const Database = require('better-sqlite3');
const db = new Database('forge.db');

db.exec(`
  CREATE TABLE IF NOT EXISTS dynamic_entries_new (
    id TEXT PRIMARY KEY,
    database_id TEXT NOT NULL,
    payload_json TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT,
    FOREIGN KEY (database_id) REFERENCES dynamic_databases(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
  );
  
  INSERT INTO dynamic_entries_new (id, database_id, payload_json, created_at, updated_at, created_by)
  SELECT id, database_id, payload_json, created_at, updated_at, created_by FROM dynamic_entries;
  
  DROP TABLE dynamic_entries;
  ALTER TABLE dynamic_entries_new RENAME TO dynamic_entries;
`);
console.log('Migration complete');
