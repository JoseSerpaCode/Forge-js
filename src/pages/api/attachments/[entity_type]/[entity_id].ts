import type { APIRoute } from 'astro';
import db from '../../../../lib/db';

export const GET: APIRoute = async ({ params, locals }) => {
  const user = locals.user;
  if (!user) return new Response('Unauthorized', { status: 401 });

  const { entity_type, entity_id } = params;
  if (!entity_type || !entity_id) return new Response('Bad Request', { status: 400 });

  try {
    const attachments = db.prepare('SELECT id, file_name, file_path FROM attachments WHERE entity_type = ? AND entity_id = ? ORDER BY uploaded_at DESC').all(entity_type, entity_id);
    return new Response(JSON.stringify(attachments), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('Error fetching attachments:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
};
