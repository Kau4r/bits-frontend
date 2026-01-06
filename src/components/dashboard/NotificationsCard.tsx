import { useState, useEffect } from 'react';
import { CheckCircleIcon, ExclamationCircleIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import { getNotifications, type Notification } from '@/services/notifications';

export default function NotificationsCard() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadNotifications = async () => {
      try {
        const data = await getNotifications();
        setNotifications(data);
      } catch (err) {
        console.error('Error fetching notifications:', err);
      } finally {
        setLoading(false);
      }
    };

    loadNotifications();
  }, []);

  const getIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'warning':
        return <ExclamationCircleIcon className="h-5 w-5 text-yellow-500" />;
      default:
        return <InformationCircleIcon className="h-5 w-5 text-blue-500" />;
    }
  };

  if (loading) {
    return (
      <div className="flex h-full flex-col">
        <div className="mb-3 flex items-center justify-between">
          <div className="h-5 w-24 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
          <div className="h-4 w-16 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
        </div>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse rounded-lg bg-white p-3 dark:bg-gray-800">
              <div className="flex items-start space-x-3">
                <div className="h-5 w-5 rounded-full bg-gray-200 dark:bg-gray-700" />
                <div className="flex-1">
                  <div className="h-4 w-32 rounded bg-gray-200 dark:bg-gray-700 mb-2" />
                  <div className="h-3 w-full rounded bg-gray-200 dark:bg-gray-700" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Notifications</h3>
        <button className="text-sm font-medium text-green-600 hover:text-green-500 dark:text-green-400 dark:hover:text-green-300">
          View All
        </button>
      </div>

      {notifications.length === 0 ? (
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center py-8">
            <InformationCircleIcon className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-sm text-gray-500 dark:text-gray-400">No notifications</p>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="-mr-2 overflow-y-auto pr-2">
            <div className="space-y-2 pr-1">
              {notifications.map(({ id, title, message, type, time }) => (
                <div
                  key={id}
                  className="flex items-start space-x-3 rounded-lg bg-white p-3 shadow-sm ring-1 ring-gray-200/50 dark:bg-gray-800 dark:ring-gray-700/50"
                >
                  <div className="mt-0.5 flex-shrink-0">
                    {getIcon(type)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-900 dark:text-white">{title}</p>
                    <p
                      className="overflow-hidden text-xs text-gray-600 dark:text-gray-300"
                      style={{
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        textOverflow: 'ellipsis'
                      }}
                    >
                      {message}
                    </p>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}