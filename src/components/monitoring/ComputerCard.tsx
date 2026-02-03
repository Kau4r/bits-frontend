import { memo } from 'react';
import type { MonitoringComputer } from '../../types/monitoring';

interface ComputerCardProps {
  computer: MonitoringComputer;
  onClick: () => void;
}

const ComputerCard = memo(({ computer, onClick }: ComputerCardProps) => {
  // Status color mapping (following pattern from epic spec)
  const statusColors = {
    ONLINE: 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100',
    IDLE: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100',
    WARNING: 'bg-orange-100 text-orange-800 dark:bg-orange-800 dark:text-orange-100',
    OFFLINE: 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100',
  };

  const bgColor = computer.Is_Online ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-900';

  return (
    <div
      className={`${bgColor} border border-gray-200 dark:border-gray-700 rounded-lg p-4 cursor-pointer hover:shadow-md transition-shadow`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      aria-label={`${computer.Name} - ${computer.Status}${computer.Current_User ? `, used by ${computer.Current_User.First_Name} ${computer.Current_User.Last_Name}` : ''}`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="font-semibold text-gray-900 dark:text-white">{computer.Name}</span>
        <span
          className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${statusColors[computer.Status]}`}
          aria-label={`Status: ${computer.Status}`}
        >
          <span className="size-2 rounded-full bg-current" aria-hidden="true"></span>
          {computer.Status}
        </span>
      </div>

      {computer.Current_User && (
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {computer.Current_User.First_Name} {computer.Current_User.Last_Name}
        </div>
      )}

      <div className="text-xs text-gray-500 dark:text-gray-500 mt-2">
        Last seen: {new Date(computer.Last_Seen).toLocaleTimeString()}
      </div>
    </div>
  );
});

ComputerCard.displayName = 'ComputerCard';

export default ComputerCard;
