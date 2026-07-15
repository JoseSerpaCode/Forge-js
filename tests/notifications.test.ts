import { test, expect, describe, beforeAll, afterAll } from 'vitest';
import db from '../src/lib/db';
import crypto from 'crypto';
import { NotificationService } from '../src/lib/NotificationService';

describe('Notification Service API Tests', () => {
  let userId: string;


  beforeAll(async () => {
    userId = crypto.randomUUID();

    
    // Configurar usuario de prueba con notificaciones habilitadas
    db.prepare(`
      INSERT INTO users (id, username, password_hash, is_sysadmin)
      VALUES (?, ?, ?, ?)
    `).run(userId, 'notif_test', 'hash', 0);
  });

  afterAll(async () => {
    db.prepare('DELETE FROM notifications WHERE user_id = ?').run(userId);
    db.prepare('DELETE FROM users WHERE id = ?').run(userId);
  });

  test('should create a notification correctly', async () => {
    NotificationService.notify(userId, 'system', 'Test Title', 'Test Message');
    
    const count = NotificationService.getUnreadCount(userId);
    expect(count).toBeGreaterThan(0);
    
    const notifs = NotificationService.getNotifications(userId) as any[];
    expect(notifs.length).toBeGreaterThan(0);
    expect(notifs[0].title).toBe('Test Title');
    expect(notifs[0].message).toBe('Test Message');
    expect(notifs[0].type).toBe('system');
    expect(notifs[0].is_read).toBe(0);
  });

  test('should not create notification if globally muted', async () => {
    db.prepare('UPDATE users SET notif_mute_all = 1 WHERE id = ?').run(userId);
    
    const countBefore = NotificationService.getNotifications(userId).length;
    NotificationService.notify(userId, 'info', 'Muted Title', 'Muted Message');
    const countAfter = NotificationService.getNotifications(userId).length;
    
    expect(countAfter).toBe(countBefore);
    
    db.prepare('UPDATE users SET notif_mute_all = 0 WHERE id = ?').run(userId);
  });

  test('should not create notification if category is muted', async () => {
    db.prepare('UPDATE users SET notif_mute_assign = 1 WHERE id = ?').run(userId);
    
    const countBefore = NotificationService.getNotifications(userId).length;
    NotificationService.notify(userId, 'assign', 'Assign Title', 'Assign Message');
    const countAfter = NotificationService.getNotifications(userId).length;
    
    expect(countAfter).toBe(countBefore); // shouldn't increase
    
    db.prepare('UPDATE users SET notif_mute_assign = 0 WHERE id = ?').run(userId);
  });

  test('should mark notifications as read', async () => {
    NotificationService.notify(userId, 'info', 'Unread', 'Message');
    expect(NotificationService.getUnreadCount(userId)).toBeGreaterThan(0);
    
    NotificationService.markAsRead(userId);
    expect(NotificationService.getUnreadCount(userId)).toBe(0);
  });
});
