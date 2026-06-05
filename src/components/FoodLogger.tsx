import { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { useSelectedDate } from '../context/DateContext';
import { DateNavigator } from './DateNavigator';
import { Food, MealEntry, FoodEntry, NutrientInfo, MealType, MealUnit } from '../types';
import { analyzeFoodWithAI, chatLogMealStream, reestimateNutrientsForUnit, ParsedMealFood, MealChatResult, LoggedMealSummary } from '../services/openai';
import { saveMeal, getMealsByUser, updateMeal, deleteMeal } from '../utils/db';
import { generateId, getStartOfDay, getEndOfDay, combineDateWithCurrentTime, formatDayLabel } from '../utils/helpers';
import { Search, Plus, X, Edit2, Trash2, Sparkles, Send, Check, AlertCircle } from 'lucide-react';
import { Toast, ToastType } from './Toast';
import { Spinner } from './Spinner';

const MEAL_TYPES = Object.values(MealType);
const QUANTITY_UNITS = Object.values(MealUnit);

type ChatMessage = { role: 'user' | 'assistant'; content: string };

// Upper bounds mirror the server's meal validation so the UI never produces a
// value the backend will reject. They are deliberately generous.
const MAX_CALORIES = 100000;
const MAX_QUANTITY = 10000;

// Clamp a possibly-NaN/Infinity/out-of-range number into [min, max], falling
// back to `fallback` when the value isn't a finite number.
const clampNumber = (value: number, min: number, max: number, fallback: number): number => {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
};

// Turn a chat failure into a user-facing message that reflects the actual
// cause, instead of always telling the user to rephrase. A connectivity or
// server-side outage is not the user's fault and rephrasing won't help.
const describeChatError = (err: unknown): string => {
  // fetch() rejects with a TypeError on network failure; also check offline.
  const isNetwork =
    (typeof navigator !== 'undefined' && navigator.onLine === false) ||
    (err instanceof TypeError &&
      /failed to fetch|network|load failed/i.test(err.message));
  if (isNetwork) {
    return "I couldn't reach the server. Check your connection and try again.";
  }
  // Server/model outages surface as 5xx or known AI failure messages.
  const message = err instanceof Error ? err.message : '';
  if (/too many|rate limit|429/i.test(message)) {
    return message || 'Too many requests. Please wait a moment and try again.';
  }
  if (/ai request failed|unavailable|timeout|timed out|5\d\d|environment variable/i.test(message)) {
    return 'The assistant is temporarily unavailable. Please try again in a moment.';
  }
  // Otherwise it's most likely genuine ambiguity in the request.
  return 'Sorry, I had trouble understanding that. Could you rephrase what you ate?';
};

// Pluralize a serving unit for display (e.g. 2 "katoris", 3 "pieces").
const formatUnit = (unit: string, quantity: number): string => {
  if (quantity === 1) return unit;
  const noPlural = ['serving', 'oz', 'gram', 'ml', 'tbsp', 'tsp'];
  if (noPlural.includes(unit)) return unit;
  return `${unit}s`;
};

// Format a Date as HH:mm for the AI meal context.
const toHHmm = (d: Date): string =>
  `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

// Small badge shown when the AI is not fully confident about a food's nutrition.
const ConfidenceBadge = ({ confidence }: { confidence?: 'high' | 'medium' | 'low' }) => {
  if (!confidence || confidence === 'high') return null;
  const isLow = confidence === 'low';
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${
        isLow ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'
      }`}
      title="The AI estimated these values. You can edit the calories."
    >
      ~estimated
    </span>
  );
};

