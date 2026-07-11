import type { APIRoute } from 'astro';
import db from '../../../lib/db';

export const GET: APIRoute = async ({ locals }) => {
  const user = locals.user!;

  try {
    const notifs = db.prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50').all(user.id);
    const unreadCount = db.prepare('SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0').get(user.id) as any;
    
    return new Response(JSON.stringify({
      notifications: notifs,
      unread: unreadCount.count
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (err: any) {
    return new Response(err.message, { status: 500 });
  }
};

export const POST: APIRoute = async ({ request, locals }) => {
  const user = locals.user!;

  try {
    const { action, id } = await request.json();
    
    if (action === 'mark_all_read') {
      db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run(user.id);
    } else if (action === 'mark_read' && id) {
      db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ? AND id = ?').run(user.id, id);
    } else if (action === 'delete' && id) {
      db.prepare('DELETE FROM notifications WHERE user_id = ? AND id = ?').run(user.id, id);
    } else {
      // [M-6 FIX] Return 400 for unknown or incomplete actions instead of silently returning 200
      return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400 });
    }
    
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err: any) {
    console.error('notifications POST error:', err);
    return new Response('Internal Server Error', { status: 500 });
  }
};
