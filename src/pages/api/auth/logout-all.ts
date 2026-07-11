import type { APIRoute } from 'astro';
import db from '../../../lib/db';

export const POST: APIRoute = async ({ locals, cookies }) => {
  const user = locals.user!;

  // [B-1 FIX] Revoke ALL active sessions for this user
  db.prepare('DELETE FROM sessions WHERE user_id = ?').run(user.id);
  cookies.delete('forge_session', { path: '/' });

  return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
};