export const FoodLogger = () => {
  const { user } = useAuth();
  const { selectedDate, isToday } = useSelectedDate();
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Food[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedFoods, setSelectedFoods] = useState<FoodEntry[]>([]);
  const [mealType, setMealType] = useState<MealType>(MealType.Breakfast);
  const [notes, setNotes] = useState('');
  const [todayMeals, setTodayMeals] = useState<MealEntry[]>([]);
  const [editingMealId, setEditingMealId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  // Index of the selected food whose nutrition is being re-estimated after a unit change.
  const [reestimatingIndex, setReestimatingIndex] = useState<number | null>(null);

  // Agentic AI meal logging
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [proposedMeal, setProposedMeal] = useState<MealChatResult | null>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll the chat to the latest message.
  useEffect(() => {
    const el = chatScrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [chatMessages, chatLoading]);

  useEffect(() => {
    loadTodayMeals();
  }, [user, selectedDate]);

  const loadTodayMeals = async () => {
    if (!user) return [];
    const startOfToday = getStartOfDay(selectedDate);
    const endOfToday = getEndOfDay(selectedDate);

    const meals = await getMealsByUser(user.id);
    const todaysMeals = meals.filter(meal => {
      const mealDate = new Date(meal.date);
      return mealDate >= startOfToday && mealDate <= endOfToday;
    });
    setTodayMeals(todaysMeals);
    return todaysMeals;
  };

  // ---- Agentic AI meal logging --------------------------------------------

  const buildMealFromParsed = (result: MealChatResult, existing?: MealEntry): MealEntry | null => {
    if (!user || result.foods.length === 0) return null;

    const foods: FoodEntry[] = result.foods.map((f: ParsedMealFood) => ({
      food: {
        id: generateId(),
        name: f.name,
        servingSize: f.servingSize,
        nutrients: f.nutrients,
        isIndian: f.isIndian ?? true,
        category: f.category,
        confidence: f.confidence,
      },
      // nutrients are per single unit, so the multiplier is the unit count
      quantity: f.unitQuantity,
      unit: f.unit,
      unitQuantity: f.unitQuantity,
    }));

    const totalNutrients = foods.reduce<NutrientInfo>(
      (acc, entry) => {
        const n = entry.food.nutrients;
        const q = entry.quantity;
        return {
          calories: acc.calories + n.calories * q,
          protein: acc.protein + n.protein * q,
          carbs: acc.carbs + n.carbs * q,
          fats: acc.fats + n.fats * q,
          fiber: (acc.fiber || 0) + (n.fiber || 0) * q,
          sugar: (acc.sugar || 0) + (n.sugar || 0) * q,
          sodium: (acc.sodium || 0) + (n.sodium || 0) * q,
          vitaminA: (acc.vitaminA || 0) + (n.vitaminA || 0) * q,
          vitaminC: (acc.vitaminC || 0) + (n.vitaminC || 0) * q,
          vitaminD: (acc.vitaminD || 0) + (n.vitaminD || 0) * q,
          calcium: (acc.calcium || 0) + (n.calcium || 0) * q,
          iron: (acc.iron || 0) + (n.iron || 0) * q,
          magnesium: (acc.magnesium || 0) + (n.magnesium || 0) * q,
          potassium: (acc.potassium || 0) + (n.potassium || 0) * q,
        };
      },
      { calories: 0, protein: 0, carbs: 0, fats: 0, fiber: 0, sugar: 0, sodium: 0, vitaminA: 0, vitaminC: 0, vitaminD: 0, calcium: 0, iron: 0, magnesium: 0, potassium: 0 }
    );

    // Resolve the meal date/time
    let date = existing ? new Date(existing.date) : combineDateWithCurrentTime(selectedDate);
    if (result.time && /^\d{1,2}:\d{2}$/.test(result.time)) {
      const [h, m] = result.time.split(':').map(Number);
      date = new Date(date);
      date.setHours(h, m, 0, 0);
    }

    return {
      id: existing ? existing.id : generateId(),
      userId: user.id,
      date,
      mealType: result.mealType || existing?.mealType || MealType.Breakfast,
      foods,
      totalNutrients,
      notes: existing?.notes,
    };
  };

  const sendChat = async () => {
    if (!chatInput.trim() || chatLoading) return;

    const userMessage: ChatMessage = { role: 'user', content: chatInput.trim() };
    const newHistory = [...chatMessages, userMessage];
    setChatMessages(newHistory);
    setChatInput('');
    setChatLoading(true);
    setProposedMeal(null);

    try {
      // Reload today's meals so the assistant matches update/delete requests
      // against the current state, not a stale snapshot (e.g. if a meal was
      // logged via the form mid-conversation).
      const freshMeals = await loadTodayMeals();
      const loggedMeals: LoggedMealSummary[] = freshMeals.map((m) => ({
        id: m.id,
        mealType: m.mealType,
        time: toHHmm(new Date(m.date)),
        foods: m.foods.map((fe) => ({
          name: fe.food.name,
          unitQuantity: fe.unitQuantity,
          unit: fe.unit,
        })),
      }));
      // Add an empty assistant bubble that fills in as the reply streams.
      setChatMessages([...newHistory, { role: 'assistant', content: '' }]);
      const updateAssistant = (text: string) =>
        setChatMessages([...newHistory, { role: 'assistant', content: text }]);

      const result = await chatLogMealStream(newHistory, loggedMeals, updateAssistant);
      // Ensure the final message is shown even if no stream chunks arrived.
      setChatMessages([...newHistory, { role: 'assistant', content: result.message }]);
      const isActionable =
        result.status === 'ready' &&
        (result.action === 'delete' ? !!result.targetMealId : result.foods.length > 0);
      if (isActionable) {
        setProposedMeal(result);
      }
    } catch (err) {
      console.error('Meal chat error:', err);
      setChatMessages([
        ...newHistory,
        { role: 'assistant', content: describeChatError(err) },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  const confirmChatMeal = async () => {
    if (!proposedMeal || !user) return;

    setChatLoading(true);
    try {
      if (proposedMeal.action === 'delete') {
        if (!proposedMeal.targetMealId) return;
        await deleteMeal(proposedMeal.targetMealId, user.id);
        setToast({ message: 'Meal deleted successfully!', type: 'success' });
      } else if (proposedMeal.action === 'update' && proposedMeal.targetMealId) {
        const existing = todayMeals.find((m) => m.id === proposedMeal.targetMealId);
        const meal = buildMealFromParsed(proposedMeal, existing);
        if (!meal) return;
        await updateMeal(meal);
        setToast({ message: 'Meal updated successfully!', type: 'success' });
      } else {
        const meal = buildMealFromParsed(proposedMeal);
        if (!meal) return;
        await saveMeal(meal);
        setToast({ message: 'Meal logged successfully!', type: 'success' });
      }
      await loadTodayMeals();
      resetChat();
    } catch (err) {
      console.error('Error applying meal action:', err);
      setToast({ message: 'Failed to apply the change. Please try again.', type: 'error' });
    } finally {
      setChatLoading(false);
    }
  };

  const resetChat = () => {
    setChatMessages([]);
    setChatInput('');
    setProposedMeal(null);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setSearching(true);
    setError(null);
    try {
      const results = await analyzeFoodWithAI(searchQuery);
      setSearchResults(results);
      setHasSearched(true);
    } catch (error) {
      console.error('Search error:', error);
      setError(error instanceof Error ? error.message : 'Failed to search for food. Please try again.');
    } finally {
      setSearching(false);
    }
  };

  const addFood = (food: Food) => {
    setSelectedFoods([...selectedFoods, { 
      food, 
      quantity: 1,
      unit: MealUnit.Serving,
      unitQuantity: 1
    }]);
    setSearchResults([]);
    setSearchQuery('');
    setHasSearched(false);
  };

  const removeFood = (index: number) => {
    setSelectedFoods(selectedFoods.filter((_, i) => i !== index));
  };

  const updateQuantity = (index: number, unitQuantity: number, unit: MealUnit) => {
    const safeQuantity = clampNumber(unitQuantity, 0, MAX_QUANTITY, 1);
    const updated = [...selectedFoods];
    updated[index].unitQuantity = safeQuantity;
    updated[index].unit = unit;
    // Calculate multiplier based on unit (for now, use unitQuantity as multiplier)
    // In a real app, you'd convert units to servings properly
    updated[index].quantity = safeQuantity;
    setSelectedFoods(updated);
  };

  // Changing the unit changes what "one unit" means, so ask the AI to re-estimate
  // the per-unit nutrition for the new unit.
  const changeFoodUnit = async (index: number, unit: MealUnit) => {
    const entry = selectedFoods[index];
    if (!entry || entry.unit === unit) return;

    // Apply the unit immediately for responsiveness.
    const updated = [...selectedFoods];
    updated[index] = { ...entry, unit };
    setSelectedFoods(updated);

    setReestimatingIndex(index);
    try {
      const { servingSize, confidence, nutrients } = await reestimateNutrientsForUnit(entry.food.name, unit);
      setSelectedFoods((prev) =>
        prev.map((e, i) =>
          i === index
            ? { ...e, unit, food: { ...e.food, servingSize, confidence, nutrients } }
            : e
        )
      );
    } catch (err) {
      console.error('Error re-estimating nutrition for unit change:', err);
      setToast({ message: 'Could not update nutrition for the new unit. Please check the calories.', type: 'error' });
    } finally {
      setReestimatingIndex(null);
    }
  };

  // Override the per-unit calories of a selected food (used to correct AI estimates).
  const updateFoodCalories = (index: number, calories: number) => {
    const safeCalories = clampNumber(calories, 0, MAX_CALORIES, 0);
    const updated = [...selectedFoods];
    const entry = updated[index];
    entry.food = {
      ...entry.food,
      nutrients: { ...entry.food.nutrients, calories: safeCalories },
      confidence: 'high', // user has confirmed/corrected the value
    };
    setSelectedFoods(updated);
  };

  // Override the per-unit calories of a food in the AI chat proposal before confirming.
  const updateProposedFoodCalories = (index: number, calories: number) => {
    const safeCalories = clampNumber(calories, 0, MAX_CALORIES, 0);
    setProposedMeal((prev) => {
      if (!prev) return prev;
      const foods = prev.foods.map((f, i) =>
        i === index
          ? { ...f, nutrients: { ...f.nutrients, calories: safeCalories }, confidence: 'high' as const }
          : f
      );
      return { ...prev, foods };
    });
  };

  const calculateTotalNutrients = (): NutrientInfo => {
    return selectedFoods.reduce(
      (acc, entry) => {
        const nutrients = entry.food.nutrients;
        return {
          calories: acc.calories + nutrients.calories * entry.quantity,
          protein: acc.protein + nutrients.protein * entry.quantity,
          carbs: acc.carbs + nutrients.carbs * entry.quantity,
          fats: acc.fats + nutrients.fats * entry.quantity,
          fiber: (acc.fiber || 0) + (nutrients.fiber || 0) * entry.quantity,
          sugar: (acc.sugar || 0) + (nutrients.sugar || 0) * entry.quantity,
          sodium: (acc.sodium || 0) + (nutrients.sodium || 0) * entry.quantity,
          vitaminA: (acc.vitaminA || 0) + (nutrients.vitaminA || 0) * entry.quantity,
          vitaminC: (acc.vitaminC || 0) + (nutrients.vitaminC || 0) * entry.quantity,
          vitaminD: (acc.vitaminD || 0) + (nutrients.vitaminD || 0) * entry.quantity,
          calcium: (acc.calcium || 0) + (nutrients.calcium || 0) * entry.quantity,
          iron: (acc.iron || 0) + (nutrients.iron || 0) * entry.quantity,
          magnesium: (acc.magnesium || 0) + (nutrients.magnesium || 0) * entry.quantity,
          potassium: (acc.potassium || 0) + (nutrients.potassium || 0) * entry.quantity,
        };
      },
      {
        calories: 0,
        protein: 0,
        carbs: 0,
        fats: 0,
        fiber: 0,
        sugar: 0,
        sodium: 0,
        vitaminA: 0,
        vitaminC: 0,
        vitaminD: 0,
        calcium: 0,
        iron: 0,
        magnesium: 0,
        potassium: 0,
      }
    );
  };

  const saveMealEntry = async () => {
    if (!user || selectedFoods.length === 0) return;

    const totalNutrients = calculateTotalNutrients();

    const meal: MealEntry = {
      id: generateId(),
      userId: user.id,
      date: combineDateWithCurrentTime(selectedDate),
      mealType,
      foods: selectedFoods,
      totalNutrients,
      notes: notes || undefined,
    };

    try {
      await saveMeal(meal);
      // Reset form
      setSelectedFoods([]);
      setNotes('');
      await loadTodayMeals();
      setToast({ message: 'Meal logged successfully!', type: 'success' });
    } catch (error) {
      console.error('Error saving meal:', error);
      setToast({ message: 'Failed to log meal. Please try again.', type: 'error' });
    }
  };

  const startEditMeal = (meal: MealEntry) => {
    setEditingMealId(meal.id);
    setSelectedFoods(meal.foods);
    setMealType(meal.mealType);
    setNotes(meal.notes || '');
  };

  const cancelEditMeal = () => {
    setEditingMealId(null);
    setSelectedFoods([]);
    setNotes('');
  };

  const saveEditedMeal = async () => {
    if (!user || !editingMealId || selectedFoods.length === 0) return;

    setLoading(true);
    try {
      const originalMeal = todayMeals.find(m => m.id === editingMealId);
      if (!originalMeal) return;

      const totalNutrients = calculateTotalNutrients();

      const updatedMeal: MealEntry = {
        ...originalMeal,
        mealType,
        foods: selectedFoods,
        totalNutrients,
        notes: notes || undefined,
      };

      await updateMeal(updatedMeal);
      cancelEditMeal();
      await loadTodayMeals();
      setToast({ message: 'Meal updated successfully!', type: 'success' });
    } catch (error) {
      console.error('Error updating meal:', error);
      setToast({ message: 'Failed to update meal. Please try again.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMeal = async (mealId: string) => {
    if (!user || !confirm('Are you sure you want to delete this meal?')) return;

    setLoading(true);
    try {
      await deleteMeal(mealId, user.id);
      await loadTodayMeals();
      setToast({ message: 'Meal deleted successfully!', type: 'success' });
    } catch (error) {
      console.error('Error deleting meal:', error);
      setToast({ message: 'Failed to delete meal. Please try again.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Log Your Meal</h1>
        <DateNavigator />
      </div>

      {!isToday && (
        <div className="card bg-amber-50 border border-amber-200 py-3">
          <p className="text-sm text-amber-800">
            You're logging for <span className="font-semibold">{formatDayLabel(selectedDate)}</span>. New meals will be saved to this date.
          </p>
        </div>
      )}

      {/* Agentic AI Meal Logging */}
      <div className="card">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-5 h-5 text-primary-600" />
          <h2 className="text-lg font-semibold">Quick Log with AI</h2>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          Describe your meal in plain language — e.g.{' '}
          <span className="italic">"2 rotis and a katori of dal for lunch at 1pm"</span>. You can also
          edit or remove today's meals, like{' '}
          <span className="italic">"add a glass of milk to breakfast"</span> or{' '}
          <span className="italic">"delete my lunch"</span>.
        </p>

        {chatMessages.length > 0 && (
          <div ref={chatScrollRef} className="space-y-3 mb-4 max-h-72 overflow-y-auto pr-1">
            {chatMessages.map((msg, i) =>
              // Skip the empty assistant placeholder shown before the first
              // streamed token (the "Thinking…" indicator covers that gap).
              msg.role === 'assistant' && msg.content === '' ? null : (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm whitespace-pre-wrap ${
                      msg.role === 'user'
                        ? 'bg-primary-600 text-white rounded-br-sm'
                        : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                    }`}
                  >
                    {msg.content}
                  </div>
                </motion.div>
              )
            )}
            {chatLoading && chatMessages[chatMessages.length - 1]?.content === '' && (
              <div className="flex justify-start">
                <div className="bg-gray-100 text-gray-500 px-3 py-2 rounded-2xl rounded-bl-sm text-sm flex items-center gap-2">
                  <Spinner className="w-4 h-4" />
                  Thinking…
                </div>
              </div>
            )}
          </div>
        )}

        {/* Proposed action preview */}
        <AnimatePresence>
        {proposedMeal && (proposedMeal.foods.length > 0 || proposedMeal.action === 'delete') && (
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
                        onChange={(e) => updateProposedFoodCalories(i, parseFloat(e.target.value) || 0)}
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
                onClick={confirmChatMeal}
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
              <button onClick={resetChat} disabled={chatLoading} className="btn-secondary text-sm">
                Discard
              </button>
            </div>
          </motion.div>
        )}
        </AnimatePresence>

        <div className="flex gap-2">
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendChat()}
            placeholder="What did you eat?"
            className="input-field flex-1"
            disabled={chatLoading}
            autoFocus
          />
          <button onClick={sendChat} disabled={chatLoading || !chatInput.trim()} className="btn-primary flex items-center gap-1">
            <Send className="w-4 h-4" />
            Send
          </button>
          {chatMessages.length > 0 && (
            <button onClick={resetChat} disabled={chatLoading} className="btn-secondary" title="Start over">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Meal Type Selection */}
      <div className="flex items-center gap-3 pt-2">
        <div className="h-px bg-gray-200 flex-1" />
        <span className="text-xs font-medium uppercase tracking-wide text-gray-400">Or add manually</span>
        <div className="h-px bg-gray-200 flex-1" />
      </div>

      {/* Meal Type Selection */}
      <div className="card">
        <label className="block text-sm font-medium text-gray-700 mb-2">Meal Type</label>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {MEAL_TYPES.map((type) => (
            <button
              key={type}
              onClick={() => setMealType(type)}
              className={`py-2 px-4 rounded-lg font-medium transition-colors capitalize ${
                mealType === type
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {type.replace('-', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Food Search */}
      <div className="card">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Search Indian Foods
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !searching && handleSearch()}
            placeholder="e.g., dosa, dal, roti, paneer tikka..."
            className="input-field flex-1"
            aria-label="Search Indian foods"
          />
          <button
            onClick={handleSearch}
            disabled={searching}
            className="btn-primary"
          >
            {searching ? (
              <span className="flex items-center gap-2">
                <Spinner className="w-4 h-4" />
                Searching...
              </span>
            ) : (
              <>
                <Search className="inline w-4 h-4 mr-2" />
                Search
              </>
            )}
          </button>
        </div>

        {/* Loading skeleton */}
        {searching && (
          <div className="mt-4 space-y-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg animate-pulse">
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-gray-200 rounded w-1/3" />
                  <div className="h-3 bg-gray-200 rounded w-1/4" />
                </div>
                <div className="h-8 w-16 bg-gray-200 rounded" />
              </div>
            ))}
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800 font-medium">Error:</p>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        )}

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="mt-4 space-y-2">
            <h3 className="font-medium text-gray-700">Search Results:</h3>            {searchResults.map((food) => (
              <div
                key={food.id}
                className="flex items-center justify-between gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                <div className="min-w-0">
                  <p className="font-medium flex items-center gap-2">
                    <span className="truncate">{food.name}</span>
                    <ConfidenceBadge confidence={food.confidence} />
                  </p>
                  <p className="text-sm text-gray-600">
                    {food.servingSize} • {food.nutrients.calories} cal
                  </p>
                </div>
                <button
                  onClick={() => addFood(food)}
                  className="btn-primary text-sm shrink-0"
                  aria-label={`Add ${food.name}`}
                >
                  <Plus className="inline w-4 h-4" />
                  Add
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Empty state when a search returned no matches */}
        {!searching && hasSearched && searchResults.length === 0 && (
          <div className="mt-4 text-center py-8 text-gray-500">
            <Search className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">No foods found. Try a different name or describe the dish.</p>
          </div>
        )}
      </div>

      {/* Selected Foods */}
      {selectedFoods.length > 0 && (
        <div className="card">
          <h3 className="font-medium text-gray-700 mb-4">Selected Foods</h3>
          <div className="space-y-3">
            {selectedFoods.map((entry, index) => (
              <div key={index} className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-3 bg-gray-50 rounded-lg">
                <div className="flex-1 min-w-0">
                  <p className="font-medium flex items-center gap-2">
                    <span className="truncate">{entry.food.name}</span>
                    <ConfidenceBadge confidence={entry.food.confidence} />
                  </p>
                  <div className="flex items-center flex-wrap gap-x-2 gap-y-1 text-sm text-gray-600 mt-0.5">
                    <span>{entry.food.servingSize} •</span>
                    {reestimatingIndex === index ? (
                      <span className="flex items-center gap-1 text-gray-500">
                        <Spinner className="w-3.5 h-3.5" /> updating…
                      </span>
                    ) : (
                      <>
                        <input
                          type="number"
                          min="0"
                          step="10"
                          value={Math.round(entry.food.nutrients.calories)}
                          onChange={(e) => updateFoodCalories(index, parseFloat(e.target.value) || 0)}
                          className="w-16 px-1.5 py-0.5 border border-gray-300 rounded text-sm"
                          title="Calories per unit — edit if the estimate looks off"
                          aria-label={`Calories per unit for ${entry.food.name}`}
                        />
                        <span>cal each</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <input
                    type="number"
                    min="0.25"
                    step="0.25"
                    value={entry.unitQuantity}
                    onChange={(e) => updateQuantity(index, parseFloat(e.target.value) || 1, entry.unit)}
                    className="w-20 px-2 py-2 border border-gray-300 rounded"
                    disabled={reestimatingIndex === index}
                    aria-label={`Quantity of ${entry.food.name}`}
                  />
                  <select
                    value={entry.unit}
                    onChange={(e) => changeFoodUnit(index, e.target.value as MealUnit)}
                    className="flex-1 sm:flex-none px-2 py-2 border border-gray-300 rounded text-sm disabled:opacity-50"
                    disabled={reestimatingIndex === index}
                    aria-label={`Unit for ${entry.food.name}`}
                  >
                    {QUANTITY_UNITS.map((unit) => (
                      <option key={unit} value={unit}>{unit}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => removeFood(index)}
                    className="text-red-500 hover:text-red-700 p-2"
                    aria-label={`Remove ${entry.food.name}`}
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="mt-4 p-4 bg-primary-50 rounded-lg">
            <h4 className="font-semibold mb-2">Total Nutrition</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Calories</p>
                <p className="text-lg font-bold">{Math.round(calculateTotalNutrients().calories)}</p>
              </div>
              <div>
                <p className="text-gray-600">Protein</p>
                <p className="text-lg font-bold">{Math.round(calculateTotalNutrients().protein)}g</p>
              </div>
              <div>
                <p className="text-gray-600">Carbs</p>
                <p className="text-lg font-bold">{Math.round(calculateTotalNutrients().carbs)}g</p>
              </div>
              <div>
                <p className="text-gray-600">Fats</p>
                <p className="text-lg font-bold">{Math.round(calculateTotalNutrients().fats)}g</p>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes about this meal..."
              className="input-field"
              rows={3}
            />
          </div>

          {/* Save Button */}
          <button onClick={editingMealId ? saveEditedMeal : saveMealEntry} className="btn-primary w-full mt-4">
            {editingMealId ? 'Update Meal' : 'Log Meal'}
          </button>
          {editingMealId && (
            <button onClick={cancelEditMeal} className="btn-secondary w-full mt-2">
              Cancel Edit
            </button>
          )}
        </div>
      )}

      {/* Today's Meals History */}
      {todayMeals.length > 0 && (
        <div className="card">
          <h3 className="text-xl font-semibold mb-4">{isToday ? "Today's Meals" : `Meals · ${formatDayLabel(selectedDate)}`}</h3>
          <div className="space-y-3">
            <AnimatePresence initial={false}>
            {todayMeals.map((meal) => (
              <motion.div
                key={meal.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0, marginTop: 0, overflow: 'hidden' }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
                className="p-4 bg-gray-50 rounded-lg"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="font-medium text-gray-900 capitalize">
                      {meal.mealType.replace('-', ' ')}
                    </h4>
                    <p className="text-xs text-gray-500">
                      {new Date(meal.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => startEditMeal(meal)}
                      disabled={loading || editingMealId !== null}
                      className="text-blue-600 hover:text-blue-800 disabled:opacity-50"
                      aria-label={`Edit ${meal.mealType.replace('-', ' ')}`}
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteMeal(meal.id)}
                      disabled={loading}
                      className="text-red-600 hover:text-red-800 disabled:opacity-50"
                      aria-label={`Delete ${meal.mealType.replace('-', ' ')}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                <div className="divide-y divide-gray-200 mb-3">
                  {meal.foods.map((foodEntry, idx) => {
                    const q = foodEntry.quantity || foodEntry.unitQuantity || 1;
                    const n = foodEntry.food.nutrients;
                    const unitLabel = formatUnit(foodEntry.unit, foodEntry.unitQuantity);
                    return (
                      <div key={idx} className="py-2">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 capitalize truncate">
                              {foodEntry.food.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {foodEntry.unitQuantity} {unitLabel}
                              {foodEntry.food.servingSize ? ` • ${foodEntry.food.servingSize}` : ''}
                            </p>
                          </div>
                          <p className="text-sm font-semibold text-gray-900 whitespace-nowrap">
                            {Math.round(n.calories * q)} cal
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1 text-xs text-gray-500">
                          <span>P {Math.round(n.protein * q)}g</span>
                          <span>C {Math.round(n.carbs * q)}g</span>
                          <span>F {Math.round(n.fats * q)}g</span>
                          {n.fiber ? <span>Fiber {Math.round(n.fiber * q)}g</span> : null}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="grid grid-cols-4 gap-2 text-sm border-t pt-2">
                  <div>
                    <span className="text-gray-600">Calories:</span>
                    <span className="ml-1 font-semibold">{Math.round(meal.totalNutrients.calories)}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Protein:</span>
                    <span className="ml-1 font-semibold">{Math.round(meal.totalNutrients.protein)}g</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Carbs:</span>
                    <span className="ml-1 font-semibold">{Math.round(meal.totalNutrients.carbs)}g</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Fats:</span>
                    <span className="ml-1 font-semibold">{Math.round(meal.totalNutrients.fats)}g</span>
                  </div>
                </div>
                
                {meal.notes && (
                  <p className="text-sm text-gray-600 mt-2 italic">Note: {meal.notes}</p>
                )}
              </motion.div>
            ))}
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  );
};
