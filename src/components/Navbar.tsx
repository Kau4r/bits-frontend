import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();

  return (
    <nav className="bg-white dark:bg-gray-800 shadow-sm transition-colors duration-200 py-2">
      <div className="flex justify-between items-center h-20 px-6 sm:px-8 lg:px-10">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <Link to="/" className="text-3xl font-bold text-gray-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
              BITS
            </Link>
          </div>
          {user && (
            <div className="hidden sm:ml-8 sm:flex sm:space-x-8">
              <Link
                to="/inventory"
                className="border-indigo-600 dark:border-indigo-400 text-gray-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 inline-flex items-center px-4 pt-1 border-b-2 text-lg font-semibold transition-colors"
              >
                Inventory
              </Link>
            </div>
          )}
        </div>
        <div className="hidden sm:ml-6 sm:flex sm:items-center space-x-6">
          {user ? (
            <>
              <button
                onClick={logout}
                className="text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 px-5 py-2.5 rounded-md text-lg font-medium transition-colors"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 px-5 py-2.5 rounded-md text-lg font-medium transition-colors"
              >
                Sign in
              </Link>
              <Link
                to="/register"
                className="ml-2 inline-flex items-center px-6 py-3 border border-transparent text-lg font-semibold rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
              >
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
