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
  "servingSize": "100g or 1 cup, etc.",
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
  recentFoods: string[]
): Promise<Recipe[]> {
  const messages: OpenAIMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    {
      role: 'user',
      content: `Suggest 3 healthy Indian recipes based on:
Preferences: ${preferences}
Goals: ${goals}
Recent foods: ${recentFoods.join(', ')}

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

export async function suggestMeal(
  remainingCalories: number,
  remainingProtein: number,
  remainingCarbs: number,
  remainingFats: number,
  remainingFiber: number,
  mealType: string
): Promise<string> {
  const messages: OpenAIMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    {
      role: 'user',
      content: `Suggest an Indian ${mealType} meal to help meet these remaining daily targets:
Calories: ${remainingCalories} kcal
Protein: ${remainingProtein}g
Carbs: ${remainingCarbs}g
Fats: ${remainingFats}g
Fiber: ${remainingFiber}g

IMPORTANT: Respond in **MARKDOWN format** with clear structure.

Provide:
1. A specific meal suggestion with ingredients and portion sizes
2. Approximate nutritional breakdown (calories, protein, carbs, fats, fiber)
3. Why this meal fits the remaining goals

Use markdown formatting:
- Use **bold** for headings and important terms
- Use bullet points (-) for lists
- Use proper line breaks for readability
- Keep it practical and focused on common Indian foods`
    }
  ];

  try {
    return await callAzureOpenAI(messages);
  } catch (error) {
    console.error('Error getting meal suggestion:', error);
    return 'Try a balanced meal with dal (protein), roti or rice (carbs), vegetables (fiber and micronutrients), and a small amount of healthy fats like ghee or nuts.';
  }
}

export async function suggestFoodForNutrient(
  nutrientName: string,
  currentAmount: number,
  targetAmount: number
): Promise<string> {
  const deficit = targetAmount - currentAmount;
  const messages: OpenAIMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    {
      role: 'user',
      content: `Suggest Indian foods rich in ${nutrientName}.

Current: ${Math.round(currentAmount)}
Target: ${Math.round(targetAmount)}
Need: ${Math.round(deficit)} more

IMPORTANT: Respond in **MARKDOWN format** with clear structure.

Provide:
1. Top 3-5 Indian foods high in ${nutrientName} with their ${nutrientName} content
2. Specific portion sizes that would help meet the deficit
3. Simple ways to incorporate these foods into meals

Use markdown formatting:
- Use **bold** for headings and important terms
- Use bullet points (-) for lists
- Use proper line breaks for readability
- Keep suggestions practical and focused on commonly available Indian ingredients`
    }
  ];

  try {
    return await callAzureOpenAI(messages);
  } catch (error) {
    console.error('Error getting food suggestion:', error);
    return `Include more ${nutrientName}-rich foods in your diet. Common sources include dairy, pulses, vegetables, and whole grains.`;
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
