import { Food, NutrientInfo, Recipe } from '../types';

// Azure OpenAI Configuration
// Users will need to set these in their environment or config
const AZURE_OPENAI_ENDPOINT = import.meta.env.VITE_AZURE_OPENAI_ENDPOINT || '';
const AZURE_OPENAI_KEY = import.meta.env.VITE_AZURE_OPENAI_KEY || '';
const AZURE_OPENAI_DEPLOYMENT = import.meta.env.VITE_AZURE_OPENAI_DEPLOYMENT || 'gpt-4o';

interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

const SYSTEM_PROMPT = `You are FitPal, an expert nutritionist specializing in Indian cuisine. You help users track their nutrition by providing accurate nutritional information about Indian foods and meals. 

Key responsibilities:
1. Identify Indian foods even with misspellings or incomplete entries
2. Provide detailed macro and micronutrient analysis
3. Suggest similar Indian foods and alternatives
4. Recommend healthy Indian recipes
5. Give personalized dietary insights for weight management and fitness goals

Always respond in JSON format when analyzing foods. Be culturally accurate and focus on Indian meals, ingredients, and cooking methods.`;

// Helper function to parse JSON that might be wrapped in markdown code blocks
function parseJSONResponse(response: string): any {
  // Remove markdown code blocks if present
  let cleanedResponse = response.trim();
  
  // Remove ```json and ``` markers
  if (cleanedResponse.startsWith('```json')) {
    cleanedResponse = cleanedResponse.slice(7);
  } else if (cleanedResponse.startsWith('```')) {
    cleanedResponse = cleanedResponse.slice(3);
  }
  
  if (cleanedResponse.endsWith('```')) {
    cleanedResponse = cleanedResponse.slice(0, -3);
  }
  
  cleanedResponse = cleanedResponse.trim();
  
  try {
    return JSON.parse(cleanedResponse);
  } catch (error) {
    throw new Error(`Failed to parse JSON response: ${error instanceof Error ? error.message : 'Unknown error'}. Response was: ${cleanedResponse.substring(0, 200)}...`);
  }
}

