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
  }
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button className="text-sm font-medium text-green-400 hover:text-green-300">
          View All
        </button>
      </div>
      <div className="space-y-3">
        {notifications.map((notification) => (
          <div key={notification.id} className="flex items-start space-x-3 p-3 bg-[#1A2236] rounded-lg">
            <div className="mt-0.5">
              {getIcon(notification.type)}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-white">{notification.title}</p>
              <p className="text-xs text-gray-200">{notification.message}</p>
              <p className="mt-1 text-xs text-gray-300">{notification.time}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
