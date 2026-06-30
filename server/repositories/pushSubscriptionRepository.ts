import { JsonCollectionRepository } from '../db/repository.js';
import { getDb } from '../db/database.js';

export interface PushSubscriptionRecord {
  id: string;
  userId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

const base = new JsonCollectionRepository<PushSubscriptionRecord>('push_subscriptions');

export const pushSubscriptionRepository = {
  save(record: PushSubscriptionRecord): void {
    // Upsert by endpoint - re-subscribing the same device replaces the old row.
    getDb()
      .prepare(
        `INSERT INTO push_subscriptions (id, user_id, data) VALUES (?, ?, ?)
         ON CONFLICT(json_extract(data, '$.endpoint'))
         DO UPDATE SET data = excluded.data`
      )
      .run(record.id, record.userId, JSON.stringify(record));
  },

  listByUser(userId: string): PushSubscriptionRecord[] {
    return base.listByUser(userId);
  },

  delete(id: string, userId: string): boolean {
    return base.delete(id, userId);
  },

  deleteByEndpoint(endpoint: string, userId: string): void {
    getDb()
      .prepare(
        `DELETE FROM push_subscriptions
         WHERE user_id = ? AND json_extract(data, '$.endpoint') = ?`
      )
      .run(userId, endpoint);
  },

  deleteByUser(userId: string): number {
    return base.deleteByUser(userId);
  },

  // Called by the scheduler when the push service returns 410/404 for a dead endpoint.
  deleteByEndpointGlobal(endpoint: string): void {
    getDb()
      .prepare(`DELETE FROM push_subscriptions WHERE json_extract(data, '$.endpoint') = ?`)
      .run(endpoint);
  },

  listAll(): PushSubscriptionRecord[] {
    const rows = getDb()
      .prepare(`SELECT data FROM push_subscriptions`)
      .all() as { data: string }[];
    return rows.map((r) => JSON.parse(r.data) as PushSubscriptionRecord);
  },
};
