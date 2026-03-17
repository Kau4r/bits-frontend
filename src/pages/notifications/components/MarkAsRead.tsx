import { Eye } from 'lucide-react';

interface MarkAsReadProps {
    onClick: () => void;
}

export default function MarkAsRead({ onClick }: MarkAsReadProps) {
    return (
        <button
            onClick={(e) => {
                e.stopPropagation();
                onClick();
            }}
            title="Mark as read"
            className="rounded-full p-1.5 hover:bg-blue-100 dark:hover:bg-blue-800 text-blue-600 dark:text-blue-400 transition"
        >
            <Eye className="h-4 w-4" />
        </button>
    );
}
