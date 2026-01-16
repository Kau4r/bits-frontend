import { useState, useEffect, useRef } from "react";
import Navbar from "./Navbar";
import { Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

import { useNotificationStream } from "@/hooks/useNotificationStream";

const Layout = () => {
  useNotificationStream(); // Initialize real-time notifications
  const [collapsed, setCollapsed] = useState(false);
  const { userRole, user, logout } = useAuth();
  const [isMobile, setIsMobile] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const noSidebarRoles = ["STUDENT", "FACULTY"];
  const hideSidebar = noSidebarRoles.includes((userRole ?? "").toUpperCase());

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
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="flex min-h-screen bg-white dark:bg-gray-900">
      {!hideSidebar && <Navbar collapsed={collapsed} setCollapsed={setCollapsed} isMobile={isMobile} />}

      <div className="flex-1 flex flex-col">
        {/* Mobile Top Notch */}
        {isMobile && (
          <header className="flex items-center justify-between bg-white dark:bg-gray-800 px-4 py-3 shadow-md fixed top-0 left-0 right-0 z-30">
            <h1 className="text-xl font-bold text-indigo-600">BITS</h1>

            <div className="flex items-center gap-3">
              {/* Notification Button */}
              <button className="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700">
                <svg className="w-6 h-6 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </button>

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