async function callAzureOpenAI(messages: OpenAIMessage[]): Promise<string> {
  if (!AZURE_OPENAI_ENDPOINT || !AZURE_OPENAI_KEY) {
    throw new Error('Azure OpenAI credentials not configured. Please set VITE_AZURE_OPENAI_ENDPOINT and VITE_AZURE_OPENAI_KEY in your .env file.');
  }

  const response = await fetch(`${AZURE_OPENAI_ENDPOINT}/openai/deployments/${AZURE_OPENAI_DEPLOYMENT}/chat/completions?api-version=2024-08-01-preview`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': AZURE_OPENAI_KEY,
    },
    body: JSON.stringify({
      messages,
      temperature: 0.7,
      max_tokens: 2000,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Azure OpenAI API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  
  if (!data.choices || !data.choices[0] || !data.choices[0].message) {
    throw new Error('Invalid response from Azure OpenAI API');
  }
  
  return data.choices[0].message.content;
}

export async function analyzeFoodWithAI(foodQuery: string): Promise<Food[]> {
  const messages: OpenAIMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    {
      role: 'user',
      content: `Analyze this Indian food query: "${foodQuery}"
      
Return a JSON array of matching foods with this structure:
[{
  "name": "Food name",
  "servingSize": "1 standard serving described in the most natural unit for this food",
  "isIndian": true,
  "category": "breakfast/lunch/dinner/snack",
  "nutrients": {
    "calories": number,
    "protein": number,
    "carbs": number,
    "fats": number,
    "fiber": number,
    "sugar": number,
    "sodium": number,
    "vitaminA": number,
    "vitaminC": number,
    "vitaminD": number,
    "calcium": number,
    "iron": number,
    "magnesium": number,
    "potassium": number
  }
}]

For servingSize, use the unit Indians naturally use for that food and include an approximate gram/ml weight in parentheses:
- Use "katori" for dal, sabzi, curry, rice, kheer (e.g., "1 katori (~150g)")
- Use "piece" for roti, chapati, idli, samosa, paratha, dosa (e.g., "1 piece (~40g)")
- Use "glass" for milk, lassi, juice (e.g., "1 glass (~250ml)")
- Use "bowl" or "plate" for larger portions, "tbsp"/"tsp" for ghee, chutney, pickle
The nutrients you return MUST correspond to exactly ONE of that serving unit.

If the food is misspelled or incomplete, suggest the most likely Indian foods. Return up to 3 matching options.`
    }
  ];

  try {
    const response = await callAzureOpenAI(messages);
    const foods = parseJSONResponse(response);
    
    if (!Array.isArray(foods)) {
      throw new Error('Expected an array of foods from AI response');
    }
    
    return foods.map((food: any) => ({
      id: `food-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: food.name,
      servingSize: food.servingSize,
      isIndian: food.isIndian ?? true,
      category: food.category,
      nutrients: food.nutrients
    }));
  } catch (error) {
    console.error('Error analyzing food:', error);
    // Throw the error to show it to the user
    throw error;
  }
}

export async function getRecipeSuggestions(
  preferences: string,
  goals: string,
  recentFoods: string[],
  dietPreference?: string
): Promise<Recipe[]> {
  const dietLine = dietPreference
    ? `\nDietary type: ${dietPreference}. ${
        dietPreference === 'vegetarian'
          ? 'Only suggest pure vegetarian recipes (no meat, fish, or eggs).'
          : dietPreference === 'eggetarian'
          ? 'Vegetarian recipes plus eggs are allowed, but no meat or fish.'
          : 'Non-vegetarian recipes are allowed (meat, fish, eggs).'
      }`
    : '';
  const messages: OpenAIMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    {
      role: 'user',
      content: `Suggest 3 healthy Indian recipes based on:
Preferences: ${preferences}
Goals: ${goals}
Recent foods: ${recentFoods.join(', ')}${dietLine}

Return JSON array:
[{
  "name": "Recipe name",
  "description": "Brief description",
  "ingredients": ["ingredient 1", "ingredient 2"],
  "instructions": ["step 1", "step 2"],
  "prepTime": "30 minutes",
  "servings": 2,
  "nutrients": {
    "calories": number,
    "protein": number,
    "carbs": number,
    "fats": number
  }
}]`
    }
  ];

  try {
    const response = await callAzureOpenAI(messages);
    const recipes = parseJSONResponse(response);
    
    if (!Array.isArray(recipes)) {
      throw new Error('Expected an array of recipes from AI response');
    }
    
    return recipes.map((recipe: any) => ({
      id: `recipe-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...recipe
    }));
  } catch (error) {
    console.error('Error getting recipes:', error);
    // Throw the error to show it to the user
    throw error;
  }
}

export async function getDietaryInsights(
  currentWeight: number,
  targetWeight: number,
  recentNutrition: NutrientInfo,
  goals: string
): Promise<string> {
  const messages: OpenAIMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    {
      role: 'user',
      content: `Provide dietary insights for an Indian diet:
Current weight: ${currentWeight}kg
Target weight: ${targetWeight}kg
Recent daily average nutrition: ${JSON.stringify(recentNutrition)}
Goals: ${goals}

Give 3-5 specific, actionable recommendations for achieving their goals through Indian cuisine.`
    }
  ];

  try {
    return await callAzureOpenAI(messages);
  } catch (error) {
    console.error('Error getting insights:', error);
    return 'Focus on portion control and include more protein-rich foods like dal, paneer, and yogurt. Stay hydrated and maintain regular meal times.';
  }
}

export interface MealSuggestion {
  name: string;
  description: string;
  mealType: string;
  ingredients: { item: string; portion: string }[];
  nutrition: { calories: number; protein: number; carbs: number; fats: number; fiber: number };
  reason: string;
}

export interface NutrientFoodItem {
  name: string;
  content: string;
  portion: string;
}

export interface NutrientSuggestion {
  nutrient: string;
  foods: NutrientFoodItem[];
  tips: string[];
}

