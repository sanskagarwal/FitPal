# FitPal 🥗

**Track Indian meals, food intake, and weight—smartly and privately**

FitPal is a modern Progressive Web App (PWA) focused on nutrition, weight management, and food intake tracking specifically for Indian foods and meals. All data is stored locally on your device—no cloud storage, complete privacy.

## ✨ Features

### 🔐 **User Registration & Login (Local Only)**
- Simple local user profile creation (no social or cloud login)
- All data stored locally in IndexedDB
- Export/import profile and nutrition logs as files (CSV/JSON)

### 🍛 **Food Logging via GPT Model**
- Search for Indian foods and meals
- Integrated with **Azure OpenAI GPT-4o** to:
  - Suggest foods even with misspellings or incomplete entries
  - Provide detailed macro & micronutrient analysis for Indian foods
  - Culturally accurate outputs for Indian cuisine

### 📊 **Macro & Micronutrient Tracking Dashboard**
- Visualize daily/weekly progress with interactive charts
- Track calories, protein, carbs, fats, and key micronutrients
- Compare intake against your personalized goals

### ⚖️ **Weight & Body Parameter Tracking**
- Log weight, BMI, and body fat percentage
- Set weight reduction or body composition goals
- Track progress with streaks and visual graphs
- Get smart insights via GPT-4o on diet tweaks for your goals

### 🔔 **Meal Reminders**
- Push notifications using PWA features
- Customizable meal time reminders

### 🎯 **Custom Nutrition Goals**
- Set personal goals for nutrients, body weight, and fitness
- Adjust targets as needed based on your progress

### 👨‍🍳 **Recipe Suggestions**
- GPT-4o suggests healthy Indian recipes
- Based on your logged foods, preferences, and health goals

### 📱 **Responsive Design**
- Fully optimized for mobile, tablet, and desktop
- Clean, intuitive UI with easy navigation

### 💾 **PWA Features**
- Installable web app for Android/iOS/desktop
- Offline support for all features
- Push notifications for meal reminders

### 🔒 **Data Privacy & Security**
- All data handled locally (no cloud storage)
- Export/import for easy backup and transfer

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ installed
- Azure OpenAI account with GPT-4o deployment

### Installation

