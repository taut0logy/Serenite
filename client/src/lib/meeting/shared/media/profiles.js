// Codec and simulcast configuration shared between the SFU (Router creation)
// and the client (capture constraints). Phase A spec §5.8.

export const ROUTER_MEDIA_CODECS = Object.freeze([
  {
    kind: 'audio',
    mimeType: 'audio/opus',
    clockRate: 48000,
    channels: 2,
  },
  {
    kind: 'video',
    mimeType: 'video/VP8',
    clockRate: 90000,
  },
  {
    kind: 'video',
    mimeType: 'video/VP9',
    clockRate: 90000,
    parameters: { 'profile-id': 2 },
  },
  {
    kind: 'video',
    mimeType: 'video/h264',
    clockRate: 90000,
    parameters: {
      'packetization-mode': 1,
      'profile-level-id': '4d0032',
      'level-asymmetry-allowed': 1,
    },
  },
  {
    kind: 'video',
    mimeType: 'video/h264',
    clockRate: 90000,
    parameters: {
      'packetization-mode': 1,
      'profile-level-id': '42e01f',
      'level-asymmetry-allowed': 1,
    },
  },
]);

// Camera simulcast — three spatial layers. See Phase A spec §5.8.
export const CAM_ENCODINGS = Object.freeze([
  { rid: 'r0', scaleResolutionDownBy: 4, maxBitrate: 150_000, scalabilityMode: 'L1T3' },
  { rid: 'r1', scaleResolutionDownBy: 2, maxBitrate: 500_000, scalabilityMode: 'L1T3' },
  { rid: 'r2', scaleResolutionDownBy: 1, maxBitrate: 1_500_000, scalabilityMode: 'L1T3' },
]);

// Screen share — single encoding, dtx for the mostly-static content case.
export const SCREEN_ENCODINGS = Object.freeze([
  { dtx: true, maxBitrate: 1_500_000, scalabilityMode: 'L1T3' },
]);

// Rendered-tile-width → spatial layer thresholds. Width must be device
// pixels (CSS px × devicePixelRatio) — see Phase A spec §5.2.
export const LAYER_WIDTH_THRESHOLDS = Object.freeze([
  { maxWidth: 240, spatialLayer: 0 },
  { maxWidth: 480, spatialLayer: 1 },
]);
export const MAX_SPATIAL_LAYER = 2;

export function spatialLayerForWidth(widthDevicePx) {
  for (const { maxWidth, spatialLayer } of LAYER_WIDTH_THRESHOLDS) {
    if (widthDevicePx < maxWidth) return spatialLayer;
  }
  return MAX_SPATIAL_LAYER;
}

export const CAMERA_CAPTURE_CONSTRAINTS = Object.freeze({
  width: { ideal: 1280 },
  height: { ideal: 720 },
});

export const SCREEN_CAPTURE_CONSTRAINTS = Object.freeze({
  video: { frameRate: { ideal: 15 } },
  audio: true,
});
