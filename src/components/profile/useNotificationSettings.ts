import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  getNotificationSettings,
  saveNotificationSettings,
  getVapidPublicKey,
  subscribeToPush,
  unsubscribeFromPush,
} from '../../utils/db';
import { NotificationSettings } from '../../types';

export type NotifTimes = {
  breakfast: string;
  lunch: string;
  dinner: string;
};

const DEFAULT_TIMES: NotifTimes = { breakfast: '08:00', lunch: '12:30', dinner: '19:00' };

// Converts a VAPID public key from base64url to Uint8Array, as required by
// pushManager.subscribe(). The raw base64 string from the server is not accepted directly.
// Uses new Uint8Array() instead of Uint8Array.from() to satisfy TypeScript 6's
// stricter ArrayBuffer generic constraints.
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const bytes = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    bytes[i] = rawData.charCodeAt(i);
  }
  return bytes;
}

// Returns the active SW registration, or null when none is available within
// 3 seconds. The race handles dev mode (no SW ever registers) and the
// production first-load window (SW activates async after page paint) without
// hanging the toggle indefinitely.
async function getActiveSwRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null;
  try {
    const existing = await navigator.serviceWorker.getRegistration();
    if (!existing) return null;
    if (existing.active) return existing;
    return await Promise.race([
      navigator.serviceWorker.ready,
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000)),
    ]);
  } catch {
    return null;
  }
}

async function getPushSubscription(): Promise<PushSubscription | null> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return null;
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    if (!reg) return null;
    return await reg.pushManager.getSubscription();
  } catch {
    return null;
  }
}

async function createPushSubscription(vapidPublicKey: string): Promise<PushSubscription | null> {
  const reg = await getActiveSwRegistration();
  if (!reg) return null;
  return reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
  });
}

