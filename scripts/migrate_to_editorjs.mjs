import Database from 'better-sqlite3';
import path from 'path';

import readline from 'readline';

if (process.env.NODE_ENV !== 'test') {
  console.warn("WARNING: You are about to run migration against the PRODUCTION database.");
  console.warn("To run against test DB, use: NODE_ENV=test node scripts/migrate_to_editorjs.mjs");
  if (!process.argv.includes('--force')) {
    console.error("Pass --force to confirm running against production.");
    process.exit(1);
  }
}

const dbPath = process.env.NODE_ENV === 'test' ? path.join(process.cwd(), 'forge_test.db') : path.join(process.cwd(), 'forge.db');
const db = new Database(dbPath, { verbose: console.log });

console.log("Starting Editor.js migration...");

const pages = db.prepare('SELECT id, content_json FROM pages').all();
let migratedCount = 0;

for (const page of pages) {
  let needsMigration = false;
  let parsedContent = null;
  
  if (!page.content_json) {
    needsMigration = true;
  } else {
    try {
      parsedContent = JSON.parse(page.content_json);
      // Valid Editor.js JSON has a blocks array
      if (!parsedContent || !Array.isArray(parsedContent.blocks)) {
        needsMigration = true;
      }
    } catch (e) {
      // It's raw text
      needsMigration = true;
    }
  }

  if (needsMigration) {
    const rawText = page.content_json || '';
    
    // Create a basic Editor.js payload with one paragraph
    const payload = {
      time: Date.now(),
      blocks: [],
      version: '2.31.6'
    };

    if (rawText.trim() !== '') {
      payload.blocks.push({
        type: 'paragraph',
        data: { text: rawText } // We save it as raw HTML/Text. DOMPurify will clean it next time it's saved.
      });
    }

    db.prepare('UPDATE pages SET content_json = ? WHERE id = ?').run(JSON.stringify(payload), page.id);
    migratedCount++;
    console.log(`Migrated page: ${page.id}`);
  }
}

console.log(`Migration complete. Migrated ${migratedCount} pages.`);
