import { randomUUID } from 'crypto';
import {
  pushSubscriptionRepository,
  PushSubscriptionRecord,
} from '../repositories/pushSubscriptionRepository.js';

export interface SubscribePayload {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export const pushSubscriptionService = {
  save(userId: string, payload: SubscribePayload): PushSubscriptionRecord {
    const record: PushSubscriptionRecord = {
      id: randomUUID(),
      userId,
      endpoint: payload.endpoint,
      p256dh: payload.p256dh,
      auth: payload.auth,
    };
    pushSubscriptionRepository.save(record);
    return record;
  },

  deleteByEndpoint(userId: string, endpoint: string): void {
    pushSubscriptionRepository.deleteByEndpoint(endpoint, userId);
  },
};
