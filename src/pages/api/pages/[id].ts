import type { APIRoute } from 'astro';
import db from '../../../lib/db';
import { checkWorkspaceAccess } from '../../../lib/guard';

// Helper to resolve workspace and check permissions
function authorize(user: any, requiredRole: 'owner' | 'editor' | 'commenter' | 'viewer', pageId: string) {
  if (!user || !user.last_workspace_id) return { error: new Response('Unauthorized', { status: 401 }) };

  const ws = db.prepare('SELECT id FROM workspaces WHERE sys_tag = ?').get(user.last_workspace_id) as any;
  if (!ws) return { error: new Response('Workspace not found', { status: 404 }) };
  const workspaceId = ws.id;

  // 1. & 2. Explicitly verify the page exists AND belongs to this workspace FIRST
  const page = db.prepare('SELECT id, workspace_id FROM pages WHERE id = ?').get(pageId) as any;
  if (!page || page.workspace_id !== workspaceId) {
    return { error: new Response('Page not found or belongs to another workspace', { status: 404 }) }; // 404 prevents leaking existence
  }

  // 3. Solo si la página pertenece al workspace correcto, invocar al Guard para validar el rol
  const access = checkWorkspaceAccess(user.id, user.is_sysadmin, workspaceId, requiredRole);
  if (!access.granted) {
    if (access.reason === 'not_member') {
      return { error: new Response('Page not found or belongs to another workspace', { status: 404 }) };
    }
    return { error: new Response(access.error, { status: 403 }) };
  }

  return { workspaceId, page };
}

export const GET: APIRoute = async ({ params, locals }) => {
  const { id } = params;
  if (!id) return new Response('Bad Request', { status: 400 });
  
  const auth = authorize(locals.user, 'viewer', id);
  if (auth.error) return auth.error;

  const page = db.prepare('SELECT * FROM pages WHERE id = ? AND workspace_id = ?').get(id, auth.workspaceId);
  return new Response(JSON.stringify(page), { status: 200, headers: { 'Content-Type': 'application/json' } });
};

export const PUT: APIRoute = async ({ params, request, locals }) => {
  const { id } = params;
  if (!id) return new Response('Bad Request', { status: 400 });

  const auth = authorize(locals.user, 'editor', id);
  if (auth.error) return auth.error;

  try {
    const data = await request.json();
    
    // Explicit IDOR mitigation: AND workspace_id = ?
    if (data.title !== undefined || data.content_json !== undefined) {
      db.prepare(`
        UPDATE pages 
        SET title = COALESCE(?, title), 
            content_json = COALESCE(?, content_json), 
            updated_at = CURRENT_TIMESTAMP 
        WHERE id = ? AND workspace_id = ?
      `).run(
        data.title !== undefined ? data.title : null, 
        data.content_json !== undefined ? data.content_json : null, 
        id, 
        auth.workspaceId
      );
    }
    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};

export const DELETE: APIRoute = async ({ params, locals }) => {
  const { id } = params;
  if (!id) return new Response('Bad Request', { status: 400 });

  // Technical Debt Note: Using 'owner' role for DELETE since there is no soft-delete. 
  // Should be re-evaluated to 'editor' when soft-delete (deleted_at) is implemented.
  const auth = authorize(locals.user, 'owner', id);
  if (auth.error) return auth.error;

  // Explicit IDOR mitigation: AND workspace_id = ?
  db.prepare('DELETE FROM pages WHERE id = ? AND workspace_id = ?').run(id, auth.workspaceId);
  
  return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
};
