import { useEffect, useRef } from 'react';
import { Lightbulb, X } from 'lucide-react';
import { NutrientSuggestion } from '../../types';
import { LoadingBlock } from '../Spinner';

interface NutrientSuggestionPanelProps {
  suggestingNutrient: boolean;
  nutrientSuggestion: NutrientSuggestion | null;
  onDismiss: () => void;
}

export const NutrientSuggestionPanel = ({
  suggestingNutrient,
  nutrientSuggestion,
  onDismiss,
}: NutrientSuggestionPanelProps) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (suggestingNutrient || nutrientSuggestion) {
      // Defer to the next frame so the newly-mounted suggestion card is laid
      // out before we scroll to it. Without this the scroll can fire before
      // layout is committed (notably in the optimized production build) and
      // end up doing nothing.
      const id = requestAnimationFrame(() => {
        ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      return () => cancelAnimationFrame(id);
    }
  }, [suggestingNutrient, nutrientSuggestion]);

  if (suggestingNutrient && !nutrientSuggestion) {
    return (
      <div ref={ref} className="card bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/20 scroll-mt-24">
        <div className="flex items-center gap-2 mb-3">
          <Lightbulb className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          <h3 className="text-lg font-semibold">Finding food suggestions…</h3>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg">
          <LoadingBlock label="Looking up Indian foods rich in this nutrient…" />
        </div>
      </div>
    );
  }

  if (!nutrientSuggestion) return null;

  return (
    <div ref={ref} className="card bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/20 scroll-mt-24">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <Lightbulb className="w-6 h-6 text-blue-600 dark:text-blue-400 flex-shrink-0" />
          <h3 className="text-lg font-semibold truncate">
            {nutrientSuggestion.nutrient}-rich foods
          </h3>
        </div>
        <button
          onClick={onDismiss}
          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 flex-shrink-0"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
        {nutrientSuggestion.foods.length > 0 ? (
          <ul className="divide-y divide-gray-100 dark:divide-gray-700">
            {nutrientSuggestion.foods.map((food, i) => (
              <li key={i} className="flex items-center justify-between gap-3 p-3 sm:p-4">
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 dark:text-gray-100 truncate">{food.name}</p>
                  {food.portion && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">{food.portion}</p>
                  )}
                </div>
                {food.content && (
                  <span className="flex-shrink-0 text-xs font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/40 rounded-full px-2.5 py-1">
                    {food.content}
                  </span>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="p-4 text-sm text-gray-600 dark:text-gray-300">No specific foods returned.</p>
        )}

        {nutrientSuggestion.tips.length > 0 && (
          <div className="p-3 sm:p-4 bg-blue-50/50 dark:bg-blue-900/20 border-t border-gray-100 dark:border-gray-700">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300 mb-2">
              Tips
            </h4>
            <ul className="space-y-1.5">
              {nutrientSuggestion.tips.map((tip, i) => (
                <li key={i} className="flex gap-2 text-sm text-gray-700 dark:text-gray-200">
                  <span className="text-blue-500 dark:text-blue-400 flex-shrink-0">•</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};
