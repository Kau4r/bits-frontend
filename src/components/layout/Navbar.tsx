import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export default function Navbar() {
  const { user } = useAuth();

  return (
    <nav className="bg-white dark:bg-gray-800 shadow-sm transition-colors duration-200 py-1.5">
      <div className="flex justify-between items-center h-14 px-6 sm:px-8 lg:px-10">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <Link to="/" className="text-2xl font-bold text-gray-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
              BITS
            </Link>
          </div>
          {user && (
            <div className="hidden sm:ml-6 sm:flex sm:space-x-6">
              <Link
                to="/inventory"
                className="border-indigo-600 dark:border-indigo-400 text-gray-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 inline-flex items-center px-3 pt-1 border-b-2 text-base font-medium transition-colors"
              >
                Inventory
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
