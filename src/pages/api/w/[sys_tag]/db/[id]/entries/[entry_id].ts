import type { APIRoute } from 'astro';
import { orm } from '../../../../../../../lib/db/drizzle';
import { dynamicDatabases, dynamicEntries } from '../../../../../../../lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { checkWorkspaceAccess } from '../../../../../../../lib/guard';

import db from '../../../../../../../lib/db';

export const DELETE: APIRoute = async (context) => {
  const { sys_tag } = context.params;
  const user = context.locals.user!;

  const workspace = db.prepare('SELECT id FROM workspaces WHERE sys_tag = ?').get(sys_tag) as any;
  if (!workspace) return new Response('Workspace not found', { status: 404 });

  const access = checkWorkspaceAccess(user.id, user.is_sysadmin, workspace.id, 'editor');
  if (!access.granted) {
    if (access.reason === 'not_member') return new Response('Workspace not found', { status: 404 });
    return new Response(access.error || 'Forbidden', { status: 403 });
  }

  const dbId = context.params.id;
  const entryId = context.params.entry_id;

  const database = orm.select().from(dynamicDatabases).where(and(eq(dynamicDatabases.id, dbId as string), eq(dynamicDatabases.workspaceId, workspace.id))).get();
  if (!database) return new Response('Database not found', { status: 404 });

  const entry = orm.select().from(dynamicEntries).where(and(eq(dynamicEntries.id, entryId as string), eq(dynamicEntries.databaseId, database.id))).get();
  if (!entry) return new Response('Entry not found', { status: 404 });

  orm.delete(dynamicEntries).where(eq(dynamicEntries.id, entryId as string)).run();

  return new Response('OK', { status: 200 });
};
