import type { APIRoute } from 'astro';
import db from '../../../../../lib/db';
import { checkWorkspaceAccess } from '../../../../../lib/guard';

export const GET: APIRoute = async ({ params, locals }) => {
  const user = locals.user!;
  const { sys_tag } = params;

  try {
    // 1. Server-side workspace resolution
    const workspace = db.prepare('SELECT id FROM workspaces WHERE sys_tag = ?').get(sys_tag) as any;
    if (!workspace) return new Response('Workspace Not Found', { status: 404 });

    // 2. Authorization check
    const access = checkWorkspaceAccess(user.id, user.is_sysadmin, workspace.id, 'viewer');
    if (!access.granted) return new Response('Forbidden', { status: 403 });

    // 3. Status Distribution
    const statusDist = db.prepare(`
      SELECT status, COUNT(id) as count
      FROM issues
      WHERE workspace_id = ?
      GROUP BY status
    `).all(workspace.id);

    // 4. Assignee Distribution (Unificado con LEFT JOIN)
    const assigneeDist = db.prepare(`
      SELECT COALESCE(u.username, 'Unassigned') as assignee, COUNT(i.id) as count
      FROM issues i
      LEFT JOIN users u ON i.assignee_id = u.id
      WHERE i.workspace_id = ?
      GROUP BY i.assignee_id
    `).all(workspace.id);

    return new Response(JSON.stringify({
      status: statusDist,
      assignee: assigneeDist
    }), { 
      status: 200, 
      headers: { 'Content-Type': 'application/json' } 
    });
  } catch (err: any) {
    console.error('Distribution API Error:', err);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), { 
      status: 500, 
      headers: { 'Content-Type': 'application/json' } 
    });
  }
};
