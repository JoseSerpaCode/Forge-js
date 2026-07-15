import { drizzle } from 'drizzle-orm/better-sqlite3';
import sqliteDb from '../db';
import * as schema from './schema';

// Export the drizzle wrapped connection reusing the existing SQLite connection pool
export const orm = drizzle(sqliteDb, { schema });
