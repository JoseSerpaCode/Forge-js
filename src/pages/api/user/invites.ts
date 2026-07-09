import type { APIRoute } from 'astro';
import db from '../../../lib/db';

export const POST: APIRoute = async ({ request, locals }) => {
  const user = locals.user;
  if (!user) return new Response('Unauthorized', { status: 401 });

  try {
    const { notifId, action } = await request.json();
    if (!notifId || !action) return new Response('Missing parameters', { status: 400 });

    const notif = db.prepare('SELECT * FROM notifications WHERE id = ? AND user_id = ?').get(notifId, user.id) as any;
    if (!notif || notif.type !== 'invite') return new Response('Invite not found', { status: 404 });

    if (action === 'accept') {
      let payload: any;
      try {
        payload = JSON.parse(notif.link_url);
      } catch (parseErr) {
        console.error('[M-7 FIX] Failed to parse invite payload:', parseErr);
        return new Response(JSON.stringify({ error: 'Invite data is corrupted' }), { status: 500 });
      }
      if (payload.ws_id && payload.role) {
        const ws = db.prepare('SELECT id FROM workspaces WHERE id = ?').get(payload.ws_id);
        if (ws) {
           const existing = db.prepare('SELECT * FROM workspace_members WHERE workspace_id = ? AND user_id = ?').get(payload.ws_id, user.id);
           if (!existing) {
             db.prepare('INSERT INTO workspace_members (workspace_id, user_id, ws_role) VALUES (?, ?, ?)').run(payload.ws_id, user.id, payload.role);
           }
        }
      }
    }

    // Delete notification regardless of accept or reject
    db.prepare('DELETE FROM notifications WHERE id = ?').run(notifId);

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err: any) {
    return new Response(err.message, { status: 500 });
  }
};
