# Plan: Photo-based food logging

Let users log a meal from a photo. A vision model identifies foods + portions, then the result flows through the **existing MealChat pipeline** (stream -> editable proposal -> confirm/save). Privacy-first: the image is analyzed then discarded, never stored. The biggest leverage is that the two-stage extract-to-ground streaming flow and the proposal/confirm UI already exist - we mainly add a vision model path and a photo attach button.

## Confirmed decisions
- Photo attaches in the MealChat composer (standalone photo-only or photo+text), reusing the proposal/confirm UI.
- Image source: camera + file upload (`<input type=file accept=image/* capture=environment>`).
- Vision model: add optional `AI_VISION_MODEL`, fall back to `AI_MODEL`.
- Result handling: stream like MealChat (reuse NDJSON infra + proposal/confirm), results fully editable before saving.

## Key existing architecture to reuse
- Streaming pipeline: server `chatLogMealStream` (`server/services/aiService.ts` ~L913) uses `streamText` + `Output.object(MealExtractSchema)` -> `partialOutputStream` emits `message`, then 2-stage grounding via `assembleChatResult` / `resolveFoodsNutrition`.
- Controller `aiController.chatMealStream` writes NDJSON: `msg` / `msg_done` / `done` / `error`.
- Route `POST /api/ai/chat-meal-stream` (`server/routes/aiRoutes.ts`).
- Model factory `getModel()` (`server/services/aiService.ts` ~L55): singleton; switches provider (openai-compatible / azure / anthropic / google). Needs refactor to build a model by name so a second (vision) model can be cached.
- `ModelMessage` (from `ai`) supports multimodal content parts: `{type:'text'}` + `{type:'image', image}`.
- Frontend client `chatLogMealStream` (`src/services/openai.ts` L177) -> uses `readNdjsonStream`.
- Hook `useMealChat.ts` `sendChat()` builds history, calls stream, sets `proposedMeal`; `confirmChatMeal()` saves via `db.ts`.
- Composer UI: `src/components/foodLogger/MealChat.tsx`.
- `express.json` limit is 5mb (`server/app.ts` L28) -> must compress client-side.

## Steps

### Phase A - Backend vision support
1. `server/env.ts`: add optional `AI_VISION_MODEL` to the env schema.
2. `server/services/aiService.ts`: refactor the provider construction in `getModel()` into a `createModel(modelName)` helper; add a separately-cached `getVisionModel()` (uses `AI_VISION_MODEL || AI_MODEL`).
3. `server/services/aiService.ts`: extend `chatLogMealStream` (and `chatLogMeal` fallback) to accept an optional `image`. When present, use the vision model and attach the image to the latest user turn as multimodal `ModelMessage` content (`[{type:'text'}, {type:'image'}]`). *depends on 2*
4. `server/prompts/index.ts`: add a vision guidance note for `mealChatSystemPrompt` (identify visible foods, estimate portions in Indian units, set confidence from clarity, ask `need_info` if ambiguous).
5. `server/validation.ts`: add an image input schema (base64/data-URL + mime enum + size bound).
6. `server/controllers/aiController.ts`: read optional `image` in `chatMealStream` and pass through (incl. fallback path). *depends on 3*
7. `server/routes/aiRoutes.ts`: wire validate middleware onto the existing `chat-meal-stream` route (no new route).

### Phase B - Frontend capture + flow
8. `src/services/openai.ts`: `chatLogMealStream` gains an optional `image` param in the POST body.
9. New compress helper in `src/components/foodLogger/foodLoggerUtils.ts`: canvas-resize to ~1024px, JPEG ~0.7 -> data URL (keeps payload under the 5mb body limit and cuts tokens).
10. `src/components/foodLogger/useMealChat.ts`: add `pendingImage` state + attach/clear; `sendChat` allows photo-only or photo+text; show a thumbnail on the user bubble; pass compressed image to the stream call. *depends on 8, 9*
11. `src/components/foodLogger/MealChat.tsx`: camera/upload button with hidden `<input type=file accept=image/* capture=environment>`, image preview + remove, bubble thumbnails. *depends on 10*

### Phase C - Docs & tests
12. Update `.env.example`, `README.md`, `docs/FEATURES.md`, and the photo row in `docs/TODO.md`.
13. Backend tests for `getVisionModel` fallback + multimodal message assembly (mock `streamText`); frontend test for the compress helper / attach interaction.

## Verification
1. `npm run lint` and `npm run build` pass.
2. `npm test` passes with new tests.
3. Manual: set a vision `AI_VISION_MODEL`, attach a meal photo -> streamed identification -> editable proposal -> confirm saves -> reload shows it.
4. Edge cases: ambiguous photo -> `need_info`; large image still uploads (compressed); no vision model set -> falls back to `AI_MODEL`.

## Scope
- **Included:** photo capture in chat composer, vision analysis via existing streaming + proposal/confirm pipeline, optional `AI_VISION_MODEL`, client compression, validation, docs/tests.
- **Excluded:** barcode scanning (separate TODO item); persisting the photo with the meal (privacy-first - analyze then discard); multi-image; re-sending the image on follow-up clarification turns (only the initiating turn carries the image, follow-ups continue as text).

## Further considerations
1. Follow-up clarification turns: the image is only sent on the first turn; follow-ups continue as text against the already-extracted foods. Recommended (simpler, cheaper). Alternative: keep the image in context across turns (more tokens, needs vision model every turn).
2. Body size: recommend client-side compression and keeping the 5mb limit. Alternative: raise the JSON limit instead (riskier for memory/DoS).
