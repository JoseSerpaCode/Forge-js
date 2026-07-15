import type { APIRoute } from 'astro';
import { orm } from '../../../../../lib/db/drizzle';
import { dynamicDatabases, dynamicViews } from '../../../../../lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { checkWorkspaceAccess } from '../../../../../lib/guard';
import crypto from 'node:crypto';

import db from '../../../../../lib/db';

export const GET: APIRoute = async (context) => {
  const { sys_tag } = context.params;
  const user = context.locals.user!;

  const workspace = db.prepare('SELECT id FROM workspaces WHERE sys_tag = ?').get(sys_tag) as any;
  if (!workspace) return new Response('Workspace not found', { status: 404 });

  const access = checkWorkspaceAccess(user.id, user.is_sysadmin, workspace.id, 'viewer');
  if (!access.granted) {
    if (access.reason === 'not_member') return new Response('Workspace not found', { status: 404 });
    return new Response(access.error || 'Forbidden', { status: 403 });
  }

  const databases = orm.select().from(dynamicDatabases)
    .where(eq(dynamicDatabases.workspaceId, workspace.id))
    .orderBy(desc(dynamicDatabases.createdAt))
    .all();

  return new Response(JSON.stringify(databases), { status: 200, headers: { 'Content-Type': 'application/json' } });
};

export const POST: APIRoute = async (context) => {
  const { sys_tag } = context.params;
  const user = context.locals.user!;

  const workspace = db.prepare('SELECT id FROM workspaces WHERE sys_tag = ?').get(sys_tag) as any;
  if (!workspace) return new Response('Workspace not found', { status: 404 });

  const access = checkWorkspaceAccess(user.id, user.is_sysadmin, workspace.id, 'editor');
  if (!access.granted) {
    if (access.reason === 'not_member') return new Response('Workspace not found', { status: 404 });
    return new Response(access.error || 'Forbidden', { status: 403 });
  }

  try {
    const body = await context.request.json();
    let { name, description, icon, columns } = body;
    
    if (!name) return new Response('Name is required', { status: 400 });

    // Validate and generate safe IDs for columns
    const safeColumns = (columns || []).map((col: any) => {
      // The server ALWAYS generates the col_id. The client cannot force it.
      const colId = `col_${crypto.randomUUID().split('-')[0]}`;
      return {
        id: colId,
        name: col.name.trim(),
        type: ['text', 'number', 'select'].includes(col.type) ? col.type : 'text',
        options: col.type === 'select' && Array.isArray(col.options) ? col.options : undefined
      };
    });

    const schemaJson = JSON.stringify({ columns: safeColumns });
    const dbId = crypto.randomUUID();

    orm.insert(dynamicDatabases).values({
      id: dbId,
      workspaceId: workspace.id,
      name,
      sysTag: sys_tag as string,
      description: description || null,
      icon: icon || null,
      schemaJson
    }).run();

    orm.insert(dynamicViews).values({
      id: crypto.randomUUID(),
      databaseId: dbId,
      name: 'Default Table',
      type: 'table',
      visibleColumnsJson: JSON.stringify(safeColumns.map((c: any) => c.id))
    }).run();

    return new Response(JSON.stringify({ id: dbId }), { status: 201, headers: { 'Content-Type': 'application/json' } });
  } catch (err: any) {
    return new Response(err.message, { status: 500 });
  }
};
