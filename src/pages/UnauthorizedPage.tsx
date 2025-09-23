import { Link } from 'react-router-dom';

const UnauthorizedPage = () => {
    return (
        <div className="flex flex-col items-center justify-center h-screen bg-gray-50 dark:bg-gray-900 text-center px-4">
            <h1 className="text-4xl font-bold text-red-600 dark:text-red-400 mb-4">Unauthorized</h1>
            <p className="text-lg text-gray-700 dark:text-gray-300 mb-6">
                You do not have permission to access this page.
            </p>
            <Link
                to="/"
                className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
            >
                Go Back Home
            </Link>
        </div>
    );
};

export default UnauthorizedPage;
