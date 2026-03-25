interface RoomCardProps {
    code: string;
    type: string;
    status: 'Available' | 'In Use';
    nextSchedule?: string;
    currentUser?: string;
    onViewDetails: () => void;
}

export default function RoomCard({ code, type, status, nextSchedule, currentUser, onViewDetails }: RoomCardProps) {
    const isAvailable = status === 'Available';

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 hover:border-indigo-500 dark:hover:border-indigo-500 transition-all duration-200 flex flex-col shadow-sm">
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
                <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">{code}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{type}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${isAvailable
                        ? 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400'
                        : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400'
                    }`}>
                    {status}
                </span>
            </div>

            {/* Schedule Info */}
            <div className="flex-1 mb-4">
                {isAvailable ? (
                    nextSchedule && (
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                            <span className="text-gray-400 dark:text-gray-500">Next Schedule</span>
                            <span className="ml-2 text-gray-700 dark:text-gray-300">{nextSchedule}</span>
                        </div>
                    )
                ) : (
                    <div className="text-sm text-gray-500 dark:text-gray-400 space-y-1">
                        <div>
                            <span className="text-gray-700 dark:text-gray-300">{nextSchedule || '—'}</span>
                        </div>
                        {currentUser && (
                            <div className="text-right text-gray-500 dark:text-gray-400">{currentUser}</div>
                        )}
                    </div>
                )}
            </div>

            {/* Action Button */}
            <button
                onClick={onViewDetails}
                className="w-full py-2.5 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-colors"
            >
                View Details
            </button>
        </div>
    );
}
