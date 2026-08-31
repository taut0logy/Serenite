'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FiLoader } from 'react-icons/fi';
import { useMeetingConnection } from '@/hooks/use-meeting-connection';
import { useMediaDevices } from '@/hooks/use-media-devices';
import { useMeetingStore } from '@/stores/meetingStore';
import { VideoGrid } from '@/components/meeting-room/video-grid';
import { ControlBar } from '@/components/meeting-room/control-bar';
import { SidePanel } from '@/components/meeting-room/side-panel';
import { ReactionsLayer } from '@/components/meeting-room/reactions-layer';
import { UnmutePrompt } from '@/components/meeting-room/unmute-prompt';
import { RemoteAudioPlayers } from '@/components/meeting-room/remote-audio-players';
import { DurationWarningBanner } from '@/components/meeting-room/duration-warning-banner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

// Milestone A2: the real meeting pipeline gains chat, reactions, raise hand,
// screen share, the participant/waiting-room panels, and layouts + pin —
// replacing Milestone A1's minimal grid.
/**
 * The live call. Mounted only once a join token has been minted and stored,
 * because the connection hook reads it from sessionStorage on connect and on
 * every reload after that.
 */
export function LiveRoom({ meetingId, onLeave }) {
  const router = useRouter();
  const connection = useMeetingConnection(meetingId);
  const {
    emitViewport,
    toggleMic,
    toggleCamera,
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
    endMeetingForAll,
    toggleIncomingVideo,
    switchCamera,
    switchMic,
    switchSpeaker,
    setRoomFlag,
  } = connection;
  const [showLastHostLeaveConfirm, setShowLastHostLeaveConfirm] = useState(false);
  const { cameras, microphones, speakers } = useMediaDevices();
  const canSelectSpeaker = typeof window !== 'undefined' && 'setSinkId' in (window.HTMLMediaElement?.prototype ?? {});

  const connectionState = useMeetingStore((s) => s.connectionState);
  const errorMessage = useMeetingStore((s) => s.errorMessage);
  const meeting = useMeetingStore((s) => s.meeting);
  const self = useMeetingStore((s) => s.self);
  const peers = useMeetingStore((s) => s.peers);
  const producers = useMeetingStore((s) => s.producers);
  const consumers = useMeetingStore((s) => s.consumers);
  const waiting = useMeetingStore((s) => s.waiting);
  const localStream = useMeetingStore((s) => s.localStream);
  const screenStream = useMeetingStore((s) => s.screenStream);
  const speakingPeerIds = useMeetingStore((s) => s.speakingPeerIds);
  const audioOutputId = useMeetingStore((s) => s.audioOutputId);
  const chat = useMeetingStore((s) => s.chat);
  const reactions = useMeetingStore((s) => s.reactions);
  const flags = useMeetingStore((s) => s.flags);
  const sidePanel = useMeetingStore((s) => s.sidePanel);
  const setSidePanel = useMeetingStore((s) => s.setSidePanel);
  const layoutMode = useMeetingStore((s) => s.layoutMode);
  const setLayoutMode = useMeetingStore((s) => s.setLayoutMode);
  const pinnedPeerId = useMeetingStore((s) => s.pinnedPeerId);
  const togglePin = useMeetingStore((s) => s.togglePin);
  const dominantSpeakerId = useMeetingStore((s) => s.dominantSpeakerId);
  const selfConnectionUnstable = useMeetingStore((s) => s.selfConnectionUnstable);
  const unmutePromptVisible = useMeetingStore((s) => s.unmutePromptVisible);
  const dismissUnmutePrompt = useMeetingStore((s) => s.dismissUnmutePrompt);
  const incomingVideoOff = useMeetingStore((s) => s.incomingVideoOff);
  const durationWarning = useMeetingStore((s) => s.durationWarning);

  // Mirrors the server's finalizeLeave check (presence.js): no auto-
  // promotion of a random participant, so if self is the room's only
  // remaining host/cohost, leaving ends the meeting for everyone. A peer
  // mid reconnect-grace has connected:false and doesn't count as "still
  // able to run the meeting", matching Room.hostsAndCohosts()'s socket check.
  const isLastHostOrCohost =
    (self?.role === 'HOST' || self?.role === 'COHOST') &&
    !Object.values(peers).some(
      (p) => p.peerId !== self?.peerId && (p.role === 'HOST' || p.role === 'COHOST') && p.connected,
    );

  async function handleLeave() {
    await leave();
    if (onLeave) onLeave();
    else router.push('/dashboard');
  }

  function handleLeaveClick() {
    if (isLastHostOrCohost) {
      setShowLastHostLeaveConfirm(true);
      return;
    }
    handleLeave();
  }

  async function handleToggleScreenShare() {
    if (self?.sharing) await stopScreenShare();
    else await startScreenShare().catch(() => {});
  }

  function handleEndForAll() {
    if (window.confirm('End the meeting for everyone?')) endMeetingForAll();
  }

  async function handleUnmuteFromPrompt() {
    dismissUnmutePrompt();
    if (!self?.micOn) await toggleMic();
  }

  if (connectionState === 'idle' || connectionState === 'connecting') {
    return <CenteredMessage icon={<FiLoader className="size-6 animate-spin" />} text="Connecting…" />;
  }

  if (connectionState === 'waiting') {
    return (
      <CenteredMessage
        icon={<FiLoader className="size-6 animate-spin" />}
        text="Waiting for the host to let you in…"
      />
    );
  }

  if (connectionState === 'error') {
    return (
      <CenteredMessage
        text={errorMessage ?? 'Something went wrong.'}
        action={
          <Button variant="secondary" onClick={() => router.push(`/j/${code}`)}>
            Back to lobby
          </Button>
        }
      />
    );
  }

  if (connectionState === 'ended') {
    return (
      <CenteredMessage
        text={errorMessage ?? 'The meeting has ended.'}
        action={
          <Button variant="secondary" onClick={() => router.push('/dashboard')}>
            Back to dashboard
          </Button>
        }
      />
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-neutral-950 text-white">
      <header className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-neutral-300">{meeting?.title}</span>
        </div>
        {connectionState === 'reconnecting' ? (
          <span className="text-xs text-amber-400">Reconnecting…</span>
        ) : null}
      </header>

      <div className="flex min-h-0 flex-1">
        <div className="relative flex min-w-0 flex-1 flex-col">
          <VideoGrid
            peers={peers}
            self={self}
            producers={producers}
            consumers={consumers}
            localStream={localStream}
            screenStream={screenStream}
            speakingPeerIds={speakingPeerIds}
            emitViewport={emitViewport}
            layoutMode={layoutMode}
            pinnedPeerId={pinnedPeerId}
            dominantSpeakerId={dominantSpeakerId}
            onTogglePin={togglePin}
          />
          <RemoteAudioPlayers consumers={consumers} audioOutputId={audioOutputId} />
          <ReactionsLayer reactions={reactions} />
          <UnmutePrompt
            visible={unmutePromptVisible}
            onUnmute={handleUnmuteFromPrompt}
            onDismiss={dismissUnmutePrompt}
          />
          <div className="absolute left-1/2 top-4 flex -translate-x-1/2 flex-col items-center gap-2">
            <DurationWarningBanner endsAt={durationWarning?.endsAt} />
            {selfConnectionUnstable ? (
              <div
                className="rounded-md bg-red-500/90 px-3 py-1.5 text-xs text-white shadow"
                data-testid="connection-unstable-banner"
              >
                Your connection is unstable
              </div>
            ) : null}
          </div>
        </div>

        {sidePanel ? (
          <SidePanel
            activeTab={sidePanel}
            onTabChange={setSidePanel}
            chat={chat}
            peers={peers}
            waiting={waiting}
            self={self}
            flags={flags}
            actions={{
              sendChat,
              muteParticipant,
              removeParticipant,
              setParticipantRole,
              muteAllParticipants,
              admitPeer,
              denyPeer,
              admitAllWaiting,
              setRoomFlag,
            }}
          />
        ) : null}
      </div>

      <ControlBar
        micOn={!!self?.micOn}
        camOn={!!self?.camOn}
        sharing={!!self?.sharing}
        handRaised={!!self?.handRaised}
        allowScreenShare={!!flags.allowScreenShare}
        isHost={self?.role === 'HOST'}
        isHostOrCohost={self?.role === 'HOST' || self?.role === 'COHOST'}
        waitingCount={waiting.length}
        sidePanel={sidePanel}
        layoutMode={layoutMode}
        incomingVideoOff={incomingVideoOff}
        recordingActive={false}
        recordingBusy={false}
        cameras={cameras}
        microphones={microphones}
        speakers={speakers}
        canSelectSpeaker={canSelectSpeaker}
        audioOutputId={audioOutputId}
        onToggleMic={toggleMic}
        onToggleCamera={toggleCamera}
        onSwitchCamera={switchCamera}
        onSwitchMic={switchMic}
        onSwitchSpeaker={switchSpeaker}
        onToggleScreenShare={handleToggleScreenShare}
        onToggleHand={toggleHand}
        onSendReaction={sendReaction}
        onToggleSidePanel={setSidePanel}
        onSetLayoutMode={setLayoutMode}
        onToggleIncomingVideo={toggleIncomingVideo}
        onEndForAll={handleEndForAll}
        onLeave={handleLeaveClick}
      />

      <Dialog open={showLastHostLeaveConfirm} onOpenChange={setShowLastHostLeaveConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>You&apos;re the last host in this meeting</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            There&apos;s no one else who can run it — leaving now will end the meeting for everyone still here.
          </p>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setShowLastHostLeaveConfirm(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setShowLastHostLeaveConfirm(false);
                handleLeave();
              }}
            >
              Leave and end meeting
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CenteredMessage({ icon, text, action }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-neutral-950 px-4 text-center text-white">
      {icon}
      <p className="max-w-sm text-sm text-neutral-300">{text}</p>
      {action}
    </div>
  );
}
