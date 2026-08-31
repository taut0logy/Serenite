import { CAM_ENCODINGS, SCREEN_ENCODINGS } from '@/lib/meeting/shared/media/profiles';

// Phase A spec §5.8. `appData.source` rides through the transport's
// 'produce' event to the server's produce handler, which is the single
// choke point for media policy (spec §4.9).

export function produceMic(sendTransport, track) {
  return sendTransport.produce({ track, appData: { source: 'mic' } });
}

export function produceCam(sendTransport, track) {
  return sendTransport.produce({
    track,
    encodings: CAM_ENCODINGS,
    codecOptions: { videoGoogleStartBitrate: 500 },
    appData: { source: 'cam' },
  });
}

export function produceScreen(sendTransport, track) {
  return sendTransport.produce({
    track,
    encodings: SCREEN_ENCODINGS,
    appData: { source: 'screen' },
  });
}

export function produceScreenAudio(sendTransport, track) {
  return sendTransport.produce({ track, appData: { source: 'screenAudio' } });
}
