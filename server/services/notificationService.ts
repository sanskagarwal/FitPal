import {
  notificationRepository,
  type NotificationRecord,
} from '../repositories/notificationRepository.js';

export const notificationService = {
  save(settings: NotificationRecord): NotificationRecord {
    notificationRepository.upsert(settings);
    return settings;
  },

  get(userId: string): NotificationRecord | null {
    return notificationRepository.get(userId);
  },
};
