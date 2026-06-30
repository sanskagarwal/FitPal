import { useState, useEffect, useCallback } from 'react';
import { Droplet, Plus, Minus } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSelectedDate } from '../../context/DateContext';
import { WaterEntry } from '../../types';
import { getWaterByDate, logWater, deleteWater } from '../../utils/db';
import { generateId, localDateStr, formatDayLabel } from '../../utils/helpers';

const DEFAULT_WATER_GOAL = 8;
// Cap the rendered icon grid so overshooting the goal stays readable.
const MAX_DISPLAY_ICONS = 16;

export const WaterPanel = () => {
  const { user } = useAuth();
  const { selectedDate, isToday } = useSelectedDate();
  const [entries, setEntries] = useState<WaterEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState(false);

  const goal = user?.profile.goals.targetWaterCups ?? DEFAULT_WATER_GOAL;
  const count = entries.length;
  const dateStr = localDateStr(selectedDate);
  const iconCount = Math.min(Math.max(count, goal), MAX_DISPLAY_ICONS);
  const pct = Math.min(100, Math.round((count / goal) * 100));

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await getWaterByDate(user.id, dateStr);
      setEntries(data);
    } catch {
      // error already logged inside getWaterByDate
    } finally {
      setLoading(false);
    }
  }, [user, dateStr]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const handleAdd = async () => {
    if (!user || adding) return;
    setAdding(true);
    const entry: WaterEntry = { id: generateId(), userId: user.id, date: dateStr };
    try {
      await logWater(entry);
      setEntries((prev) => [...prev, entry]);
    } catch {
      // error already logged inside logWater
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async () => {
    if (!user || removing || count === 0) return;
    setRemoving(true);
    const last = entries[entries.length - 1];
    try {
      await deleteWater(last.id, user.id);
      setEntries((prev) => prev.slice(0, -1));
    } catch {
      // error already logged inside deleteWater
    } finally {
      setRemoving(false);
    }
  };

  const dayLabel = isToday ? "Today's" : `${formatDayLabel(selectedDate)}'s`;

  return (
    <div className="card">
      <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
        {dayLabel} Water Intake
      </h2>

      {loading ? (
        <div className="flex justify-center py-4">
          <div className="spinner" />
        </div>
      ) : (
        <>
          {/* Cup icon grid */}
          <div className="flex flex-wrap gap-1.5 mb-4" aria-label={`${count} of ${goal} cups logged`}>
            {Array.from({ length: iconCount }).map((_, i) => (
              <Droplet
                key={i}
                className={`w-7 h-7 transition-colors ${
                  i < count
                    ? 'text-blue-500 dark:text-blue-400 fill-blue-500 dark:fill-blue-400'
                    : 'text-gray-300 dark:text-gray-600'
                }`}
              />
            ))}
          </div>

          {/* Progress bar */}
          <div className="mb-4">
            <div className="h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
              <div
                className="h-full rounded-full bg-blue-500 dark:bg-blue-400 transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>

          {/* Count + buttons */}
          <div className="flex items-center justify-between gap-4">
            <p className="text-gray-700 dark:text-gray-200">
              <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">{count}</span>
              <span className="text-gray-500 dark:text-gray-400"> / {goal} cups</span>
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleRemove}
                disabled={removing || count === 0}
                className="btn-secondary p-2 min-h-11 min-w-11 flex items-center justify-center disabled:opacity-40"
                aria-label="Remove last cup"
              >
                <Minus className="w-5 h-5" />
              </button>
              <button
                onClick={handleAdd}
                disabled={adding}
                className="btn-primary px-4 py-2 min-h-11 flex items-center gap-1.5 disabled:opacity-60"
              >
                <Plus className="w-4 h-4" />
                Add Cup
              </button>
            </div>
          </div>

          {count >= goal && count > 0 && (
            <p className="text-sm text-green-600 dark:text-green-400 mt-3 font-medium">
              Daily water goal reached!
            </p>
          )}
        </>
      )}
    </div>
  );
};
