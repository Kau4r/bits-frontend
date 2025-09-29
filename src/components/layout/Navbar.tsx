import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useState } from 'react';
import type { ReactNode } from 'react';

const roleRoutes = {
  ADMIN: [
    { label: 'Users', path: '/' },
    { label: 'Rooms', path: '/room' },
  ],
  LAB_TECH: [
    { label: 'Dashboard', path: '/' },
    { label: 'Notifications', path: '/notification' },
    { label: 'Tickets', path: '/tickets' },
    { label: 'Room Queue', path: '/labtech/room' },
    { label: 'Inventory', path: '/inventory' },
    { label: 'Forms', path: '/forms' },
  ],
  LAB_HEAD: [
    { label: 'Dashboard', path: '/' },
    { label: 'Notifications', path: '/notification' },
    { label: 'Tickets', path: '/tickets' },
    { label: 'Room Queue', path: '/labtech/room' },
    { label: 'Inventory', path: '/inventory' },
    { label: 'Forms', path: '/forms' },
    {label: 'Lab Tech View', path: '/labtechview'},
  ],
} as const;

type Role = keyof typeof roleRoutes;

const navIcons: Record<string, ReactNode> = {
  Dashboard: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M13 5v6h6" />
    </svg>
  ),
  Users: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  ),
  Rooms: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  ),
  Notifications: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
  ),
  Tickets: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2a2 2 0 012-2h2a2 2 0 012 2v2m4 0V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10m16 0a2 2 0 01-2 2H7a2 2 0 01-2-2" />
    </svg>
  ),
  'Room Queue': (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 17l4 4 4-4m0-5l-4-4-4 4" />
    </svg>
  ),
  Inventory: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  ),
  Forms: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  'Lab Tech View': (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  ),
};

const Navbar = ({ collapsed, setCollapsed }: { collapsed: boolean; setCollapsed: (c: boolean) => void }) => {
  const { userRole, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (!userRole || !roleRoutes[userRole as Role]) return null;
  const navItems = roleRoutes[userRole as Role];

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      <nav
        className={`fixed inset-y-0 left-0 z-50 flex h-screen flex-col bg-white shadow-sm dark:bg-gray-800 transition-all duration-300 ${
          collapsed ? 'w-20' : 'w-56'
        } ${mobileOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}
        aria-label="Sidebar navigation"
      >
        <header className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-700">
          <h1 className={`text-xl font-bold text-indigo-600 ${collapsed ? 'sr-only' : ''}`}>BITS</h1>
          <button
            onClick={() => {
              if (window.innerWidth < 1024) {
                setMobileOpen(!mobileOpen);
              } else {
                setCollapsed(!collapsed);
              }
            }}
            className="rounded-md p-2 hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            aria-label="Toggle navigation"
            type="button"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-3 py-5">
          <ul className="space-y-2">
            {navItems.map((item) => (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    `group flex items-center gap-3 rounded-md px-4 py-2 text-sm font-medium transition-colors duration-300 ${
                      collapsed ? 'justify-center' : ''
                    } ${isActive ? 'bg-indigo-500 text-white shadow-sm' : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'}`
                  }
                  end
                >
                  <span
                    className={`text-indigo-600 group-hover:text-indigo-700 dark:text-indigo-400 ${
                      collapsed ? 'mx-auto' : ''
                    }`}
                    aria-hidden="true"
                  >
                    {navIcons[item.label] || <span className="w-6 h-6" />}
                  </span>
                  <span className={collapsed ? 'sr-only' : ''}>{item.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </div>

        <footer className="border-t border-gray-200 px-4 py-4 dark:border-gray-700">
          <button
            onClick={handleLogout}
            className={`w-full flex items-center gap-3 rounded-md bg-red-600 px-3 py-3 text-sm font-medium text-white shadow hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors ${
              collapsed ? 'justify-center' : ''
            }`}
            type="button"
            aria-label="Logout"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
              aria-hidden="true"
              focusable="false"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H7a2 2 0 01-2-2V7a2 2 0 012-2h4a2 2 0 012 2v1"
              />
            </svg>
            <span className={collapsed ? 'sr-only' : 'inline'}>Logout</span>
          </button>
        </footer>
      </nav>
    </>
  );
};

export default Navbar;
