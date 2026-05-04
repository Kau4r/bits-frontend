import type { RoomStatus } from '@/types/monitoring';
import type { HeartbeatStatus } from '@/types/heartbeat';
import { FloatingSelect } from '@/ui/FloatingSelect';

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
        <FloatingSelect
          id="room-filter"
          value={selectedRoomId === null ? '' : String(selectedRoomId)}
          placeholder="All Rooms"
          options={[
            { value: '', label: 'All Rooms' },
            ...[...rooms]
              .sort((a, b) => a.room_name.localeCompare(b.room_name))
              .map(room => ({ value: String(room.room_id), label: room.room_name })),
          ]}
          onChange={(roomId) => onRoomChange(roomId === '' ? null : Number(roomId))}
          className="min-w-48"
        />
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
