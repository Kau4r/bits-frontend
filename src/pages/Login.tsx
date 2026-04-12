import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/hooks/useTheme';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { login } = useAuth();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (!username || !password) {
      setError('Please enter both username/email and password');
      return;
    }

    setIsLoading(true);

    try {
      const result = await login(username, password);

      if (result.success && result.user) {
        const role = result.user.User_Role;
        const isMobile = window.innerWidth < 768;
        const target =
          role === "LAB_TECH"
            ? isMobile
              ? "/labtech-mobile"
              : "/"
            : role === "LAB_HEAD"
              ? "/"
              : role === "FACULTY"
                ? "/faculty/scheduling"
                : role === "SECRETARY"
                  ? "/secretary/scheduling"
                  : role === "STUDENT"
                    ? "/student-session"
                    : "/";

        // ✅ small delay to ensure context updates before route guard checks
        setTimeout(() => {
          navigate(target, { replace: true });
        }, 100);
      } else {
        setError(result.error || 'Login failed');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('An error occurred during login');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex flex-col flex-1 bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      {/* Theme Toggle */}
      <button
        onClick={toggleTheme}
        className="absolute top-4 right-4 p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        {theme === 'dark' ? (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        ) : (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
          </svg>
        )}
      </button>

      <div className="flex items-center justify-center min-h-screen px-4 py-6 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-6 bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg">

          {/* Header */}
          <div className="flex flex-col items-center text-center space-y-2">
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white">BITS</h2>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Login to access your account
            </p>
          </div>

          {/* Form */}
          <form className="mt-6 space-y-4 w-full" onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="username"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Username or Email
                </label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Enter your username or email"
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                // placeholder="Enter password"
                />
              </div>
            </div>

            {/* Forgot password */}
            <div className="flex items-center justify-end">
              <a
                href="#"
                className="text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
              >
                Forgot your password?
              </a>
            </div>

            {/* Submit button */}
            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center py-2 px-4 text-sm font-medium text-white bg-indigo-600 rounded-md border border-transparent hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" />
                    Signing in...
                  </>
                ) : (
                  'Sign in'
                )}
              </button>
            </div>
          </form>

          {/* Error message */}
          {error && (
            <div className="bg-red-50 dark:bg-red-500/20 border-l-4 border-red-500 p-4 mt-4">
              <div className="flex items-center">
                <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                <p className="ml-3 text-sm text-red-700 dark:text-red-200">{error}</p>
              </div>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
