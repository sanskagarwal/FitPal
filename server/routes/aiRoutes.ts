import { Router } from 'express';
import { aiController } from '../controllers/aiController.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { validateBody } from '../middleware/validate.js';
import { ChatMealStreamSchema, MealInsightRequestSchema } from '../validation.js';

// AI proxy routes. Mounted behind auth (see routes/index.ts).
// Azure/OpenAI calls run here so the provider key never reaches the browser.
export const aiRoutes = Router();

aiRoutes.post('/analyze-food', asyncHandler(aiController.analyzeFood));
aiRoutes.post('/reestimate-unit', asyncHandler(aiController.reestimateUnit));
aiRoutes.post('/recipes', asyncHandler(aiController.recipes));
aiRoutes.post('/insights', asyncHandler(aiController.insights));
aiRoutes.post('/suggest-meal', asyncHandler(aiController.suggestMeal));
aiRoutes.post(
  '/meal-insight',
  validateBody(MealInsightRequestSchema),
  asyncHandler(aiController.mealInsight)
);
aiRoutes.post('/suggest-nutrient', asyncHandler(aiController.suggestNutrient));
aiRoutes.post('/suggest-goals', asyncHandler(aiController.suggestGoals));
aiRoutes.post('/chat-meal', asyncHandler(aiController.chatMeal));
aiRoutes.post(
  '/chat-meal-stream',
  validateBody(ChatMealStreamSchema),
  asyncHandler(aiController.chatMealStream)
);
