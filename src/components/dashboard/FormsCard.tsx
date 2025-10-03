import { CheckCircleIcon, ClockIcon, EyeIcon } from '@heroicons/react/24/outline';

const statuses = [
  {
    id: 1,
    name: 'Approved',
    count: 15,
    icon: CheckCircleIcon,
    color: 'text-green-500 dark:text-green-400',
    bg: 'bg-green-100 dark:bg-green-900/20',
  },
  {
    id: 2,
    name: 'Pending',
    count: 8,
    icon: ClockIcon,
    color: 'text-yellow-500 dark:text-yellow-400',
    bg: 'bg-yellow-100 dark:bg-yellow-900/20',
  },
  {
    id: 3,
    name: 'In Review',
    count: 5,
    icon: EyeIcon,
    color: 'text-blue-500 dark:text-blue-400',
    bg: 'bg-blue-100 dark:bg-blue-900/20',
  }
];

export default function FormsCard() {
  return (
    <div className="grid grid-cols-3 gap-3">
      {statuses.map(({ id, name, count, icon: Icon, color, bg }) => (
        <div 
          key={id} 
          className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm ring-1 ring-gray-200/50 dark:border-gray-700 dark:bg-gray-800 dark:ring-gray-700/50"
        >
          <div className="flex items-center justify-between">
            <div className={`rounded-lg p-2 ${bg} ${color}`}>
              <Icon className="h-4 w-4" />
            </div>
            <div className="text-right">
              <div className="text-lg font-semibold text-gray-900 dark:text-white">{count}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">{name}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}