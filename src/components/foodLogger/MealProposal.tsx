import { motion } from 'motion/react';
import { Check, AlertCircle } from 'lucide-react';
import { MealEntry, MealChatResult } from '../../types';
import { ConfidenceBadge } from './ConfidenceBadge';

interface MealProposalProps {
  proposedMeal: MealChatResult;
  todayMeals: MealEntry[];
  chatLoading: boolean;
  onUpdateProposedFoodCalories: (index: number, calories: number) => void;
  onConfirm: () => void;
  onDiscard: () => void;
}

// The preview of the AI-proposed meal action (log / update / delete) with an
// inline confirm/discard. Calories per item can be corrected before confirming.
export const MealProposal = ({
  proposedMeal,
  todayMeals,
  chatLoading,
  onUpdateProposedFoodCalories,
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
          ? 'border-red-200 bg-red-50'
          : 'border-primary-200 bg-primary-50'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-gray-800">
          {proposedMeal.action === 'delete'
            ? 'Ready to delete'
            : proposedMeal.action === 'update'
            ? 'Ready to update'
            : 'Ready to log'}
          {proposedMeal.mealType && proposedMeal.action !== 'delete' && (
            <span className="ml-2 text-sm font-normal text-gray-600 capitalize">
              ({proposedMeal.mealType.replace('-', ' ')}
              {proposedMeal.time ? ` • ${proposedMeal.time}` : ''})
            </span>
          )}
        </h3>
      </div>
      {proposedMeal.action === 'delete' ? (
        (() => {
          const target = todayMeals.find((m) => m.id === proposedMeal.targetMealId);
          return (
            <p className="text-sm text-gray-700 mb-3">
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
            <li key={i} className="text-sm text-gray-700 flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
              <span className="flex items-center gap-2 min-w-0">
                <span className="truncate">
                  • {f.unitQuantity} {f.unit} {f.name}
                </span>
                <ConfidenceBadge confidence={f.confidence} />
              </span>
              <span className="flex items-center gap-1 text-gray-500 shrink-0">
                <input
                  type="number"
                  min="0"
                  step="10"
                  value={Math.round(f.nutrients.calories)}
                  onChange={(e) => onUpdateProposedFoodCalories(i, parseFloat(e.target.value) || 0)}
                  className="w-16 px-1.5 py-1 border border-gray-300 rounded text-sm bg-white"
                  title="Calories per unit — edit if the estimate looks off"
                />
                <span>×{f.unitQuantity} = {Math.round(f.nutrients.calories * f.unitQuantity)} cal</span>
              </span>
            </li>
          ))}
        </ul>
      )}
      {proposedMeal.action !== 'delete' &&
        proposedMeal.foods.some((f) => f.confidence === 'low') && (
          <div className="mb-3 flex items-start gap-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-2.5 py-2">
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
