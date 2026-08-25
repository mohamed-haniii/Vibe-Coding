import { getDb } from '../db';

export async function logAudit(
  userId: number,
  action: string,
  entityType: string,
  entityId?: number,
  details?: object | string
) {
  try {
    const db = await getDb();
    const timestamp = new Date().toISOString();
    const detailsStr = typeof details === 'object' ? JSON.stringify(details) : (details || '');

    await db.run(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, timestamp)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, action, entityType, entityId || null, detailsStr, timestamp]
    );
  } catch (err) {
    console.error('Audit log failed:', err);
  }
}
