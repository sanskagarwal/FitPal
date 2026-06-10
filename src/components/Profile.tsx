import { User, LogOut, Palette } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useProfileForm } from './profile/useProfileForm';
import { ProfileForm } from './profile/ProfileForm';
import { ProfileInfoCard } from './profile/ProfileInfoCard';
import { DataManagementCard } from './profile/DataManagementCard';
import { DangerZoneCard } from './profile/DangerZoneCard';
import { ThemeToggle } from './ThemeToggle';

export const Profile = () => {
  const { logout } = useAuth();
  const { formData, updateField, loading, message, currentWeight, handleSubmit } = useProfileForm();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">Your Profile</h1>

      <div className="card">
        <div className="flex items-center gap-3 mb-6">
          <User className="w-8 h-8 text-primary-600 dark:text-primary-400" />
          <div>
            <h2 className="text-xl font-semibold">Personal Information</h2>
            <p className="text-sm text-gray-600 dark:text-gray-300">Update your personal details and metrics</p>
          </div>
        </div>

        <ProfileForm
          formData={formData}
          updateField={updateField}
          currentWeight={currentWeight}
          loading={loading}
          message={message}
          onSubmit={handleSubmit}
        />
      </div>

      <DataManagementCard />

      <div className="card">
        <div className="flex items-center gap-3 mb-6">
          <Palette className="w-8 h-8 text-primary-600 dark:text-primary-400" />
          <div>
            <h2 className="text-xl font-semibold">Appearance</h2>
            <p className="text-sm text-gray-600 dark:text-gray-300">Choose how FitPal looks on this device</p>
          </div>
        </div>
        <ThemeToggle showLabels />
      </div>

      <ProfileInfoCard />

      <DangerZoneCard />

      {/* Logout lives here on mobile, where the header logout button is hidden
          in favor of the bottom navigation bar. */}
      <button
        onClick={logout}
        className="md:hidden w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium text-red-600 bg-white border border-red-200 hover:bg-red-50 dark:text-red-400 dark:bg-gray-800 dark:border-red-800 dark:hover:bg-red-900/30 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400 active:scale-[0.99]"
      >
        <LogOut className="w-4 h-4" />
        Logout
      </button>
    </div>
  );
};
