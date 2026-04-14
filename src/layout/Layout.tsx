import { useState, useEffect, useRef } from "react";
import Navbar from "@/layout/Navbar";
import { Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useNotifications } from "@/context/NotificationContext";
import { Toaster } from 'react-hot-toast';
import { Bell, DoorOpen } from "lucide-react";

const Layout = () => {
  const [collapsed, setCollapsed] = useState(false);
  const { userRole, user, logout } = useAuth();
  const { notifications, unreadCount, markAsRead } = useNotifications();
  const [isMobile, setIsMobile] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const noSidebarRoles = ["STUDENT", "FACULTY", "SECRETARY"];
  const hideSidebar = noSidebarRoles.includes((userRole ?? "").toUpperCase());
  const isStudent = (userRole ?? "").toUpperCase() === "STUDENT";

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Close profile dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(e.target as Node)) {
        setNotificationOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const formatNotificationTime = (timestamp: string) => {
    const diff = Date.now() - new Date(timestamp).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${Math.max(0, mins)}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  const handleNotificationClick = async (id: number, read: boolean) => {
    if (!read) await markAsRead(id);
  };

  const handleRoomsClick = () => {
    setNotificationOpen(false);
    setProfileOpen(false);
    navigate("/student-room-view");
  };

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="flex min-h-screen bg-white dark:bg-gray-900">
      <Toaster position="top-right" reverseOrder={false} />
      {!hideSidebar && <Navbar collapsed={collapsed} setCollapsed={setCollapsed} isMobile={isMobile} />}

      <div className="flex-1 flex flex-col">
        {/* Mobile Top Notch */}
        {isMobile && (
          <header className="fixed left-0 right-0 top-0 z-50 flex items-center justify-between bg-white px-4 py-3 shadow-md dark:bg-gray-800">
            <h1 className="text-xl font-bold text-indigo-600">BITS</h1>

            <div className="flex items-center gap-3">
              {isStudent && (
                <button
                  type="button"
                  onClick={handleRoomsClick}
                  className="flex items-center gap-1.5 rounded-md px-2.5 py-2 text-gray-700 transition hover:bg-gray-200 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white"
                  aria-label="View available rooms"
                >
                  <DoorOpen className="h-5 w-5" />
                  <span className="text-sm font-medium">Rooms</span>
                </button>
              )}

              {/* Notification Button */}
              <div className="relative" ref={notificationRef}>
                <button
                  type="button"
                  onClick={() => {
                    setNotificationOpen(prev => !prev);
                    setProfileOpen(false);
                  }}
                  className="relative rounded-md p-2 hover:bg-gray-200 dark:hover:bg-gray-700"
                  aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
                >
                  <Bell className="h-6 w-6 text-gray-700 dark:text-gray-300" />
                  {unreadCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[11px] font-bold leading-none text-white ring-2 ring-white dark:ring-gray-800">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                </button>

                {notificationOpen && (
                  <div className="absolute right-0 z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
                    <div className="border-b border-gray-200 px-4 py-3 dark:border-gray-700">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">Notifications</p>
                    </div>
                    <div className="max-h-80 overflow-y-auto py-1">
                      {notifications.length > 0 ? (
                        notifications.slice(0, 8).map(notification => (
                          <button
                            key={notification.id}
                            type="button"
                            onClick={() => handleNotificationClick(notification.id, notification.read)}
                            className={`block w-full px-4 py-3 text-left transition hover:bg-gray-100 dark:hover:bg-gray-700 ${!notification.read ? "border-l-2 border-indigo-500" : ""}`}
                          >
                            <p className="text-sm font-medium text-gray-900 dark:text-white">{notification.title}</p>
                            <p className="mt-1 line-clamp-2 text-sm text-gray-700 dark:text-gray-300">{notification.message || "No details"}</p>
                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{formatNotificationTime(notification.timestamp)}</p>
                          </button>
                        ))
                      ) : (
                        <div className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">No notifications</div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Profile Picture with Dropdown */}
              <div className="relative" ref={profileRef}>
                <button
                  onClick={() => setProfileOpen(!profileOpen)}
                  className="w-10 h-10 rounded-full overflow-hidden border-2 border-gray-300 flex items-center justify-center bg-gray-200 dark:bg-gray-700 text-white font-semibold text-lg focus:outline-none"
                >
                  <span>{user?.First_Name ? user.First_Name.charAt(0).toUpperCase() : "U"}</span>
                </button>


                {profileOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-50">
                    <div className="px-4 py-3">
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{user?.First_Name || "User Name"}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-300 truncate">{user?.Email || "user@example.com"}</p>
                    </div>
                    <div className="border-t border-gray-200 dark:border-gray-700"></div>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </div>
          </header>
        )}

        <main className={`flex-1 mt-0 lg:mt-0 min-h-screen overflow-y-auto transition-all duration-300 
          ${hideSidebar ? "ml-0" : collapsed && !isMobile ? "ml-20" : !collapsed && !isMobile ? "ml-56" : "ml-0"} 
          ${isMobile ? "pt-16" : ""} bg-white dark:bg-gray-900`}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
