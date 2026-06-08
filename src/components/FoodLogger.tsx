import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSelectedDate } from '../context/DateContext';
import { DateNavigator } from './DateNavigator';
import { Food } from '../types';
import { Toast, ToastType } from './Toast';
import { MEAL_TYPES } from './foodLogger/foodLoggerUtils';
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
        todayMeals={todayMeals}
        onSend={chat.sendChat}
        onConfirm={chat.confirmChatMeal}
        onDiscard={chat.resetChat}
        onReset={chat.resetChat}
        onUpdateProposedFoodCalories={chat.updateProposedFoodCalories}
      />

      {/* Divider */}
      <div className="flex items-center gap-3 pt-2">
        <div className="h-px bg-gray-200 dark:bg-gray-700 flex-1" />
        <span className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Or add manually</span>
        <div className="h-px bg-gray-200 dark:bg-gray-700 flex-1" />
      </div>

      {/* Meal Type Selection */}
      <div className="card">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Meal Type</label>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
          {MEAL_TYPES.map((type) => (
            <button
              key={type}
              onClick={() => editor.setMealType(type)}
              className={`py-2 px-4 rounded-lg font-medium transition-colors capitalize ${
                editor.mealType === type
                  ? 'bg-primary-700 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {type.replace('-', ' ')}
            </button>
          ))}
        </div>
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
      <SelectedFoodsList
        selectedFoods={editor.selectedFoods}
        reestimatingIndex={editor.reestimatingIndex}
        editingMealId={editor.editingMealId}
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
