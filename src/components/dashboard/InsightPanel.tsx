import { Flame, Drumstick, Wheat, Droplet, Lightbulb, X, type LucideIcon } from 'lucide-react';
import { DietaryInsight, InsightCategory } from '../../types';
import { Spinner, LoadingBlock } from '../Spinner';

// Icon + colour per dietary-insight category, used to give each recommendation
// a recognisable visual like the meal-suggestion card.
const INSIGHT_VISUALS: Record<InsightCategory, { Icon: LucideIcon; color: string; bg: string }> = {
  calories: { Icon: Flame, color: 'text-orange-600 dark:text-orange-300', bg: 'bg-orange-100 dark:bg-orange-900/40' },
  protein: { Icon: Drumstick, color: 'text-red-600 dark:text-red-300', bg: 'bg-red-100 dark:bg-red-900/40' },
  carbs: { Icon: Wheat, color: 'text-blue-600 dark:text-blue-300', bg: 'bg-blue-100 dark:bg-blue-900/40' },
  fats: { Icon: Droplet, color: 'text-amber-600 dark:text-amber-300', bg: 'bg-amber-100 dark:bg-amber-900/40' },
  fiber: { Icon: Wheat, color: 'text-green-600 dark:text-green-300', bg: 'bg-green-100 dark:bg-green-900/40' },
  hydration: { Icon: Droplet, color: 'text-cyan-600 dark:text-cyan-300', bg: 'bg-cyan-100 dark:bg-cyan-900/40' },
  general: { Icon: Lightbulb, color: 'text-amber-600 dark:text-amber-300', bg: 'bg-amber-100 dark:bg-amber-900/40' },
};

interface InsightPanelProps {
  insight: DietaryInsight | null;
  loadingInsight: boolean;
  canGetInsights: boolean;
  onGetInsights: () => void;
  onDismiss: () => void;
}

export const InsightPanel = ({
  insight,
  loadingInsight,
  canGetInsights,
  onGetInsights,
  onDismiss,
}: InsightPanelProps) => {
  return (
    <div className="card bg-gradient-to-br from-amber-50 to-amber-100/60 dark:from-amber-900/30 dark:to-amber-900/20">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Lightbulb className="w-6 h-6 text-amber-600 dark:text-amber-400" />
          <h2 className="text-xl font-semibold">AI Dietary Insights</h2>
        </div>
        <div className="flex items-center gap-2">
          {insight && !loadingInsight && (
            <button
              onClick={onDismiss}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              aria-label="Dismiss insights"
            >
              <X className="w-5 h-5" />
            </button>
          )}
          <button
            onClick={onGetInsights}
            disabled={loadingInsight || !canGetInsights}
            className="btn-primary flex items-center justify-center gap-2 whitespace-nowrap"
          >
            {loadingInsight && <Spinner className="w-4 h-4" />}
            {loadingInsight ? 'Thinking…' : insight ? 'Refresh' : 'Get Insights'}
          </button>
        </div>
      </div>
      {loadingInsight ? (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg">
          <LoadingBlock label="Analyzing your recent nutrition…" />
        </div>
      ) : insight ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-sm">
          {insight.summary && (
            <div className="flex items-start gap-3 p-4 border-b border-gray-100 dark:border-gray-700">
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
                <Lightbulb className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-200 leading-snug self-center">{insight.summary}</p>
            </div>
          )}
          <ul className="divide-y divide-gray-100 dark:divide-gray-700">
            {insight.recommendations.map((rec, i) => {
              const visual = INSIGHT_VISUALS[rec.category] ?? INSIGHT_VISUALS.general;
              const Icon = visual.Icon;
              return (
                <li key={i} className="flex items-start gap-3 p-4">
                  <div className={`flex-shrink-0 w-9 h-9 rounded-lg ${visual.bg} flex items-center justify-center`}>
                    <Icon className={`w-4 h-4 ${visual.color}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{rec.title}</h3>
                      <span className="text-[10px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400 capitalize">
                        {rec.category}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-0.5">{rec.detail}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ) : (
        <p className="text-gray-600 dark:text-gray-300">
          Get personalized, AI-powered tips for reaching your goals through Indian cuisine, based on
          your recent nutrition.
        </p>
      )}
    </div>
  );
};
