import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSelectedDate } from '../context/DateContext';
import { DateNavigator } from './DateNavigator';
import { Food } from '../types';
import { Toast, ToastType } from './Toast';
import { useTodayMeals } from './foodLogger/useTodayMeals';
import { useFoodSearch } from './foodLogger/useFoodSearch';
import { useMealEditor } from './foodLogger/useMealEditor';
import { useMealChat } from './foodLogger/useMealChat';
import { MealChat } from './foodLogger/MealChat';
import { FoodSearch } from './foodLogger/FoodSearch';
import { SelectedFoodsList } from './foodLogger/SelectedFoodsList';
import { TodayMealsHistory } from './foodLogger/TodayMealsHistory';
import { formatDayLabel } from '../utils/helpers';

export const FoodLogger = () => {
  const { user } = useAuth();
  const { selectedDate, isToday } = useSelectedDate();
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const showToast = (next: { message: string; type: ToastType }) => setToast(next);

  const { todayMeals, loadTodayMeals } = useTodayMeals(user, selectedDate);
  const search = useFoodSearch();
  const editor = useMealEditor({ user, selectedDate, loadTodayMeals, todayMeals, setToast: showToast });
  const chat = useMealChat({ user, selectedDate, todayMeals, loadTodayMeals, setToast: showToast });

  // When an edit starts, scroll the editor card into view so the user isn't left
  // looking at the meal row further down the page.
  const editorRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (editor.editingMealId) {
      editorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [editor.editingMealId]);

  const handleAddFood = (food: Food) => {
    editor.addFood(food);
    search.clearSearch();
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
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">Log Your Meal</h1>
        <DateNavigator />
      </div>

      {!isToday && (
        <div className="card alert-warning py-3">
          <p className="text-sm">
            You're logging for <span className="font-semibold">{formatDayLabel(selectedDate)}</span>. New meals will be saved to this date.
          </p>
        </div>
      )}

      {/* Agentic AI Meal Logging */}
      <MealChat
        chatMessages={chat.chatMessages}
        chatInput={chat.chatInput}
        setChatInput={chat.setChatInput}
        chatLoading={chat.chatLoading}
        chatPreparing={chat.chatPreparing}
        proposedMeal={chat.proposedMeal}
        proposedMealType={chat.proposedMealType}
        mealTypeUncertain={chat.mealTypeUncertain}
        pendingImage={chat.pendingImage}
        imageLoading={chat.imageLoading}
        todayMeals={todayMeals}
        onSend={chat.sendChat}
        onAttachImage={chat.attachImage}
        onClearImage={chat.clearImage}
        onConfirm={chat.confirmChatMeal}
        onDiscard={chat.resetChat}
        onReset={chat.resetChat}
        onUpdateProposedFoodCalories={chat.updateProposedFoodCalories}
        onUpdateProposedMealType={chat.updateProposedMealType}
      />

      {/* Divider */}
      <div className="flex items-center gap-3 pt-2">
        <div className="h-px bg-gray-200 dark:bg-gray-700 flex-1" />
        <span className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Or add manually</span>
        <div className="h-px bg-gray-200 dark:bg-gray-700 flex-1" />
      </div>

      {/* Food Search */}
      <FoodSearch
        searchQuery={search.searchQuery}
        setSearchQuery={search.setSearchQuery}
        searching={search.searching}
        searchResults={search.searchResults}
        hasSearched={search.hasSearched}
        error={search.error}
        onSearch={search.handleSearch}
        onAddFood={handleAddFood}
      />

      {/* Selected Foods */}
      <div ref={editorRef} className="scroll-mt-4">
        <SelectedFoodsList
          selectedFoods={editor.selectedFoods}
          reestimatingIndex={editor.reestimatingIndex}
          editingMealId={editor.editingMealId}
          mealType={editor.mealType}
          setMealType={editor.setMealType}
          notes={editor.notes}
          setNotes={editor.setNotes}
          calculateTotalNutrients={editor.calculateTotalNutrients}
          onUpdateFoodCalories={editor.updateFoodCalories}
          onUpdateQuantity={editor.updateQuantity}
          onChangeFoodUnit={editor.changeFoodUnit}
          onRemoveFood={editor.removeFood}
          onSave={editor.editingMealId ? editor.saveEditedMeal : editor.saveMealEntry}
          onCancelEdit={editor.cancelEditMeal}
        />
      </div>

      {/* Today's Meals History */}
      <TodayMealsHistory
        todayMeals={todayMeals}
        isToday={isToday}
        selectedDate={selectedDate}
        loading={editor.loading}
        editingMealId={editor.editingMealId}
        onStartEdit={editor.startEditMeal}
        onDelete={editor.handleDeleteMeal}
      />
    </div>
  );
};
