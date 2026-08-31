'use client';

import { useEffect, useRef } from 'react';
import { FiMic, FiMicOff, FiMapPin } from 'react-icons/fi';
import { FaHandPaper } from 'react-icons/fa';
import { Button } from '@/components/ui/button';
import { QualityBadge } from './quality-badge';

// Phase A spec §6.4. `pinnable` gates whether the pin control renders at all
// (screen-share tiles and the self tile aren't pinnable).
export function ParticipantTile({
  peer,
  track,
  producerId,
  isSelf,
  viewportTracker,
  isScreenShare = false,
  pinned = false,
  pinnable = false,
  onTogglePin,
  large = false,
  score = null,
  speaking = false,
}) {
  const containerRef = useRef(null);
  const videoRef = useRef(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (track) {
      const stream = new MediaStream([track]);
      el.srcObject = stream;
    } else {
      el.srcObject = null;
    }
  }, [track]);

  // Observed on the always-rendered container, not the conditionally-
  // rendered <video> — otherwise a remote tile could never be reported
  // visible until it already had a track, and it can never get a track
  // without being reported visible first (spec §5.1's viewport-driven
  // consumption depends on this element existing before any consumer does).
  useEffect(() => {
    if (!viewportTracker || !producerId || isSelf) return;
    const el = containerRef.current;
    viewportTracker.observe(el, producerId);
    return () => viewportTracker.unobserve(el, producerId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewportTracker, producerId, isSelf]);

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden rounded-lg bg-neutral-900 ring-2 ring-offset-2 ring-offset-neutral-950 transition-[--tw-ring-color] duration-150 ${large ? 'h-full w-full' : 'aspect-video'} ${speaking && !isScreenShare ? 'ring-emerald-400' : 'ring-transparent'}`}
      data-testid={isScreenShare ? 'screen-share-tile' : 'participant-tile'}
      data-peer-id={peer.peerId}
    >
      {track ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isSelf}
          className={`h-full w-full ${isScreenShare ? 'object-contain' : 'object-cover'}`}
          data-testid="participant-video"
        />
      ) : (
        <div className="flex h-full items-center justify-center text-sm text-neutral-400">
          {isScreenShare ? `${peer.displayName}'s screen` : peer.displayName}
        </div>
      )}

      {pinnable ? (
        <Button
          type="button"
          size="icon-xs"
          variant={pinned ? 'secondary' : 'ghost'}
          aria-label={pinned ? `Unpin ${peer.displayName}` : `Pin ${peer.displayName}`}
          aria-pressed={pinned}
          className="absolute right-2 top-2 bg-black/40 hover:bg-black/60"
          onClick={() => onTogglePin?.(peer.peerId)}
        >
          <FiMapPin />
        </Button>
      ) : null}

      {!isScreenShare ? (
        <div className="absolute bottom-2 left-2 flex items-center gap-1.5 rounded bg-black/60 px-2 py-1 text-xs text-white">
          {peer.micOn ? <FiMic className="size-3" /> : <FiMicOff className="size-3 text-red-400" />}
          {peer.handRaised ? <FaHandPaper className="size-3 text-amber-400" aria-label="Hand raised" /> : null}
          <span>
            {peer.displayName}
            {isSelf ? ' (You)' : ''}
          </span>
          {!isSelf ? <QualityBadge score={score} /> : null}
        </div>
      ) : null}
    </div>
  );
}
