import db from './src/lib/db';
import { checkWorkspaceAccess } from './src/lib/guard';

try {
  const sys_tag = 'proyect-orion';
  console.log('sys_tag:', sys_tag);

  const workspace = db.prepare('SELECT id, name FROM workspaces WHERE sys_tag = ?').get(sys_tag) as any;
  console.log('workspace:', workspace);

  if (!workspace) {
    console.log('Workspace not found. Skipping access check.');
  } else {
    const databases = db.prepare(`
      SELECT id, name, description, icon, schema_json, created_at 
      FROM dynamic_databases 
      WHERE workspace_id = ?
      ORDER BY created_at DESC
    `).all(workspace.id) as any[];
    console.log('Databases:', databases);
  }
} catch (e) {
  console.error(e);
}
