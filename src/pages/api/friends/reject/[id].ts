import type { APIRoute } from 'astro';
import db from '../../../../lib/db';

export const POST: APIRoute = async ({ request, params, locals }) => {
  try {
    const user = locals.user;
    if (!user) return new Response('Unauthorized', { status: 401 });

    const friendshipId = params.id;
    if (!friendshipId) return new Response('Bad Request', { status: 400 });

    const result = db.prepare(`
      UPDATE friendships 
      SET status = 'rejected', updated_at = CURRENT_TIMESTAMP
      WHERE id = ? 
      AND (user_a_id = ? OR user_b_id = ?) 
      AND action_user_id != ? 
      AND status = 'pending'
    `).run(friendshipId, user.id, user.id, user.id);
    
    console.log('Reject attempt:', { friendshipId, userId: user.id, changes: result.changes });

    if (result.changes === 0) {
        return new Response(JSON.stringify({ 
          error: 'Not Found or Unauthorized', 
          friendshipId, 
          userId: user.id, 
          dbState: db.prepare('SELECT * FROM friendships WHERE id = ?').get(friendshipId)
        }), { status: 404 });
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 });

  } catch (e: any) {
    console.error('Reject Friend Error:', e);
    return new Response(e.message, { status: 500 });
  }
};
