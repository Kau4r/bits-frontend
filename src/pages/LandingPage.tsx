import { Link } from 'react-router-dom';

const LandingPage = () => {
  const routes = [
    { path: '/labtech-dashboard', description: 'Lab Technician Dashboard' },
    { path: '/labhead-dashboard', description: 'Lab Head Dashboard' },
    { path: '/inventory', description: 'Inventory Management' },
    { path: '/room', description: 'Room Management' },
    { path: '/SysDashboard', description: 'System Admin Dashboard' },
    { path: '/login', description: 'Login Page' },
    { path: '/user/:email', description: 'User Details (replace :email with actual email)' },
    { path: '/student-session', description: 'Student Session Page' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-center">BITS TEMPORARY LANDING PAGE</h1>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Available Pages:</h2>
          <ul className="space-y-3">
            {routes.map((route) => (
              <li key={route.path} className="border-b border-gray-200 dark:border-gray-700 pb-2">
                <Link 
                  to={route.path} 
                  className="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {route.path}
                </Link>
                <p className="text-sm text-gray-600 dark:text-gray-400">{route.description}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
