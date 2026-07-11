import type { APIRoute } from 'astro';
import db from '../../../lib/db';

export const POST: APIRoute = async ({ request, locals }) => {
  const user = locals.user!;

  try {
    const { bio, pronouns, public_email } = await request.json();
    
    // Strict validation
    if (bio && typeof bio !== 'string') return new Response('Invalid bio', { status: 400 });
    if (bio && bio.length > 500) return new Response('Bio too long (max 500 characters)', { status: 400 });
    
    if (pronouns && typeof pronouns !== 'string') return new Response('Invalid pronouns', { status: 400 });
    if (pronouns && pronouns.length > 30) return new Response('Pronouns too long', { status: 400 });
    
    if (public_email && typeof public_email !== 'string') return new Response('Invalid email', { status: 400 });
    if (public_email && public_email.length > 100) return new Response('Email too long', { status: 400 });
    if (public_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(public_email)) {
      return new Response('Invalid email format', { status: 400 });
    }

    db.prepare(`
      UPDATE users 
      SET bio = ?, pronouns = ?, public_email = ? 
      WHERE id = ?
    `).run(
      bio ? bio.trim() : null, 
      pronouns ? pronouns.trim() : null, 
      public_email ? public_email.trim() : null, 
      user.id
    );
    
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err: any) {
    return new Response(err.message, { status: 500 });
  }
};