1. **Clone the repository** (or you're already in it!)

2. **Install dependencies:**
```bash
npm install
```

3. **Configure Azure OpenAI:**
   
   Create a `.env` file in the root directory:
```env
VITE_AZURE_OPENAI_ENDPOINT=https://your-resource-name.openai.azure.com
VITE_AZURE_OPENAI_KEY=your_api_key_here
VITE_AZURE_OPENAI_DEPLOYMENT=gpt-4o
```

   Get these values from your Azure OpenAI resource in the Azure Portal.

4. **Start the development server:**
```bash
npm run dev
```

5. **Open your browser** and navigate to `http://localhost:5173`

### Building for Production

```bash
npm run build
```

The production-ready files will be in the `dist/` folder. You can serve them with any static file server or deploy to platforms like:
- Vercel
- Netlify
- GitHub Pages
- Azure Static Web Apps

## 📖 How to Use FitPal

### 1. **Register Your Account**
- Enter your name, email, and password
- Provide basic info: age, gender, height, target weight, and activity level
- FitPal will calculate recommended daily calorie and macro targets

### 2. **Log Your Meals**
- Go to "Log Food" page
- Search for Indian foods (e.g., "dosa", "dal makhani", "paneer tikka")
- AI will identify the food and provide nutritional information
- Select portion sizes and log your meal
- View your daily totals instantly

### 3. **Track Your Weight**
- Go to "Weight" page
- Log your current weight regularly
- Track BMI and body fat percentage
- View progress charts and maintain streaks

### 4. **Set Your Goals**
- Go to "Goals" page
- Customize your target weight
- Adjust daily calorie and macro targets
- Save and track progress against your goals

### 5. **Get Recipe Ideas**
- Go to "Recipes" page
- Enter your preferences (vegetarian, high protein, etc.)
- Get AI-powered healthy Indian recipe suggestions
- View ingredients, instructions, and nutrition info

### 6. **Export/Import Your Data**
- Export your data as JSON (full backup) or CSV (for spreadsheets)
- Import data to restore from backup or transfer between devices

## 🏗️ Architecture & Code Structure

```
FitPal/
├── src/
│   ├── components/          # React components
│   │   ├── AuthPage.tsx    # Login/Register
│   │   ├── Dashboard.tsx   # Main dashboard with stats
│   │   ├── FoodLogger.tsx  # Food search and logging
│   │   ├── WeightTracker.tsx # Weight logging and charts
│   │   ├── Goals.tsx       # Goal management
│   │   ├── Recipes.tsx     # Recipe suggestions
│   │   └── Layout.tsx      # App layout with navigation
│   ├── context/
│   │   └── AuthContext.tsx # Authentication state management
│   ├── services/
│   │   └── openai.ts       # Azure OpenAI integration
│   ├── utils/
│   │   ├── db.ts           # IndexedDB operations
│   │   ├── helpers.ts      # Utility functions
│   │   └── exportImport.ts # Data export/import
│   ├── types/
│   │   └── index.ts        # TypeScript type definitions
│   ├── App.tsx             # Main app component
│   ├── main.tsx            # App entry point
│   └── index.css           # Global styles
├── index.html
├── vite.config.ts          # Vite + PWA configuration
├── tailwind.config.js      # Tailwind CSS configuration
├── tsconfig.json           # TypeScript configuration
└── package.json
```

### Key Technologies

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework
- **IndexedDB (idb)** - Local data storage
- **Recharts** - Data visualization
- **Azure OpenAI GPT-4o** - AI-powered food analysis and suggestions
- **Vite PWA Plugin** - Progressive Web App features
- **Lucide React** - Icon library

## 🔧 Development

### Available Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run preview  # Preview production build
npm run lint     # Run ESLint
```

### Adding New Features

The app is modular and easy to extend:

1. **New components** - Add to `src/components/`
2. **New data models** - Update `src/types/index.ts`
3. **New database operations** - Extend `src/utils/db.ts`
4. **New AI features** - Extend `src/services/openai.ts`

## 🔐 Azure OpenAI Setup

1. Go to [Azure Portal](https://portal.azure.com)
2. Create an **Azure OpenAI** resource
3. Deploy a **GPT-4o** model
4. Copy the endpoint URL and API key
5. Add them to your `.env` file

The app uses GPT-4o for:
- Food identification and nutritional analysis
- Recipe suggestions
- Dietary insights and recommendations

## 📱 Installing as PWA

### On Desktop (Chrome/Edge)
1. Click the install icon (➕) in the address bar
2. Click "Install" in the prompt
3. FitPal will open in its own window

### On Mobile (Android)
1. Open in Chrome
2. Tap the menu (⋮)
3. Select "Add to Home screen"
4. Tap "Add"

### On iOS
1. Open in Safari
2. Tap the Share button
3. Select "Add to Home Screen"
4. Tap "Add"

## 🌟 Key Features Explained

### Local Data Storage
All your data is stored in your browser's IndexedDB. No servers, no cloud—complete privacy. Data never leaves your device unless you explicitly export it.

### AI-Powered Food Recognition
The app uses Azure OpenAI's GPT-4o model, pre-prompted for Indian cuisine. It can:
- Recognize misspelled food names
- Identify regional variations
- Provide accurate nutritional data for Indian meals
- Suggest healthy alternatives

### Offline Support
Once loaded, FitPal works completely offline. You can:
- Log meals
- Track weight
- View your data
- Set goals

All without an internet connection!

## 🤝 Contributing

This is a personal project, but suggestions and improvements are welcome! Feel free to:
- Open issues for bugs or feature requests
- Submit pull requests
- Share your feedback

## 📄 License

See the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with ❤️ for the Indian fitness community
- Powered by Azure OpenAI for intelligent food tracking
- Inspired by the need for culturally relevant nutrition tools

---

**FitPal** - Your personal Indian nutrition companion 🥗💪
Track meals for Fitness and Health
