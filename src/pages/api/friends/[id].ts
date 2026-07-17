import type { APIRoute } from 'astro';
import db from '../../../../lib/db';
import { checkAuth } from '../../../../lib/auth';

export const DELETE: APIRoute = async ({ request, params, locals }) => {
  try {
    const user = await checkAuth(request, locals);
    if (!user) return new Response('Unauthorized', { status: 401 });

    const friendshipId = params.id;
    if (!friendshipId) return new Response('Bad Request', { status: 400 });

    const result = db.prepare(`
      UPDATE friendships 
      SET status = 'ended', updated_at = CURRENT_TIMESTAMP
      WHERE id = ? 
      AND (user_a_id = ? OR user_b_id = ?) 
      AND status = 'accepted'
    `).run(friendshipId, user.id, user.id);

    if (result.changes === 0) {
        return new Response('Not Found or Unauthorized', { status: 404 });
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 });

  } catch (e: any) {
    console.error('Unfriend Error:', e);
    return new Response(e.message, { status: 500 });
  }
};
