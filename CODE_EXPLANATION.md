# FitPal - Complete Code Explanation

This document explains the architecture and key components of the FitPal application.

## 🏗️ Application Architecture

FitPal is a **Progressive Web App (PWA)** built with:
- **Frontend**: React 18 with TypeScript
- **Styling**: Tailwind CSS for responsive design
- **State Management**: React Context API for authentication
- **Data Storage**: IndexedDB for local data persistence
- **AI Integration**: Azure OpenAI GPT-4o for food analysis
- **Build Tool**: Vite for fast development and optimized builds
- **Charts**: Recharts for data visualization

## 📁 Project Structure Explained

### `/src/types/index.ts`
Defines all TypeScript interfaces for type safety:
- **User**: User profile with goals and preferences
- **Food**: Food items with nutritional information
- **MealEntry**: Logged meals with foods and totals
- **WeightEntry**: Weight tracking entries
- **Recipe**: AI-generated recipes
- **Streak**: Tracking consistency

### `/src/utils/`

#### `db.ts` - IndexedDB Operations
- **Purpose**: Manages all local data storage
- **Key Functions**:
  - `initDB()`: Creates/opens the IndexedDB database
  - `saveUser()`, `getUser()`: User CRUD operations
  - `saveMeal()`, `getMealsByUser()`: Meal logging operations
  - `saveWeight()`, `getWeightsByUser()`: Weight tracking
  - Data stores: users, meals, weights, notifications, streaks

#### `helpers.ts` - Utility Functions
- **Authentication**: `hashPassword()`, `verifyPassword()`
- **Calculations**: `calculateBMI()`, `calculateDailyCalories()`, `calculateMacros()`
- **Date Utils**: `getStartOfDay()`, `getStartOfWeek()`, `getDaysInRange()`
- **Streaks**: `calculateStreak()` for tracking consistency

#### `exportImport.ts` - Data Portability
- **Export**: `exportDataAsJSON()`, `exportDataAsCSV()`
- **Import**: `importDataFromJSON()`
- Allows users to backup and restore all their data

### `/src/services/openai.ts` - AI Integration

This is where the magic happens! Key functions:

#### `analyzeFoodWithAI(foodQuery: string)`
- Takes user input (e.g., "dosa", "paneer tikka")
- Sends to Azure OpenAI with Indian cuisine context
- Returns structured food data with nutrition info
- Handles misspellings and variations

#### `getRecipeSuggestions(preferences, goals, recentFoods)`
- Generates Indian recipes based on user preferences
- Considers dietary goals (weight loss, muscle gain, etc.)
- Returns recipes with ingredients, steps, and nutrition

#### `getDietaryInsights(currentWeight, targetWeight, nutrition, goals)`
- Provides personalized advice using AI
- Analyzes current nutrition vs. goals
- Suggests specific Indian food adjustments

**Mock Data**: If Azure OpenAI isn't configured, the service returns mock data for common Indian foods (dosa, idli, roti, dal) so the app still works for development.

### `/src/context/AuthContext.tsx` - State Management

Global authentication and user state:
- **Provides**: Current user, loading state, auth functions
- **Functions**:
  - `login(email, password)`: Validates and logs in user
  - `register(name, email, password, profile)`: Creates new user
  - `logout()`: Clears user session
  - `updateProfile()`, `updateGoals()`: Updates user data
- **Storage**: Uses localStorage for session persistence

### `/src/components/`

#### `AuthPage.tsx` - Registration & Login
- **Two modes**: Login and Register tabs
- **Registration collects**:
  - Basic info: name, email, password
  - Profile: age, gender, height, target weight
  - Activity level: sedentary to very active
- **Calculations**: Automatically calculates recommended calories and macros
- **Security**: Passwords are hashed locally using SHA-256

#### `Dashboard.tsx` - Main Overview
- **Today's Stats**: Calories, protein, carbs, fats with progress bars
- **Weight Progress**: Current weight, target, BMI
- **Macro Distribution**: Pie chart showing protein/carbs/fats ratio
- **Weekly Trends**: Line chart showing nutrition over the week
- **Real-time Updates**: Recalculates when new meals are logged

#### `FoodLogger.tsx` - Meal Logging
- **Search Interface**: Input for Indian food names
- **AI Integration**: Calls `analyzeFoodWithAI()` on search
- **Meal Type Selection**: Breakfast, lunch, dinner, snack
- **Food Entry**:
  - Add multiple foods to a meal
  - Adjust quantities (supports decimals like 1.5 servings)
  - See running total of nutrients
- **Save**: Stores complete meal in IndexedDB

