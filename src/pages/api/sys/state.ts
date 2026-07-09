import type { APIRoute } from 'astro';
import db from '../../../lib/db';

export const GET: APIRoute = async ({ request, locals }) => {
  const user = locals.user;
  if (!user) return new Response('Unauthorized', { status: 401 });

  const url = new URL(request.url);
  const q = url.searchParams.get('q');
  
  if (!q || q.length < 2) {
    return new Response(JSON.stringify([]), { status: 200 });
  }

  try {
    const query = `%${q}%`;
    let results: any[] = [];

    // Search Workspaces
    if (user.is_sysadmin === 1) {
      const wss = db.prepare(`SELECT w.name as title, 'workspace' as type, '/w/' || w.sys_tag as url FROM workspaces w WHERE w.name LIKE ? OR w.sys_tag LIKE ? LIMIT 3`).all(query, query);
      results = results.concat(wss);
    } else {
      const wss = db.prepare(`
        SELECT w.name as title, 'workspace' as type, '/w/' || w.sys_tag as url 
        FROM workspaces w 
        JOIN workspace_members wm ON w.id = wm.workspace_id 
        WHERE wm.user_id = ? AND (w.name LIKE ? OR w.sys_tag LIKE ?) LIMIT 3
      `).all(user.id, query, query);
      results = results.concat(wss);
    }

    // Search Users
    const users = db.prepare(`SELECT username as title, 'user' as type, '#' as url FROM users WHERE username LIKE ? LIMIT 3`).all(query);
    results = results.concat(users);

    // Search Pages & Issues
    if (user.is_sysadmin === 1) {
      const pages = db.prepare(`SELECT p.title, 'page' as type, '/w/' || w.sys_tag || '/p?page=' || p.id as url FROM pages p JOIN workspaces w ON p.workspace_id = w.id WHERE p.title LIKE ? LIMIT 5`).all(query);
      const issues = db.prepare(`SELECT i.title, 'issue' as type, '/w/' || w.sys_tag || '/board?issue=' || i.id as url FROM issues i JOIN workspaces w ON i.workspace_id = w.id WHERE i.title LIKE ? LIMIT 5`).all(query);
      results = [...results, ...pages, ...issues];
    } else {
      const userWorkspaces = db.prepare('SELECT workspace_id FROM workspace_members WHERE user_id = ?').all(user.id).map((row: any) => row.workspace_id);
      
      if (userWorkspaces.length > 0) {
        const placeholders = userWorkspaces.map(() => '?').join(',');
        
        const pages = db.prepare(`SELECT p.title, 'page' as type, '/w/' || w.sys_tag || '/p?page=' || p.id as url FROM pages p JOIN workspaces w ON p.workspace_id = w.id WHERE p.title LIKE ? AND p.workspace_id IN (${placeholders}) LIMIT 5`).all(query, ...userWorkspaces);
        
        const issues = db.prepare(`SELECT i.title, 'issue' as type, '/w/' || w.sys_tag || '/board?issue=' || i.id as url FROM issues i JOIN workspaces w ON i.workspace_id = w.id WHERE i.title LIKE ? AND i.workspace_id IN (${placeholders}) LIMIT 5`).all(query, ...userWorkspaces);
        
        results = [...results, ...pages, ...issues];
      }
    }

    return new Response(JSON.stringify(results), { status: 200 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};
