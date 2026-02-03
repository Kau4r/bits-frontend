import { Archive as ArchiveIcon, RotateCcw } from 'lucide-react';

interface ArchiveProps {
    isArchived: boolean;
    onClick: () => void;
}

export default function Archive({ isArchived, onClick }: ArchiveProps) {
    return (
        <button
            onClick={(e) => {
                e.stopPropagation();
                onClick();
            }}
            title={isArchived ? 'Restore' : 'Archive'}
            className={`rounded-full p-1.5 transition ${isArchived
                    ? 'hover:bg-green-100 dark:hover:bg-green-800 text-green-600 dark:text-green-400'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400'
                }`}
        >
            {isArchived ? (
                <RotateCcw className="h-4 w-4" />
            ) : (
                <ArchiveIcon className="h-4 w-4" />
            )}
        </button>
    );
}
