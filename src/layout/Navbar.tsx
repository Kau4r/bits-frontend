import { NavLink, useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useNotifications } from '@/context/NotificationContext';
import { useTheme } from '@/hooks/useTheme';

type NavChild = { label: string; path: string };
type NavItem = { label: string; path: string; children?: NavChild[] };

const INVENTORY_CHILDREN: NavChild[] = [
  { label: 'Information', path: '/inventory?view=information' },
  { label: 'Inventory List', path: '/inventory?view=list' },
];

const roleRoutes: Record<string, readonly NavItem[]> = {
  ADMIN: [
    { label: 'Users', path: '/' },
    { label: 'Rooms', path: '/room' },
    { label: 'Schedule Import', path: '/schedule-import' },
    { label: 'Maintenance', path: '/maintenance' },
  ],
  LAB_TECH: [
    { label: 'Dashboard', path: '/' },
    { label: 'Notifications', path: '/notification' },
    { label: 'Tickets', path: '/tickets' },
    { label: 'Rooms', path: '/labtech/room' },
    { label: 'Inventory', path: '/inventory', children: INVENTORY_CHILDREN },
    { label: 'Borrowing', path: '/labtech/borrowing' },
    { label: 'Forms', path: '/forms' },
    { label: 'Reports', path: '/reports' },
  ],
  LAB_HEAD: [
    { label: 'Dashboard', path: '/' },
    { label: 'Notifications', path: '/notification' },
    { label: 'Tickets', path: '/tickets' },
    { label: 'Scheduling', path: '/labhead-scheduling' },
    { label: 'Rooms', path: '/labtech/room' },
    { label: 'Inventory', path: '/inventory', children: INVENTORY_CHILDREN },
    { label: 'Borrowing', path: '/labtech/borrowing' },
    { label: 'Forms', path: '/forms' },
    { label: 'Lab Tech View', path: '/labtechview' },
  ],
};

type Role = keyof typeof roleRoutes;

const splitPath = (target: string): { pathname: string; search: string } => {
  const [pathname, search = ''] = target.split('?');
  return { pathname, search };
};

// A child is active when its pathname matches AND every query param it
// specifies is present in the current location with the same value.
const isChildActive = (childPath: string, location: { pathname: string; search: string }) => {
  const target = splitPath(childPath);
  if (location.pathname !== target.pathname) return false;
  if (!target.search) return true;
  const wanted = new URLSearchParams(target.search);
  const current = new URLSearchParams(location.search);
  for (const [key, value] of wanted) {
    if (current.get(key) !== value) return false;
  }
  return true;
};

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
  'Scheduling': (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  'Schedule Import': (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 16V9m0 0l-3 3m3-3l3 3" />
    </svg>
  ),
  Maintenance: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M10 11v6m4-6v6M6 7l1 14h10l1-14M9 7V4h6v3" />
    </svg>
  ),
  Inventory: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  ),
  Borrowing: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.05 4.575a1.575 1.575 0 10-3.15 0v3m3.15-3v-1.5a1.575 1.575 0 013.15 0v1.5m-3.15 0l.075 5.925m3.075.75V4.575m0 0a1.575 1.575 0 013.15 0V15M6.9 7.575a1.575 1.575 0 10-3.15 0v8.175a6.75 6.75 0 006.75 6.75h2.018a5.25 5.25 0 003.712-1.538l1.732-1.732a5.25 5.25 0 001.538-3.712l.003-2.024a.668.668 0 01.198-.471 1.575 1.575 0 10-2.228-2.228 3.818 3.818 0 00-1.12 2.687M6.9 7.575V12m6.27 4.318A4.49 4.49 0 0116.35 15m.002 0h-.002" />
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
  Reports: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
    </svg>
  ),
};