export async function suggestMeal(
  remainingCalories: number,
  remainingProtein: number,
  remainingCarbs: number,
  remainingFats: number,
  remainingFiber: number,
  mealType: string,
  dietPreference?: string
): Promise<MealSuggestion> {
  const dietLine = dietPreference
    ? `\nDietary type: ${dietPreference}. ${
        dietPreference === 'vegetarian'
          ? 'Only suggest pure vegetarian foods (no meat, fish, or eggs).'
          : dietPreference === 'eggetarian'
          ? 'Vegetarian foods plus eggs are allowed, but no meat or fish.'
          : 'Non-vegetarian foods are allowed (meat, fish, eggs).'
      }`
    : '';
  const messages: OpenAIMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    {
      role: 'user',
      content: `Suggest a single Indian ${mealType} meal to help meet these remaining daily targets:
Calories: ${remainingCalories} kcal
Protein: ${remainingProtein}g
Carbs: ${remainingCarbs}g
Fats: ${remainingFats}g
Fiber: ${remainingFiber}g${dietLine}

Return ONLY a JSON object (no markdown, no extra text) with this EXACT structure:
{
  "name": "Name of the meal",
  "description": "One short sentence describing the meal",
  "ingredients": [
    { "item": "Ingredient name", "portion": "1 katori" }
  ],
  "nutrition": { "calories": number, "protein": number, "carbs": number, "fats": number, "fiber": number },
  "reason": "One or two short sentences explaining why this meal fits the remaining goals"
}

Use common, easily available Indian foods. Keep portions realistic (katori, piece, glass, tbsp, etc.). All nutrition numbers must be totals for the whole meal.`
    }
  ];

  try {
    const raw = await callAzureOpenAI(messages);
    const parsed = parseJSONResponse(raw);
    const n = parsed.nutrition || {};
    return {
      name: parsed.name || `${mealType} suggestion`,
      description: parsed.description || '',
      mealType,
      ingredients: Array.isArray(parsed.ingredients)
        ? parsed.ingredients
            .map((i: any) => ({ item: String(i.item || ''), portion: String(i.portion || '') }))
            .filter((i: any) => i.item)
        : [],
      nutrition: {
        calories: Math.round(Number(n.calories) || 0),
        protein: Math.round(Number(n.protein) || 0),
        carbs: Math.round(Number(n.carbs) || 0),
        fats: Math.round(Number(n.fats) || 0),
        fiber: Math.round(Number(n.fiber) || 0),
      },
      reason: parsed.reason || '',
    };
  } catch (error) {
    console.error('Error getting meal suggestion:', error);
    return {
      name: 'Balanced Indian plate',
      description: 'A simple, balanced meal using everyday Indian foods.',
      mealType,
      ingredients: [
        { item: 'Dal (lentils)', portion: '1 katori' },
        { item: 'Roti or rice', portion: '2 pieces / 1 katori' },
        { item: 'Mixed vegetable sabzi', portion: '1 katori' },
        { item: 'Curd', portion: '1 katori' },
      ],
      nutrition: {
        calories: Math.max(0, Math.round(remainingCalories)),
        protein: Math.max(0, Math.round(remainingProtein)),
        carbs: Math.max(0, Math.round(remainingCarbs)),
        fats: Math.max(0, Math.round(remainingFats)),
        fiber: Math.max(0, Math.round(remainingFiber)),
      },
      reason: 'Balances protein, carbs, fibre and a little healthy fat to fill your remaining goals.',
    };
  }
}

export async function suggestFoodForNutrient(
  nutrientName: string,
  currentAmount: number,
  targetAmount: number
): Promise<NutrientSuggestion> {
  const deficit = targetAmount - currentAmount;
  const messages: OpenAIMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    {
      role: 'user',
      content: `Suggest Indian foods rich in ${nutrientName}.

Current: ${Math.round(currentAmount)}
Target: ${Math.round(targetAmount)}
Need: ${Math.round(deficit)} more

Return ONLY a JSON object (no markdown, no extra text) with this EXACT structure:
{
  "foods": [
    { "name": "Food name", "content": "amount of ${nutrientName} per portion e.g. 12g", "portion": "1 katori" }
  ],
  "tips": [
    "Short, practical tip to add this food to a meal"
  ]
}

Provide 3-5 commonly available Indian foods high in ${nutrientName}, with realistic portions, and 2-3 short tips.`
    }
  ];

  try {
    const raw = await callAzureOpenAI(messages);
    const parsed = parseJSONResponse(raw);
    const foodsRaw = parsed.foods || parsed.top_foods || [];
    return {
      nutrient: nutrientName,
      foods: Array.isArray(foodsRaw)
        ? foodsRaw
            .map((f: any) => ({
              name: String(f.name || f.item || ''),
              content: String(f.content || f.amount || ''),
              portion: String(f.portion || ''),
            }))
            .filter((f: any) => f.name)
        : [],
      tips: Array.isArray(parsed.tips)
        ? parsed.tips.map((t: any) => String(t)).filter(Boolean)
        : [],
    };
  } catch (error) {
    console.error('Error getting food suggestion:', error);
    return {
      nutrient: nutrientName,
      foods: [],
      tips: [
        `Include more ${nutrientName}-rich foods such as dairy, pulses, vegetables and whole grains.`,
      ],
    };
  }
}

