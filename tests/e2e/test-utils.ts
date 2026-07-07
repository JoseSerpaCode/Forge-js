import Database from 'better-sqlite3';
import path from 'path';

export function getTestDb() {
  if (process.env.NODE_ENV !== 'test') {
    throw new Error('SECURITY HALT: E2E Test execution attempted outside of test environment.');
  }
  const dbPath = path.join(process.cwd(), 'forge_test.db');
  if (!dbPath.includes('_test')) {
    throw new Error('SECURITY HALT: E2E Test DB path does not contain "_test". Preventing contamination of production DB.');
  }
  return new Database(dbPath);
}
