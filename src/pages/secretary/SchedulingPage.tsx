import { useState, useEffect, useRef } from 'react';
import Scheduling from '@/pages/scheduling/SchedulingPage';
import { LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { ActiveRoomProvider } from '@/context/ActiveRoomContext';
import type { RoomType } from '@/types/room';

const SECRETARY_ALLOWED_ROOM_TYPES: RoomType[] = ['CONSULTATION', 'CONFERENCE'];

const SecretaryScheduling = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const secretaryName = user ? `${user.First_Name} ${user.Last_Name}` : 'Secretary';
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!profileOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [profileOpen]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <ActiveRoomProvider allowedRoomTypes={SECRETARY_ALLOWED_ROOM_TYPES} storageScope="secretary">
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

              <div className="relative" ref={profileRef}>
                <button
                  onClick={() => setProfileOpen(v => !v)}
                  className={`flex items-center justify-center rounded-full p-0.5 transition-colors hover:ring-2 hover:ring-indigo-400 ${profileOpen ? 'ring-2 ring-indigo-400' : ''}`}
                  type="button"
                  aria-haspopup="menu"
                  aria-expanded={profileOpen}
                  aria-label="Account menu"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
                    {`${user?.First_Name?.[0] ?? ''}${user?.Last_Name?.[0] ?? ''}`.toUpperCase()}
                  </div>
                </button>
                {profileOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 top-full mt-2 z-50 w-64 rounded-xl border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800"
                  >
                    <div className="flex items-start gap-3 border-b border-gray-200 p-4 dark:border-gray-700">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-base font-bold text-white">
                        {`${user?.First_Name?.[0] ?? ''}${user?.Last_Name?.[0] ?? ''}`.toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                          {user?.First_Name} {user?.Last_Name}
                        </p>
                        <p className="truncate text-xs text-gray-500 dark:text-gray-400">{user?.Email}</p>
                        <span className="mt-1 inline-flex rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300">
                          Secretary
                        </span>
                      </div>
                    </div>
                    <div className="p-2">
                      <button
                        onClick={() => { setProfileOpen(false); handleLogout(); }}
                        className="w-full flex items-center gap-3 rounded-md bg-red-600 px-3 py-2.5 text-sm font-semibold text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors"
                        type="button"
                      >
                        <LogOut className="w-5 h-5" />
                        Logout
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </nav>

        <div className="flex-1 overflow-hidden">
          <Scheduling />
        </div>
      </div>
    </ActiveRoomProvider>
  );
};

export default SecretaryScheduling;
