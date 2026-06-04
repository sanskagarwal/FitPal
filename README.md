# FitPal 🥗

**AI-powered nutrition tracker for Indian cuisine with complete privacy**

FitPal is a modern Progressive Web App (PWA) that helps you track Indian meals, monitor weight, and achieve your fitness goals. Built with React, TypeScript, and Azure OpenAI, it provides intelligent food analysis while keeping your data completely private.

## ✨ Key Features

- 🍛 **AI-Powered Food Logging** - Identify and log Indian foods with nutritional analysis powered by Azure OpenAI GPT-4o
- 📊 **Smart Dashboard** - Track calories, macros, and micronutrients with interactive visualizations
- ⚖️ **Weight Tracking** - Monitor weight, BMI, and body fat with streak tracking for consistency
- 🎯 **Personalized Goals** - Auto-calculated maintenance calories based on your profile with customizable targets
- 👨‍🍳 **Recipe Suggestions** - Get healthy Indian recipe ideas tailored to your goals
- 💡 **Smart Suggestions** - AI-powered food recommendations to meet your remaining daily nutrient targets
- 📱 **PWA Support** - Install as an app, works offline, responsive on all devices
- 🔒 **Privacy First** - File-based storage with no cloud dependency, your data stays yours
- ✏️ **Full CRUD** - Edit and delete meal and weight entries anytime
- 📤 **Data Export/Import** - Export your data as JSON or CSV, and restore from backups

## 🚀 Quick Start

### Prerequisites
- Node.js 22+ installed
- Azure OpenAI account with GPT-4o deployment (optional for development)

### Installation

1. **Clone and install dependencies:**
```bash
git clone <repository-url>
cd FitPal
npm install
cd server && npm install && cd ..
```

2. **Configure environment:**
```bash
cp .env.example .env
# Edit .env with your Azure OpenAI credentials
```

3. **Run the application:**
```bash
npm run dev:all
```

This starts both the frontend (http://localhost:5173) and backend server (http://localhost:3001).

### Alternative: Run Separately
```bash
# Terminal 1 - Frontend
npm run dev

# Terminal 2 - Backend
npm run server
```

## 📖 Usage

1. **Register** - Create an account with your current weight and activity level
2. **Set Goals** - Adjust your target weight and nutrition goals
3. **Log Meals** - Search for Indian foods and log your daily meals
4. **Track Weight** - Record your weight regularly to maintain streaks
5. **View Progress** - Monitor your nutrition and weight trends on the dashboard
6. **Get Suggestions** - Use AI to find foods that help you meet your nutrient goals
7. **Discover Recipes** - Explore healthy Indian recipes personalized for you

## 🛠️ Tech Stack

**Frontend:**
- React 19 + TypeScript
- Vite (build tool)
- Tailwind CSS (styling)
- Recharts (data visualization)
- Vite PWA Plugin (offline support)

**Backend:**
- Express.js (REST API)
- File-based JSON storage
- TypeScript

**AI Integration:**
- Azure OpenAI GPT-4o (food analysis, recipes, suggestions)

## 📁 Project Structure

```
FitPal/
├── src/                    # Frontend source
│   ├── components/        # React components
│   ├── context/          # React context (auth)
│   ├── services/         # API services (OpenAI)
│   ├── utils/           # Utilities (database, helpers)
│   └── types/           # TypeScript types
├── server/               # Backend server
│   ├── index.ts         # Express server
│   └── data/            # JSON file storage
├── .env                 # Environment config
└── package.json         # Dependencies
```

## 🔗 Learn More

- **[FEATURES.md](FEATURES.md)** - Complete feature list and capabilities
- **[DEVELOPER.md](DEVELOPER.md)** - Setup instructions, API documentation, and development guide

## 📄 License

See [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

Built with ❤️ for the Indian fitness community. Powered by Azure OpenAI for intelligent food tracking.

---

**FitPal** - Track meals for Fitness and Health 🥗💪
