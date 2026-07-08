import type { APIRoute } from 'astro';
import db from '../../../lib/db';
import bcrypt from 'bcryptjs';

export const POST: APIRoute = async ({ request, locals }) => {
  const user = locals.user;
  if (!user) return new Response('Unauthorized', { status: 401 });

  try {
    const data = await request.json();
    const { username, avatar_url, current_password, new_password } = data;
    
    // Update Password if provided
    if (current_password && new_password) {
      const dbUser = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(user.id) as any;
      if (!dbUser || !bcrypt.compareSync(current_password, dbUser.password_hash)) {
        return new Response('Invalid current password', { status: 403 });
      }
      if (new_password.length < 8) {
        return new Response('New password must be at least 8 characters', { status: 400 });
      }
      const newHash = bcrypt.hashSync(new_password, 10);
      db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(newHash, user.id);
    }
    
    if (username && typeof username === 'string') {
      db.prepare('UPDATE users SET username = ? WHERE id = ?').run(username, user.id);
    }
    
    if (avatar_url !== undefined) {
      db.prepare('UPDATE users SET avatar_url = ? WHERE id = ?').run(avatar_url, user.id);
    }
    
    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};
