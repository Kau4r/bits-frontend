import { Link } from 'react-router-dom';
import { Box } from 'lucide-react';

export default function Navbar() {
  return (
    <nav className="bg-white dark:bg-gray-800 shadow-sm transition-colors duration-200 min-h-screen w-25">
      <div className="flex flex-col justify-between h-full">
        <div className="flex flex-col items-center space-y-4 p-4">
          <Link to="/" className="text-2xl font-bold text-gray-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
            BITS
          </Link>
          <Link
            to="/inventory"
            className="border-indigo-600 dark:border-indigo-400 text-gray-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center justify-center h-10 w-full text-base font-medium transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 gap-2"
          >
            <Box className="w-5 h-5" />
          </Link>
        </div>
      </div>
    </nav>
  );
}
