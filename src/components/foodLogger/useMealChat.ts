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
import {
  ChatMessage,
  clampNumber,
  compressImage,
  describeChatError,
  sumNutrients,
  toHHmm,
  MAX_CALORIES,
} from './foodLoggerUtils';

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
  const [chatPreparing, setChatPreparing] = useState(false);
  const [proposedMeal, setProposedMeal] = useState<MealChatResult | null>(null);
  // A compressed photo (data URL) attached to the next message, with a flag while
  // it is being read/compressed so the UI can show a spinner.
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(false);

  // Compress and stage a photo for the next send. Surfaces a toast on failure
  // (unreadable/oversized) and leaves any previously staged image cleared.
  const attachImage = async (file: File) => {
    setImageLoading(true);
    try {
      const dataUrl = await compressImage(file);
      setPendingImage(dataUrl);
    } catch (err) {
      setPendingImage(null);
      setToast({
        message: err instanceof Error ? err.message : 'Could not read that image.',
        type: 'error',
      });
    } finally {
      setImageLoading(false);
    }
  };

  const clearImage = () => setPendingImage(null);

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
      // Carry the photo only when logging a new meal from a picture; the server
      // stores it and strips the field. Updates do not change the photo.
      ...(result.image && !existing ? { image: result.image } : {}),
    };
  };

  const sendChat = async () => {
    // Allow sending with text, a photo, or both - but never an empty turn.
    if ((!chatInput.trim() && !pendingImage) || chatLoading || imageLoading) return;

    const image = pendingImage ?? undefined;
    const userMessage: ChatMessage = {
      role: 'user',
      content: chatInput.trim(),
      ...(image ? { image } : {}),
    };
    const newHistory = [...chatMessages, userMessage];
    setChatMessages(newHistory);
    setChatInput('');
    setPendingImage(null);
    setChatLoading(true);
    setChatPreparing(false);
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
      // The history sent to the server is text-only; the photo travels as a
      // separate `image` argument (and only on the turn it was attached).
      const apiHistory = newHistory.map(({ role, content }) => ({ role, content }));
      // Add an empty assistant bubble that fills in as the reply streams.
      setChatMessages([...newHistory, { role: 'assistant', content: '' }]);
      const updateAssistant = (text: string) =>
        setChatMessages([...newHistory, { role: 'assistant', content: text }]);

      const result = await chatLogMealStream(
        apiHistory,
        loggedMeals,
        updateAssistant,
        () => setChatPreparing(true),
        image
      );
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
      setChatPreparing(false);
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
    setChatPreparing(false);
    setProposedMeal(null);
    setPendingImage(null);
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
    chatPreparing,
    proposedMeal,
    pendingImage,
    imageLoading,
    attachImage,
    clearImage,
    sendChat,
    confirmChatMeal,
    resetChat,
    updateProposedFoodCalories,
  };
};
