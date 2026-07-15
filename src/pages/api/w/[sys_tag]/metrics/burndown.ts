import type { APIRoute } from 'astro';
import db from '../../../../../lib/db';
import { checkWorkspaceAccess } from '../../../../../lib/guard';

export const GET: APIRoute = async ({ request, params, locals }) => {
  const user = locals.user!;
  const { sys_tag } = params;
  const url = new URL(request.url);
  const sprintId = url.searchParams.get('sprint_id');

  try {
    // 1. Server-side workspace resolution
    const workspace = db.prepare('SELECT id FROM workspaces WHERE sys_tag = ?').get(sys_tag) as any;
    if (!workspace) return new Response('Workspace Not Found', { status: 404 });

    // 2. Authorization check
    const access = checkWorkspaceAccess(user.id, user.is_sysadmin, workspace.id, 'viewer');
    if (!access.granted) {
      if (access.reason === 'not_member') return new Response('Not Found', { status: 404 });
      return new Response('Forbidden', { status: 403 });
    }

    if (!sprintId) {
      return new Response(JSON.stringify({ error: 'Missing sprint_id parameter' }), { 
        status: 400, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }

    // 3. Verify sprint belongs to workspace
    const sprint = db.prepare('SELECT start_date, end_date FROM sprints WHERE id = ? AND workspace_id = ?').get(sprintId, workspace.id) as any;
    if (!sprint) {
       return new Response(JSON.stringify({ error: 'Sprint not found in this workspace' }), { 
        status: 404, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }

    // 4. Calculate burndown using COUNT instead of story_points
    // We mock the daily burndown history for MVP purposes or calculate from audit logs.
    // For V1 MVP as approved: we use a simplified approach since we don't have historical issue state tracking yet,
    // or we fetch the total count and how many are done.
    // A real burndown requires historical data. For now, we return the total issues and completed issues.
    
    const totalIssues = db.prepare("SELECT COUNT(id) as count FROM issues WHERE sprint_id = ? AND workspace_id = ?").get(sprintId, workspace.id) as any;
    const doneIssues = db.prepare("SELECT COUNT(id) as count FROM issues WHERE sprint_id = ? AND workspace_id = ? AND status = 'done'").get(sprintId, workspace.id) as any;

    const burndownData = {
      total_issues: totalIssues.count,
      completed_issues: doneIssues.count,
      sprint_start: sprint.start_date,
      sprint_end: sprint.end_date
    };

    return new Response(JSON.stringify(burndownData), { 
      status: 200, 
      headers: { 'Content-Type': 'application/json' } 
    });
  } catch (err: any) {
    console.error('Burndown API Error:', err);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), { 
      status: 500, 
      headers: { 'Content-Type': 'application/json' } 
    });
  }
};
