import { User } from 'lucide-react';
import { useProfileForm } from './profile/useProfileForm';
import { ProfileForm } from './profile/ProfileForm';
import { ProfileInfoCard } from './profile/ProfileInfoCard';
import { DataManagementCard } from './profile/DataManagementCard';
import { DangerZoneCard } from './profile/DangerZoneCard';

export const Profile = () => {
  const { formData, updateField, loading, message, currentWeight, handleSubmit } = useProfileForm();

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Your Profile</h1>

      <div className="card">
        <div className="flex items-center gap-3 mb-6">
          <User className="w-8 h-8 text-primary-600" />
          <div>
            <h2 className="text-xl font-semibold">Personal Information</h2>
            <p className="text-sm text-gray-600">Update your personal details and metrics</p>
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

      <ProfileInfoCard />

      <DangerZoneCard />
    </div>
  );
};
