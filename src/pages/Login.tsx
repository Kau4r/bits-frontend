import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }

    setIsLoading(true);

    try {
      const result = await login(email, password);

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
    <div className="flex flex-col flex-1 bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
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
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Email address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                // placeholder="@usc.edu.ph"
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
