import type { APIRoute } from 'astro';
import db from '../../../lib/db';
import bcrypt from 'bcryptjs';

export const POST: APIRoute = async ({ request, locals }) => {
  const user = locals.user!;

  try {
    const data = await request.json();
    const { username, avatar_url, current_password, new_password, notif_mute_all, notif_mute_assign, notif_mute_mention, notif_mute_sprint, notif_mute_system } = data;
    
    
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
      if (username.length < 3) {
        return new Response('Username must be at least 3 characters', { status: 400 });
      }
      const existing = db.prepare('SELECT id FROM users WHERE username = ? AND id != ?').get(username, user.id);
      if (existing) {
        return new Response('Username is already taken', { status: 400 });
      }
      db.prepare('UPDATE users SET username = ? WHERE id = ?').run(username, user.id);
    }
    
    if (avatar_url !== undefined) {
      if (typeof avatar_url !== 'string') {
        return new Response('Invalid avatar format', { status: 400 });
      }
      
      // Size limit ~2.5MB base64 string
      if (avatar_url.length > 2.8 * 1024 * 1024) {
        return new Response('Avatar size exceeds 2MB limit', { status: 413 });
      }

      if (avatar_url !== '' && !avatar_url.startsWith('http://') && !avatar_url.startsWith('https://') && !avatar_url.startsWith('data:image/')) {
        return new Response('Invalid avatar source. Must be HTTP/S or data:image', { status: 400 });
      }

      if (avatar_url.startsWith('data:image/svg+xml')) {
        return new Response('SVG uploads are not permitted for security reasons', { status: 400 });
      }

      db.prepare('UPDATE users SET avatar_url = ? WHERE id = ?').run(avatar_url, user.id);
    }
    
    // Notification preferences update
    if (notif_mute_all !== undefined) {
      db.prepare(`
        UPDATE users SET 
          notif_mute_all = ?, 
          notif_mute_assign = ?, 
          notif_mute_mention = ?, 
          notif_mute_sprint = ?, 
          notif_mute_system = ?
        WHERE id = ?
      `).run(
        notif_mute_all ? 1 : 0, 
        notif_mute_assign ? 1 : 0, 
        notif_mute_mention ? 1 : 0, 
        notif_mute_sprint ? 1 : 0, 
        notif_mute_system ? 1 : 0, 
        user.id
      );
    }

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};
