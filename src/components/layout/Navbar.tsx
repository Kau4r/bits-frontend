import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useState } from 'react';
import type { ReactNode } from 'react';

const roleRoutes = {
  ADMIN: [
    { label: 'Dashboard', path: '/' },
    { label: 'Rooms', path: '/room' },
  ],
  LAB_TECH: [
    { label: 'Dashboard', path: '/' },
    { label: 'Notifications', path: '/notification' },
    { label: 'Tickets', path: '/tickets' },
    { label: 'Room Queue', path: '/labtech/room' },
    { label: 'Inventory', path: '/inventory' },
    { label: 'Forms', path: '/labtech/forms' },
  ],
  LAB_HEAD: [
    { label: 'Dashboard', path: '/' },
    { label: 'Notifications', path: '/notification' },
    { label: 'Tickets', path: '/tickets' },
    { label: 'Room Queue', path: '/labtech/room' },
    { label: 'Inventory', path: '/inventory' },
    { label: 'Forms', path: '/labtech/forms' },
  ],
} as const;

type Role = keyof typeof roleRoutes;

const navIcons: Record<string, ReactNode> = {
  Dashboard: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M13 5v6h6" />
    </svg>
  ),
  Notifications: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
  ),
  Tickets: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2a2 2 0 012-2h2a2 2 0 012 2v2m4 0V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10m16 0a2 2 0 01-2 2H7a2 2 0 01-2-2" />
    </svg>
  ),
  'Room Queue': (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 17l4 4 4-4m0-5l-4-4-4 4" />
    </svg>
  ),
  Inventory: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V7a2 2 0 00-2-2H6a2 2 0 00-2 2v6m16 0a2 2 0 01-2 2H6a2 2 0 01-2-2m16 0V7m0 6v6a2 2 0 01-2 2H6a2 2 0 01-2-2v-6" />
    </svg>
  ),
  Forms: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 16h8M8 12h8m-8-4h8M4 6h16M4 6v12a2 2 0 002 2h12a2 2 0 002-2V6" />
    </svg>
  ),
  Rooms: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 10v10a1 1 0 001 1h16a1 1 0 001-1V10M4 10V4a1 1 0 011-1h14a1 1 0 011 1v6" />
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
        />
      )}

      <nav
        className={`fixed inset-y-0 left-0 z-50 flex h-screen flex-col bg-white shadow-sm dark:bg-gray-800 transition-all duration-300 
        ${collapsed ? 'w-20' : 'w-56'} 
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full'} 
        lg:translate-x-0`}
      >
        <div className="flex items-center justify-between border-b px-4 py-3 dark:border-gray-700">
          <span className={`text-xl font-bold text-indigo-600 ${collapsed ? 'hidden' : ''}`}>BITS</span>
          <button
            onClick={() => {
              if (window.innerWidth < 1024) {
                setMobileOpen(!mobileOpen);
              } else {
                setCollapsed(!collapsed);
              }
            }}
            className="ml-2 p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
            aria-label="Toggle navbar"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-4">
          <ul className="space-y-1">
            {navItems.map((item) => (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-all duration-300 
                    ${collapsed ? 'justify-center' : ''} 
                    ${isActive
                      ? 'bg-indigo-500 text-white shadow-sm'
                      : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'}`
                  }
                >
                  {navIcons[item.label] || <span className="w-5 h-5" />}
                  <span className={collapsed ? 'sr-only' : ''}>{item.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </div>

        <div className="border-t px-4 py-3 dark:border-gray-700">
          <button
            onClick={handleLogout}
            className={`w-full flex items-center gap-2 rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 
            ${collapsed ? 'justify-center' : ''}`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H7a2 2 0 01-2-2V7a2 2 0 012-2h4a2 2 0 012 2v1" />
            </svg>
            <span className={collapsed ? 'sr-only' : 'inline'}>Logout</span>
          </button>
        </div>
      </nav>
    </>
  );
};

export default Navbar;
