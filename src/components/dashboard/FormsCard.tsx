import { CheckCircleIcon, ClockIcon, EyeIcon } from '@heroicons/react/24/outline';

const statuses = [
  {
    id: 1,
    name: 'Approved',
    count: 15,
    icon: CheckCircleIcon,
    color: 'text-green-400',
    bg: 'bg-green-900/10',
  },
  {
    id: 2,
    name: 'Pending',
    count: 8,
    icon: ClockIcon,
    color: 'text-yellow-400',
    bg: 'bg-yellow-900/10',
  },
  {
    id: 3,
    name: 'In Review',
    count: 5,
    icon: EyeIcon,
    color: 'text-blue-400',
    bg: 'bg-blue-900/10',
  }
];

export default function FormsCard() {
  return (
    <div className="grid grid-cols-3 gap-3">
      {statuses.map(({ id, name, count, icon: Icon, color, bg }) => (
        <div key={id} className="p-3 bg-[#1A2236] rounded-lg border border-gray-700">
          <div className="flex items-center justify-between">
            <div className={`p-2 rounded-lg ${bg} ${color}`}>
              <Icon className="h-4 w-4" />
            </div>
            <div className="text-right">
              <div className="text-lg font-semibold text-white">{count}</div>
              <div className="text-xs text-gray-400">{name}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
