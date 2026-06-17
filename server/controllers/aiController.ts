import { Request, Response } from 'express';
import {
  analyzeFoodWithAI,
  reestimateNutrientsForUnit,
  getRecipeSuggestions,
  getDietaryInsights,
  suggestMeal,
  getMealInsight,
  suggestFoodForNutrient,
  suggestGoals,
  chatLogMeal,
  chatLogMealStream,
  type VisionImage,
} from '../services/aiService.js';
import { normalizeImageDataUrl } from '../services/imageService.js';
import { AIError } from '../errors.js';
import { logger } from '../logger.js';

// Run an AI service call and reply with JSON, mapping any failure to a typed
// AIError (502) so the central error handler renders it consistently.
async function run(res: Response, fn: () => Promise<unknown>): Promise<void> {
  try {
    res.json(await fn());
  } catch (error) {
    logger.error('AI request failed', { error: error instanceof Error ? error.message : String(error) });
    throw new AIError(error instanceof Error ? error.message : 'AI request failed');
  }
}

export const aiController = {
  analyzeFood: (req: Request, res: Response) =>
    run(res, () => analyzeFoodWithAI(req.body.foodQuery)),

  reestimateUnit: (req: Request, res: Response) =>
    run(res, () => reestimateNutrientsForUnit(req.body.foodName, req.body.unit)),

  recipes: (req: Request, res: Response) =>
    run(res, () =>
      getRecipeSuggestions(
        req.body.preferences,
        req.body.goals,
        req.body.recentFoods,
        req.body.dietPreference
      )
    ),

  insights: (req: Request, res: Response) =>
    run(res, () =>
      getDietaryInsights(
        req.body.currentWeight,
        req.body.targetWeight,
        req.body.recentNutrition,
        req.body.goals
      )
    ),

  suggestMeal: (req: Request, res: Response) =>
    run(res, () =>
      suggestMeal(
        req.body.remainingCalories,
        req.body.remainingProtein,
        req.body.remainingCarbs,
        req.body.remainingFats,
        req.body.remainingFiber,
        req.body.mealType,
        req.body.dietPreference,
        req.body.calorieCap
      )
    ),

  mealInsight: (req: Request, res: Response) =>
    run(res, () =>
      getMealInsight(
        req.body.mealType,
        req.body.consumed,
        req.body.target,
        req.body.laterMealTypes,
        req.body.dietPreference
      )
    ),

  suggestNutrient: (req: Request, res: Response) =>
    run(res, () =>
      suggestFoodForNutrient(req.body.nutrientName, req.body.currentAmount, req.body.targetAmount)
    ),

  suggestGoals: (req: Request, res: Response) =>
    run(res, () =>
      suggestGoals(
        req.body.height,
        req.body.currentWeight,
        req.body.age,
        req.body.gender,
        req.body.activityLevel,
        req.body.targetWeight
      )
    ),

  chatMeal: (req: Request, res: Response) =>
    run(res, () => chatLogMeal(req.body.history, req.body.loggedMeals, undefined, req.body.localTime)),

  // Streaming chat endpoint. Responds with newline-delimited JSON (NDJSON):
  //   {"t":"msg","v":"<assistant message so far>"}  - emitted as the reply streams
  //   {"t":"msg_done"}                              - reply finished; grounding nutrition next
  //   {"t":"done","v":<MealChatResult>}             - final, nutrition-grounded result
  //   {"t":"error","v":"<reason>"}                  - only if both streaming and fallback fail
  // If streaming fails mid-flight, fall back to the non-streaming path (which
  // carries retry/backoff) so the client still gets a usable result.
  async chatMealStream(req: Request, res: Response): Promise<void> {
    const history = req.body.history;
    const loggedMeals = req.body.loggedMeals;
    const localTime: string | undefined = req.body.localTime;

    // Optional photo: normalize (validate + decode + re-encode) up front so a
    // bad image fails as a 400 before we open the NDJSON stream. The normalized
    // data URL is echoed back in the final result so the client can persist
    // exactly what the model saw without re-uploading the original.
    const imageDataUrl: string | undefined = req.body.image;
    let image: VisionImage | undefined;
    let normalizedImageDataUrl: string | undefined;
    if (imageDataUrl) {
      const normalized = await normalizeImageDataUrl(imageDataUrl);
      image = { data: new Uint8Array(normalized.buffer), mediaType: normalized.mime };
      normalizedImageDataUrl = normalized.dataUrl;
    }

    res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('X-Accel-Buffering', 'no'); // disable proxy buffering for live streaming
    const write = (obj: unknown) => res.write(`${JSON.stringify(obj)}\n`);
    const withImage = (final: unknown) =>
      normalizedImageDataUrl ? { ...(final as object), image: normalizedImageDataUrl } : final;

    try {
      const final = await chatLogMealStream(
        history,
        loggedMeals,
        (text) => write({ t: 'msg', v: text }),
        () => write({ t: 'msg_done' }),
        image,
        localTime
      );
      write({ t: 'done', v: withImage(final) });
    } catch (error: unknown) {
      logger.error('Streaming chat failed, falling back to non-streaming', {
        error: error instanceof Error ? error.message : String(error),
      });
      try {
        const final = await chatLogMeal(history, loggedMeals, image, localTime);
        write({ t: 'done', v: withImage(final) });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'AI request failed';
        write({ t: 'error', v: message });
      }
    } finally {
      res.end();
    }
  },
};
