import type { APIRoute } from 'astro';
import { orm } from '../../../../../../../lib/db/drizzle';
import { dynamicEntries, dynamicDatabases } from '../../../../../../../lib/db/schema';
import { eq, and } from 'drizzle-orm';
import crypto from 'node:crypto';
import { checkWorkspaceAccess } from '../../../../../../../lib/guard';

import db from '../../../../../../../lib/db';

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

  const dbId = context.params.id;
  const payload = await context.request.json();

  try {
    const dbData = orm.select().from(dynamicDatabases).where(and(eq(dynamicDatabases.id, dbId as string), eq(dynamicDatabases.workspaceId, workspace.id))).get();
    if (!dbData) return new Response('Database Not Found', { status: 404 });

    const newEntry = {
      id: `ent-${crypto.randomUUID()}`,
      databaseId: dbId as string,
      payloadJson: JSON.stringify(payload),
      createdBy: user.id
    };

    orm.insert(dynamicEntries).values(newEntry).run();

    return new Response(JSON.stringify(newEntry), { status: 201 });
  } catch (err: any) {
    return new Response(err.message, { status: 500 });
  }
};
