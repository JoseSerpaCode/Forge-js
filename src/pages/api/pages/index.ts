import type { APIRoute } from 'astro';
import db from '../../../lib/db';
import { checkWorkspaceAccess } from '../../../lib/guard';

export const POST: APIRoute = async ({ request, locals }) => {
  const user = locals.user;
  if (!user || !user.last_workspace_id) return new Response('Unauthorized', { status: 401 });

  try {
    const data = await request.json();
    
    // 1. Resolve workspace_id from user's current sys_tag context
    const ws = db.prepare('SELECT id FROM workspaces WHERE sys_tag = ?').get(user.last_workspace_id) as any;
    if (!ws) return new Response('Workspace not found', { status: 404 });
    const workspaceId = ws.id;

    // 2. Validate Permissions (Editor required for POST)
    const access = checkWorkspaceAccess(user.id, user.is_sysadmin, workspaceId, 'editor');
    if (!access.granted) return new Response(access.error, { status: 403 });

    // 3. If parent_page_id is provided, validate it belongs to the SAME workspace
    if (data.parent_page_id) {
      const parentPage = db.prepare('SELECT workspace_id FROM pages WHERE id = ?').get(data.parent_page_id) as any;
      if (!parentPage || parentPage.workspace_id !== workspaceId) {
        return new Response('Bad Request: Cross-workspace parenting or parent not found', { status: 400 });
      }
    }

    const newId = crypto.randomUUID();
    
    // 4. Insert page explicitly binding to workspaceId
    db.prepare(`
      INSERT INTO pages (id, workspace_id, parent_page_id, title, content_json, created_by)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      newId,
      workspaceId,
      data.parent_page_id || null,
      data.title || 'Untitled',
      '{}',
      user.id
    );

    return new Response(JSON.stringify({ id: newId, title: data.title || 'Untitled' }), { 
      status: 200, 
      headers: { 'Content-Type': 'application/json' } 
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};
