import Database from 'better-sqlite3';
import path from 'path';

function migrate(dbPath) {
  const db = new Database(dbPath);
  console.log(`Migrando ${path.basename(dbPath)}...`);
  
  // Asignar ROW_NUMBER() * 100000 particionado por workspace_id, sprint_id, status
  const issues = db.prepare(`
    SELECT id, workspace_id, sprint_id, status 
    FROM issues 
    ORDER BY created_at ASC
  `).all();
  
  // Agrupar manualmente para simular particionamiento
  const groups = {};
  for (const issue of issues) {
    const key = `${issue.workspace_id}-${issue.sprint_id || 'null'}-${issue.status}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(issue.id);
  }
  
  const updateStmt = db.prepare('UPDATE issues SET position = ? WHERE id = ?');
  db.transaction(() => {
    let updated = 0;
    for (const key in groups) {
      const issueIds = groups[key];
      let currentPos = 100000;
      for (const id of issueIds) {
        updateStmt.run(currentPos, id);
        currentPos += 100000;
        updated++;
      }
    }
    console.log(`Migradas ${updated} filas en ${path.basename(dbPath)}`);
  })();
}

migrate(path.join(process.cwd(), 'forge.db'));
migrate(path.join(process.cwd(), 'forge_test.db'));
