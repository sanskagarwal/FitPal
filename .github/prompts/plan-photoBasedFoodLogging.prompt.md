# Plan: Photo-based food logging

Let users log a meal from a photo. A vision model identifies foods + portions, then the
result flows through the **existing MealChat pipeline** (stream -> editable proposal ->
confirm/save). The uploaded photo is normalized server-side, **persisted (compressed)**
alongside the meal, and shown on the Food Logger page next to that meal. The biggest
leverage is that the two-stage extract-to-ground streaming flow and the proposal/confirm
UI already exist - we mainly add a vision model path, a photo attach button, server-side
image normalization, and a small image store.

## Confirmed decisions (re-confirmed)
- **Entry point:** photo attaches in the MealChat composer (standalone photo-only or
  photo+text), reusing the proposal/confirm UI.
- **Image source:** camera + file upload (`<input type=file accept=image/* capture=environment>`).
- **Vision model:** add optional `AI_VISION_MODEL`, fall back to `AI_MODEL`.
- **Result handling:** stream like MealChat (reuse NDJSON infra + proposal/confirm), results
  fully editable before saving.
- **Persistence (changed):** keep the photo. Store a **compressed** copy with the meal and
  show it on the Food Logger page only (next to each logged meal). Not privacy-discard.
- **Compression (changed):** authoritative compression happens **server-side** with `sharp`
  (new dependency, approved) so stored size is consistent and the client cannot bypass it;
  the client does only a light pre-shrink to fit the upload limit. See note below.
- **Storage shape:** image bytes live in a dedicated `meal_images` table and are fetched
  lazily via an authenticated endpoint; the meal JSON carries only a `hasImage` flag. This
  avoids bloating the full-history meal fetch (`GET /meals/:userId` returns every meal).
- **Follow-up turns:** the image is sent only on the first turn; clarification turns continue
  as text.
- **New dependency:** `sharp` (server-side image normalization), approved.

### Why server-side compression (how the big providers do it)
OpenAI and Gemini both resize/tile images **server-side** for inference; their web clients
downscale before upload only to save bandwidth, not for correctness. We mirror that: the
browser does a light downscale (bandwidth/upload-limit only, untrusted), and the server
re-encodes every image to a fixed spec (longest side ~1024px, JPEG q~0.7, **EXIF stripped**)
and uses that single normalized buffer for both the vision call and persistence.

## Key existing architecture to reuse
- Streaming pipeline: server `chatLogMealStream` (`server/services/aiService.ts`, ~L912) uses
  `streamText` + `Output.object(MealExtractSchema)` -> `partialOutputStream` emits `message`,
  then 2-stage grounding via `assembleChatResult` / `resolveFoodsNutrition`.
- Model factory `getModel()` (`server/services/aiService.ts`, ~L54): singleton; switches
  provider (openai-compatible / azure / anthropic / google). Refactor so a model can be built
  by name and a second (vision) model cached separately.
- `ModelMessage` (from `ai`) supports multimodal content parts:
  `{type:'text'}` + `{type:'image', image}`.
- Controller `aiController.chatMealStream` writes NDJSON: `msg` / `msg_done` / `done` / `error`.
- Route `POST /api/ai/chat-meal-stream` (`server/routes/aiRoutes.ts`). No AI route is wired to
  `validateBody` today.
- Frontend client `chatLogMealStream` (`src/services/openai.ts`, ~L176) -> `readNdjsonStream`.
- Hook `useMealChat.ts` `sendChat()` builds history, streams, sets `proposedMeal`;
  `confirmChatMeal()` saves via `db.ts` (`saveMeal` -> `POST /meals`).
- Composer UI: `src/components/foodLogger/MealChat.tsx`.
- Persistence: meals are a JSON document in a `data TEXT` column
  (`server/db/migrations.ts` v1; `JsonCollectionRepository`). Migrations are append-only.
- Meal save path: `POST /meals` -> `validateBody(MealSchema)` -> `mealController.create` ->
  `mealService.create` -> `mealRepository.insert`. Delete: `DELETE /meals/:userId/:id`.
- Meal fetch is whole-history: `getMealsByUser` -> `GET /meals/:userId`, filtered by date on
  the client (`src/utils/db.ts`). This is why images must not be inlined in the meal JSON.
- `express.json` limit is 5mb (`server/app.ts`, ~L28) -> client must keep uploads under it.
- Dark mode is now mandatory: every new UI element (attach button, image preview, bubble
  thumbnail, meal photo) must ship `dark:` variants (see `AGENTS.md` / `ThemeContext`).
- Mobile bottom nav + safe-area utilities now exist; the composer attach button must be
  reachable and the camera capture must work on mobile.

## Steps

