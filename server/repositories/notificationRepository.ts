import { JsonSingletonRepository } from '../db/repository.js';

export interface NotificationRecord {
  userId: string;
  [key: string]: unknown;
}

export const notificationRepository = new JsonSingletonRepository<NotificationRecord>(
  'notifications'
);
