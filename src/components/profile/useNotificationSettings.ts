import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getNotificationSettings, saveNotificationSettings } from '../../utils/db';
import { NotificationSettings } from '../../types';

export type NotifTimes = {
  breakfast: string;
  lunch: string;
  dinner: string;
};

const DEFAULT_TIMES: NotifTimes = { breakfast: '08:00', lunch: '12:30', dinner: '19:00' };

export const useNotificationSettings = () => {
  const { user } = useAuth();
  const [enabled, setEnabled] = useState(false);
  const [times, setTimes] = useState<NotifTimes>(DEFAULT_TIMES);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [permissionState, setPermissionState] = useState<NotificationPermission | 'unavailable'>(() =>
    typeof Notification === 'undefined' ? 'unavailable' : Notification.permission
  );

  useEffect(() => {
    if (!user) return;
    getNotificationSettings(user.id)
      .then((settings) => {
        if (settings) {
          setEnabled(settings.enabled);
          setTimes({
            breakfast: settings.breakfast ?? '',
            lunch: settings.lunch ?? '',
            dinner: settings.dinner ?? '',
          });
        }
      })
      .finally(() => setLoading(false));
  }, [user]);

  const persist = useCallback(
    async (enabledVal: boolean, timesVal: NotifTimes) => {
      if (!user) return;
      setSaving(true);
      setMessage('');
      try {
        const settings: NotificationSettings = {
          userId: user.id,
          enabled: enabledVal,
          ...(timesVal.breakfast ? { breakfast: timesVal.breakfast } : {}),
          ...(timesVal.lunch ? { lunch: timesVal.lunch } : {}),
          ...(timesVal.dinner ? { dinner: timesVal.dinner } : {}),
        };
        await saveNotificationSettings(settings);
        setMessage('Saved.');
        setTimeout(() => setMessage(''), 2000);
      } catch {
        setMessage('Failed to save. Please try again.');
      } finally {
        setSaving(false);
      }
    },
    [user]
  );

  const toggleEnabled = async () => {
    if (!user) return;
    const nextEnabled = !enabled;

    if (nextEnabled) {
      if (permissionState === 'unavailable') return;
      if (permissionState === 'denied') {
        setMessage('Notifications are blocked. Please enable them in your browser settings.');
        return;
      }
      if (permissionState !== 'granted') {
        const result = await Notification.requestPermission();
        setPermissionState(result);
        if (result !== 'granted') {
          setMessage('Notification permission was not granted.');
          return;
        }
      }
    }

    setEnabled(nextEnabled);
    await persist(nextEnabled, times);
  };

  const updateTime = (field: keyof NotifTimes, value: string) => {
    setTimes((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => persist(enabled, times);

  return { enabled, toggleEnabled, times, updateTime, loading, saving, message, permissionState, handleSave };
};
