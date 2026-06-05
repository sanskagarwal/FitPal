export const ProfileInfoCard = () => {
  return (
    <div className="card bg-gradient-to-br from-blue-50 to-blue-100">
      <h3 className="font-semibold mb-3 text-blue-900">ℹ️ About Your Data</h3>
      <ul className="space-y-2 text-sm text-blue-800">
        <li>• All your data is stored securely on the server</li>
        <li>• Data is saved in JSON files on machine (server/data/ directory)</li>
        <li>• Your privacy is completely protected - no external cloud services</li>
        <li>• Back up the server/data/ folder regularly to prevent data loss</li>
        <li>• Changes to height, weight, age, and activity level affect goal calculations</li>
      </ul>
    </div>
  );
};
