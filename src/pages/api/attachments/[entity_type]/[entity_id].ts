import type { APIRoute } from 'astro';
import db from '../../../../lib/db';
import { checkWorkspaceAccess } from '../../../../lib/guard';

export const GET: APIRoute = async ({ params, locals }) => {
  const user = locals.user!;

  const { entity_type, entity_id } = params;
  if (!entity_type || !entity_id) return new Response('Bad Request', { status: 400 });

  // [C-3 FIX] Validate entity_type whitelist
  if (entity_type !== 'issue' && entity_type !== 'page') {
    return new Response('Invalid entity type', { status: 400 });
  }

  try {
    // [C-3 FIX] Resolve the entity's workspace and verify membership
    const entityTable = entity_type === 'issue' ? 'issues' : 'pages';
    const entity = db.prepare(`SELECT workspace_id FROM ${entityTable} WHERE id = ?`).get(entity_id) as any;

    if (!entity) {
      return new Response(JSON.stringify([]), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    const access = checkWorkspaceAccess(user.id, user.is_sysadmin, entity.workspace_id, 'viewer');
    if (!access.granted) {
      return new Response('Forbidden', { status: 403 });
    }

    const attachments = db.prepare(
      'SELECT id, file_name, file_path FROM attachments WHERE entity_type = ? AND entity_id = ? ORDER BY uploaded_at DESC'
    ).all(entity_type, entity_id);

    return new Response(JSON.stringify(attachments), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('Error fetching attachments:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
};
