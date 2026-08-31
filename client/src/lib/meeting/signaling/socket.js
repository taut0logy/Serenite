import { io } from 'socket.io-client';

// Phase A spec §4.1. `auth` carries either a fresh join token or a
// reconnect token + resume flag — the SFU's authMiddleware distinguishes
// them by shape (spec §3.5/§4.1).

export function createSignalingSocket({ wsUrl, token, reconnectToken, resume }) {
  const auth = reconnectToken ? { reconnectToken, resume } : { token };
  return io(`${wsUrl}/signaling`, {
    auth,
    autoConnect: false,
    reconnection: true,
    reconnectionDelay: 500,
    reconnectionDelayMax: 5000,
    timeout: 10000,
  });
}
