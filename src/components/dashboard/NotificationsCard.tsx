import { CheckCircleIcon, ExclamationCircleIcon, InformationCircleIcon } from '@heroicons/react/24/outline';

const notifications = [
  {
    id: 1,
    title: 'Lab Maintenance',
    message: 'Scheduled maintenance for Computer Lab 1 on June 20th',
    type: 'info',
    time: '2 hours ago'
  },
  {
    id: 2,
    title: 'New Equipment',
    message: 'New equipment has been added to Physics Lab 2',
    type: 'success',
    time: '1 day ago'
  },
  {
    id: 3,
    title: 'System Update',
    message: 'System update scheduled for tomorrow at 2:00 AM',
    type: 'warning',
    time: '2 days ago'
  },
  {
    id: 3,
    title: 'System Update',
    message: 'System update scheduled for tomorrow at 2:00 AM',
    type: 'warning',
    time: '2 days ago'
  },
  {
    id: 3,
    title: 'System Update',
    message: 'System update scheduled for tomorrow at 2:00 AM',
    type: 'warning',
    time: '2 days ago'
  },
  {
    id: 3,
    title: 'System Update',
    message: 'System update scheduled for tomorrow at 2:00 AM',
    type: 'warning',
    time: '2 days ago'
  },
  {
    id: 3,
    title: 'System Update',
    message: 'System update scheduled for tomorrow at 2:00 AM',
    type: 'warning',
    time: '2 days ago'
  },
  {
    id: 3,
    title: 'System Update',
    message: 'System update scheduled for tomorrow at 2:00 AM',
    type: 'warning',
    time: '2 days ago'
  },
  {
    id: 3,
    title: 'System Update',
    message: 'System update scheduled for tomorrow at 2:00 AM',
    type: 'warning',
    time: '2 days ago'
  },

  {
    id: 3,
    title: 'System Update',
    message: 'System update scheduled for tomorrow at 2:00 AM',
    type: 'warning',
    time: '2 days ago'
  },
  {
    id: 3,
    title: 'System Update',
    message: 'System update scheduled for tomorrow at 2:00 AM',
    type: 'warning',
    time: '2 days ago'
  },
  {
    id: 3,
    title: 'System Update',
    message: 'System update scheduled for tomorrow at 2:00 AM',
    type: 'warning',
    time: '2 days ago'
  },
  {
    id: 3,
    title: 'System Update',
    message: 'System update scheduled for tomorrow at 2:00 AM',
    type: 'warning',
    time: '2 days ago'
  },
  {
    id: 3,
    title: 'System Update',
    message: 'System update scheduled for tomorrow at 2:00 AM',
    type: 'warning',
    time: '2 days ago'
  },
  {
    id: 3,
    title: 'System Update',
    message: 'System update scheduled for tomorrow at 2:00 AM',
    type: 'warning',
    time: '2 days ago'
  },
  {
    id: 3,
    title: 'System Update',
    message: 'System update scheduled for tomorrow at 2:00 AM',
    type: 'warning',
    time: '2 days ago'
  },
  {
    id: 3,
    title: 'System Update',
    message: 'System update scheduled for tomorrow at 2:00 AM',
    type: 'warning',
    time: '2 days ago'
  },
  // add more if needed...
];

export default function NotificationsCard() {
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

  return (
    <div className="flex h-full flex-col">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Notifications</h3>
        <button className="text-sm font-medium text-green-600 hover:text-green-500 dark:text-green-400 dark:hover:text-green-300">
          View All
        </button>
      </div>
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
    </div>
  );
}