'use client';

import { useCallback, useEffect, useRef } from 'react';
import { C2S, C2S_FF, S2C_DELTA, S2C_MEDIA, S2C_TERMINAL } from '@/lib/meeting/shared/signaling/events';
import { createSignalingSocket } from '@/lib/meeting/signaling/socket';
import { call } from '@/lib/meeting/signaling/rpc';
import { loadDevice } from '@/lib/meeting/media/device';
import { createTransports } from '@/lib/meeting/media/transports';
import { produceMic, produceCam, produceScreen, produceScreenAudio } from '@/lib/meeting/media/producers';
import { SCREEN_CAPTURE_CONSTRAINTS } from '@/lib/meeting/shared/media/profiles';
import { consumeRemote, resumeConsumer } from '@/lib/meeting/media/consumers';
import { createTalkingDetector } from '@/lib/meeting/media/analyser';
import { loadDevicePrefs, saveDevicePrefs } from '@/lib/meeting/media/devicePrefs';
import { useMeetingStore } from '@/stores/meetingStore';

// Phase A spec §6.3. Owns the socket, the mediasoup-client Device and
// transports, and the mapping from server events to store updates. UI
// components read state via useMeetingStore selectors and call the actions
// this hook returns (produce/consume side effects only happen here).

function reconnectStorageKey(code) {
  return `meet:reconnect:${code}`;
}
function joinStorageKey(code) {
  return `meet:join:${code}`;
}

