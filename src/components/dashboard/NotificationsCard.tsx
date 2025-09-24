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
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-white">Notifications</h3>
        <button className="text-sm font-medium text-green-400 hover:text-green-300">
          View All
        </button>
      </div>
      <div className="flex-1 overflow-hidden flex flex-col">
        <div
          className="overflow-y-auto pr-2 -mr-2"
        >
          <div className="space-y-2 pr-1">
            {notifications.map(({ id, title, message, type, time }) => (
              <div key={id} className="flex items-start space-x-3 p-3 bg-[#1A2236] rounded-lg">
                <div className="mt-0.5 flex-shrink-0">
                  {getIcon(type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{title}</p>
                  <p className="text-xs text-gray-200 overflow-hidden" style={{
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    textOverflow: 'ellipsis'
                  }}>
                    {message}
                  </p>
                  <p className="mt-1 text-xs text-gray-300">{time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