#### `WeightTracker.tsx` - Body Metrics
- **Input Form**: Weight, optional body fat %, notes
- **BMI Calculation**: Automatic based on height
- **Streak Tracking**: 
  - Counts consecutive days of logging
  - Displays current and longest streaks
- **Progress Chart**: Line chart showing weight over time
- **History Table**: Shows last 10 weight entries

#### `Goals.tsx` - Goal Management
- **Editable Targets**:
  - Target weight (kg)
  - Daily calories
  - Protein, carbs, fats (grams)
- **Tips Section**: Provides guidance on setting realistic goals
- **Calculations**: Uses goals to show progress throughout app

#### `Recipes.tsx` - AI Recipe Suggestions
- **Preference Input**: User enters dietary preferences
- **AI Generation**: Calls `getRecipeSuggestions()` with context
- **Recipe Display**:
  - Name and description
  - Prep time and servings
  - Ingredients list
  - Step-by-step instructions
  - Nutrition per serving
- **Indian Focus**: All recipes are Indian cuisine

#### `Layout.tsx` - App Structure
- **Header**: Logo, navigation, user info, logout
- **Navigation**:
  - Desktop: Horizontal menu bar
  - Mobile: Hamburger menu
  - Active page highlighting
- **Main Content**: Renders current page component
- **Footer**: Branding and privacy message
- **Responsive**: Adapts to all screen sizes

### `/src/App.tsx` - Main Application

The root component that:
1. Wraps everything in `AuthProvider`
2. Shows loading spinner during initialization
3. Routes to `AuthPage` if not logged in
4. Renders `Layout` with appropriate page if logged in
5. Manages page navigation state

### `/src/main.tsx` - Entry Point

- Mounts the React app to DOM
- Wraps in `StrictMode` for development checks
- Imports global CSS (Tailwind)

## 🎨 Styling with Tailwind CSS

### `/src/index.css`

Custom CSS including:
- **Tailwind Directives**: `@tailwind base/components/utilities`
- **Custom Components**:
  - `.btn-primary`: Primary action buttons
  - `.btn-secondary`: Secondary buttons
  - `.input-field`: Form inputs with focus states
  - `.card`: Content containers with shadows
  - `.stat-card`: Gradient stat cards
- **Animations**: Loading spinner
- **Dark Mode**: Automatic support based on system preference
- **Custom Scrollbar**: Styled for better UX

### `tailwind.config.js`