export function useMeetingConnection(code) {
  const ref = useRef({
    socket: null,
    device: null,
    sendTransport: null,
    recvTransport: null,
    hasCompletedFirstJoin: false,
    // React 19/Next dev mode double-invokes this hook's effect (mount →
    // cleanup → mount) while `ref.current` survives across that cycle. Each
    // `connect()` call captures the epoch at start and every async
    // continuation re-checks it after each await; a superseded attempt
    // (whose epoch no longer matches) aborts instead of racing the real one
    // to create a second set of transports. Confirmed necessary by a live
    // Playwright run: without this guard, two RTCPeerConnection pairs were
    // created per page and media never actually flowed.
    epoch: 0,
  });

  const reconcileConsumersAgainstSnapshot = useCallback((snapshot) => {
    const state = useMeetingStore.getState();
    const liveProducerIds = new Set(snapshot.producers.map((p) => p.producerId));
    for (const consumer of Object.values(state.consumers)) {
      if (liveProducerIds.has(consumer.producerId)) continue;
      // The server closed this consumer while we were disconnected and the
      // notification never reached us (peer.socket was null) — spec §3.5.
      consumer.consumer?.close?.();
      state.removeConsumer(consumer.consumerId);
    }
  }, []);

  const resync = useCallback(async () => {
    const socket = ref.current.socket;
    if (!socket) return;
    try {
      const { snapshot } = await call(socket, C2S.ROOM_SYNC);
      reconcileConsumersAgainstSnapshot(snapshot);
      useMeetingStore.getState().applySnapshot(snapshot);
    } catch {
      useMeetingStore.getState().setConnectionState('error', 'Lost sync with the meeting. Please rejoin.');
    }
  }, [reconcileConsumersAgainstSnapshot]);

  const handleConsumerNew = useCallback(async (payload) => {
    const { recvTransport, socket } = ref.current;
    if (!recvTransport) return;
    const consumer = await consumeRemote(recvTransport, socket, payload);
    useMeetingStore.getState().addConsumer({
      consumerId: payload.consumerId,
      producerId: payload.producerId,
      peerId: payload.peerId,
      kind: payload.kind,
      source: payload.source,
      track: consumer.track,
      consumer,
      paused: payload.producerPaused,
    });
    await resumeConsumer(socket, payload.consumerId);
  }, []);

  const registerListeners = useCallback(
    (socket, myEpoch) => {
      const store = useMeetingStore;

      const onDelta = (event, apply) => {
        socket.on(event, (payload) => {
          const applied = store.getState().applyDelta(payload, apply);
          if (!applied) resync();
        });
      };

      onDelta(S2C_DELTA.PEER_JOINED, (_s, d) => ({
        peers: { ...store.getState().peers, [d.peer.peerId]: d.peer },
      }));
      onDelta(S2C_DELTA.PEER_LEFT, (_s, d) => {
        const peers = { ...store.getState().peers };
        delete peers[d.peerId];
        return { peers };
      });
      onDelta(S2C_DELTA.PEER_UPDATED, (_s, d) => {
        const current = store.getState();
        const existing = current.peers[d.peerId];
        if (!existing) return {};
        const { rev, ...patch } = d;
        const result = { peers: { ...current.peers, [d.peerId]: { ...existing, ...patch } } };
        // Role/connected changes for our own peer must also update `self`,
        // which is what host-only UI gating (e.g. the waiting-room bar) reads.
        if (d.peerId === current.self?.peerId) result.self = { ...current.self, ...patch };
        return result;
      });
      onDelta(S2C_DELTA.PRODUCER_NEW, (_s, d) => ({
        producers: {
          ...store.getState().producers,
          [d.producerId]: { producerId: d.producerId, peerId: d.peerId, kind: d.kind, source: d.source, paused: d.paused },
        },
      }));
      onDelta(S2C_DELTA.PRODUCER_CLOSED, (_s, d) => {
        const producers = { ...store.getState().producers };
        delete producers[d.producerId];
        return { producers };
      });
      onDelta(S2C_DELTA.PRODUCER_PAUSED, (_s, d) => {
        const existing = store.getState().producers[d.producerId];
        if (!existing) return {};
        return { producers: { ...store.getState().producers, [d.producerId]: { ...existing, paused: true } } };
      });
      onDelta(S2C_DELTA.PRODUCER_RESUMED, (_s, d) => {
        const existing = store.getState().producers[d.producerId];
        if (!existing) return {};
        return { producers: { ...store.getState().producers, [d.producerId]: { ...existing, paused: false } } };
      });
      onDelta(S2C_DELTA.WAITING_ADDED, (_s, d) => ({
        waiting: [...store.getState().waiting, { peerId: d.peerId, displayName: d.displayName, avatarUrl: d.avatarUrl, at: d.at }],
      }));
      onDelta(S2C_DELTA.WAITING_REMOVED, (_s, d) => ({
        waiting: store.getState().waiting.filter((w) => w.peerId !== d.peerId),
      }));
      onDelta(S2C_DELTA.ROOM_FLAGS, (_s, d) => ({ flags: d.flags }));
      onDelta(S2C_DELTA.RECORDING_STATE, (_s, d) => ({
        recording: { active: d.active, startedAt: d.startedAt, startedBy: d.startedBy },
      }));
      onDelta(S2C_DELTA.SPEAKER_DOMINANT, (_s, d) => ({ dominantSpeakerId: d.dominantSpeakerId }));
      onDelta(S2C_DELTA.CHAT_MESSAGE, (_s, d) => ({ chat: [...store.getState().chat, d.message] }));
      onDelta(S2C_DELTA.REACTION, (_s, d) => {
        // Reactions are a transient overlay, not room state that needs
        // rev-tracked persistence, but they still travel as a delta so a
        // dropped one (rev gap) correctly triggers a resync like anything
        // else — it just resyncs to nothing since reactions aren't in the
        // snapshot, which is the right outcome for something ephemeral.
        store.getState().addReaction({ id: `${d.peerId}-${d.at}-${Math.random()}`, peerId: d.peerId, emoji: d.emoji, at: d.at });
        return {};
      });

      socket.on(S2C_MEDIA.CONSUMER_NEW, handleConsumerNew);
      socket.on(S2C_MEDIA.CONSUMER_CLOSED, ({ consumerId }) => {
        const state = useMeetingStore.getState();
        state.consumers[consumerId]?.consumer?.close?.();
        state.removeConsumer(consumerId);
      });
      socket.on(S2C_MEDIA.CONSUMER_SCORE, ({ consumerId, score }) => {
        useMeetingStore.getState().setConsumerScore(consumerId, score);
      });
      socket.on(S2C_MEDIA.AUDIO_LEVELS, ({ speakingPeerIds }) => {
        useMeetingStore.getState().setSpeakingPeerIds(speakingPeerIds);
      });
      socket.on(S2C_MEDIA.DURATION_WARNING, ({ endsAt }) => {
        useMeetingStore.getState().setDurationWarning({ endsAt });
      });
      socket.on(S2C_MEDIA.QUALITY_ADVICE, (payload) => {
        // Two distinct senders share this event name: the bandwidth
        // governor (`{ level, reason }`, spec §5.5) and the per-producer
        // score advisory (`{ producerId, kind, unstable }`, spec §5.6) —
        // distinguished by which fields are present.
        if ('unstable' in payload) {
          useMeetingStore.getState().setSelfConnectionUnstable(payload.unstable);
        }
      });
      socket.on(S2C_MEDIA.HOST_MUTED, ({ kind }) => {
        // The server already paused the producer (spec §4.7's asymmetric
        // host:mute) — bring the local mediasoup-client Producer object and
        // UI state in line with that, don't just flip a flag.
        if (kind === 'audio') {
          ref.current.micProducer?.pause();
          useMeetingStore.getState().setSelf({ micOn: false });
        } else {
          if (ref.current.camProducer) {
            ref.current.camProducer.close();
            ref.current.camProducer = null;
          }
          ref.current.localStream?.getVideoTracks().forEach((t) => t.stop());
          useMeetingStore.getState().setSelf({ camOn: false });
        }
      });

      socket.on(S2C_TERMINAL.ADMITTED, async ({ snapshot, reconnectToken }) => {
        if (ref.current.epoch !== myEpoch) return;
        sessionStorage.setItem(reconnectStorageKey(code), reconnectToken);
        socket.auth = { reconnectToken, resume: true };
        useMeetingStore.getState().applySnapshot(snapshot);
        useMeetingStore.getState().setConnectionState('connected');
        await startLocalMedia(myEpoch);
      });
      socket.on(S2C_TERMINAL.DENIED, () => {
        useMeetingStore.getState().setConnectionState('ended', 'The host did not admit you.');
      });
      socket.on(S2C_TERMINAL.REMOVED, () => {
        useMeetingStore.getState().setConnectionState('ended', 'You were removed from the meeting.');
      });
      socket.on(S2C_TERMINAL.MEETING_ENDED, ({ reason } = {}) => {
        const message =
          reason === 'host_left'
            ? 'The meeting ended because the host left and no one else could run it.'
            : reason === 'duration_expired'
              ? "The meeting ended — it reached its scheduled duration."
              : 'The meeting has ended.';
        useMeetingStore.getState().setConnectionState('ended', message);
        sessionStorage.removeItem(reconnectStorageKey(code));
      });

      socket.on('disconnect', () => {
        if (useMeetingStore.getState().connectionState === 'connected') {
          useMeetingStore.getState().setConnectionState('reconnecting');
        }
      });
    },
    [code, handleConsumerNew, resync],
  );

  const startLocalMedia = useCallback(async (myEpoch) => {
    const { device, socket } = ref.current;
    const { sendTransport, recvTransport } = await createTransports(device, socket);
    if (ref.current.epoch !== myEpoch) {
      // Superseded mid-flight (StrictMode double-invoke) — this attempt's
      // transports were created against a socket that's about to be/already
      // was disconnected. Close them rather than leaving orphaned PCs.
      sendTransport.close();
      recvTransport.close();
      return;
    }
    ref.current.sendTransport = sendTransport;
    ref.current.recvTransport = recvTransport;

    // The lobby's own device selects only ever changed its own local
    // preview — the meeting page did a completely unconstrained
    // getUserMedia() call, silently ignoring whatever the user picked.
    // devicePrefs bridges that choice across the /j/[code] -> /meeting/[code]
    // navigation (sessionStorage, since React state doesn't survive it).
    const devicePrefs = loadDevicePrefs();
    if (devicePrefs.audioOutputId) useMeetingStore.getState().setAudioOutputId(devicePrefs.audioOutputId);
    const stream = await navigator.mediaDevices
      .getUserMedia({
        audio: devicePrefs.audioDeviceId ? { deviceId: { exact: devicePrefs.audioDeviceId } } : true,
        video: devicePrefs.videoDeviceId ? { deviceId: { exact: devicePrefs.videoDeviceId } } : true,
      })
      .catch(() => null);
    if (!stream || ref.current.epoch !== myEpoch) {
      stream?.getTracks().forEach((t) => t.stop());
      return;
    }

    const flags = useMeetingStore.getState().flags;
    const audioTrack = stream.getAudioTracks()[0];
    const videoTrack = stream.getVideoTracks()[0];
    ref.current.localStream = stream;
    useMeetingStore.getState().setLocalStream(stream);

    if (audioTrack) {
      // Mic mute is a producer.pause(), never track.enabled = false — the
      // local AnalyserNode-based "are you talking?" prompt (spec §5.7) needs
      // the track live even while muted.
      const micProducer = await produceMic(sendTransport, audioTrack);
      ref.current.micProducer = micProducer;
      if (flags.muteOnEntry) {
        await call(socket, C2S.PAUSE_PRODUCER, { producerId: micProducer.id });
        micProducer.pause();
      }
      useMeetingStore.getState().setSelf({ micOn: !flags.muteOnEntry });
    }
    if (videoTrack) {
      if (flags.cameraOffOnEntry) {
        // Camera-off-on-entry closes the producer outright (spec §5.7) — no
        // producer is created at all, matching a self-initiated camera-off.
        videoTrack.stop();
        useMeetingStore.getState().setSelf({ camOn: false });
      } else {
        const camProducer = await produceCam(sendTransport, videoTrack);
        ref.current.camProducer = camProducer;
        useMeetingStore.getState().setSelf({ camOn: true });
      }
    }
  }, []);

  const connect = useCallback(async () => {
    const myEpoch = ++ref.current.epoch;
    const store = useMeetingStore.getState();
    const storedReconnectToken = sessionStorage.getItem(reconnectStorageKey(code));
    const joinResult = JSON.parse(sessionStorage.getItem(joinStorageKey(code)) ?? 'null');

    if (!storedReconnectToken && !joinResult) {
      store.setConnectionState('error', 'No join credentials found — please rejoin from the lobby.');
      return;
    }

    // sessionStorage survives a reload (only cleared when the tab closes),
    // so `joinResult` — and its wsUrl — is still available even on the
    // resume:false (page-reload) path.
    const wsUrl = joinResult?.wsUrl;
    if (!wsUrl) {
      useMeetingStore.getState().setConnectionState('error', 'No join credentials found — please rejoin from the lobby.');
      return;
    }
    const socket = createSignalingSocket(
      storedReconnectToken
        ? { wsUrl, reconnectToken: storedReconnectToken, resume: false }
        : { wsUrl, token: joinResult.token },
    );
    ref.current.socket = socket;
    registerListeners(socket, myEpoch);
    store.setConnectionState('connecting');

    socket.on('connect', async () => {
      if (ref.current.epoch !== myEpoch) return; // superseded before the socket even connected

      if (ref.current.hasCompletedFirstJoin) {
        // A socket.io-internal reconnect on the SAME socket instance — the
        // `auth` was already updated to {reconnectToken, resume:true} after
        // the first join succeeded, so this is the resume path (spec §3.5).
        useMeetingStore.getState().setConnectionState('connected');
        await resync();
        return;
      }

      try {
        const { routerRtpCapabilities } = await call(socket, C2S.GET_ROUTER_RTP_CAPABILITIES);
        if (ref.current.epoch !== myEpoch) return;
        const device = await loadDevice(routerRtpCapabilities);
        if (ref.current.epoch !== myEpoch) return;
        ref.current.device = device;

        const ack = await call(socket, C2S.JOIN, { rtpCapabilities: device.rtpCapabilities });
        if (ref.current.epoch !== myEpoch) return;
        ref.current.hasCompletedFirstJoin = true;

        if (ack.waiting) {
          useMeetingStore.getState().setConnectionState('waiting');
          return;
        }

        sessionStorage.setItem(reconnectStorageKey(code), ack.reconnectToken);
        socket.auth = { reconnectToken: ack.reconnectToken, resume: true };
        useMeetingStore.getState().applySnapshot(ack.snapshot);
        useMeetingStore.getState().setConnectionState('connected');
        await startLocalMedia(myEpoch);
      } catch (err) {
        if (ref.current.epoch !== myEpoch) return;
        useMeetingStore.getState().setConnectionState('error', err.message ?? 'Could not join the meeting.');
      }
    });

    socket.connect();
  }, [code, registerListeners, resync, startLocalMedia]);

  const emitViewport = useCallback((payload) => {
    // The tracker's real, most recent computation — kept so toggling the
    // manual video-off override back off can immediately restore exactly
    // what was visible, without waiting for the next IntersectionObserver
    // callback (nothing about the DOM necessarily changes at toggle time).
    ref.current.lastViewportPayload = payload;

    // Manual "turn off incoming video" (spec §5.5's manual override):
    // reporting nothing visible makes the server's consumerManager
    // naturally stop sending any video, reusing the existing viewport
    // mechanism instead of adding a second server-side video-off path.
    const effective = useMeetingStore.getState().incomingVideoOff
      ? { visible: [], prefetch: [], pinned: [] }
      : payload;
    ref.current.socket?.emit(C2S_FF.VIEWPORT, effective);
  }, []);

  const toggleIncomingVideo = useCallback(() => {
    const store = useMeetingStore.getState();
    const next = !store.incomingVideoOff;
    store.setIncomingVideoOff(next);
    const payload = next
      ? { visible: [], prefetch: [], pinned: [] }
      : (ref.current.lastViewportPayload ?? { visible: [], prefetch: [], pinned: [] });
    ref.current.socket?.emit(C2S_FF.VIEWPORT, payload);
  }, []);

  const admitPeer = useCallback((peerId) => {
    const socket = ref.current.socket;
    if (socket) return call(socket, C2S.HOST_ADMIT, { peerId });
  }, []);

  const denyPeer = useCallback((peerId) => {
    const socket = ref.current.socket;
    if (socket) return call(socket, C2S.HOST_DENY, { peerId });
  }, []);

  const admitAllWaiting = useCallback(() => {
    const socket = ref.current.socket;
    if (socket) return call(socket, C2S.HOST_ADMIT_ALL, {});
  }, []);

  const sendChat = useCallback((text) => {
    ref.current.socket?.emit(C2S_FF.CHAT_SEND, { text });
  }, []);

  const sendReaction = useCallback((emoji) => {
    ref.current.socket?.emit(C2S_FF.REACTION_SEND, { emoji });
  }, []);

  const toggleHand = useCallback(() => {
    const store = useMeetingStore.getState();
    const raised = !store.self?.handRaised;
    ref.current.socket?.emit(C2S_FF.HAND_TOGGLE, { raised });
    store.setSelf({ handRaised: raised });
  }, []);

  const stopScreenShare = useCallback(async () => {
    const state = ref.current;
    const socket = state.socket;
    for (const key of ['screenProducer', 'screenAudioProducer']) {
      const producer = state[key];
      if (!producer || producer.closed) continue;
      await call(socket, C2S.CLOSE_PRODUCER, { producerId: producer.id }).catch(() => {});
      producer.close();
      state[key] = null;
    }
    const store = useMeetingStore.getState();
    store.setSelf({ sharing: false });
    store.setScreenStream(null);
  }, []);

  const startScreenShare = useCallback(async () => {
    const state = ref.current;
    const store = useMeetingStore.getState();
    if (!state.sendTransport) return;

    const displayStream = await navigator.mediaDevices.getDisplayMedia(SCREEN_CAPTURE_CONSTRAINTS).catch(() => null);
    const videoTrack = displayStream?.getVideoTracks()[0];
    if (!videoTrack) return;

    try {
      state.screenProducer = await produceScreen(state.sendTransport, videoTrack);
    } catch (err) {
      // Rejected server-side (share limit reached / disabled) — the produce
      // handler is the single choke point for this policy (spec §4.9).
      displayStream.getTracks().forEach((t) => t.stop());
      throw err;
    }
    // Self-preview: unlike other peers' shares (which arrive via a real
    // consumer), our own share never round-trips through the SFU back to
    // us, so without this the presenter's own tile just never renders.
    store.setScreenStream(new MediaStream([videoTrack]));

    // Share audio is feature-detected, not guaranteed (Firefox/Safari don't
    // offer it) — the share proceeds video-only when absent (spec risk table).
    const audioTrack = displayStream.getAudioTracks()[0];
    if (audioTrack) {
      state.screenAudioProducer = await produceScreenAudio(state.sendTransport, audioTrack).catch(() => null);
    }

    // The browser's own "Stop sharing" affordance ends the track directly —
    // this is the only signal we get for that, so it drives our own cleanup.
    videoTrack.addEventListener('ended', () => stopScreenShare());

    store.setSelf({ sharing: true });
  }, [stopScreenShare]);

  const muteParticipant = useCallback((peerId, kind = 'audio') => {
    const socket = ref.current.socket;
    if (socket) return call(socket, C2S.HOST_MUTE, { peerId, kind });
  }, []);

  const muteAllParticipants = useCallback(() => {
    const socket = ref.current.socket;
    if (socket) return call(socket, C2S.HOST_MUTE_ALL, {});
  }, []);

  const removeParticipant = useCallback((peerId) => {
    const socket = ref.current.socket;
    if (socket) return call(socket, C2S.HOST_REMOVE, { peerId });
  }, []);

  const setParticipantRole = useCallback((peerId, role) => {
    const socket = ref.current.socket;
    if (socket) return call(socket, C2S.HOST_SET_ROLE, { peerId, role });
  }, []);

  const setRoomFlag = useCallback((flag, value) => {
    const socket = ref.current.socket;
    if (socket) return call(socket, C2S.HOST_SET_FLAG, { flag, value });
  }, []);

  const endMeetingForAll = useCallback(() => {
    const socket = ref.current.socket;
    if (socket) return call(socket, C2S.HOST_END, {});
  }, []);

  const startRecording = useCallback(() => {
    const socket = ref.current.socket;
    if (socket) return call(socket, C2S.RECORDING_START, {});
  }, []);

  const stopRecording = useCallback(() => {
    const socket = ref.current.socket;
    if (socket) return call(socket, C2S.RECORDING_STOP, {});
  }, []);

  const askToUnmute = useCallback((peerId) => {
    const socket = ref.current.socket;
    if (socket) return call(socket, C2S.ASK_TO_UNMUTE, { peerId });
  }, []);

  const toggleMic = useCallback(async () => {
    const { micProducer, socket } = ref.current;
    if (!micProducer || !socket) return;
    const store = useMeetingStore.getState();
    const turningOn = !store.self?.micOn;
    // Server-side producer.pause()/resume() — never track.enabled — so the
    // local "are you talking?" analyser keeps working while muted, and other
    // peers/the host see the real state (spec §5.7).
    await call(socket, turningOn ? C2S.RESUME_PRODUCER : C2S.PAUSE_PRODUCER, { producerId: micProducer.id });
    if (turningOn) micProducer.resume();
    else micProducer.pause();
    store.setSelf({ micOn: turningOn });
  }, []);

  const toggleCamera = useCallback(async () => {
    const state = ref.current;
    const store = useMeetingStore.getState();
    if (store.self?.camOn) {
      // Self-initiated camera-off closes the producer so the capture light
      // actually goes out (spec §5.7) — distinct from a host-issued mute,
      // which can only pause.
      if (state.camProducer && state.socket) {
        await call(state.socket, C2S.CLOSE_PRODUCER, { producerId: state.camProducer.id }).catch(() => {});
        state.camProducer.close();
        state.camProducer = null;
      }
      state.localStream?.getVideoTracks().forEach((t) => t.stop());
      // A new MediaStream instance, not an in-place mutation — Zustand
      // subscribers key off reference identity, so mutating the existing
      // stream object would never trigger a re-render.
      const remainingTracks = state.localStream?.getAudioTracks() ?? [];
      state.localStream = new MediaStream(remainingTracks);
      store.setLocalStream(state.localStream);
      store.setSelf({ camOn: false });
    } else {
      const { videoDeviceId } = loadDevicePrefs();
      const newStream = await navigator.mediaDevices
        .getUserMedia({ video: videoDeviceId ? { deviceId: { exact: videoDeviceId } } : true })
        .catch(() => null);
      const track = newStream?.getVideoTracks()[0];
      if (!track || !state.sendTransport) return;
      const producer = await produceCam(state.sendTransport, track);
      state.camProducer = producer;
      const existingAudio = state.localStream?.getAudioTracks() ?? [];
      state.localStream = new MediaStream([...existingAudio, track]);
      store.setLocalStream(state.localStream);
      store.setSelf({ camOn: true });
    }
  }, []);

  // Mid-call device switching (distinct from toggleMic/toggleCamera's
  // on/off): uses mediasoup-client's Producer.replaceTrack, which swaps the
  // underlying MediaStreamTrack on the existing RTCRtpSender with no
  // renegotiation and no consumer churn for anyone else watching — the
  // producer id, and everyone else's subscription to it, never changes.
  // If the relevant producer isn't currently live (mic/camera off), there's
  // nothing to live-swap; the preference is still saved for the next time
  // it's turned on (toggleMic/toggleCamera's "on" paths already read it).
  const switchCamera = useCallback(async (deviceId) => {
    saveDevicePrefs({ videoDeviceId: deviceId });
    const state = ref.current;
    if (!state.camProducer || state.camProducer.closed) return;
    const newStream = await navigator.mediaDevices
      .getUserMedia({ video: { deviceId: { exact: deviceId } } })
      .catch(() => null);
    const newTrack = newStream?.getVideoTracks()[0];
    if (!newTrack) return;
    await state.camProducer.replaceTrack({ track: newTrack });
    const oldTrack = state.localStream?.getVideoTracks()[0];
    oldTrack?.stop();
    const audioTracks = state.localStream?.getAudioTracks() ?? [];
    state.localStream = new MediaStream([...audioTracks, newTrack]);
    useMeetingStore.getState().setLocalStream(state.localStream);
  }, []);

  const switchMic = useCallback(async (deviceId) => {
    saveDevicePrefs({ audioDeviceId: deviceId });
    const state = ref.current;
    if (!state.micProducer || state.micProducer.closed) return;
    const newStream = await navigator.mediaDevices
      .getUserMedia({ audio: { deviceId: { exact: deviceId } } })
      .catch(() => null);
    const newTrack = newStream?.getAudioTracks()[0];
    if (!newTrack) return;
    await state.micProducer.replaceTrack({ track: newTrack });
    const oldTrack = state.localStream?.getAudioTracks()[0];
    oldTrack?.stop();
    const videoTracks = state.localStream?.getVideoTracks() ?? [];
    state.localStream = new MediaStream([newTrack, ...videoTracks]);
    useMeetingStore.getState().setLocalStream(state.localStream);
    // The local "are you talking?" analyser (spec §5.7) reads a specific
    // track off the old MediaStream — restart it against the new one
    // rather than leave it silently listening to a now-stopped track.
    if (state.talkingDetector) {
      state.talkingDetector.destroy();
      state.talkingDetector = createTalkingDetector({
        track: newTrack,
        onTalking: () => useMeetingStore.getState().showUnmutePrompt(),
      });
    }
  }, []);

  // Audio output (speaker) selection is applied per-<audio>-element by
  // RemoteAudioPlayers reading this store value directly — there's no
  // single element to call setSinkId on, one hidden <audio> element exists
  // per remote audio consumer. This just persists the choice + updates the
  // store; browsers without setSinkId support (historically Firefox/Safari)
  // simply keep using the system default, checked before this is ever
  // exposed in the UI.
  const switchSpeaker = useCallback((deviceId) => {
    saveDevicePrefs({ audioOutputId: deviceId });
    useMeetingStore.getState().setAudioOutputId(deviceId);
  }, []);

  const leave = useCallback(async () => {
    const socket = ref.current.socket;
    if (socket?.connected) {
      try {
        await call(socket, C2S.LEAVE);
      } catch {
        // best-effort — disconnecting below is what actually matters
      }
    }
    sessionStorage.removeItem(reconnectStorageKey(code));
    ref.current.localStream?.getTracks().forEach((t) => t.stop());
    stopScreenTracksOnly(ref.current);
    socket?.disconnect();
  }, [code]);

  // "You're muted — are you talking?" (spec §5.7). Runs only while muted,
  // reading the still-live local track (muting never disables the track).
  const micOn = useMeetingStore((s) => s.self?.micOn);
  useEffect(() => {
    const track = ref.current.localStream?.getAudioTracks()[0];
    if (micOn !== false || !track) {
      ref.current.talkingDetector?.destroy();
      ref.current.talkingDetector = null;
      return undefined;
    }
    ref.current.talkingDetector = createTalkingDetector({
      track,
      onTalking: () => useMeetingStore.getState().showUnmutePrompt(),
    });
    return () => {
      ref.current.talkingDetector?.destroy();
      ref.current.talkingDetector = null;
    };
  }, [micOn]);

  useEffect(() => {
    connect();
    return () => {
      // Invalidate this attempt for any of its still-in-flight async
      // continuations (see the `epoch` comment above), then tear down
      // whatever it had actually created so far.
      ref.current.epoch += 1;
      ref.current.sendTransport?.close();
      ref.current.recvTransport?.close();
      ref.current.socket?.disconnect();
      ref.current.localStream?.getTracks().forEach((t) => t.stop());
      stopScreenTracksOnly(ref.current);
      ref.current.talkingDetector?.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    emitViewport,
    toggleMic,
    toggleCamera,
    switchCamera,
    switchMic,
    switchSpeaker,
    leave,
    admitPeer,
    denyPeer,
    admitAllWaiting,
    sendChat,
    sendReaction,
    toggleHand,
    startScreenShare,
    stopScreenShare,
    muteParticipant,
    muteAllParticipants,
    removeParticipant,
    setParticipantRole,
    setRoomFlag,
    endMeetingForAll,
    askToUnmute,
    toggleIncomingVideo,
    startRecording,
    stopRecording,
  };
}

/** Stops the browser-level capture tracks for an active screen share, if any. */
function stopScreenTracksOnly(state) {
  state.screenProducer?.track?.stop?.();
  state.screenAudioProducer?.track?.stop?.();
}
