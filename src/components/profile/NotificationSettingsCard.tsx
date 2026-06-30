import { Bell } from 'lucide-react';
import { useNotificationSettings } from './useNotificationSettings';

const TIME_FIELDS = [
  { key: 'breakfast', label: 'Breakfast' },
  { key: 'lunch', label: 'Lunch' },
  { key: 'dinner', label: 'Dinner' },
] as const;

export const NotificationSettingsCard = () => {
  const {
    enabled,
    toggleEnabled,
    times,
    updateTime,
    loading,
    saving,
    message,
    permissionState,
    handleSave,
  } = useNotificationSettings();

  const unavailable = permissionState === 'unavailable';

  return (
    <div className="card">
      <div className="flex items-center gap-3 mb-6">
        <Bell className="w-8 h-8 text-primary-600 dark:text-primary-400" />
        <div>
          <h2 className="text-xl font-semibold">Meal Reminders</h2>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Get notified when it is time to log your meals
          </p>
        </div>
      </div>

      {unavailable ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Push notifications are not supported in this browser.
        </p>
      ) : (
        <div className="space-y-5">
          {loading ? (
            <div className="h-6 w-32 animate-pulse rounded bg-gray-100 dark:bg-gray-700" />
          ) : (
            <>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                  Enable reminders
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={enabled}
                  onClick={toggleEnabled}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 ${
                    enabled
                      ? 'bg-primary-600 dark:bg-primary-500'
                      : 'bg-gray-200 dark:bg-gray-600'
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      enabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {enabled && (
                <div className="space-y-3 pt-1">
                  {TIME_FIELDS.map(({ key, label }) => (
                    <div key={key} className="flex items-center gap-4">
                      <label
                        htmlFor={`notif-time-${key}`}
                        className="w-20 shrink-0 text-sm text-gray-600 dark:text-gray-300"
                      >
                        {label}
                      </label>
                      <input
                        id={`notif-time-${key}`}
                        type="time"
                        value={times[key]}
                        onChange={(e) => updateTime(key, e.target.value)}
                        className="input-field max-w-[140px]"
                      />
                    </div>
                  ))}
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={handleSave}
                      disabled={saving}
                      className="btn-primary"
                    >
                      {saving ? 'Saving...' : 'Save times'}
                    </button>
                  </div>
                </div>
              )}

              {message && (
                <p
                  className={`text-sm ${
                    message.startsWith('Failed') ||
                    message.includes('blocked') ||
                    message.includes('not granted')
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-green-600 dark:text-green-400'
                  }`}
                >
                  {message}
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};
