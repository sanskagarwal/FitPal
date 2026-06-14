import { Router } from 'express';
import { aiController } from '../controllers/aiController.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { validateBody } from '../middleware/validate.js';
import {
  AnalyzeFoodSchema,
  ChatMealSchema,
  ChatMealStreamSchema,
  InsightsRequestSchema,
  MealInsightRequestSchema,
  RecipesRequestSchema,
  ReestimateUnitSchema,
  SuggestGoalsRequestSchema,
  SuggestMealRequestSchema,
  SuggestNutrientRequestSchema,
} from '../validation.js';

// AI proxy routes. Mounted behind auth (see routes/index.ts).
// Azure/OpenAI calls run here so the provider key never reaches the browser.
export const aiRoutes = Router();

aiRoutes.post(
  '/analyze-food',
  validateBody(AnalyzeFoodSchema),
  asyncHandler(aiController.analyzeFood)
);
aiRoutes.post(
  '/reestimate-unit',
  validateBody(ReestimateUnitSchema),
  asyncHandler(aiController.reestimateUnit)
);
aiRoutes.post('/recipes', validateBody(RecipesRequestSchema), asyncHandler(aiController.recipes));
aiRoutes.post('/insights', validateBody(InsightsRequestSchema), asyncHandler(aiController.insights));
aiRoutes.post(
  '/suggest-meal',
  validateBody(SuggestMealRequestSchema),
  asyncHandler(aiController.suggestMeal)
);
aiRoutes.post(
  '/meal-insight',
  validateBody(MealInsightRequestSchema),
  asyncHandler(aiController.mealInsight)
);
aiRoutes.post(
  '/suggest-nutrient',
  validateBody(SuggestNutrientRequestSchema),
  asyncHandler(aiController.suggestNutrient)
);
aiRoutes.post(
  '/suggest-goals',
  validateBody(SuggestGoalsRequestSchema),
  asyncHandler(aiController.suggestGoals)
);
aiRoutes.post('/chat-meal', validateBody(ChatMealSchema), asyncHandler(aiController.chatMeal));
aiRoutes.post(
  '/chat-meal-stream',
  validateBody(ChatMealStreamSchema),
  asyncHandler(aiController.chatMealStream)
);
