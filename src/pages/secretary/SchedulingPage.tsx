import Scheduling from '@/pages/scheduling/SchedulingPage';
import { LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import type { RoomType } from '@/types/room';

const SECRETARY_ALLOWED_ROOM_TYPES: RoomType[] = ['CONSULTATION', 'CONFERENCE'];

const SecretaryScheduling = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const secretaryName = user ? `${user.First_Name} ${user.Last_Name}` : 'Secretary';

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen flex-col bg-[#f4f7fa] dark:bg-[#101828]">
      <nav className="bg-white shadow-sm dark:bg-[#1e2939]">
        <div className="w-full px-6">
          <div className="flex h-18 items-center justify-between">
            <div className="flex items-center space-x-6">
              <h1 className="text-4xl font-bold text-[#4338CA]">BITS</h1>
              <div className="text-lg text-gray-900 dark:text-gray-200">
                Hello, <span className="font-medium text-gray-900 dark:text-gray-200">{secretaryName}</span>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="flex items-center justify-center space-x-2 rounded-md px-3 py-2 text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"
              title="Log out"
            >
              <LogOut className="h-5 w-5 flex-shrink-0" />
              <span>Log out</span>
            </button>
          </div>
        </div>
      </nav>

      <div className="flex-1 overflow-hidden">
        <Scheduling allowedRoomTypes={SECRETARY_ALLOWED_ROOM_TYPES} />
      </div>
    </div>
  );
};

export default SecretaryScheduling;
