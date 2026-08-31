'use client';

import { useEffect, useMemo, useRef } from 'react';
import { createViewportTracker } from '@/lib/meeting/media/viewport';
import { ParticipantTile } from './participant-tile';

// Milestone A2 (spec §6.4): Tiled / Spotlight / Sidebar, with manual pin
// overriding the automatic spotlight target. `screenTiles` are always
// preferred as the spotlight target over a pinned peer's cam feed only when
// nothing is pinned — an explicit pin always wins.
export function VideoGrid({
  peers,
  self,
  producers,
  consumers,
  localStream,
  screenStream,
  speakingPeerIds,
  emitViewport,
  layoutMode = 'tiled',
  pinnedPeerId,
  dominantSpeakerId,
  onTogglePin,
}) {
  const trackerRef = useRef(null);
  if (!trackerRef.current) {
    trackerRef.current = createViewportTracker({ onChange: emitViewport });
  }
  useEffect(() => {
    return () => trackerRef.current?.destroy();
  }, []);

  const { camTiles, screenTiles } = useMemo(() => {
    const speakingSet = new Set(speakingPeerIds);
    const cams = Object.values(peers).map((peer) => {
      const isSelf = peer.peerId === self?.peerId;
      if (isSelf) {
        return {
          peer: { ...peer, micOn: self.micOn, camOn: self.camOn, handRaised: self.handRaised },
          track: localStream?.getVideoTracks()[0] ?? null,
          producerId: null,
          isSelf: true,
          speaking: speakingSet.has(peer.peerId),
        };
      }
      const camProducer = Object.values(producers).find((p) => p.peerId === peer.peerId && p.source === 'cam');
      const consumer = camProducer
        ? Object.values(consumers).find((c) => c.producerId === camProducer.producerId)
        : null;
      return {
        peer,
        track: consumer?.track ?? null,
        producerId: camProducer?.producerId ?? null,
        isSelf: false,
        score: consumer?.score ?? null,
        speaking: speakingSet.has(peer.peerId),
      };
    });
    cams.sort((a, b) => (b.isSelf ? 1 : 0) - (a.isSelf ? 1 : 0));

    const screens = Object.values(producers)
      .filter((p) => p.source === 'screen')
      .map((producer) => {
        const isSelfShare = producer.peerId === self?.peerId;
        if (isSelfShare) {
          // Our own share never round-trips through the SFU back to us as a
          // consumer — preview it from the raw local track instead, same
          // idea as the self cam tile using localStream directly above.
          return {
            peer: { ...peers[producer.peerId], micOn: self.micOn, camOn: self.camOn, handRaised: self.handRaised },
            track: screenStream?.getVideoTracks()[0] ?? null,
            producerId: producer.producerId,
            isScreenShare: true,
            isSelf: true,
          };
        }
        const peer = peers[producer.peerId];
        if (!peer) return null;
        const consumer = Object.values(consumers).find((c) => c.producerId === producer.producerId);
        return { peer, track: consumer?.track ?? null, producerId: producer.producerId, isScreenShare: true, isSelf: false };
      })
      .filter(Boolean);

    return { camTiles: cams, screenTiles: screens };
  }, [peers, self, producers, consumers, localStream, screenStream, speakingPeerIds]);

  const tracker = trackerRef.current;

  if (layoutMode === 'tiled') {
    return (
      <div className="grid flex-1 auto-rows-fr grid-cols-2 gap-3 overflow-auto p-4 sm:grid-cols-3 lg:grid-cols-4">
        {screenTiles.map((tile) => (
          <div key={`screen-${tile.peer.peerId}`} className="col-span-2 row-span-2">
            <ParticipantTile {...tile} viewportTracker={tracker} />
          </div>
        ))}
        {camTiles.map((tile) => (
          <ParticipantTile
            key={tile.peer.peerId}
            {...tile}
            viewportTracker={tracker}
            pinnable={!tile.isSelf}
            pinned={pinnedPeerId === tile.peer.peerId}
            onTogglePin={onTogglePin}
          />
        ))}
      </div>
    );
  }

  // Spotlight/Sidebar share the same "one big + a strip of others" shape;
  // only the strip's orientation differs.
  const isSidebar = layoutMode === 'sidebar';
  const spotlightScreen = screenTiles[0] ?? null;
  const spotlightPeerId = pinnedPeerId ?? spotlightScreen?.peer.peerId ?? dominantSpeakerId ?? camTiles[0]?.peer.peerId;
  const mainTile =
    spotlightScreen && (!pinnedPeerId || pinnedPeerId === spotlightScreen.peer.peerId)
      ? spotlightScreen
      : (camTiles.find((t) => t.peer.peerId === spotlightPeerId) ?? camTiles[0]);
  const otherTiles = camTiles.filter((t) => t.peer.peerId !== mainTile?.peer.peerId);

  return (
    <div className={`flex flex-1 gap-3 overflow-hidden p-4 ${isSidebar ? 'flex-row' : 'flex-col'}`}>
      <div className="min-h-0 flex-1">
        {mainTile ? (
          <ParticipantTile
            {...mainTile}
            large
            viewportTracker={tracker}
            pinnable={!mainTile.isScreenShare && !mainTile.isSelf}
            pinned={pinnedPeerId === mainTile.peer.peerId}
            onTogglePin={onTogglePin}
          />
        ) : null}
      </div>
      {otherTiles.length > 0 ? (
        <div className={isSidebar ? 'flex w-44 shrink-0 flex-col gap-2 overflow-y-auto' : 'flex h-28 shrink-0 gap-2 overflow-x-auto'}>
          {otherTiles.map((tile) => (
            <div key={tile.peer.peerId} className={isSidebar ? 'aspect-video shrink-0' : 'aspect-video h-full shrink-0'}>
              <ParticipantTile
                {...tile}
                viewportTracker={tracker}
                pinnable={!tile.isSelf}
                pinned={pinnedPeerId === tile.peer.peerId}
                onTogglePin={onTogglePin}
              />
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
