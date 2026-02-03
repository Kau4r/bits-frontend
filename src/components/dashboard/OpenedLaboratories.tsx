import { useState, useEffect } from 'react';
import { ClockIcon } from '@heroicons/react/24/outline';
import { ComputerDesktopIcon } from '@heroicons/react/24/solid';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
import { getRooms } from '@/services/room';
import type { Room } from '@/types/room';

type DisplayRoom = {
  id: number;
  label: string;
  room: string;
  status: 'Open' | 'Closed';
  schedule: string;
  capacity: { used: number; total: number };
};

export default function OpenedLaboratories() {
  const [rooms, setRooms] = useState<DisplayRoom[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadRooms = async () => {
      try {
        const data = await getRooms();

        // Filter for LAB type rooms that are IN_USE (opened)
        const labRooms = data
          .filter((r: Room) => r.Room_Type === 'LAB' && r.Status === 'IN_USE')
          .slice(0, 2) // Show only first 2 rooms
          .map((r: Room): DisplayRoom => ({
            id: r.Room_ID,
            label: r.Name,
            room: r.Name,
            status: 'Open',
            schedule: '—', // Schedule would need separate API call
            capacity: { used: 0, total: r.Capacity ?? 30 },
          }));

        setRooms(labRooms);
      } catch (err) {
        console.error('Error fetching rooms:', err);
      } finally {
        setLoading(false);
      }
    };

    loadRooms();
  }, []);

  if (loading) {
    return (
      <div className="flex h-full flex-col gap-4">
        <div className="grid h-full grid-cols-1 gap-4 md:grid-cols-2">
          {[1, 2].map((i) => (
            <div key={i} className="animate-pulse rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
              <div className="h-6 w-32 rounded bg-gray-200 dark:bg-gray-700 mb-4" />
              <div className="h-32 w-32 mx-auto rounded-full bg-gray-200 dark:bg-gray-700" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (rooms.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-gray-500 dark:text-gray-400">
        No labs currently open
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="grid h-full grid-cols-1 gap-4 md:grid-cols-2 auto-rows-fr">
        {rooms.map((r) => {
          const isWindowsLab = r.label.toLowerCase().includes('windows');
          const isOpen = r.status === 'Open';

          return (
            <div
              key={r.id}
              className="grid h-full grid-rows-[auto_minmax(10rem,1fr)_auto_auto] gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm ring-1 ring-gray-200/50 dark:border-gray-700 dark:bg-gray-800 dark:ring-gray-700/50"
            >
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <span className={`rounded-lg p-2 ring-1 ring-inset ${isWindowsLab
                    ? 'bg-blue-50 ring-blue-200 dark:bg-blue-900/30 dark:ring-blue-800/50'
                    : 'bg-gray-50 ring-gray-200 dark:bg-gray-700/50 dark:ring-gray-600/50'
                    }`}>
                    <ComputerDesktopIcon
                      className={`h-5 w-5 ${isWindowsLab
                        ? 'text-blue-600 dark:text-blue-300'
                        : 'text-gray-600 dark:text-gray-300'
                        }`}
                    />
                  </span>
                  <div className="leading-tight">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{r.label}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-300">Room {r.room}</p>
                  </div>
                </div>
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${isOpen
                  ? 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:ring-emerald-800/60'
                  : 'bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-900/30 dark:text-rose-300 dark:ring-rose-800/60'
                  }`}>
                  <span className={`h-2 w-2 rounded-full ${isOpen ? 'bg-emerald-500' : 'bg-rose-500'
                    }`} />
                  {r.status}
                </span>
              </div>

              {/* Capacity */}
              <div className="flex flex-col items-center justify-center h-full">
                <div className="relative w-full max-w-[160px] mx-auto">
                  <CircularProgressbar
                    value={r.capacity.used}
                    maxValue={r.capacity.total}
                    text=""
                    strokeWidth={10}
                    styles={buildStyles({
                      pathColor: '#6366F1',
                      trailColor: 'rgba(0, 0, 0, 0.05)',
                      pathTransitionDuration: 0.5,
                    })}
                  />
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <div className="text-2xl font-semibold text-gray-900 dark:text-white">
                      {r.capacity.used}
                      <span className="text-lg text-gray-500 dark:text-gray-400">/{r.capacity.total}</span>
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">Capacity</div>
                  </div>
                </div>
              </div>

              {/* Schedule */}
              <div className="rounded-xl bg-gray-50 dark:bg-gray-700/50">
                <div className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-2">
                    <ClockIcon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Schedule</span>
                  </div>
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{r.schedule}</span>
                </div>
              </div>

              {/* Footer */}
              <div>
                <button
                  type="button"
                  className="h-10 w-full rounded-xl bg-indigo-600 px-3 text-sm font-medium text-white transition hover:bg-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-800"
                >
                  View Details
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}