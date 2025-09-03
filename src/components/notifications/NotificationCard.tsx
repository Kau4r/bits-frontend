import { Bell, Clock, Check, AlertTriangle, Eye } from 'lucide-react';

interface NotificationCardProps {
  notification: {
    id: number;
    title: string;
    message: string;
    time: string;
    read: boolean;
    type: 'System' | 'Issue Report' | 'Asset Request' | 'Form Update';
    role: 'Lab Tech' | 'Lab Head';
  };
  onMarkAsRead?: (id: number) => void;
}

export default function NotificationCard({ notification, onMarkAsRead }: NotificationCardProps) {
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'System':
        return <Bell className="h-5 w-5 text-blue-500" />;
      case 'Issue Report':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'Asset Request':
        return <Check className="h-5 w-5 text-green-500" />;
      case 'Form Update':
        return <Eye className="h-5 w-5 text-purple-500" />;
      default:
        return <Bell className="h-5 w-5 text-blue-500" />;
    }
  };

  return (
    <div
      className={`group relative p-4 rounded-xl border ${
        notification.read
          ? 'bg-white dark:bg-gray-800'
          : 'bg-blue-50/60 dark:bg-blue-900/30'
      } border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all`}
    >
      <div className="flex items-start gap-4">
        <div className="pt-0.5">{getNotificationIcon(notification.type)}</div>

        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-white">
              {notification.title}
            </h3>

            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center">
                <Clock className="h-3 w-3 mr-1" />
                {notification.time}
              </span>

              {!notification.read && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onMarkAsRead?.(notification.id);
                  }}
                  title="Mark as read"
                  className="rounded-full p-1 hover:bg-blue-100 dark:hover:bg-blue-800 text-blue-600 dark:text-blue-400 transition"
                >
                  <Eye className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
            {notification.message}
          </p>
        </div>
      </div>
    </div>
  );
}
