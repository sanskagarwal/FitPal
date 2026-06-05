import { useState } from 'react';
import {
  FoodEntry,
  MealEntry,
  MealType,
  NutrientInfo,
  User,
  ParsedMealFood,
  MealChatResult,
  LoggedMealSummary,
} from '../../types';
import { saveMeal, updateMeal, deleteMeal } from '../../utils/db';
import { chatLogMealStream } from '../../services/openai';
import { generateId, combineDateWithCurrentTime } from '../../utils/helpers';
import { ToastType } from '../Toast';
import { ChatMessage, clampNumber, describeChatError, sumNutrients, toHHmm, MAX_CALORIES } from './foodLoggerUtils';

type SetToast = (toast: { message: string; type: ToastType }) => void;

interface UseMealChatArgs {
  user: User | null;
  selectedDate: Date;
  todayMeals: MealEntry[];
  loadTodayMeals: () => Promise<MealEntry[]>;
  setToast: SetToast;
}

// Owns the agentic "Quick Log with AI" conversation: streaming chat, the
// proposed meal preview, and applying the create/update/delete action. Wraps
// the existing AI + db calls only.
export const useMealChat = ({ user, selectedDate, todayMeals, loadTodayMeals, setToast }: UseMealChatArgs) => {
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [proposedMeal, setProposedMeal] = useState<MealChatResult | null>(null);

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

    const totalNutrients: NutrientInfo = sumNutrients(
      foods.map((entry) => ({ nutrients: entry.food.nutrients, quantity: entry.quantity }))
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

  return {
    chatMessages,
    chatInput,
    setChatInput,
    chatLoading,
    proposedMeal,
    sendChat,
    confirmChatMeal,
    resetChat,
    updateProposedFoodCalories,
  };
};
