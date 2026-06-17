import { motion } from 'motion/react';
import { Check, AlertCircle } from 'lucide-react';
import { MealEntry, MealChatResult, MealType } from '../../types';
import { formatMealTypeLabel } from '../../utils/helpers';
import { ConfidenceBadge } from './ConfidenceBadge';

interface MealProposalProps {
  proposedMeal: MealChatResult;
  todayMeals: MealEntry[];
  chatLoading: boolean;
  proposedMealType: MealType;
  mealTypeUncertain: boolean;
  onUpdateProposedFoodCalories: (index: number, calories: number) => void;
  onUpdateProposedMealType: (mealType: MealType) => void;
  onConfirm: () => void;
  onDiscard: () => void;
}

// The preview of the AI-proposed meal action (log / update / delete) with an
// inline confirm/discard. Calories per item can be corrected before confirming.
export const MealProposal = ({
  proposedMeal,
  todayMeals,
  chatLoading,
  proposedMealType,
  mealTypeUncertain,
  onUpdateProposedFoodCalories,
  onUpdateProposedMealType,
  onConfirm,
  onDiscard,
}: MealProposalProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      className={`mb-4 p-4 border rounded-lg ${
        proposedMeal.action === 'delete'
          ? 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/30'
          : 'border-primary-200 bg-primary-50 dark:border-primary-800 dark:bg-primary-900/30'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-gray-800 dark:text-gray-100">
          {proposedMeal.action === 'delete'
            ? 'Ready to delete'
            : proposedMeal.action === 'update'
            ? 'Ready to update'
            : 'Ready to log'}
        </h3>
      </div>
      {proposedMeal.action !== 'delete' && (
        <div className="mb-3">
          <div className="flex flex-wrap items-center gap-2">
            <label
              htmlFor="proposed-meal-type"
              className="text-sm font-medium text-gray-700 dark:text-gray-200"
            >
              Logging as
            </label>
            <select
              id="proposed-meal-type"
              value={proposedMealType}
              onChange={(e) => onUpdateProposedMealType(e.target.value as MealType)}
              disabled={chatLoading}
              className={`rounded-lg border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 ${
                mealTypeUncertain
                  ? 'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-200'
                  : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-gray-100'
              }`}
            >
              {Object.values(MealType).map((type) => (
                <option key={type} value={type}>
                  {formatMealTypeLabel(type)}
                </option>
              ))}
            </select>
            {mealTypeUncertain && (
              <span
                className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                title="I guessed this meal type - change it if needed"
              >
                ~inferred
              </span>
            )}
          </div>
          {mealTypeUncertain && (
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              You didn't say which meal this is, so I guessed it - change it if that's not right.
            </p>
          )}
        </div>
      )}
      {proposedMeal.action === 'delete' ? (
        (() => {
          const target = todayMeals.find((m) => m.id === proposedMeal.targetMealId);
          return (
            <p className="text-sm text-gray-700 dark:text-gray-200 mb-3">
              {target
                ? `This will remove your ${target.mealType.replace('-', ' ')} (${target.foods
                    .map((fe) => fe.food.name)
                    .join(', ')}).`
                : 'This will remove the selected meal.'}
            </p>
          );
        })()
      ) : (
        <ul className="space-y-1 mb-3">
          {proposedMeal.foods.map((f, i) => (
            <li key={i} className="text-sm text-gray-700 dark:text-gray-200 flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
              <span className="flex items-center gap-2 min-w-0">
                <span className="truncate">
                  • {f.unitQuantity} {f.unit} {f.name}
                </span>
                <ConfidenceBadge confidence={f.confidence} />
              </span>
              <span className="flex items-center gap-1 text-gray-500 dark:text-gray-400 shrink-0">
                <input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  step="10"
                  value={Math.round(f.nutrients.calories)}
                  onChange={(e) => onUpdateProposedFoodCalories(i, parseFloat(e.target.value) || 0)}
                  className="w-16 px-1.5 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 dark:text-gray-100"
                  title="Calories per unit - edit if the estimate looks off"
                />
                <span>×{f.unitQuantity} = {Math.round(f.nutrients.calories * f.unitQuantity)} cal</span>
              </span>
            </li>
          ))}
        </ul>
      )}
      {proposedMeal.action !== 'delete' &&
        proposedMeal.foods.some((f) => f.confidence === 'low') && (
          <div className="mb-3 flex items-start gap-2 text-xs alert-warning rounded-md px-2.5 py-2">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>
              Some items are rough estimates (marked{' '}
              <span className="font-medium">~estimated</span>). Please review the calories
              above and adjust any that look off before confirming.
            </span>
          </div>
        )}
      <div className="flex gap-2">
        <button
          onClick={onConfirm}
          disabled={chatLoading}
          className={`text-sm flex items-center gap-1 ${
            proposedMeal.action === 'delete' ? 'btn-danger' : 'btn-primary'
          }`}
        >
          <Check className="w-4 h-4" />{' '}
          {proposedMeal.action === 'delete'
            ? 'Confirm & Delete'
            : proposedMeal.action === 'update'
            ? 'Confirm & Update'
            : 'Confirm & Log'}
        </button>
        <button onClick={onDiscard} disabled={chatLoading} className="btn-secondary text-sm">
          Discard
        </button>
      </div>
    </motion.div>
  );
};
