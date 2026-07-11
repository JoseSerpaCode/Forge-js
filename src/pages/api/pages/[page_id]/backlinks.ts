import type { APIRoute } from 'astro';
import db from '../../../../lib/db';
import { checkWorkspaceAccess } from '../../../../lib/guard';

// GET /api/pages/[page_id]/backlinks → list issues that reference this page
export const GET: APIRoute = async ({ params, locals }) => {
  const user = locals.user!;

  const { page_id } = params;
  if (!page_id) return new Response('Bad Request', { status: 400 });

  const page = db.prepare('SELECT workspace_id FROM pages WHERE id = ?').get(page_id) as any;
  if (!page) return new Response('Not Found', { status: 404 });

  const access = checkWorkspaceAccess(user.id, user.is_sysadmin, page.workspace_id, 'viewer');
  if (!access.granted) return new Response('Forbidden', { status: 403 });

  const backlinks = db.prepare(`
    SELECT i.id, i.title, i.status, i.type, i.priority, ipl.linked_at,
           u.username as linked_by_username
    FROM issue_page_links ipl
    JOIN issues i ON ipl.issue_id = i.id
    LEFT JOIN users u ON ipl.linked_by = u.id
    WHERE ipl.page_id = ?
    ORDER BY ipl.linked_at DESC
  `).all(page_id);

  return new Response(JSON.stringify(backlinks), { status: 200, headers: { 'Content-Type': 'application/json' } });
};
