import { Device } from 'mediasoup-client';

// Phase A spec §6.1. Device.load() is where a real mediasoup-client
// 3.21.0 ↔ mediasoup 3.24.0 incompatibility would surface first — if the
// router's advertised codecs can't be matched against this browser's
// capabilities, this throws immediately.
export async function loadDevice(routerRtpCapabilities) {
  const device = new Device();
  await device.load({ routerRtpCapabilities });
  return device;
}
