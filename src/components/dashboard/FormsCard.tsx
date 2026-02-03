import { useState, useEffect } from 'react';
import { CheckCircleIcon, ClockIcon, EyeIcon } from '@heroicons/react/24/outline';

type FormStatusConfig = {
  id: number;
  name: string;
  count: number;
  icon: typeof CheckCircleIcon;
  color: string;
  bg: string;
};

interface FormsCardProps {
  pendingCount?: number;
  approvedCount?: number;
  inReviewCount?: number;
}

export default function FormsCard({ pendingCount = 0, approvedCount = 0, inReviewCount = 0 }: FormsCardProps) {
  // Update state when prop changes
  useEffect(() => {
    setStatuses(prev => prev.map(s => {
      if (s.name === 'Pending') return { ...s, count: pendingCount };
      if (s.name === 'Approved') return { ...s, count: approvedCount };
      if (s.name === 'In Review') return { ...s, count: inReviewCount };
      return s;
    }));
  }, [pendingCount, approvedCount, inReviewCount]);

  const [statuses, setStatuses] = useState<FormStatusConfig[]>([
    { id: 1, name: 'Approved', count: 0, icon: CheckCircleIcon, color: 'text-green-500 dark:text-green-400', bg: 'bg-green-100 dark:bg-green-900/20' },
    { id: 2, name: 'Pending', count: 0, icon: ClockIcon, color: 'text-yellow-500 dark:text-yellow-400', bg: 'bg-yellow-100 dark:bg-yellow-900/20' },
    { id: 3, name: 'In Review', count: 0, icon: EyeIcon, color: 'text-blue-500 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-900/20' },
  ]);
  // No internal fetching needed as data comes from props
  // If we need Approved/In Review counts, we should add them to dashboard metrics API later




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