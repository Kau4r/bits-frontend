import { useState, useEffect } from 'react'

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
    selectedQueueItem: RoomQueueItem | null;
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

    const [startTime, setStartTime] = useState('')
    const [endTime, setEndTime] = useState('')
    const [error, setError] = useState('')

    useEffect(() => {
        if (selectedQueueItem) {
            setStartTime(selectedQueueItem.startTime)
            setEndTime(selectedQueueItem.endTime)
        } else {
            setStartTime('')
            setEndTime('')
        }
    }, [selectedQueueItem])

    const isEditing = !!selectedQueueItem

    const handleSubmit = () => {
        if (!startTime || !endTime) {
            setError('Please select both start and end times')
            return
        }

        if (startTime >= endTime) {
            setError('End time must be after start time')
            return
        }

        onQueue(startTime, endTime, selectedQueueItem?.segment || segment)
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
                    <p className="text-sm text-gray-300">Segment: {selectedQueueItem?.segment || segment === 'CB1' ? 'Computer Borrowing 1' : 'Computer Borrowing 2'}</p>
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

                <div className="flex justify-end space-x-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-300 hover:text-white"
                    >
                        Cancel
                    </button>
                    {isEditing && (
                        <button
                            onClick={() => selectedQueueItem && onRemove(selectedQueueItem)}
                            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                        >
                            Remove
                        </button>
                    )}
                    <button
                        onClick={handleSubmit}
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                    >
                        {isEditing ? 'Update' : 'Queue'}
                    </button>
                </div>
            </div>
        </div>
    )
}
