import Scheduling from '../Scheduling/Scheduling';
import { Bell, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';

const FacultyScheduling = () => {
  const navigate = useNavigate();
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  
  const handleLogout = () => {
    console.log('Logging out...');
    navigate('/logout');
  };
  
  // Replace with actual faculty data
  const facultyName = "Dr. Juan Dela Cruz";
  
  const notifications = [
    { id: 1, title: 'New Schedule', message: 'Your schedule has been updated', time: '2h ago' },
    { id: 2, title: 'Reminder', message: 'Class starts in 15 minutes', time: '1d ago' },
  ];
  
  return (
    <div className="flex flex-col h-screen bg-gray-900">
      {/* Navigation Bar */}
      <nav className="bg-gray-800 shadow-sm">
        <div className="w-full px-6">
          <div className="flex justify-between items-center h-18">
            {/* Left side - Logo and Greeting */}
            <div className="flex items-center space-x-6">
              <h1 className="text-4xl font-bold text-[#4338CA]">BITS</h1>
              <div className="text-gray text-lg">
                Hello, <span className="text-gray font-medium">{facultyName}</span>
              </div>
            </div>
            
            {/* Right side - Navigation items */}
            <div className="flex items-center space-x-6">
              
              <div className="relative">
                <button 
                  onClick={() => {
                    setIsNotificationOpen(!isNotificationOpen);
                  }}
                  className="p-1 rounded-full text-gray-400 hover:text-white transition-colors focus:outline-none"
                >
                  <Bell className="h-6 w-6" />
                </button>

                {isNotificationOpen && (
                  <div className="origin-top-right absolute right-0 mt-2 w-72 rounded-md shadow-lg bg-gray-800 ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
                    <div className="py-1">
                      <div className="px-4 py-2 border-b border-gray-700">
                        <p className="text-sm font-medium text-white">Notifications</p>
                      </div>
                      {notifications.length > 0 ? (
                        notifications.map(notification => (
                          <div key={notification.id} className="px-4 py-3 hover:bg-gray-700">
                            <p className="text-sm font-medium text-white">{notification.title}</p>
                            <p className="text-sm text-gray-300">{notification.message}</p>
                            <p className="text-xs text-gray-400 mt-1">{notification.time}</p>
                          </div>
                        ))
                      ) : (
                        <div className="px-4 py-3 text-sm text-gray-400">No new notifications</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              {/* Logout Button */}
              <div className="flex items-center justify-center">
                <button
                  onClick={handleLogout}
                  className="flex items-center justify-center text-gray-400 hover:text-white transition-colors px-3 py-2 rounded-md hover:bg-gray-700 space-x-2"
                  title="Log out"
                >
                  <LogOut className="h-5 w-5 flex-shrink-0" />
                  <span>Log out</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>
      <div className="flex-1 overflow-hidden p-4">
        <Scheduling />
      </div>
    </div>
  );
};

export default FacultyScheduling;