export async function suggestGoals(
  height: number,
  currentWeight: number,
  age: number,
  gender: string,
  activityLevel: string,
  targetWeight: number
): Promise<{
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  fiber: number;
  explanation: string;
}> {
  const messages: OpenAIMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    {
      role: 'user',
      content: `Calculate recommended daily nutrition goals for:
Height: ${height}cm
Current Weight: ${currentWeight}kg
Age: ${age}
Gender: ${gender}
Activity Level: ${activityLevel}
Target Weight: ${targetWeight}kg
Goal direction: ${
        targetWeight < currentWeight
          ? 'weight loss (apply a moderate calorie deficit)'
          : targetWeight > currentWeight
          ? 'weight gain (apply a moderate calorie surplus)'
          : 'weight maintenance (no deficit or surplus)'
      }

Provide goals in JSON format:
{
  "calories": number,
  "protein": number,
  "carbs": number,
  "fats": number,
  "fiber": number,
  "explanation": "brief explanation of why these goals are appropriate"
}

First compute maintenance calories (TDEE) using a standard BMR formula (Mifflin-St Jeor or Harris-Benedict) times an activity factor. Then adjust the calorie target toward the target weight: apply a safe deficit of about 300-500 kcal/day for weight loss, or a surplus of about 250-500 kcal/day for weight gain, and no adjustment for maintenance. Never recommend fewer than 1200 kcal/day for women or 1500 kcal/day for men. Keep protein high enough to preserve muscle during a deficit, and use macronutrient ratios appropriate for an Indian diet. In the explanation, state the maintenance calories, the deficit/surplus applied, and why.`
    }
  ];

  try {
    const response = await callAzureOpenAI(messages);
    return JSON.parse(response);
  } catch (error) {
    console.error('Error getting goal suggestions:', error);
    // Return basic calculations as fallback
    const bmr = gender === 'male' 
      ? 10 * currentWeight + 6.25 * height - 5 * age + 5
      : 10 * currentWeight + 6.25 * height - 5 * age - 161;
    
    const activityMultiplier = {
      'sedentary': 1.2,
      'light': 1.375,
      'moderate': 1.55,
      'active': 1.725,
      'very-active': 1.9
    }[activityLevel] || 1.5;

    const maintenanceCalories = Math.round(bmr * activityMultiplier);

    // Adjust toward target weight with a safe deficit/surplus.
    let calories = maintenanceCalories;
    let adjustmentNote = 'no adjustment (maintenance)';
    if (targetWeight < currentWeight) {
      calories = maintenanceCalories - 500; // ~0.5 kg/week loss
      adjustmentNote = 'a 500 kcal/day deficit for weight loss';
    } else if (targetWeight > currentWeight) {
      calories = maintenanceCalories + 300; // lean gain
      adjustmentNote = 'a 300 kcal/day surplus for weight gain';
    }

    // Enforce a safe minimum floor.
    const minCalories = gender === 'male' ? 1500 : 1200;
    calories = Math.max(minCalories, calories);

    const protein = Math.round(currentWeight * 1.6);
    const fats = Math.round((calories * 0.25) / 9);
    const carbs = Math.round((calories - (protein * 4) - (fats * 9)) / 4);
    const fiber = 30;

    return {
      calories,
      protein,
      carbs,
      fats,
      fiber,
      explanation: `Maintenance is about ${maintenanceCalories} kcal/day (BMR × activity). Applied ${adjustmentNote} to move toward your target weight of ${targetWeight}kg.`
    };
  }
}

// ---------------------------------------------------------------------------
// Agentic, conversational meal logging
// ---------------------------------------------------------------------------

