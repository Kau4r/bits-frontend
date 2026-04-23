import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { DoorOpen, Presentation, Loader2, MessageSquareWarning, Info } from 'lucide-react';
import type { OpenedLabRoom } from '@/services/room';
import {
    getPublicOpenedLabs,
    getPublicLectureRooms,
    type PublicLectureRoom,
} from '@/services/publicRooms';
import MobileOpenedLabCard from '@/pages/public/components/MobileOpenedLabCard';
import MobileLectureCard from '@/pages/public/components/MobileLectureCard';
import RoomSchedule7DayDrawer from '@/pages/public/components/RoomSchedule7DayDrawer';
import PublicReportIssueModal from '@/pages/public/components/PublicReportIssueModal';

const BOTTOM_BAR_HEIGHT = 56; // px — keep in sync with the fixed bar below.

export default function StudentPublicLanding() {
    const [openedLabs, setOpenedLabs] = useState<OpenedLabRoom[]>([]);
    const [lectureRooms, setLectureRooms] = useState<PublicLectureRoom[]>([]);
    const [isLoadingLabs, setIsLoadingLabs] = useState(true);
    const [isLoadingLectures, setIsLoadingLectures] = useState(true);
    const [selectedRoom, setSelectedRoom] = useState<PublicLectureRoom | null>(null);
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);

    // Poll opened labs every 60s (same cadence as RoomViewPage).
    useEffect(() => {
        let isMounted = true;

        const fetchLabs = async (showLoading = false) => {
            try {
                if (showLoading) setIsLoadingLabs(true);
                const labs = await getPublicOpenedLabs();
                if (isMounted) setOpenedLabs(labs);
            } catch (err) {
                console.error('Failed to fetch opened labs:', err);
            } finally {
                if (isMounted && showLoading) setIsLoadingLabs(false);
            }
        };

        fetchLabs(true);
        const interval = window.setInterval(() => fetchLabs(false), 60000);

        return () => {
            isMounted = false;
            window.clearInterval(interval);
        };
    }, []);

    // Fetch lecture rooms once.
    useEffect(() => {
        let isMounted = true;

        const fetchLectures = async () => {
            try {
                setIsLoadingLectures(true);
                const rooms = await getPublicLectureRooms();
                if (isMounted) setLectureRooms(rooms);
            } catch (err) {
                console.error('Failed to fetch lecture rooms:', err);
            } finally {
                if (isMounted) setIsLoadingLectures(false);
            }
        };

        fetchLectures();
        return () => {
            isMounted = false;
        };
    }, []);

    return (
        <div className="min-h-screen w-full bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white">
            {/* Sticky header */}
            <header className="sticky top-0 z-10 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-b border-gray-200 dark:border-slate-700">
                <div className="px-4 py-3 flex items-center justify-between">
                    <div>
                        <h1 className="text-lg font-bold text-indigo-600 dark:text-indigo-400 leading-tight">BITS</h1>
                        <p className="text-xs text-gray-600 dark:text-gray-400">Rooms Open for Student Usage</p>
                    </div>
                </div>
            </header>

            <main
                className="px-4 py-4 space-y-8"
                style={{ paddingBottom: BOTTOM_BAR_HEIGHT + 16 }}
            >
                {/* Open Labs */}
                <section>
                    <div className="flex items-center gap-2 mb-3">
                        <DoorOpen className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                        <h2 className="text-base font-semibold">Open Labs</h2>
                    </div>

                    {/* Helper banner: if a lab is full, ask a lab tech to open another room. */}
                    <p className="mb-3 flex items-start gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        <span>
                            If a lab is full when you arrive, please ask the lab technician — they can open another room for you.
                        </span>
                    </p>

                    {isLoadingLabs ? (
                        <div className="flex items-center justify-center py-10 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                            <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
                            <span className="ml-2 text-sm text-gray-600 dark:text-gray-300">Loading open labs…</span>
                        </div>
                    ) : openedLabs.length === 0 ? (
                        <div className="text-center py-8 rounded-xl border border-dashed border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800">
                            <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">No labs are open right now</p>
                            <p className="text-xs text-gray-500 mt-1">Check back later or ask a lab technician.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {openedLabs.map(lab => (
                                <MobileOpenedLabCard key={lab.Room_ID} lab={lab} />
                            ))}
                        </div>
                    )}
                </section>

                {/* Lecture Rooms */}
                <section>
                    <div className="flex items-center gap-2 mb-3">
                        <Presentation className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                        <h2 className="text-base font-semibold">Lecture Rooms</h2>
                    </div>

                    {isLoadingLectures ? (
                        <div className="flex items-center justify-center py-10 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                            <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
                            <span className="ml-2 text-sm text-gray-600 dark:text-gray-300">Loading lecture rooms…</span>
                        </div>
                    ) : lectureRooms.length === 0 ? (
                        <div className="text-center py-8 rounded-xl border border-dashed border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800">
                            <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">No lecture rooms listed</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {lectureRooms.map(room => (
                                <MobileLectureCard
                                    key={room.Room_ID}
                                    room={room}
                                    onClick={() => setSelectedRoom(room)}
                                />
                            ))}
                        </div>
                    )}
                </section>
            </main>

            {/* Fixed bottom bar */}
            <div
                className="fixed bottom-0 left-0 right-0 z-20 bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-700 flex items-center justify-center px-4"
                style={{ height: BOTTOM_BAR_HEIGHT }}
            >
                <p className="text-sm text-gray-700 dark:text-gray-200 text-center">
                    If you are a lab technician,{' '}
                    <Link to="/login" className="text-indigo-600 dark:text-indigo-400 font-medium underline">
                        click here to login
                    </Link>
                </p>
            </div>

            {/* Schedule drawer */}
            {selectedRoom && (
                <RoomSchedule7DayDrawer
                    roomId={selectedRoom.Room_ID}
                    roomName={selectedRoom.Name}
                    onClose={() => setSelectedRoom(null)}
                />
            )}

            {/* Report Issue FAB — sits above the fixed bottom bar */}
            <button
                onClick={() => setIsReportModalOpen(true)}
                aria-label="Report an issue"
                className="fixed right-4 z-30 flex items-center justify-center w-14 h-14 rounded-full bg-red-600 hover:bg-red-700 text-white shadow-lg transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                style={{ bottom: BOTTOM_BAR_HEIGHT + 16 }}
            >
                <MessageSquareWarning className="w-6 h-6" />
            </button>

            {/* Report Issue modal */}
            <PublicReportIssueModal
                isOpen={isReportModalOpen}
                onClose={() => setIsReportModalOpen(false)}
            />
        </div>
    );
}
