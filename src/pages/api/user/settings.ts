import type { APIRoute } from 'astro';
import db from '../../../lib/db';

export const POST: APIRoute = async ({ request, locals }) => {
  const user = locals.user;
  if (!user) return new Response('Unauthorized', { status: 401 });

  try {
    const data = await request.json();
    const newUsername = data.username;
    
    if (newUsername && typeof newUsername === 'string') {
      db.prepare('UPDATE users SET username = ? WHERE id = ?').run(newUsername, user.id);
      return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    
    return new Response('Invalid data', { status: 400 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};
