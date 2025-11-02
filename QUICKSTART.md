# FitPal Quick Start Guide 🚀

Get FitPal running in 5 minutes!

## Quick Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Azure OpenAI (Optional for Testing)

For full AI features, create a `.env` file:
```bash
cp .env.example .env
```

Then edit `.env` with your Azure OpenAI credentials.

**Don't have Azure OpenAI?** No problem! The app includes mock data for development and will work without it.

### 3. Start the App
```bash
npm run dev
```

Open http://localhost:5173 in your browser.

## First Steps in FitPal

### Create Your Account
1. Click "Register" 
2. Fill in your details:
   - Name and email (stored locally)
   - Age, gender, height
   - Target weight
   - Activity level
3. Click "Create Account"

### Log Your First Meal
1. Go to "Log Food"
2. Search for an Indian food (try "dosa" or "dal")
3. Select the food from results
4. Adjust quantity if needed
5. Click "Log Meal"

### Track Your Weight
1. Go to "Weight"
2. Enter your current weight
3. Click "Log Weight"
4. View your progress chart

### Set Your Goals
1. Go to "Goals"
2. Customize your targets:
   - Target weight
   - Daily calories
   - Macros (protein, carbs, fats)
3. Click "Update Goals"

### View Your Dashboard
1. Go to "Dashboard"
2. See your daily progress
3. View weekly trends
4. Check how close you are to your goals

## Testing Without Azure OpenAI

The app includes mock data for common Indian foods:
- Dosa
- Idli
- Roti
- Dal

Search for these to test the food logging feature without Azure OpenAI.

## Building for Production

```bash
npm run build
```

The `dist/` folder will contain your production-ready PWA.

## Need Help?

- **Full documentation**: See README.md
- **Azure setup**: See AZURE_SETUP.md
- **Issues**: Check the console for error messages

## Common Issues

### Dependencies won't install
```bash
rm -rf node_modules package-lock.json
npm install
```

### Port 5173 already in use
```bash
npm run dev -- --port 3000
```

### Can't find Azure OpenAI endpoint
Make sure `.env` is in the root directory and formatted correctly.

## What's Included

✅ User registration and login (local)
✅ Food search and logging
✅ Nutrition tracking dashboard
✅ Weight tracking with charts
✅ Goal management
✅ Recipe suggestions
✅ PWA support (installable, offline-ready)
✅ Export/import data
✅ Responsive design

## Next Steps

1. **Customize the app** - Edit components in `src/components/`
2. **Add more features** - Extend the codebase
3. **Deploy** - Build and deploy to Vercel, Netlify, or Azure

Happy tracking! 🥗💪
