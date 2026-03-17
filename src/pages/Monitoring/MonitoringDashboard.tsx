import { useMemo, useState, useEffect } from 'react';
import { useMonitoringData } from '@/hooks/useMonitoringData';
import StatusGrid from '@/pages/monitoring/components/StatusGrid';
import ComputerDetailModal from '@/pages/monitoring/components/ComputerDetailModal';
import LoadingSkeleton from '@/pages/monitoring/components/LoadingSkeleton';
import ErrorBoundary from '@/components/ErrorBoundary';
import { Monitor, Filter } from 'lucide-react';
import Search from '@/components/Search';
import type { HeartbeatStatus } from '@/types/heartbeat';

export default function MonitoringDashboard() {
  const { rooms, isLoading, error, selectedRoomId, selectedStatus, setRoomFilter, setStatusFilter } = useMonitoringData();
  const [selectedComputerId, setSelectedComputerId] = useState<number | null>(null);
  const [selectedComputerName, setSelectedComputerName] = useState<string>('');
  const [statusAnnouncement, setStatusAnnouncement] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');

  // Calculate total stats across all rooms
  const totalStats = useMemo(() => {
    const total = rooms.reduce((acc, room) => ({
      online: acc.online + room.online_count,
      offline: acc.offline + room.offline_count,
      total: acc.total + room.total_count,
    }), { online: 0, offline: 0, total: 0 });

    // Count computers by status
    const statusCounts = {
      ONLINE: 0,
      IDLE: 0,
      WARNING: 0,
      OFFLINE: 0,
    };

    rooms.forEach(room => {
      room.computers.forEach(computer => {
        if (statusCounts[computer.Status] !== undefined) {
          statusCounts[computer.Status]++;
        }
      });
    });

    return { ...total, ...statusCounts };
  }, [rooms]);

  // Filter logic with computer-level filtering and search
  const filteredRooms = useMemo(() => {
    let result = rooms;

    // Filter by room
    if (selectedRoomId !== null) {
      result = result.filter(r => r.room_id === selectedRoomId);
    }

    // Filter by status within each room
    if (selectedStatus !== 'ALL') {
      result = result.map(room => ({
        ...room,
        computers: room.computers.filter(c => c.Status === selectedStatus)
      })).filter(room => room.computers.length > 0);
    }

    // Filter by Search (Room Name or Computer Name)
    if (searchTerm.trim() !== '') {
      const lowerTerm = searchTerm.toLowerCase();
      result = result.map(room => ({
        ...room,
        computers: room.computers.filter(c =>
          c.Name.toLowerCase().includes(lowerTerm)
        )
      })).filter(room =>
        room.room_name.toLowerCase().includes(lowerTerm) || room.computers.length > 0
      );
    }

    return result;
  }, [rooms, selectedRoomId, selectedStatus, searchTerm]);

  // Announce status changes to screen readers
  useEffect(() => {
    if (!isLoading && totalStats.OFFLINE > 0) {
      setStatusAnnouncement(`${totalStats.OFFLINE} computer${totalStats.OFFLINE !== 1 ? 's' : ''} offline`);
    } else if (!isLoading) {
      setStatusAnnouncement(`All computers online. ${totalStats.total} total.`);
    }
  }, [totalStats.OFFLINE, totalStats.total, isLoading]);

  // Handler for opening computer detail modal
  const handleComputerClick = (computerId: number, computerName: string) => {
    setSelectedComputerId(computerId);
    setSelectedComputerName(computerName);
  };

  return (
    <ErrorBoundary>
      <div className="h-full w-full bg-white p-6 sm:px-8 lg:px-10 dark:bg-gray-900">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Computer Monitoring</h1>
        <p className="mt-1 mb-4 text-sm text-gray-500 dark:text-gray-400">View real-time status of computer systems across all labs</p>

        {/* Live region for status updates - screen reader only */}
        <div role="status" aria-live="polite" className="sr-only">
          {statusAnnouncement}
        </div>

        {/* Stats row - total online/offline counts */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex items-center gap-4 transition-all hover:shadow-md" aria-label={`Total computers: ${totalStats.total}`}>
            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-lg">
              <Monitor className="w-6 h-6" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Computers</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalStats.total}</p>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex items-center gap-4 transition-all hover:shadow-md" aria-label={`Online computers: ${totalStats.ONLINE + totalStats.IDLE}`}>
            <div className="p-3 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-lg">
              <Monitor className="w-6 h-6" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Online</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalStats.ONLINE + totalStats.IDLE}</p>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex items-center gap-4 transition-all hover:shadow-md" aria-label={`Warning status computers: ${totalStats.WARNING}`}>
            <div className="p-3 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-lg">
              <Monitor className="w-6 h-6" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Warning</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalStats.WARNING}</p>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex items-center gap-4 transition-all hover:shadow-md" aria-label={`Offline computers: ${totalStats.OFFLINE}`}>
            <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg">
              <Monitor className="w-6 h-6" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Offline</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalStats.OFFLINE}</p>
            </div>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="mb-6 flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="min-w-[280px] flex-1">
            <Search
              searchTerm={searchTerm}
              onChange={setSearchTerm}
              showLabel={false}
              placeholder="Search computers or rooms..."
            />
          </div>

          {/* Room Filter */}
          <div className="relative">
            <select
              value={selectedRoomId ?? ''}
              onChange={(e) => setRoomFilter(e.target.value ? Number(e.target.value) : null)}
              className="appearance-none rounded-lg border border-gray-300 bg-white py-2 pl-4 pr-10 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700"
            >
              <option value="">All Rooms</option>
              {rooms.map(room => (
                <option key={room.room_id} value={room.room_id}>
                  {room.room_name}
                </option>
              ))}
            </select>
            <Filter className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          </div>

          {/* Status Filter */}
          <div className="relative">
            <select
              value={selectedStatus}
              onChange={(e) => setStatusFilter(e.target.value as HeartbeatStatus | 'ALL')}
              className="appearance-none rounded-lg border border-gray-300 bg-white py-2 pl-4 pr-10 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700"
            >
              <option value="ALL">All Status</option>
              <option value="ONLINE">Online</option>
              <option value="IDLE">Idle</option>
              <option value="WARNING">Warning</option>
              <option value="OFFLINE">Offline</option>
            </select>
            <Filter className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          </div>

          {/* Results Count */}
          <div className="ml-auto flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <span className="font-semibold text-gray-900 dark:text-white">
              {filteredRooms.reduce((acc, r) => acc + r.computers.length, 0)}
            </span>
            <span>of {rooms.reduce((acc, r) => acc + r.computers.length, 0)} computers</span>
          </div>
        </div>

        {isLoading && <LoadingSkeleton />}

        {error && (
          <div className="text-center py-8 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
            Error: {error}
          </div>
        )}

        {/* Room-grouped grids */}
        {!isLoading && !error && filteredRooms.map(room => (
          <StatusGrid key={room.room_id} room={room} onComputerClick={handleComputerClick} />
        ))}

        {!isLoading && !error && filteredRooms.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Monitor className="h-12 w-12 text-gray-400 mb-2" />
            <h3 className="text-sm font-medium text-gray-900 dark:text-white">No computers found</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Try adjusting your filters or search terms</p>
          </div>
        )}

        {/* Computer Detail Modal */}
        <ComputerDetailModal
          computerId={selectedComputerId ?? 0}
          computerName={selectedComputerName}
          isOpen={selectedComputerId !== null}
          onClose={() => setSelectedComputerId(null)}
        />
      </div>
    </ErrorBoundary>
  );
}