Customizes Tailwind with:
- **Primary Color**: Green theme (#10b981)
- **Content Paths**: Scans all React files
- **Extended Colors**: Custom green palette

## 🔧 Configuration Files

### `vite.config.ts` - Build Configuration

Key features:
- **React Plugin**: JSX transformation
- **PWA Plugin**: Configures service worker
  - Auto-update on new versions
  - Offline caching strategy
  - Push notification support
- **Manifest**: App metadata for installation
  - Name, icons, theme color
  - Display mode: standalone
- **Workbox**: Caches app assets and API responses

### `tsconfig.json` - TypeScript Configuration

- **Strict Mode**: Maximum type safety
- **ES2020**: Modern JavaScript features
- **JSX**: React JSX transformation
- **Module Resolution**: Bundler mode for Vite

### `package.json` - Dependencies

Key dependencies:
- **react**, **react-dom**: UI framework
- **typescript**: Type system
- **vite**: Build tool
- **tailwindcss**: CSS framework
- **idb**: IndexedDB wrapper
- **recharts**: Charts and graphs
- **date-fns**: Date manipulation
- **lucide-react**: Icon library
- **vite-plugin-pwa**: PWA support

## 🔐 Data Flow

### User Registration Flow
1. User fills registration form
2. `AuthContext.register()` called
3. Password hashed with SHA-256
4. Daily calorie needs calculated based on profile
5. Macros calculated (40% carbs, 30% protein, 30% fat)
6. User saved to IndexedDB
7. Session stored in localStorage
8. App navigates to Dashboard

### Meal Logging Flow
1. User searches for food (e.g., "dosa")
2. `analyzeFoodWithAI()` sends query to Azure OpenAI
3. GPT-4o identifies food and returns nutrition data
4. User selects food, adjusts quantity
5. Nutrients calculated: `quantity × base_nutrients`
6. User can add multiple foods
7. Total nutrients summed
8. `saveMeal()` stores in IndexedDB
9. Dashboard automatically updates

### Weight Tracking Flow
1. User enters weight
2. BMI calculated: `weight / (height_m)²`
3. Entry saved to IndexedDB
4. Streak calculation:
   - Load all weight dates
   - Check consecutive days
   - Update current and longest streaks
5. Chart regenerated with new data point

## 🌐 PWA Features

### Service Worker
- **Precaching**: HTML, CSS, JS cached on install
- **Runtime Caching**: Azure OpenAI responses cached
- **Offline Fallback**: App works without internet
- **Update Strategy**: Auto-update when new version available

### Installability
- **Manifest**: Provides app metadata
- **Icons**: Multiple sizes for different devices
- **Standalone Mode**: Runs like native app
- **Add to Home Screen**: Installable on mobile

### Push Notifications (Future Enhancement)
- Structure ready for meal reminders
- Would require service worker notification API
- User can set meal times in notifications settings

## 🔒 Privacy & Security

### Local-First Architecture
- **No Backend**: No server, no database
- **IndexedDB**: All data in browser
- **No Tracking**: No analytics or tracking
- **No Cloud Sync**: Data never leaves device

### Security Measures
- **Password Hashing**: SHA-256 before storage
- **Local Only**: Credentials never transmitted
- **Export/Import**: User controls data portability
- **No PII Collection**: Only what user enters

## 📊 Data Visualization

### Recharts Integration

**Dashboard Charts**:
1. **Pie Chart**: Macro distribution
   - Shows protein/carbs/fats ratio
   - Color-coded (red/blue/amber)
   
2. **Line Chart**: Weekly nutrition trends
   - Multiple lines for calories, macros
   - X-axis: Days of week
   - Y-axis: Values in grams/calories

**Weight Charts**:
- Line chart showing weight over time
- BMI trends
- Up to 30 recent entries displayed

## 🚀 Performance Optimizations

1. **Vite**: Fast HMR (Hot Module Replacement)
2. **Code Splitting**: Automatic by Vite
3. **Tree Shaking**: Removes unused code
4. **Asset Optimization**: Images and assets minified
5. **IndexedDB**: Fast local queries
6. **React**: Efficient re-renders with hooks

## 🧪 Development vs Production

### Development Mode
- Hot reload on file changes
- Source maps for debugging
- Verbose error messages
- Mock data fallback for AI

### Production Build
- Minified and optimized
- Service worker enabled
- Assets compressed
- PWA features active

## 🔄 State Management Pattern

Uses **React Context** for global state:
- Authentication state (user, loading)
- No prop drilling needed
- Clean separation of concerns
- Easy to test and extend

Local component state with `useState` for:
- Form inputs
- Loading states
- UI toggles

## 📱 Responsive Design Strategy

### Mobile First
- Base styles for mobile
- `md:` prefix for tablets
- `lg:` prefix for desktop

### Breakpoints
- Mobile: < 768px
- Tablet: 768px - 1024px
- Desktop: > 1024px

### Adaptive UI
- Grid layouts collapse on mobile
- Navigation becomes hamburger menu
- Charts responsive with `ResponsiveContainer`
- Touch-friendly hit areas (44px minimum)

## 🎯 Best Practices Used

1. **TypeScript**: Full type safety
2. **Component Modularity**: Single responsibility
3. **Error Handling**: Try-catch blocks, user feedback
4. **Accessibility**: Semantic HTML, ARIA labels
5. **Code Organization**: Clear file structure
6. **Comments**: Inline documentation
7. **Naming**: Descriptive variable/function names
8. **Consistent Styling**: Tailwind utility classes

## 🔮 Future Enhancements

Potential features to add:
- [ ] Meal reminders with notifications
- [ ] Photo upload for meals
- [ ] Social features (share recipes)
- [ ] More detailed micronutrient tracking
- [ ] Exercise logging
- [ ] Water intake tracking
- [ ] Multiple user profiles
- [ ] Custom food database
- [ ] Meal planning calendar
- [ ] Barcode scanner integration

## 📚 Learning Resources

To understand the codebase better:
- **React Docs**: https://react.dev
- **TypeScript**: https://typescriptlang.org/docs
- **Tailwind CSS**: https://tailwindcss.com/docs
- **IndexedDB**: https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API
- **Azure OpenAI**: https://learn.microsoft.com/en-us/azure/ai-services/openai/
- **PWA**: https://web.dev/progressive-web-apps/

## 🎓 Key Concepts to Understand

1. **React Hooks**: useState, useEffect, useContext
2. **Context API**: Global state management
3. **IndexedDB**: Browser database
4. **Async/Await**: Asynchronous operations
5. **TypeScript Interfaces**: Type definitions
6. **Tailwind CSS**: Utility-first styling
7. **PWA**: Progressive Web Apps
8. **API Integration**: Azure OpenAI calls

This app demonstrates modern web development practices and is a great learning project!
