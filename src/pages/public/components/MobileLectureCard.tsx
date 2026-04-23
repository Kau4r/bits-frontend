import { Users, Presentation, ChevronRight } from 'lucide-react';
import type { PublicLectureRoom } from '@/services/publicRooms';

interface MobileLectureCardProps {
    room: PublicLectureRoom;
    onClick: () => void;
}

export default function MobileLectureCard({ room, onClick }: MobileLectureCardProps) {
    const isAvailable = room.Status === 'AVAILABLE';

    return (
        <button
            type="button"
            onClick={onClick}
            className="w-full text-left rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-sm p-4 hover:border-indigo-500 dark:hover:border-indigo-400 transition-colors"
        >
            <div className="flex items-start gap-3">
                <div className="shrink-0 p-2.5 rounded-lg bg-indigo-50 dark:bg-indigo-500/10">
                    <Presentation className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                            <h3 className="text-base font-semibold text-gray-900 dark:text-white truncate">
                                {room.Name}
                            </h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Lecture Room</p>
                        </div>
                        <span
                            className={`shrink-0 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                                isAvailable
                                    ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                                    : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                            }`}
                        >
                            {isAvailable ? 'Available' : 'In Use'}
                        </span>
                    </div>

                    <div className="mt-3 flex items-center justify-between text-sm">
                        <div className="flex items-center text-gray-600 dark:text-gray-300">
                            <Users className="w-4 h-4 mr-2 text-gray-400" />
                            <span>Capacity: <span className="font-medium text-gray-900 dark:text-white">{room.Capacity}</span></span>
                        </div>
                        <span className="inline-flex items-center text-indigo-600 dark:text-indigo-400 text-xs font-medium">
                            View schedule
                            <ChevronRight className="w-4 h-4 ml-0.5" />
                        </span>
                    </div>
                </div>
            </div>
        </button>
    );
}