### Phase A - Backend vision support
1. `server/env.ts`: add optional `AI_VISION_MODEL` to the env schema.
2. `server/services/aiService.ts`: refactor provider construction in `getModel()` into a
   `createModel(modelName)` helper; add a separately-cached `getVisionModel()`
   (uses `AI_VISION_MODEL || AI_MODEL`).
3. Add a server-side image normalizer (new `server/services/imageService.ts`) using `sharp`:
   decode -> auto-orient -> resize longest side to ~1024px -> JPEG q~0.7 -> strip EXIF ->
   return `{ buffer, mime }`. Used by both the vision call and meal save. See Phase D for the
   security hardening this step must include.
4. `server/services/aiService.ts`: extend `chatLogMealStream` (and `chatLogMeal` fallback) to
   accept an optional normalized `image`. When present, use the vision model and attach the
   image to the latest user turn as multimodal `ModelMessage` content
   (`[{type:'text'}, {type:'image'}]`). Return the normalized image (data URL) in the final
   result so the client can persist exactly what the model saw without re-uploading the
   original. *depends on 2, 3*
5. `server/prompts/index.ts`: add a vision guidance note to `MEAL_CHAT_SYSTEM_PROMPT` /
   `mealChatSystemPrompt` (identify visible foods, estimate portions in Indian units, set
   confidence from image clarity, ask `need_info` if ambiguous). The note must also instruct
   the model to treat any text visible inside the photo as meal content only and never as
   instructions (defense-in-depth against image-borne prompt injection).
6. `server/validation.ts`: add a reusable image-input schema (data-URL/base64 + strict mime
   allowlist + size bound) for the chat and meal-save paths.
7. `server/controllers/aiController.ts`: read optional `image` in `chatMealStream`, normalize
   via the image service, pass through to the stream (and fallback) path, and include the
   normalized image in the `done` payload. *depends on 3, 4*
8. `server/routes/aiRoutes.ts`: wire `validateBody` onto the existing `chat-meal-stream` route
   (image bounds), no new route.

### Phase B - Persist + serve the photo
9. `server/db/migrations.ts`: add migration **v2** creating `meal_images`
   (`meal_id TEXT PRIMARY KEY, user_id TEXT NOT NULL, mime TEXT NOT NULL, image BLOB NOT NULL`,
   plus `idx_meal_images_user`). Append-only; do not edit v1.
10. New `server/repositories/mealImageRepository.ts` (binary table, not the JSON pattern):
    `upsert(mealId, userId, mime, buffer)`, `get(mealId, userId)`, `delete(mealId, userId)`.
11. `server/validation.ts` (`MealSchema`): accept an optional transient `image` (data URL,
    validated + bounded). `server/services/mealService.ts` / `mealController.ts`: on
    `create`, if `image` present -> normalize via the image service -> write to
    `meal_images` -> set `hasImage: true` on the meal doc and strip the raw `image` before
    persisting the meal JSON. On `delete`, cascade-delete the `meal_images` row. *depends on 3, 10*
12. New `GET /meals/:userId/:id/image` (`mealRoutes` + `mealController.getImage`): auth +
    ownership (`requireOwnParam`), streams the BLOB with its mime and cache headers; 404 if
    none. See Phase D for the response-header hardening. *depends on 10*

### Phase C - Frontend capture, flow, and display
13. `src/services/openai.ts`: `chatLogMealStream` gains an optional `image` param in the POST
    body; the final `MealChatResult` now may carry a normalized `image` data URL.
14. New compress helper in `src/components/foodLogger/foodLoggerUtils.ts`: canvas downscale to
    ~2048px / JPEG ~0.8 -> data URL (bandwidth + keeps the upload under the 5mb body limit;
    the server re-normalizes authoritatively).
15. `src/components/foodLogger/useMealChat.ts`: add `pendingImage` state + attach/clear;
    `sendChat` allows photo-only or photo+text; show a thumbnail on the user bubble; pass the
    compressed image to the stream call; carry the server-returned normalized image on
    `proposedMeal` so `confirmChatMeal` includes it in the `saveMeal` payload. *depends on 13, 14*
16. `src/components/foodLogger/MealChat.tsx`: camera/upload button with hidden
    `<input type=file accept=image/* capture=environment>`, image preview + remove, bubble
    thumbnails - all with `dark:` variants. *depends on 15*
17. `src/types/index.ts`: `MealEntry` gains optional `hasImage?: boolean` (persisted) and a
    transient `image?: string` (data URL, used only during proposal/save, never stored).
