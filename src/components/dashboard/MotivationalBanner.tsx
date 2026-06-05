import { AlertCircle, Sparkles, TrendingUp, type LucideIcon } from 'lucide-react';
import { DailyStats } from '../../types';

interface MotivationalBannerProps {
  todayStats: DailyStats | null;
  targetCalories: number;
}

interface MotivationalMessage {
  icon: LucideIcon;
  message: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
  iconColor: string;
}

const getMotivationalMessage = (
  todayStats: DailyStats | null,
  targetCalories: number
): MotivationalMessage | null => {
  if (!todayStats) return null;

  const caloriePercent = (todayStats.totalCalories / targetCalories) * 100;

  if (caloriePercent > 120) {
    return {
      icon: AlertCircle,
      message: `You're ${Math.round(caloriePercent - 100)}% over your calorie goal. Consider lighter meals for the rest of the day! 💪`,
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      textColor: 'text-red-800',
      iconColor: 'text-red-600',
    };
  } else if (caloriePercent > 100) {
    return {
      icon: AlertCircle,
      message: `You've reached your calorie goal! Great job tracking. Keep it balanced! 🎯`,
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200',
      textColor: 'text-amber-800',
      iconColor: 'text-amber-600',
    };
  } else if (caloriePercent >= 80) {
    return {
      icon: TrendingUp,
      message: `You're on track! ${Math.round(100 - caloriePercent)}% of calories remaining. Keep going! 🌟`,
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      textColor: 'text-green-800',
      iconColor: 'text-green-600',
    };
  }
  return {
    icon: Sparkles,
    message: `Great start! You have plenty of room for nutritious meals today. Stay consistent! ✨`,
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    textColor: 'text-blue-800',
    iconColor: 'text-blue-600',
  };
};

export const MotivationalBanner = ({ todayStats, targetCalories }: MotivationalBannerProps) => {
  const msg = getMotivationalMessage(todayStats, targetCalories);
  if (!msg) return null;

  return (
    <div className={`card ${msg.bgColor} ${msg.borderColor} border`}>
      <div className="flex items-center gap-3">
        <msg.icon className={`w-6 h-6 ${msg.iconColor}`} />
        <p className={`${msg.textColor} font-medium`}>{msg.message}</p>
      </div>
    </div>
  );
};
