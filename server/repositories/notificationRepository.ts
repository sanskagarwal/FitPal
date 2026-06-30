import { JsonSingletonRepository } from '../db/repository.js';
import { getDb } from '../db/database.js';

export interface NotificationRecord {
  userId: string;
  enabled?: boolean;
  breakfast?: string;
  lunch?: string;
  dinner?: string;
  timezone?: string;
  [key: string]: unknown;
}

const base = new JsonSingletonRepository<NotificationRecord>('notifications');

export const notificationRepository = {
  upsert: base.upsert.bind(base),
  get: base.get.bind(base),
  deleteByUser: base.deleteByUser.bind(base),

  listEnabled(): NotificationRecord[] {
    const rows = getDb()
      .prepare(`SELECT data FROM notifications WHERE json_extract(data, '$.enabled') = 1`)
      .all() as { data: string }[];
    return rows.map((r) => JSON.parse(r.data) as NotificationRecord);
  },
};
