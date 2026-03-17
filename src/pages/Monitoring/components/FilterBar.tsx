import type { RoomStatus } from '@/types/monitoring';
import type { HeartbeatStatus } from '@/types/heartbeat';

interface FilterBarProps {
  rooms: RoomStatus[];
  selectedRoomId: number | null;
  selectedStatus: HeartbeatStatus | 'ALL';
  onRoomChange: (roomId: number | null) => void;
  onStatusChange: (status: HeartbeatStatus | 'ALL') => void;
}

export default function FilterBar({
  rooms,
  selectedRoomId,
  selectedStatus,
  onRoomChange,
  onStatusChange
}: FilterBarProps) {
  return (
    <div className="flex flex-wrap gap-4 mb-6" role="region" aria-label="Monitoring filters">
      {/* Room dropdown */}
      <div>
        <label htmlFor="room-filter" className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
          Room
        </label>
        <select
          id="room-filter"
          value={selectedRoomId ?? ''}
          onChange={(e) => onRoomChange(e.target.value ? Number(e.target.value) : null)}
          className="border border-gray-300 rounded px-3 py-2 bg-white text-gray-900 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
          aria-label="Filter by room"
        >
          <option value="">All Rooms</option>
          {rooms.map(room => (
            <option key={room.room_id} value={room.room_id}>
              {room.room_name}
            </option>
          ))}
        </select>
      </div>

      {/* Status filter - chip toggles */}
      <div>
        <label id="status-filter-label" className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
          Status
        </label>
        <div className="flex gap-2" role="group" aria-labelledby="status-filter-label">
          {(['ALL', 'ONLINE', 'IDLE', 'WARNING', 'OFFLINE'] as const).map(status => (
            <button
              key={status}
              onClick={() => onStatusChange(status)}
              className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
                selectedStatus === status
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
              aria-pressed={selectedStatus === status}
              aria-label={`Filter by ${status} status`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
