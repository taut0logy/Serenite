// Ack-to-promise wrapper with a timeout (Phase A spec §4.2). Every C2S
// event listed as "ack" in the protocol table goes through this.

export class SignalingError extends Error {
  constructor(code, message) {
    super(message ?? code);
    this.name = 'SignalingError';
    this.code = code;
  }
}

export class SignalingTimeoutError extends Error {
  constructor(event) {
    super(`Timed out waiting for a response to "${event}"`);
    this.name = 'SignalingTimeoutError';
    this.event = event;
  }
}

const DEFAULT_TIMEOUT_MS = 8000;

export function call(socket, event, payload, { timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new SignalingTimeoutError(event)), timeoutMs);
    socket.emit(event, payload ?? {}, (response) => {
      clearTimeout(timer);
      if (response?.error) {
        reject(new SignalingError(response.error.code, response.error.message));
      } else {
        resolve(response);
      }
    });
  });
}