export const useNotificationSettings = () => {
  const { user } = useAuth();
  const [enabled, setEnabled] = useState(false);
  const [times, setTimes] = useState<NotifTimes>(DEFAULT_TIMES);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [message, setMessage] = useState('');
  const [permissionState, setPermissionState] = useState<NotificationPermission | 'unavailable'>(() =>
    typeof Notification === 'undefined' ? 'unavailable' : Notification.permission
  );
  const togglingRef = useRef(false);
  const messageTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (messageTimerRef.current) clearTimeout(messageTimerRef.current);
    };
  }, []);

  const showMessage = useCallback((msg: string, duration = 2000) => {
    if (messageTimerRef.current) clearTimeout(messageTimerRef.current);
    setMessage(msg);
    if (duration > 0) {
      messageTimerRef.current = setTimeout(() => setMessage(''), duration);
    }
  }, []);

  // Load settings and reconcile enabled state against live browser state.
  // If the DB says enabled but permission was revoked or the browser lost the
  // push subscription, we correct to disabled both locally and on the server.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    (async () => {
      try {
        const settings = await getNotificationSettings(user.id);
        if (cancelled) return;

        if (!settings) {
          setTimes(DEFAULT_TIMES);
          return;
        }

        let actualEnabled = settings.enabled ?? false;

        if (actualEnabled) {
          const permission = typeof Notification === 'undefined' ? 'unavailable' : Notification.permission;
          if (!cancelled) setPermissionState(permission);

          if (permission !== 'granted') {
            actualEnabled = false;
          } else {
            const sub = await getPushSubscription();
            if (!sub) actualEnabled = false;
          }

          if (!cancelled && actualEnabled !== settings.enabled) {
            // Silently correct the server - don't block render on this
            saveNotificationSettings({
              userId: user.id,
              enabled: false,
              timezone: settings.timezone,
              ...(settings.breakfast ? { breakfast: settings.breakfast } : {}),
              ...(settings.lunch ? { lunch: settings.lunch } : {}),
              ...(settings.dinner ? { dinner: settings.dinner } : {}),
            }).catch(() => {});
          }
        }

        if (cancelled) return;
        setEnabled(actualEnabled);
        setTimes({
          breakfast: settings.breakfast ?? DEFAULT_TIMES.breakfast,
          lunch: settings.lunch ?? DEFAULT_TIMES.lunch,
          dinner: settings.dinner ?? DEFAULT_TIMES.dinner,
        });
      } catch {
        if (!cancelled) setTimes(DEFAULT_TIMES);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const save = useCallback(
    async (enabledVal: boolean, timesVal: NotifTimes): Promise<void> => {
      if (!user) return;
      const settings: NotificationSettings = {
        userId: user.id,
        enabled: enabledVal,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        ...(timesVal.breakfast ? { breakfast: timesVal.breakfast } : {}),
        ...(timesVal.lunch ? { lunch: timesVal.lunch } : {}),
        ...(timesVal.dinner ? { dinner: timesVal.dinner } : {}),
      };
      await saveNotificationSettings(settings);
    },
    [user]
  );

  const toggleEnabled = useCallback(async () => {
    if (!user || togglingRef.current) return;
    togglingRef.current = true;
    setToggling(true);
    setMessage('');

    try {
      const nextEnabled = !enabled;

      if (nextEnabled) {
        const livePermission: NotificationPermission | 'unavailable' =
          typeof Notification === 'undefined' ? 'unavailable' : Notification.permission;
        setPermissionState(livePermission);

        if (livePermission === 'unavailable') return;
        if (livePermission === 'denied') {
          showMessage('Notifications are blocked. Please enable them in your browser settings.');
          return;
        }

        if (livePermission !== 'granted') {
          const result = await Notification.requestPermission();
          setPermissionState(result);
          if (result !== 'granted') {
            showMessage('Notification permission was not granted.');
            return;
          }
        }

        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
          showMessage('Push disabled: browser does not support push.');
          return;
        }

        const vapidKey = await getVapidPublicKey();
        if (!vapidKey) {
          showMessage('Push disabled: VAPID key not configured on server.');
          return;
        }

        const existing = await getPushSubscription();
        const subscription = existing ?? (await createPushSubscription(vapidKey));
        if (!subscription) {
          showMessage('Push disabled: could not create push subscription (SW not active?).');
          return;
        }

        const json = subscription.toJSON();
        const p256dh = json.keys?.['p256dh'] ?? '';
        const auth = json.keys?.['auth'] ?? '';
        if (!p256dh || !auth) {
          showMessage('Push disabled: subscription missing encryption keys.');
          return;
        }

        await subscribeToPush(user.id, { endpoint: subscription.endpoint, p256dh, auth });
        // Persist only after all setup succeeded - no optimistic update
        await save(true, times);
        setEnabled(true);
      } else {
        const sub = await getPushSubscription().catch(() => null);

        // Commit disabled state before touching browser subscription
        await save(false, times);
        setEnabled(false);

        // Browser + server cleanup run independently after state is committed.
        // If sub is null (browser evicted it), we skip the server call - the
        // push service will return 410/404 on the next send and auto-clean it.
        await Promise.allSettled([
          sub ? sub.unsubscribe() : Promise.resolve(),
          sub ? unsubscribeFromPush(user.id, sub.endpoint) : Promise.resolve(),
        ]);
      }
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      showMessage(`Failed: ${detail}`);
    } finally {
      togglingRef.current = false;
      setToggling(false);
    }
  }, [user, enabled, times, save, showMessage]);

  const updateTime = useCallback((field: keyof NotifTimes, value: string) => {
    setTimes((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleSave = useCallback(async () => {
    if (!user) return;
    setSaving(true);
    setMessage('');
    try {
      await save(enabled, times);
      showMessage('Saved.');
    } catch {
      showMessage('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [user, enabled, times, save, showMessage]);

  return { enabled, toggleEnabled, toggling, times, updateTime, loading, saving, message, permissionState, handleSave };
};
