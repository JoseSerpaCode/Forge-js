import type { APIRoute } from 'astro';
import db from '../../../../../lib/db';
import { checkWorkspaceAccess } from '../../../../../lib/guard';
import crypto from 'crypto';

export const GET: APIRoute = async ({ params, locals }) => {
  const { sys_tag } = params;
  const user = locals.user;
  if (!user) return new Response('Unauthorized', { status: 401 });

  const workspace = db.prepare('SELECT id FROM workspaces WHERE sys_tag = ?').get(sys_tag) as any;
  if (!workspace) return new Response('Workspace not found', { status: 404 });

  const access = checkWorkspaceAccess(user.id, user.is_sysadmin, workspace.id, 'viewer');
  if (!access.granted) {
    if (access.reason === 'not_member') return new Response('Workspace not found', { status: 404 });
    return new Response(access.error || 'Forbidden', { status: 403 });
  }

  const databases = db.prepare(`
    SELECT id, name, description, icon, created_at 
    FROM dynamic_databases 
    WHERE workspace_id = ?
    ORDER BY created_at DESC
  `).all(workspace.id);

  return new Response(JSON.stringify(databases), { status: 200, headers: { 'Content-Type': 'application/json' } });
};

export const POST: APIRoute = async ({ params, request, locals }) => {
  const { sys_tag } = params;
  const user = locals.user;
  if (!user) return new Response('Unauthorized', { status: 401 });

  const workspace = db.prepare('SELECT id FROM workspaces WHERE sys_tag = ?').get(sys_tag) as any;
  if (!workspace) return new Response('Workspace not found', { status: 404 });

  const access = checkWorkspaceAccess(user.id, user.is_sysadmin, workspace.id, 'editor');
  if (!access.granted) {
    if (access.reason === 'not_member') return new Response('Workspace not found', { status: 404 });
    return new Response(access.error || 'Forbidden', { status: 403 });
  }

  try {
    const body = await request.json();
    let { name, description, icon, columns } = body;
    
    if (!name) return new Response('Name is required', { status: 400 });

    // Validate and generate safe IDs for columns
    const safeColumns = (columns || []).map((col: any) => {
      // The server ALWAYS generates the col_id. The client cannot force it.
      const colId = `col_${crypto.randomBytes(4).toString('hex')}`;
      return {
        id: colId,
        name: col.name.trim(),
        type: ['text', 'number', 'select'].includes(col.type) ? col.type : 'text',
        options: col.type === 'select' && Array.isArray(col.options) ? col.options : undefined
      };
    });

    const schemaJson = JSON.stringify({ columns: safeColumns });
    const dbId = crypto.randomUUID();

    db.prepare(`
      INSERT INTO dynamic_databases (id, workspace_id, name, sys_tag, description, icon, schema_json)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(dbId, workspace.id, name, sys_tag, description || null, icon || null, schemaJson);

    // Create a default Table view
    db.prepare(`
      INSERT INTO dynamic_views (id, database_id, name, type, visible_columns_json)
      VALUES (?, ?, ?, ?, ?)
    `).run(crypto.randomUUID(), dbId, 'Default Table', 'table', JSON.stringify(safeColumns.map((c: any) => c.id)));

    db.prepare('INSERT INTO audit_logs (id, workspace_id, user_id, action, entity_type, entity_id) VALUES (?, ?, ?, ?, ?, ?)').run(
      crypto.randomUUID(), workspace.id, user.id, 'DATABASE_CREATED', 'dynamic_database', dbId
    );

    return new Response(JSON.stringify({ id: dbId }), { status: 201, headers: { 'Content-Type': 'application/json' } });
  } catch (err: any) {
    return new Response(err.message, { status: 500 });
  }
};
