import { useState, useMemo } from 'react';
import type { FormEvent } from 'react';
import { FloatingSelect } from '@/ui/FloatingSelect';

interface RoomOption {
  Room_ID: number;
  Name: string;
}

interface ReportIssueModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (
    description: string,
    issueType: string,
    equipment: string,
    pcNumber: string,
    noRoom: boolean,
    roomId: number | null,
  ) => Promise<void>;
  room: string;
  pcNumber: string;
  rooms?: RoomOption[];
  defaultRoomId?: number | null;
}

const showPcNumberFor = (issueType: string) => issueType === 'hardware' || issueType === 'software';
const showEquipmentFor = (issueType: string) => issueType === 'hardware';

export default function ReportIssueModal({
  isOpen,
  onClose,
  onSubmit,
  room,
  pcNumber,
  rooms,
  defaultRoomId,
}: ReportIssueModalProps) {
  const [description, setDescription] = useState('');
  const [issueType, setIssueType] = useState('hardware');
  const [equipment, setEquipment] = useState('monitor');
  const isPlaceholderPc = !pcNumber || /^(unknown|n\/?a|none|-+)$/i.test(pcNumber.trim());
  const [editablePcNumber, setEditablePcNumber] = useState(isPlaceholderPc ? '' : pcNumber);
  const [noRoom, setNoRoom] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Resolve initial room selection: explicit defaultRoomId, or look up by display name in `rooms`.
  const initialRoomId = useMemo<number | null>(() => {
    if (defaultRoomId != null) return defaultRoomId;
    if (rooms && room) {
      const match = rooms.find((r) => r.Name.trim().toLowerCase() === room.trim().toLowerCase());
      if (match) return match.Room_ID;
    }
    return null;
  }, [defaultRoomId, rooms, room]);
  const [selectedRoomId, setSelectedRoomId] = useState<number | null>(initialRoomId);

  const hasRoomList = !!rooms && rooms.length > 0;
  const needsEquipment = showEquipmentFor(issueType);
  const needsPcNumber = showPcNumberFor(issueType);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!description) return;
    if (needsEquipment && !equipment) return;

    setIsSubmitting(true);
    try {
      const effectiveRoomId = noRoom ? null : selectedRoomId;
      await onSubmit(
        description.trim(),
        issueType,
        needsEquipment ? equipment : '',
        needsPcNumber ? editablePcNumber.trim() : '',
        noRoom,
        effectiveRoomId,
      );
      setDescription('');
      setEquipment('monitor');
      setEditablePcNumber(isPlaceholderPc ? '' : pcNumber);
      setNoRoom(false);
      setSelectedRoomId(initialRoomId);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900 w-full max-w-md">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Report an Issue</h2>
          </div>
          <button
            onClick={onClose}
            className="text-3xl text-gray-500 hover:text-black dark:hover:text-white"
            aria-label="Close"
            disabled={isSubmitting}
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Room
              </label>
              <label className="inline-flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={noRoom}
                  onChange={(e) => setNoRoom(e.target.checked)}
                  disabled={isSubmitting}
                  className="h-3.5 w-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
                />
                Not tied to a specific room
              </label>
            </div>
            {noRoom ? (
              <input
                type="text"
                value="No room selected"
                readOnly
                className="w-full px-3 py-2 border border-gray-300 dark:border-[#334155] rounded-md shadow-sm cursor-not-allowed bg-gray-200 italic text-gray-500 dark:bg-[#0f172a] dark:text-gray-500"
              />
            ) : hasRoomList ? (
              <select
                value={selectedRoomId ?? ''}
                onChange={(e) => {
                  const v = e.target.value;
                  setSelectedRoomId(v === '' ? null : Number(v));
                }}
                disabled={isSubmitting}
                className="w-full px-3 py-2 border border-gray-300 dark:border-[#334155] rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-[#1e2939] dark:text-white"
              >
                <option value="">Select a room</option>
                {rooms!.map((r) => (
                  <option key={r.Room_ID} value={r.Room_ID}>
                    {r.Name}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={room}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 dark:border-[#334155] rounded-md shadow-sm dark:text-gray-300 cursor-not-allowed bg-gray-100 dark:bg-[#1e2939]"
              />
            )}
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Issue
            </label>
            <FloatingSelect
              id="report-issue-type"
              value={issueType}
              placeholder="Select issue"
              options={[
                { value: 'hardware', label: 'Hardware' },
                { value: 'software', label: 'Software' },
                { value: 'network', label: 'Network' },
                { value: 'other', label: 'Other' },
              ]}
              onChange={setIssueType}
            />
          </div>
          {needsPcNumber && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                PC Number
              </label>
              <input
                type="text"
                value={editablePcNumber}
                onChange={(e) => setEditablePcNumber(e.target.value)}
                placeholder="Enter PC number"
                className="w-full px-3 py-2 border border-gray-300 dark:border-[#334155] rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-[#1e2939] dark:text-white"
                disabled={isSubmitting}
              />
            </div>
          )}
          {needsEquipment && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Select Equipment
              </label>
              <FloatingSelect
                id="equipment"
                value={equipment}
                placeholder="Select equipment"
                options={[
                  { value: 'monitor', label: 'Monitor' },
                  { value: 'keyboard', label: 'Keyboard' },
                  { value: 'mouse', label: 'Mouse' },
                  { value: 'mini-pc', label: 'Mini PC' },
                  { value: 'headset', label: 'Headset' },
                ]}
                onChange={setEquipment}
                disabled={isSubmitting}
              />
            </div>
          )}

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">
              Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:border-[#334155] dark:bg-[#1e2939] dark:text-white"
              placeholder="Please provide detailed information about the issue..."
              required
              disabled={isSubmitting}
            />
          </div>



          <div className="flex justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50 dark:border-gray-700 dark:bg-slate-900 dark:text-white dark:hover:bg-gray-800 disabled:opacity-50"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center justify-center w-full rounded-lg border border-transparent bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSubmitting || !description || (needsEquipment && !equipment)}
            >
              {isSubmitting ? 'Submitting...' : 'Submit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
