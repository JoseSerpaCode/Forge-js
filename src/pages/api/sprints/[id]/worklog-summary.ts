import type { APIRoute } from 'astro';
import db from '../../../../lib/db';
import { checkWorkspaceAccess } from '../../../../lib/guard';

export const GET: APIRoute = async ({ params, locals }) => {
  const sprintId = params.id;
  const user = locals.user;
  if (!user) return new Response('Unauthorized', { status: 401 });

  const sprint = db.prepare('SELECT workspace_id, start_date, end_date FROM sprints WHERE id = ?').get(sprintId) as any;
  if (!sprint) return new Response('Not found', { status: 404 });

  const access = checkWorkspaceAccess(user.id, user.is_sysadmin, sprint.workspace_id, 'viewer');
  if (!access.granted) return new Response('Forbidden', { status: 403 });

  // Agrupar por usuario
  const byUser = db.prepare(`
    SELECT u.username, u.avatar_url, SUM(wl.hours_spent) as total_hours
    FROM work_logs wl
    JOIN issues i ON wl.issue_id = i.id
    JOIN users u ON wl.user_id = u.id
    WHERE i.sprint_id = ?
    GROUP BY wl.user_id
    ORDER BY total_hours DESC
  `).all(sprintId);

  // Total vs Estimado del sprint
  const totals = db.prepare(`
    SELECT SUM(logged_hours) as total_logged, SUM(estimated_hours) as total_estimated
    FROM issues
    WHERE sprint_id = ?
  `).get(sprintId) as any;

  return new Response(JSON.stringify({ 
    byUser, 
    total_logged: totals.total_logged || 0,
    total_estimated: totals.total_estimated || 0
  }), { status: 200 });
};
