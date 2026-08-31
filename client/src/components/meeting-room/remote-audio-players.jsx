'use client';

import { useEffect, useRef } from 'react';

// Remote peer audio (mic + screenAudio) was being received at the WebRTC/
// mediasoup level — negotiated, decoded, showing up in getStats() — but
// never actually attached to any playing element anywhere in the client.
// Mute icons and speaking detection both operate on the signaling/RTP
// layer, so they "worked" the whole time regardless; only actual audible
// playback was missing. `<video>` elements only ever carry a peer's *video*
// track (see video-grid.jsx); audio consumers need their own element.
// Rendered once at the meeting page level, not per-tile — playback has no
// visual layout, it just needs to exist for as long as the consumer does.

function RemoteAudioTrack({ track, sinkId }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.srcObject = track ? new MediaStream([track]) : null;
  }, [track]);

  useEffect(() => {
    const el = ref.current;
    // setSinkId is Chrome/Edge only as of most current browser versions —
    // absent elsewhere, playback still works, just always through the
    // system default output (feature-detected, not assumed available).
    if (!el || typeof el.setSinkId !== 'function' || !sinkId) return;
    el.setSinkId(sinkId).catch(() => {});
  }, [sinkId]);

  return <audio ref={ref} autoPlay playsInline />;
}

export function RemoteAudioPlayers({ consumers, audioOutputId }) {
  const audioConsumers = Object.values(consumers).filter((c) => c.kind === 'audio');
  return (
    <div className="hidden" aria-hidden="true">
      {audioConsumers.map((c) => (
        <RemoteAudioTrack key={c.consumerId} track={c.track} sinkId={audioOutputId} />
      ))}
    </div>
  );
}
