import { describe, it, expect } from 'vitest';
import { io as Client } from 'socket.io-client';

describe('WebSocket Security (Slack Killer)', () => {
  it('Debe rechazar la conexión si la cookie forge_session es inválida', (done) => {
    const clientSocket = Client(`http://localhost:4321`, {
      extraHeaders: {
        Cookie: 'forge_session=fake-uuid-1234'
      }
    });

    clientSocket.on('connect_error', (err) => {
      expect(err.message).toBe('Invalid session');
      clientSocket.close();
      done();
    });
  });
});
