import { Bell, Clock, AlertTriangle, Check, FileText, RotateCcw, User } from 'lucide-react';
import type { Notification } from '@/types/notification';
import MarkAsRead from '@/pages/notifications/components/MarkAsRead';
import Archive from '@/pages/notifications/components/Archive';

interface NotificationCardProps {
  notification: Notification;
  onMarkAsRead?: (id: number) => void;
  onMarkAsUnread?: (id: number) => void;
  onArchive?: (id: number) => void;
  onRestore?: (id: number) => void;
}

// Compact "2h ago" / "5m ago" label.
const formatRelativeTime = (iso?: string): string => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const diffMs = Date.now() - d.getTime();
  const diffSec = Math.round(diffMs / 1000);
  if (diffSec < 60) return 'just now';
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.round(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return d.toLocaleDateString();
};

export default function NotificationCard({
  notification,
  onMarkAsRead,
  onMarkAsUnread,
  onArchive,
  onRestore,
}: NotificationCardProps) {
  const isUnread = !notification.isRead && !notification.isArchived;
  const relativeTime = formatRelativeTime(notification.timestamp);

  const handleCardClick = () => {
    // Click anywhere on an unread, non-archived card to mark it read.
    // (Buttons inside stop propagation so they don't double-fire.)
    if (isUnread && onMarkAsRead) {
      onMarkAsRead(notification.id);
    }
  };
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'System':
        return <Bell className="h-5 w-5 text-blue-500" />;
      case 'Issue Report':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'Asset Request':
        return <Check className="h-5 w-5 text-green-500" />;
      case 'Form Update':
        return <FileText className="h-5 w-5 text-purple-500" />;
      default:
        return <Bell className="h-5 w-5 text-blue-500" />;
    }
  };

  const getTypeBadgeClass = (type: string) => {
    switch (type) {
      case 'Issue Report':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200';
      case 'Asset Request':
        return 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200';
      case 'Form Update':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200';
      case 'System':
      default:
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200';
    }
  };

  const stateBadge = notification.isArchived
    ? {
        label: 'Archived',
        className: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200',
      }
    : notification.isRead
      ? {
          label: 'Read',
          className: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200',
        }
      : {
          label: 'New',
          className: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-200',
        };

  return (
    <div
      role={isUnread ? 'button' : undefined}
      tabIndex={isUnread ? 0 : undefined}
      onClick={handleCardClick}
      onKeyDown={(e) => {
        if (isUnread && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          handleCardClick();
        }
      }}
      className={`group relative p-4 rounded-xl border border-l-4 transition-all shadow-sm hover:shadow-md ${
        notification.isArchived
          ? 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 border-l-gray-300 dark:border-l-gray-600'
          : isUnread
            ? 'bg-blue-50 dark:bg-blue-900/30 border-gray-200 dark:border-gray-700 border-l-indigo-500 cursor-pointer'
            : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 border-l-transparent'
      }`}
    >
      <div className="flex items-start gap-4">
        <div className="pt-0.5">{getNotificationIcon(notification.type)}</div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className={`truncate text-sm text-gray-800 dark:text-white ${isUnread ? 'font-bold' : 'font-semibold'}`}>
                {notification.title}
              </h3>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${getTypeBadgeClass(notification.type)}`}>
                  {notification.type}
                </span>
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${stateBadge.className}`}>
                  {stateBadge.label}
                </span>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2" onClick={(e) => e.stopPropagation()}>
              <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center">
                <Clock className="h-3 w-3 mr-1" />
                {notification.time}
              </span>

              {/* Mark as Read for unread, non-archived */}
              {isUnread && onMarkAsRead && (
                <MarkAsRead onClick={() => onMarkAsRead(notification.id)} />
              )}

              {/* Mark as Unread for read, non-archived */}
              {!isUnread && !notification.isArchived && onMarkAsUnread && (
                <button
                  type="button"
                  onClick={() => onMarkAsUnread(notification.id)}
                  title="Mark as unread"
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-900/20 dark:hover:text-indigo-300"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
              )}

              {/* Archive / Restore */}
              {notification.isArchived ? (
                onRestore && (
                  <Archive
                    isArchived={true}
                    onClick={() => onRestore(notification.id)}
                  />
                )
              ) : (
                onArchive && (
                  <Archive
                    isArchived={false}
                    onClick={() => onArchive(notification.id)}
                  />
                )
              )}
            </div>
          </div>

          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
            {notification.message}
          </p>

          {/* Extra info row — relative time + sender */}
          {(relativeTime || notification.senderName) && (
            <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-gray-500 dark:text-gray-400">
              {relativeTime && (
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {relativeTime}
                </span>
              )}
              {notification.senderName && (
                <span className="inline-flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {notification.senderName}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
