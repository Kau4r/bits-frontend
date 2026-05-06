import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckCircle,
  AlertTriangle,
  Ticket,
  FileText,
  Bell,
  Box,
  Calendar,
  ChevronDown,
} from 'lucide-react';
import { useNotifications } from '@/context/NotificationContext';
import Card from './Card';

/**
 * Returns a relative time string like "2m ago", "3h ago", "Yesterday"
 */
function getRelativeTime(timestamp: string | undefined, timeStr: string): string {
  if (!timestamp) return timeStr;

  const now = new Date();
  const date = new Date(timestamp);
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHr / 24);

  if (diffSec < 60) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/**
 * Returns an icon and accent color based on the notification title
 */
function getNotificationStyle(title: string) {
  const t = title.toUpperCase();

  if (t.includes('APPROVED')) {
    return {
      icon: <CheckCircle className="h-5 w-5" />,
      color: 'text-green-500',
      bg: 'bg-green-500/10',
    };
  }
  if (t.includes('REJECT') || t.includes('ERROR') || t.includes('FAIL')) {
    return {
      icon: <AlertTriangle className="h-5 w-5" />,
      color: 'text-red-500',
      bg: 'bg-red-500/10',
    };
  }
  if (t.includes('TICKET') || t.includes('ISSUE') || t.includes('REPORT')) {
    return {
      icon: <Ticket className="h-5 w-5" />,
      color: 'text-yellow-500',
      bg: 'bg-yellow-500/10',
    };
  }
  if (t.includes('FORM') || t.includes('SUBMIT')) {
    return {
      icon: <FileText className="h-5 w-5" />,
      color: 'text-purple-500',
      bg: 'bg-purple-500/10',
    };
  }
  if (t.includes('BORROW') || t.includes('ASSET') || t.includes('INVENTORY')) {
    return {
      icon: <Box className="h-5 w-5" />,
      color: 'text-cyan-500',
      bg: 'bg-cyan-500/10',
    };
  }
  if (t.includes('BOOK') || t.includes('SCHEDULE') || t.includes('ROOM')) {
    return {
      icon: <Calendar className="h-5 w-5" />,
      color: 'text-blue-500',
      bg: 'bg-blue-500/10',
    };
  }
  // Default
  return {
    icon: <Bell className="h-5 w-5" />,
    color: 'text-gray-500',
    bg: 'bg-gray-500/10',
  };
}

export default function NotificationsCard() {
  const { notifications, loading, markAsRead, markAllAsRead } = useNotifications();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollDown, setCanScrollDown] = useState(false);

  const activeNotifications = notifications.filter(n => !n.archived);
  const unreadNotifications = activeNotifications.filter(n => !n.read);
  const recentReadNotifications = activeNotifications
    .filter(n => n.read)
    .sort((a, b) => new Date(b.readAt || b.timestamp).getTime() - new Date(a.readAt || a.timestamp).getTime())
    .slice(0, 5);
  const visibleNotifications = unreadNotifications.length > 0 ? unreadNotifications : recentReadNotifications;

  // Check scroll position to show/hide indicator
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const checkScroll = () => {
      const hasMore = el.scrollHeight - el.scrollTop - el.clientHeight > 20;
      setCanScrollDown(hasMore);
    };

    checkScroll();
    el.addEventListener('scroll', checkScroll);
    // Recheck when notifications change
    const observer = new ResizeObserver(checkScroll);
    observer.observe(el);

    return () => {
      el.removeEventListener('scroll', checkScroll);
      observer.disconnect();
    };
  }, [visibleNotifications.length]);

  if (loading && notifications.length === 0) {
    return (
      <Card title="Notifications" className="h-full">
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse rounded-lg bg-gray-50 dark:bg-gray-700/30 p-3">
              <div className="flex items-start space-x-3">
                <div className="h-8 w-8 rounded-lg bg-gray-200 dark:bg-gray-700" />
                <div className="flex-1">
                  <div className="h-4 w-32 rounded bg-gray-200 dark:bg-gray-700 mb-2" />
                  <div className="h-3 w-full rounded bg-gray-200 dark:bg-gray-700" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  return (
    <Card
      title="Notifications"
      className="h-full"
      headerRight={
        activeNotifications.length > 0 ? (
          <div className="flex items-center gap-3">
            {unreadNotifications.length > 0 && (
              <button
                type="button"
                onClick={() => void markAllAsRead()}
                className="text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
              >
                Read All
              </button>
            )}
            <Link
              to="/notification"
              className="text-sm font-medium text-green-600 hover:text-green-500 dark:text-green-400 dark:hover:text-green-300"
            >
              View All
            </Link>
          </div>
        ) : undefined
      }
    >
      {visibleNotifications.length === 0 ? (
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center py-8">
            <Bell className="h-10 w-10 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
            <p className="text-sm text-gray-500 dark:text-gray-400">No new notifications</p>
          </div>
        </div>
      ) : (
        <div className="relative flex flex-1 flex-col overflow-hidden">
          {unreadNotifications.length === 0 && recentReadNotifications.length > 0 && (
            <div className="mb-2 px-1">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
                No new notifications
              </p>
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">Recent read notifications</p>
            </div>
          )}
          <div ref={scrollRef} className="-mr-2 overflow-y-auto pr-2">
            <div className="space-y-2 pr-1">
              {visibleNotifications.map(({ id, title, message, timestamp, time, user, read }) => {
                const style = getNotificationStyle(title);
                const displayUser = user ? `${user.First_Name} ${user.Last_Name}` : null;

                return (
                  <div
                    key={id}
                    onClick={() => !read && markAsRead(id)}
                    className="cursor-pointer group flex items-start gap-3 rounded-lg p-2.5 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/30"
                    title={read ? title : 'Click to mark as read'}
                  >
                    <div className={`mt-0.5 flex-shrink-0 rounded-lg p-1.5 ${style.bg} ${style.color}`}>
                      {style.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {title}
                        </p>
                        <span className="text-[10px] text-gray-400 dark:text-gray-500 flex-shrink-0 whitespace-nowrap">
                          {getRelativeTime(timestamp, time)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
                        {message}
                      </p>
                      {displayUser && (
                        <p className="mt-1 text-[10px] text-gray-400 dark:text-gray-500">
                          by {displayUser}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {canScrollDown && (
            <div className="pointer-events-none absolute bottom-0 left-0 right-2 flex justify-center pb-1 pt-6 bg-gradient-to-t from-gray-50 dark:from-gray-900 to-transparent">
              <div className="pointer-events-auto flex items-center gap-1 rounded-full bg-gray-800/70 dark:bg-gray-600/70 px-3 py-1 text-[10px] text-white">
                <ChevronDown className="h-3 w-3 animate-bounce" />
                Scroll for more
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
