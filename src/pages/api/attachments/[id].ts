import type { APIRoute } from 'astro';
import db from '../../../lib/db';
import fs from 'fs';
import path from 'path';
import { checkWorkspaceAccess } from '../../../lib/guard';

export const DELETE: APIRoute = async ({ params, locals }) => {
  const user = locals.user;
  if (!user) return new Response('Unauthorized', { status: 401 });

  const { id } = params;
  if (!id) return new Response('Bad Request', { status: 400 });

  try {
    // [C-2 FIX] Fetch full attachment info including entity references
    const attachment = db.prepare(
      'SELECT id, file_path, entity_type, entity_id, uploaded_by FROM attachments WHERE id = ?'
    ).get(id) as any;

    if (!attachment) {
      return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    // [C-2 FIX] Resolve the workspace and verify access
    const entityTable = attachment.entity_type === 'issue' ? 'issues' : 'pages';
    const entity = db.prepare(`SELECT workspace_id FROM ${entityTable} WHERE id = ?`).get(attachment.entity_id) as any;

    if (entity) {
      const access = checkWorkspaceAccess(user.id, user.is_sysadmin, entity.workspace_id, 'editor');
      if (!access.granted) {
        return new Response('Forbidden', { status: 403 });
      }
    } else {
      // Entity no longer exists; only the uploader or sysadmin can clean up
      if (user.is_sysadmin !== 1 && attachment.uploaded_by !== user.id) {
        return new Response('Forbidden', { status: 403 });
      }
    }

    // [C-5 FIX] Build a safe absolute path using basename only
    const safeFilename = path.basename(attachment.file_path.replace('/api/storage/', ''));
    const absolutePath = path.join(process.cwd(), '.data', 'storage', safeFilename);

    try {
      fs.unlinkSync(absolutePath);
    } catch (err) {
      console.error('Failed to delete file from disk:', err);
    }

    db.prepare('DELETE FROM attachments WHERE id = ?').run(id);

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('Error deleting attachment:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
};