export interface ParsedMealFood {
  name: string;
  servingSize: string; // describes ONE unit, e.g. "1 katori (~150g)"
  unit:
    | 'serving'
    | 'katori'
    | 'bowl'
    | 'plate'
    | 'cup'
    | 'glass'
    | 'tbsp'
    | 'tsp'
    | 'piece'
    | 'slice'
    | 'gram'
    | 'ml'
    | 'oz';
  unitQuantity: number; // how many of `unit` the user had
  isIndian: boolean;
  category?: string;
  nutrients: NutrientInfo; // per ONE unit
}

export interface MealChatResult {
  status: 'need_info' | 'ready';
  message: string; // assistant's reply: a clarifying question or a confirmation summary
  mealType?: 'breakfast' | 'morning-snack' | 'lunch' | 'evening-snack' | 'dinner';
  time?: string | null; // HH:mm if known
  foods: ParsedMealFood[];
}

const MEAL_CHAT_SYSTEM_PROMPT = `You are FitPal's agentic meal-logging assistant, an expert nutritionist specializing in Indian cuisine.

The user describes, in natural language, what they ate and (optionally) when. Your job is to turn that into a precise, logged meal.

Behaviour:
1. Extract every food, its quantity, and the unit. Pick the unit Indians naturally use for each food:
   - "katori" for dal, sabzi, curry, rice, kheer, raita
   - "piece" for roti, chapati, idli, samosa, paratha, dosa, vada
   - "glass" for milk, lassi, juice, buttermilk
   - "bowl"/"plate" for larger portions; "tbsp"/"tsp" for ghee, chutney, pickle, sugar
   - "slice" for bread/cake; otherwise "gram"/"ml"/"serving"/"cup"/"oz"
2. Ask SHORT clarifying questions ONLY when something important is genuinely ambiguous (unclear quantity, unknown food, or you cannot reasonably infer the meal type). Do not over-ask — make sensible assumptions for obvious cases and state them.
3. Infer mealType from the food or the stated time when possible (e.g. dosa in the morning -> breakfast).
4. Provide nutrients for exactly ONE unit of each food (not the total).

ALWAYS respond with ONLY a JSON object (no markdown) in this exact shape:
{
  "status": "need_info" | "ready",
  "message": "If need_info: a short, friendly clarifying question. If ready: a one-line confirmation summary of what will be logged.",
  "mealType": "breakfast" | "morning-snack" | "lunch" | "evening-snack" | "dinner" | null,
  "time": "HH:mm" or null,
  "foods": [
    {
      "name": "Food name",
      "servingSize": "1 katori (~150g)",
      "unit": "katori",
      "unitQuantity": 2,
      "isIndian": true,
      "category": "lunch",
      "nutrients": {
        "calories": number, "protein": number, "carbs": number, "fats": number,
        "fiber": number, "sugar": number, "sodium": number,
        "vitaminA": number, "vitaminC": number, "vitaminD": number,
        "calcium": number, "iron": number, "magnesium": number, "potassium": number
      }
    }
  ]
}

When status is "need_info", you may still include any foods you have already understood (with your best-guess quantities) so the user sees progress, but set status to "need_info" until the open question is resolved. When everything needed is known, set status to "ready" and include the full list of foods.`;

export async function chatLogMeal(
  history: { role: 'user' | 'assistant'; content: string }[]
): Promise<MealChatResult> {
  const now = new Date();
  const messages: OpenAIMessage[] = [
    { role: 'system', content: MEAL_CHAT_SYSTEM_PROMPT },
    {
      role: 'system',
      content: `Current local time is ${now.toLocaleString()}. Use this to infer meal type/time when the user does not specify it.`,
    },
    ...history,
  ];

  const response = await callAzureOpenAI(messages);
  const parsed = parseJSONResponse(response) as MealChatResult;

  if (!parsed || (parsed.status !== 'need_info' && parsed.status !== 'ready')) {
    throw new Error('Unexpected response from meal assistant.');
  }

  return {
    status: parsed.status,
    message: parsed.message || '',
    mealType: parsed.mealType ?? undefined,
    time: parsed.time ?? null,
    foods: Array.isArray(parsed.foods) ? parsed.foods : [],
  };
}