const Navbar = ({ collapsed, setCollapsed, isMobile }: { collapsed: boolean; setCollapsed: (c: boolean) => void; isMobile: boolean }) => {
  const { user, userRole, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement | null>(null);
  const { unreadCount, pendingTicketCount } = useNotifications();
  const { theme, toggleTheme } = useTheme();

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

  const location = useLocation();
  const navItems = userRole && roleRoutes[userRole as Role] ? roleRoutes[userRole as Role] : [];

  // Auto-expand a dropdown when the user is already on one of its child routes.
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  useEffect(() => {
    setExpanded(prev => {
      const next = { ...prev };
      for (const item of navItems) {
        if (!item.children) continue;
        const shouldOpen = item.children.some(child => isChildActive(child.path, location));
        if (shouldOpen) next[item.path] = true;
      }
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, location.search, userRole]);

  if (!userRole || !roleRoutes[userRole as Role]) return null;

  const toggleExpanded = (path: string) => {
    setExpanded(prev => ({ ...prev, [path]: !prev[path] }));
  };

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const toggleSidebar = () => {
    if (isMobile) setMobileOpen(!mobileOpen);
    else setCollapsed(!collapsed);
  };

  return (
    <>
      {/* Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      <nav
        className={`fixed inset-y-0 left-0 z-50 flex h-screen flex-col bg-white shadow-sm dark:bg-gray-800 transition-all duration-300
          ${collapsed && !isMobile ? "w-20" : !collapsed && !isMobile ? "w-56" : "w-56"} 
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}
      >
        <header className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-700">
          <h1 className={`text-xl font-bold text-indigo-600 ${collapsed && !isMobile ? "sr-only" : ""}`}>
            BITS
          </h1>
          <button
            onClick={toggleSidebar}
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
            {navItems.map((item) => {
              const hasChildren = !!item.children && item.children.length > 0;
              const showAsDropdown = hasChildren && (!collapsed || isMobile);

              if (showAsDropdown) {
                const isOpen = !!expanded[item.path];
                const anyChildActive = item.children!.some(child => isChildActive(child.path, location));
                const activeStyle = anyChildActive
                  ? 'bg-indigo-500 text-white shadow-sm'
                  : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700';

                return (
                  <li key={item.path}>
                    <button
                      type="button"
                      onClick={() => toggleExpanded(item.path)}
                      aria-expanded={isOpen}
                      className={`group flex w-full items-center gap-3 rounded-md px-4 py-2 text-sm font-medium transition-colors duration-300 ${activeStyle}`}
                    >
                      <span
                        className={`relative ${anyChildActive ? 'text-white' : 'text-indigo-600 group-hover:text-indigo-700 dark:text-indigo-400'}`}
                        aria-hidden="true"
                      >
                        {navIcons[item.label] || <span className="w-6 h-6" />}
                      </span>
                      <span className="flex-1 text-left">{item.label}</span>
                      <svg
                        className={`h-4 w-4 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {isOpen && (
                      <ul className="mt-1 space-y-1 pl-10">
                        {item.children!.map(child => {
                          const active = isChildActive(child.path, location);
                          return (
                            <li key={child.path}>
                              <Link
                                to={child.path}
                                onClick={() => isMobile && setMobileOpen(false)}
                                className={`block rounded-md px-3 py-1.5 text-sm transition-colors ${
                                  active
                                    ? 'bg-indigo-100 font-semibold text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-200'
                                    : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                                }`}
                              >
                                {child.label}
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </li>
                );
              }

              return (
                <li key={item.path}>
                  <NavLink
                    to={item.path}
                    onClick={() => isMobile && setMobileOpen(false)}
                    className={({ isActive }) =>
                      `group flex items-center gap-3 rounded-md px-4 py-2 text-sm font-medium transition-colors duration-300
                    ${collapsed && !isMobile ? "justify-center" : ""}
                    ${isActive ? "bg-indigo-500 text-white shadow-sm" : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"}`
                    }
                    end
                  >
                    {({ isActive }) => (
                      <>
                        <span
                          className={`relative ${isActive ? "text-white" : "text-indigo-600 group-hover:text-indigo-700 dark:text-indigo-400"} ${collapsed && !isMobile ? "mx-auto" : ""}`}
                          aria-hidden="true"
                        >
                          {navIcons[item.label] || <span className="w-6 h-6" />}
                          {/* Notification badge */}
                          {item.label === 'Notifications' && unreadCount > 0 && (
                            <span
                              aria-label={`${unreadCount} unread notifications`}
                              className="absolute -bottom-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[11px] font-bold leading-none text-white ring-2 ring-white dark:ring-gray-800"
                            >
                              {unreadCount > 99 ? '99+' : unreadCount}
                            </span>
                          )}
                          {/* Pending Tickets badge */}
                          {item.label === 'Tickets' && pendingTicketCount > 0 && (
                            <span
                              aria-label={`${pendingTicketCount} pending tickets`}
                              className="absolute -bottom-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[11px] font-bold leading-none text-white ring-2 ring-white dark:ring-gray-800"
                            >
                              {pendingTicketCount > 99 ? '99+' : pendingTicketCount}
                            </span>
                          )}
                        </span>
                        <span className={collapsed && !isMobile ? "sr-only" : ""}>{item.label}</span>
                      </>
                    )}
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </div>

        <footer className="border-t border-gray-200 px-4 py-4 dark:border-gray-700 space-y-2">
          <button
            onClick={toggleTheme}
            className={`w-full flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${collapsed && !isMobile ? "justify-center" : ""}`}
            type="button"
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
            <span className={collapsed && !isMobile ? "sr-only" : "inline"}>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
          </button>

          {user && (
            <div ref={profileRef} className="relative">
              <button
                onClick={() => setProfileOpen(v => !v)}
                className={`w-full flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${collapsed && !isMobile ? "justify-center" : ""} ${profileOpen ? "bg-gray-100 dark:bg-gray-700" : ""}`}
                type="button"
                aria-haspopup="menu"
                aria-expanded={profileOpen}
                aria-label="Open profile menu"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-sm font-bold text-white">
                  {`${user.First_Name?.[0] ?? ''}${user.Last_Name?.[0] ?? ''}`.toUpperCase()}
                </div>
                <div className={`min-w-0 flex-1 text-left ${collapsed && !isMobile ? "sr-only" : "flex flex-col"}`}>
                  <span className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                    {user.First_Name} {user.Last_Name}
                  </span>
                  <span className="truncate text-xs text-gray-500 dark:text-gray-400">
                    {userRole?.replace('_', ' ')}
                  </span>
                </div>
              </button>

              {profileOpen && (
                <div
                  role="menu"
                  className={`absolute bottom-full mb-2 z-50 rounded-xl border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800 ${collapsed && !isMobile ? "left-full ml-2 bottom-0 w-64" : "left-0 right-0"}`}
                >
                  <div className="flex items-start gap-3 border-b border-gray-200 p-4 dark:border-gray-700">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-base font-bold text-white">
                      {`${user.First_Name?.[0] ?? ''}${user.Last_Name?.[0] ?? ''}`.toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                        {user.First_Name} {user.Middle_Name ? `${user.Middle_Name} ` : ''}{user.Last_Name}
                      </p>
                      <p className="truncate text-xs text-gray-500 dark:text-gray-400">{user.Email}</p>
                      <span className="mt-1 inline-flex rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300">
                        {userRole?.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                  {user.Username && (
                    <div className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                      <span className="font-semibold text-gray-700 dark:text-gray-300">Username:</span> {user.Username}
                    </div>
                  )}
                  <div className="border-t border-gray-200 p-2 dark:border-gray-700">
                    <button
                      onClick={() => { setProfileOpen(false); handleLogout(); }}
                      className="w-full flex items-center gap-3 rounded-md bg-red-600 px-3 py-2.5 text-sm font-semibold text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors"
                      type="button"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H7a2 2 0 01-2-2V7a2 2 0 012-2h4a2 2 0 012 2v1" />
                      </svg>
                      Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </footer>
      </nav>
    </>
  );
};


export default Navbar;
