import { Router } from 'express';
import { aiController } from '../controllers/aiController.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

// AI proxy routes. Mounted behind auth + rate limiting (see routes/index.ts).
// Azure/OpenAI calls run here so the provider key never reaches the browser.
export const aiRoutes = Router();

aiRoutes.post('/analyze-food', asyncHandler(aiController.analyzeFood));
aiRoutes.post('/reestimate-unit', asyncHandler(aiController.reestimateUnit));
aiRoutes.post('/recipes', asyncHandler(aiController.recipes));
aiRoutes.post('/insights', asyncHandler(aiController.insights));
aiRoutes.post('/suggest-meal', asyncHandler(aiController.suggestMeal));
aiRoutes.post('/suggest-nutrient', asyncHandler(aiController.suggestNutrient));
aiRoutes.post('/suggest-goals', asyncHandler(aiController.suggestGoals));
aiRoutes.post('/chat-meal', asyncHandler(aiController.chatMeal));
aiRoutes.post('/chat-meal-stream', asyncHandler(aiController.chatMealStream));
