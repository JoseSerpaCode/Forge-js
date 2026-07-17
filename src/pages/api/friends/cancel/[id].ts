import type { APIRoute } from 'astro';
import db from '../../../../../lib/db';
import { checkAuth } from '../../../../../lib/auth';

export const POST: APIRoute = async ({ request, params, locals }) => {
  try {
    const user = await checkAuth(request, locals);
    if (!user) return new Response('Unauthorized', { status: 401 });

    const friendshipId = params.id;
    if (!friendshipId) return new Response('Bad Request', { status: 400 });

    const result = db.prepare(`
      DELETE FROM friendships 
      WHERE id = ? 
      AND action_user_id = ? 
      AND status = 'pending'
    `).run(friendshipId, user.id);

    if (result.changes === 0) {
        return new Response('Not Found or Unauthorized', { status: 404 });
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 });

  } catch (e: any) {
    console.error('Cancel Friend Request Error:', e);
    return new Response(e.message, { status: 500 });
  }
};
