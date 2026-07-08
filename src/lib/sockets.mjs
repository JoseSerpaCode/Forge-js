// src/lib/sockets.mjs
import cookie from 'cookie';
import db from './db.ts';
import crypto from 'crypto';

export function setupSockets(io) {
  io.use((socket, next) => {
    const cookies = cookie.parse(socket.request.headers.cookie || '');
    const sessionId = cookies.forge_session;
    if (!sessionId) return next(new Error('Unauthorized'));

    // Validar Sesión en DB
    const session = db.prepare('SELECT user_id FROM sessions WHERE id = ?').get(sessionId);
    if (!session) return next(new Error('Invalid session'));

    socket.userId = session.user_id;
    next();
  });

  io.on('connection', (socket) => {
    socket.on('join_channel', (channelId) => {
      // 1. Validar que el channel exista y obtener el workspace_id
      const channel = db.prepare('SELECT workspace_id FROM channels WHERE id = ?').get(channelId);
      if (!channel) return;

      // 2. Validar que el usuario sea miembro del workspace (Multi-Tenant Guard)
      const isMember = db.prepare('SELECT 1 FROM workspace_members WHERE workspace_id = ? AND user_id = ?').get(channel.workspace_id, socket.userId);
      const userRec = db.prepare('SELECT is_sysadmin FROM users WHERE id = ?').get(socket.userId);

      if (isMember || (userRec && userRec.is_sysadmin === 1)) {
        socket.join(channelId);
        console.log(`User ${socket.userId} joined channel ${channelId}`);
      }
    });

    socket.on('send_message', (data) => {
      const { channelId, content } = data;
      // Validar presencia en el room
      if (!socket.rooms.has(channelId)) return;

      const channel = db.prepare('SELECT workspace_id FROM channels WHERE id = ?').get(channelId);
      if (!channel) return;

      const roleRow = db.prepare('SELECT ws_role FROM workspace_members WHERE workspace_id = ? AND user_id = ?').get(channel.workspace_id, socket.userId);
      const userRec = db.prepare('SELECT is_sysadmin FROM users WHERE id = ?').get(socket.userId);
      const isSysadmin = userRec && userRec.is_sysadmin === 1;

      // Un viewer o alguien sin acceso no puede escribir (revocación de sesión persistente)
      if (!isSysadmin && (!roleRow || roleRow.ws_role === 'viewer')) {
        return;
      }

      const msgId = crypto.randomUUID();
      db.prepare('INSERT INTO messages (id, channel_id, user_id, content) VALUES (?, ?, ?, ?)').run(msgId, channelId, socket.userId, content);

      io.to(channelId).emit('new_message', {
        id: msgId,
        channel_id: channelId,
        user_id: socket.userId,
        content,
        created_at: new Date().toISOString()
      });

      if (content.includes('@Janus')) {
        process.emit('janus_mentioned', { channelId, content, userId: socket.userId });
      }
    });
  });

  process.on('system_notification', ({ channelId, content }) => {
    const msgId = crypto.randomUUID();
    // System message user_id is hardcoded as 'system'
    try {
      db.prepare('INSERT INTO messages (id, channel_id, user_id, content) VALUES (?, ?, ?, ?)').run(msgId, channelId, 'system', content);
      
      io.to(channelId).emit('new_message', {
        id: msgId,
        channel_id: channelId,
        user_id: 'system',
        content,
        created_at: new Date().toISOString()
      });
    } catch(e) { console.error('Failed to send system notification', e) }
  });

  // Escuchar expulsiones de workspaces para matar sockets zombies
  process.on('user_removed_from_workspace', ({ userId, workspaceId }) => {
    try {
      const channels = db.prepare('SELECT id FROM channels WHERE workspace_id = ?').all(workspaceId);
      for (const [socketId, socket] of io.sockets.sockets) {
        if (socket.userId === userId) {
          channels.forEach(c => socket.leave(c.id));
          // También podemos forzar desconexión si queremos ser más estrictos, pero con sacarlo de los rooms basta.
        }
      }
    } catch(e) {}
  });
}
