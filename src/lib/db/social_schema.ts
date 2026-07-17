import { sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const friendships = sqliteTable('friendships', {
  id: text('id').primaryKey(),
  userAId: text('user_a_id').notNull(),
  userBId: text('user_b_id').notNull(),
  status: text('status').notNull(), // 'pending', 'accepted', 'rejected', 'ended', 'blocked'
  actionUserId: text('action_user_id').notNull(),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

export const userBlocks = sqliteTable('user_blocks', {
  id: text('id').primaryKey(),
  blockerId: text('blocker_id').notNull(),
  blockedId: text('blocked_id').notNull(),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

export const workspaceJoinRequests = sqliteTable('workspace_join_requests', {
  id: text('id').primaryKey(),
  workspaceId: text('workspace_id').notNull(),
  userId: text('user_id').notNull(),
  status: text('status').notNull(), // 'pending', 'approved', 'rejected', 'cancelled'
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});
