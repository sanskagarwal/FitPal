import cron from 'node-cron';
import webpush from 'web-push';
import { config } from '../env.js';
import { logger } from '../logger.js';
import { notificationRepository } from '../repositories/notificationRepository.js';
import { pushSubscriptionRepository } from '../repositories/pushSubscriptionRepository.js';

const MEAL_LABELS: Record<string, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
};

function currentHHmm(timezone: string): string {
  // formatToParts avoids locale-specific separators and the "24:00" vs "00:00"
  // edge case some ICU builds produce for midnight under hourCycle h23.
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date());
  const hour = parts.find((p) => p.type === 'hour')?.value ?? '00';
  const minute = parts.find((p) => p.type === 'minute')?.value ?? '00';
  return `${hour}:${minute}`;
}

async function sendReminders(): Promise<void> {
  const enabled = notificationRepository.listEnabled();
  if (enabled.length === 0) return;

  for (const settings of enabled) {
    const tz = settings.timezone || 'UTC';
    const now = currentHHmm(tz);

    const matchedMeals = (
      ['breakfast', 'lunch', 'dinner'] as const
    ).filter((meal) => settings[meal] === now);

    if (matchedMeals.length === 0) continue;

    const subscriptions = pushSubscriptionRepository.listByUser(settings.userId);
    if (subscriptions.length === 0) continue;

    for (const meal of matchedMeals) {
      const label = MEAL_LABELS[meal];
      const payload = JSON.stringify({
        title: `Time to log ${label}`,
        body: 'Tap to open FitPal and log your meal.',
        meal,
      });

      for (const sub of subscriptions) {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            payload
          );
        } catch (err: unknown) {
          const status = (err as { statusCode?: number }).statusCode;
          if (status === 410 || status === 404) {
            // Subscription expired or revoked - remove it so we stop sending.
            pushSubscriptionRepository.deleteByEndpointGlobal(sub.endpoint);
            logger.info('Removed stale push subscription', { endpoint: sub.endpoint });
          } else {
            logger.error('Failed to send push notification', {
              userId: settings.userId,
              endpoint: sub.endpoint,
              status,
            });
          }
        }
      }
    }
  }
}

export function startPushScheduler(): void {
  const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_MAILTO } = config;
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY || !VAPID_MAILTO) {
    logger.info('Push scheduler disabled - VAPID keys not configured');
    return;
  }

  webpush.setVapidDetails(VAPID_MAILTO, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

  // Run every minute. A server restart inside a matching minute can re-fire
  // that minute's reminder - acceptable for v1.
  cron.schedule('* * * * *', () => {
    sendReminders().catch((err: unknown) => {
      logger.error('Push scheduler error', { error: String(err) });
    });
  });

  logger.info('Push scheduler started');
}
