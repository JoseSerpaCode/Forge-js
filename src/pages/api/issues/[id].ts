import type { APIRoute } from 'astro';
import db from '../../../lib/db';

export const PATCH: APIRoute = async ({ params, request, locals }) => {
  const { id } = params;
  const user = locals.user;
  if (!user || !id) return new Response('Unauthorized', { status: 401 });

  try {
    const data = await request.json();
    
    // Updates description if passed
    if (data.description !== undefined) {
      db.prepare('UPDATE issues SET description = ? WHERE id = ?').run(data.description, id);
    }
    
    // Updates points if passed
    if (data.story_points !== undefined) {
      db.prepare('UPDATE issues SET story_points = ? WHERE id = ?').run(data.story_points, id);
    }

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};
