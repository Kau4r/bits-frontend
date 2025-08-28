import { useState } from 'react'

interface RoomQueueItem {
    roomCode: string;
    startTime: string;
    endTime: string;
    user: string;
    status: 'pending' | 'approved' | 'rejected';
    segment: 'CB1' | 'CB2';
}

interface QueueModalProps {
    isOpen: boolean;
    onClose: () => void;
    onQueue: (startTime: string, endTime: string, segment: 'CB1' | 'CB2') => void;
    onRemove: (item: RoomQueueItem) => void;
    roomCode: string | null;
    segment: 'CB1' | 'CB2';
    selectedQueueItem?: RoomQueueItem;
}


export default function QueueModal({
    isOpen,
    onClose,
    onQueue,
    onRemove,
    roomCode,
    segment,
    selectedQueueItem,
}: QueueModalProps) {

    const [startTime, setStartTime] = useState(selectedQueueItem?.startTime || '')
    const [endTime, setEndTime] = useState(selectedQueueItem?.endTime || '')
    const isEditing = !!selectedQueueItem
    const [error, setError] = useState('')

    const handleSubmit = () => {
        if (!startTime || !endTime) {
            setError('Please select both start and end times')
            return
        }

        if (startTime >= endTime) {
            setError('End time must be after start time')
            return
        }

        onQueue(startTime, endTime, isEditing ? selectedQueueItem!.segment : segment)
        onClose()
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
            <div className="bg-gray-800 p-6 rounded-lg w-full max-w-md">
                <h2 className="text-xl font-bold mb-4">{isEditing ? 'Edit Queue Item' : 'Queue Room'}</h2>

                {(roomCode || selectedQueueItem?.roomCode) && (
                    <div className="mb-4">
                        <p className="text-lg font-semibold">Room: {roomCode || selectedQueueItem?.roomCode}</p>
                    </div>
                )}

                {error && (
                    <div className="mb-4 p-3 bg-red-500/20 text-red-500 rounded-lg">
                        {error}
                    </div>
                )}

                <div className="mb-4">
                    <p className="text-sm text-gray-300">Segment: {segment === 'CB1' ? 'Computer Borrowing 1' : 'Computer Borrowing 2'}</p>
                </div>

                <div className="mb-4">
                    <label htmlFor="startTime" className="block text-sm font-medium text-white mb-2">
                        Start Time
                    </label>
                    <input
                        type="time"
                        id="startTime"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500"
                    />
                </div>

                <div className="mb-4">
                    <label htmlFor="endTime" className="block text-sm font-medium text-white mb-2">
                        End Time
                    </label>
                    <input
                        type="time"
                        id="endTime"
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500"
                    />
                </div>

                <div className="flex justify-between mt-6">
                    {isEditing && (
                        <button
                            onClick={() => {
                                if (selectedQueueItem) onRemove(selectedQueueItem)
                                onClose()
                            }}
                            className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg"
                        >
                            Remove from Queue
                        </button>
                    )}
                    <div className="flex space-x-4">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSubmit}
                            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                        >
                            {isEditing ? 'Update' : 'Queue'}
                        </button>
                    </div>
                </div>

            </div>
        </div>
    )
}
