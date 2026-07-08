import type { APIRoute } from 'astro';
import db from '../../../lib/db';

export const GET: APIRoute = async ({ request, locals }) => {
  const user = locals.user;
  if (!user) return new Response('Unauthorized', { status: 401 });

  const url = new URL(request.url);
  const q = url.searchParams.get('q');
  
  if (!q || q.length < 3) {
    return new Response(JSON.stringify([]), { status: 200 });
  }

  try {
    const query = `%${q}%`;
    let results: any[] = [];

    if (user.is_sysadmin === 1) {
      // Sysadmins can search globally
      const pages = db.prepare("SELECT id, title, 'page' as type FROM pages WHERE title LIKE ? LIMIT 5").all(query);
      const issues = db.prepare("SELECT id, title, 'issue' as type FROM issues WHERE title LIKE ? LIMIT 5").all(query);
      results = [...pages, ...issues];
    } else {
      // Normal users can only search within their workspaces
      const userWorkspaces = db.prepare('SELECT workspace_id FROM workspace_members WHERE user_id = ?').all(user.id).map((row: any) => row.workspace_id);
      
      if (userWorkspaces.length > 0) {
        const placeholders = userWorkspaces.map(() => '?').join(',');
        
        const pages = db.prepare(`SELECT id, title, 'page' as type FROM pages WHERE title LIKE ? AND workspace_id IN (${placeholders}) LIMIT 5`).all(query, ...userWorkspaces);
        const issues = db.prepare(`SELECT id, title, 'issue' as type FROM issues WHERE title LIKE ? AND workspace_id IN (${placeholders}) LIMIT 5`).all(query, ...userWorkspaces);
        
        results = [...pages, ...issues];
      }
    }

    return new Response(JSON.stringify(results), { status: 200 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};
