import { LogIn, UserPlus } from 'lucide-react';
import { useAuthForm } from './auth/useAuthForm';
import { RegisterFields } from './auth/RegisterFields';

export const AuthPage = () => {
  const { isLogin, formData, updateField, error, loading, switchMode, handleSubmit } = useAuthForm();

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 dark:from-gray-900 dark:to-gray-800 flex items-start justify-center p-4 py-10 sm:py-16">
      <div className="card max-w-md w-full">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-primary-600 dark:text-primary-400 mb-2">🥗 FitPal</h1>
          <p className="text-gray-600 dark:text-gray-300">Track Indian meals smartly & privately</p>
        </div>

        <div className="flex gap-2 mb-6">
          <button
            onClick={() => switchMode(true)}
            className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
              isLogin ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200'
            }`}
          >
            <LogIn className="inline w-4 h-4 mr-2" />
            Login
          </button>
          <button
            onClick={() => switchMode(false)}
            className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
              !isLogin ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200'
            }`}
          >
            <UserPlus className="inline w-4 h-4 mr-2" />
            Register
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !loading) {
              e.preventDefault();
              e.currentTarget.requestSubmit();
            }
          }}
          className="space-y-4"
        >
          {!isLogin && (
            <input
              type="text"
              placeholder="Full Name"
              value={formData.name}
              onChange={(e) => updateField('name', e.target.value)}
              className="input-field"
              required={!isLogin}
            />
          )}

          <input
            type="email"
            placeholder="Email"
            value={formData.email}
            onChange={(e) => updateField('email', e.target.value)}
            className="input-field"
            required
          />

          <div>
            <input
              type="password"
              placeholder="Password"
              value={formData.password}
              onChange={(e) => updateField('password', e.target.value)}
              className="input-field"
              required
              minLength={isLogin ? undefined : 8}
            />
            {!isLogin && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">At least 8 characters</p>
            )}
          </div>

          {!isLogin && <RegisterFields formData={formData} updateField={updateField} />}

          {error && (
            <div className="alert-error p-3 rounded-lg text-sm" role="alert" aria-live="polite">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full"
          >
            {loading ? 'Processing...' : isLogin ? 'Login' : 'Create Account'}
          </button>
        </form>
      </div>
    </div>
  );
};
