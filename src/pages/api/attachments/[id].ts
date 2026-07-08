import type { APIRoute } from 'astro';
import db from '../../../lib/db';
import fs from 'fs';
import path from 'path';

export const DELETE: APIRoute = async ({ params, locals }) => {
  const user = locals.user;
  if (!user) return new Response('Unauthorized', { status: 401 });

  const { id } = params;
  if (!id) return new Response('Bad Request', { status: 400 });

  try {
    const attachment = db.prepare('SELECT file_path FROM attachments WHERE id = ?').get(id) as any;
    if (attachment) {
      try {
        fs.unlinkSync(attachment.file_path);
      } catch (err) {
        console.error('Failed to delete file from disk', err);
      }
      db.prepare('DELETE FROM attachments WHERE id = ?').run(id);
    }
    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('Error deleting attachment:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
};