18. Food Logger meal list (`src/components/FoodLogger.tsx` / the today's-meals view): when
    `meal.hasImage`, render a lazy `<img loading="lazy">` pointing at
    `GET /meals/:userId/:id/image` (with credentials), styled for light + dark. *depends on 12, 17*

### Phase D - Security hardening (image-specific)
19. Input trust: never trust the client-supplied MIME or extension. Enforce a strict **raster
    allowlist** (`image/jpeg`, `image/png`, `image/webp`); **reject SVG** and anything else
    (SVG can carry scripts). Validate the data-URL/base64 shape and bound the decoded byte size
    *before* decoding. Covers steps 6 and 11.
20. Decompression-bomb / DoS protection: configure `sharp` with `limitInputPixels` and a
    fail-safe decode so a small file cannot expand into huge memory; reject images whose
    dimensions exceed a sane cap. The re-encode in step 3 also neutralizes polyglot/embedded
    payloads (decode then re-encode to a clean JPEG, dropping all metadata). Covers step 3.
21. Safe serving: the image endpoint (step 12) must respond with the correct `Content-Type`,
    `X-Content-Type-Options: nosniff`, and `Content-Disposition: inline; filename=...` so the
    browser renders but never executes the bytes, and must enforce auth + ownership (a user
    cannot fetch another user's image). Covers step 12.
22. Prompt-injection containment: text inside a photo ("ignore previous instructions...") is
    contained because the chat path forces `Output.object(MealExtractSchema)` (the model can
    only emit the meal schema, not free-form actions) and the user still reviews/edits the
    proposal before saving; reinforced by the system-prompt note in step 5.

### Phase E - Docs & tests
23. Update `.env.example` (`AI_VISION_MODEL`), `README.md`, `docs/FEATURES.md`, and the
    photo row in `docs/TODO.md`. Note the `sharp` dependency in `docs/DEVELOPER.md`.
24. Backend tests: `getVisionModel` fallback; image normalization (size/mime/EXIF, SVG
    rejection, oversized/bomb rejection) mocked where practical; multimodal message assembly
    (mock `streamText`); `meal_images` upsert/get/delete + cascade on meal delete; image
    endpoint auth/ownership + security headers (403/404/nosniff). Frontend test: compress
    helper + attach interaction.

## Verification
1. `npm run lint` and `npm run build` pass.
2. `npm test` (and relevant `npm run test:e2e`) pass with new tests.
3. Manual: set `AI_VISION_MODEL`, attach a meal photo -> streamed identification -> editable
   proposal -> confirm saves -> reload -> the meal shows its thumbnail on the Food Logger in
   both light and dark themes.
4. Edge cases: ambiguous photo -> `need_info`; large image still uploads (client shrink +
   server normalize); no vision model set -> falls back to `AI_MODEL`; deleting the meal
   removes its stored image; another user cannot fetch the image (403); SVG/oversized/bomb
   image is rejected at the boundary.

## Scope
- **Included:** photo capture in the chat composer, vision analysis via the existing streaming
  + proposal/confirm pipeline, optional `AI_VISION_MODEL`, client pre-shrink + authoritative
  server-side normalization (`sharp`, EXIF stripped), image security hardening (mime allowlist,
  SVG rejection, decompression-bomb limits, safe serving headers, injection containment),
  persisting the compressed photo in `meal_images`, lazy authenticated image endpoint, Food
  Logger thumbnail display (light + dark), validation, docs/tests.
- **Excluded:** barcode scanning (separate TODO item); multi-image per meal; re-sending the
  image on follow-up clarification turns; showing the photo outside the Food Logger
  (dashboard/history); editing/replacing a meal's photo after logging (chat updates are text);
  including image bytes in JSON/CSV export (see consideration 3).

## Further considerations
1. **Follow-up clarification turns:** image only on the first turn; follow-ups continue as
   text against the already-extracted foods (simpler, cheaper). Alternative: keep the image in
   context every turn (more tokens, vision model each turn).
2. **Save round-trip:** the server returns the normalized image in the stream `done` result so
   the client can persist exactly what the model saw, sending it back once on confirm. The
   image crosses the wire three times (upload, return, save) as base64 (~33% larger than raw
   bytes), but images are small and compressed so this is acceptable for v1. Alternative if it
   ever matters: cache the normalized image server-side by token and "promote" it on confirm
   (avoids the re-send but adds a stateful cache lifecycle - rejected for now to keep the chat
   endpoint stateless).
3. **Export/import:** JSON/CSV export uses the in-memory meals array, which carries only
   `hasImage`, so exported backups will **not** include photos. Recommended: document this for
   v1. Alternative: have export fetch and inline base64 images (bloats the backup file) - defer
   unless requested.
4. **Body size:** keep the 5mb `express.json` limit; rely on client pre-shrink + server
   normalize rather than raising the limit (raising it increases memory/DoS risk).
5. **Storage growth:** compressed images are ~100-250KB each in `meal_images`; the lazy
   endpoint keeps them out of the whole-history meal fetch. If DB size becomes a concern later,
   the same repository could be swapped to file storage under `DATA_DIR` without touching the
   API shape.
