import { useMemo, useState, useEffect } from 'react';
import { useMonitoringData } from '../../hooks/useMonitoringData';
import StatusGrid from '../../components/monitoring/StatusGrid';
import FilterBar from '../../components/monitoring/FilterBar';
import ComputerDetailModal from '../../components/monitoring/ComputerDetailModal';
import LoadingSkeleton from '../../components/monitoring/LoadingSkeleton';
import ErrorBoundary from '../../components/ErrorBoundary';
import { ComputerDesktopIcon } from '@heroicons/react/24/outline';

export default function MonitoringDashboard() {
  const { rooms, isLoading, error, selectedRoomId, selectedStatus, setRoomFilter, setStatusFilter } = useMonitoringData();
  const [selectedComputerId, setSelectedComputerId] = useState<number | null>(null);
  const [selectedComputerName, setSelectedComputerName] = useState<string>('');
  const [statusAnnouncement, setStatusAnnouncement] = useState<string>('');

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
        statusCounts[computer.Status]++;
      });
    });

    return { ...total, ...statusCounts };
  }, [rooms]);

  // Filter logic with computer-level filtering
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

    return result;
  }, [rooms, selectedRoomId, selectedStatus]);

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
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">Computer Monitoring</h1>

        {/* Live region for status updates - screen reader only */}
        <div role="status" aria-live="polite" className="sr-only">
          {statusAnnouncement}
        </div>

      {/* Stats row - total online/offline counts */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex items-center gap-4" aria-label={`Total computers: ${totalStats.total}`}>
          <div className="p-3 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-lg">
            <ComputerDesktopIcon className="w-6 h-6" aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Total Computers</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalStats.total}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex items-center gap-4" aria-label={`Online computers: ${totalStats.ONLINE + totalStats.IDLE}`}>
          <div className="p-3 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-lg">
            <ComputerDesktopIcon className="w-6 h-6" aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Online</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalStats.ONLINE + totalStats.IDLE}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex items-center gap-4" aria-label={`Warning status computers: ${totalStats.WARNING}`}>
          <div className="p-3 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-lg">
            <ComputerDesktopIcon className="w-6 h-6" aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Warning</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalStats.WARNING}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex items-center gap-4" aria-label={`Offline computers: ${totalStats.OFFLINE}`}>
          <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg">
            <ComputerDesktopIcon className="w-6 h-6" aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Offline</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalStats.OFFLINE}</p>
          </div>
        </div>
      </div>

      {/* FilterBar */}
      <FilterBar
        rooms={rooms}
        selectedRoomId={selectedRoomId}
        selectedStatus={selectedStatus}
        onRoomChange={setRoomFilter}
        onStatusChange={setStatusFilter}
      />

      {isLoading && <LoadingSkeleton />}

      {error && (
        <div className="text-center py-8 text-red-600 dark:text-red-400">
          Error: {error}
        </div>
      )}

      {/* Room-grouped grids */}
      {!isLoading && !error && filteredRooms.map(room => (
        <StatusGrid key={room.room_id} room={room} onComputerClick={handleComputerClick} />
      ))}

      {!isLoading && !error && filteredRooms.length === 0 && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          No rooms match the current filters.
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
