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

export default function FormsCard() {
  const [statuses, setStatuses] = useState<FormStatusConfig[]>([
    { id: 1, name: 'Approved', count: 0, icon: CheckCircleIcon, color: 'text-green-500 dark:text-green-400', bg: 'bg-green-100 dark:bg-green-900/20' },
    { id: 2, name: 'Pending', count: 0, icon: ClockIcon, color: 'text-yellow-500 dark:text-yellow-400', bg: 'bg-yellow-100 dark:bg-yellow-900/20' },
    { id: 3, name: 'In Review', count: 0, icon: EyeIcon, color: 'text-blue-500 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-900/20' },
  ]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadFormStats = async () => {
      try {
        // TODO: Replace with actual API call when /api/forms/stats is available
        // const response = await api.get('/forms/stats');
        // setStatuses(response.data);

        // For now, show zeros until API is ready
        setStatuses([
          { id: 1, name: 'Approved', count: 0, icon: CheckCircleIcon, color: 'text-green-500 dark:text-green-400', bg: 'bg-green-100 dark:bg-green-900/20' },
          { id: 2, name: 'Pending', count: 0, icon: ClockIcon, color: 'text-yellow-500 dark:text-yellow-400', bg: 'bg-yellow-100 dark:bg-yellow-900/20' },
          { id: 3, name: 'In Review', count: 0, icon: EyeIcon, color: 'text-blue-500 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-900/20' },
        ]);
      } catch (err) {
        console.error('Error fetching form stats:', err);
      } finally {
        setLoading(false);
      }
    };

    loadFormStats();
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-3 gap-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800">
            <div className="flex items-center justify-between">
              <div className="h-8 w-8 rounded-lg bg-gray-200 dark:bg-gray-700" />
              <div className="text-right">
                <div className="h-5 w-8 rounded bg-gray-200 dark:bg-gray-700 mb-1" />
                <div className="h-3 w-12 rounded bg-gray-200 dark:bg-gray-700" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

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