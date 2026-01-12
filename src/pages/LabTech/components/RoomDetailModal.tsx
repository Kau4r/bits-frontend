import { useState } from 'react';
import type { Room } from '@/types/room';

interface RoomDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    room: Room;
}

// Mock PC Data
const generateMockPCs = () => {
    return Array.from({ length: 24 }, (_, i) => {
        const rand = Math.random();
        let status: 'Available' | 'In Use' | 'Damaged' = 'Available';
        let user: string | undefined = undefined;

        if (rand > 0.8) status = 'Damaged';
        else if (rand > 0.4) {
            status = 'In Use';
            user = 'Student 22102588';
        }

        return {
            id: i + 1,
            name: `PC ${i + 1}`,
            status,
            user
        };
    });
};

const mockPCs = generateMockPCs();

// Mock Schedule Data with columns
const timeSlots = [
    '7:30', '8:00', '8:30', '9:00', '9:30', '10:00', '10:30', '11:00', '11:30', '12:00',
    '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00',
    '17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00'
];




export default function RoomDetailModal({ isOpen, onClose, room }: RoomDetailModalProps) {
    const [activeTab, setActiveTab] = useState<'Computers' | 'Assets' | 'Schedule'>('Computers');

    if (!isOpen) return null;

    // Stats

    const available = mockPCs.filter(pc => pc.status === 'Available').length;
    const inUse = mockPCs.filter(pc => pc.status === 'In Use').length;
    const damaged = mockPCs.filter(pc => pc.status === 'Damaged').length;

    return (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center backdrop-blur-sm" onClick={onClose}>
            <div
                className="bg-gray-900 rounded-xl w-full max-w-6xl h-[90vh] flex flex-col shadow-2xl border border-gray-800"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-6 pb-4 flex justify-between items-start border-b border-gray-800">
                    <div>
                        <h2 className="text-2xl font-bold text-white">{room.Name}</h2>
                        <p className="text-gray-400">{room.Room_Type}</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-white p-2">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Tabs & Stats Header */}
                <div className="px-6 py-4 bg-gray-900 flex flex-col md:flex-row justify-between items-center gap-4">
                    {/* Stats (only show on Computers tab or always?) Screenshot shows it below Room Name */}
                    {activeTab === 'Computers' && (
                        <div className="flex gap-6 text-sm font-medium">
                            <span className="text-gray-300">Available: <span className="text-green-400 font-bold text-lg">{available}</span></span>
                            <span className="text-gray-300">In Use: <span className="text-gray-100 font-bold text-lg">{inUse}</span></span>
                            <span className="text-gray-300">Damaged: <span className="text-red-400 font-bold text-lg">{damaged}</span></span>
                        </div>
                    )}
                    {activeTab !== 'Computers' && <div></div>} {/* Spacer */}

                    {/* Tabs Segmented Control */}
                    <div className="flex bg-gray-800 p-1 rounded-lg">
                        {(['Computers', 'Assets', 'Schedule'] as const).map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`px-6 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === tab
                                    ? 'bg-gray-700 text-white shadow-sm'
                                    : 'text-gray-400 hover:text-gray-200'
                                    }`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 bg-gray-900">
                    {activeTab === 'Computers' && (
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                            {mockPCs.map(pc => (
                                <div
                                    key={pc.id}
                                    className="bg-gray-800 border border-gray-700 rounded-xl p-4 flex flex-col gap-3 hover:border-gray-600 transition-colors"
                                >
                                    <div className="flex items-center gap-2">
                                        <div className={`w-2.5 h-2.5 rounded-full ${pc.status === 'Available' ? 'bg-green-500' :
                                            pc.status === 'In Use' ? 'bg-gray-400' : 'bg-red-500'
                                            }`} />
                                        <span className={`text-xs font-medium ${pc.status === 'Available' ? 'text-green-400' :
                                            pc.status === 'In Use' ? 'text-gray-400' : 'text-red-400'
                                            }`}>
                                            {pc.status}
                                        </span>
                                    </div>

                                    <div className="flex flex-col items-center py-2">
                                        <svg className={`w-12 h-12 mb-2 ${pc.status === 'Available' ? 'text-green-500' :
                                            pc.status === 'In Use' ? 'text-gray-400' : 'text-red-500'
                                            }`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                        </svg>
                                        <span className="text-white font-bold text-lg">{pc.name}</span>
                                    </div>

                                    {pc.user && (
                                        <div className="border-t border-gray-700 pt-2 mt-auto">
                                            <p className="text-[10px] text-gray-500 font-medium">User: {pc.user}</p>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {activeTab === 'Assets' && (
                        <div className="flex items-center justify-center h-64 border-2 border-dashed border-gray-700 rounded-xl">
                            <p className="text-gray-500 text-lg">Work in Progress</p>
                        </div>
                    )}

                    {activeTab === 'Schedule' && (
                        <div>
                            <h3 className="text-xl font-bold text-white mb-6">Today's Schedule</h3>

                            {/* Schedule Container */}
                            <div className="overflow-x-auto pb-4">
                                <div className="min-w-[1200px]"> {/* Force width for scroll */}
                                    {/* Time Header Row */}
                                    <div className="grid grid-cols-[repeat(28,minmax(80px,1fr))] gap-2 mb-4">
                                        {timeSlots.map(time => (
                                            <div key={time} className="bg-gray-800 py-3 rounded-lg text-center text-sm font-semibold text-white">
                                                {time}
                                            </div>
                                        ))}
                                    </div>

                                    {/* Events Rows (Mocking 2 rows for now) */}
                                    <div className="relative space-y-4">
                                        {/* Row 1 */}
                                        <div className="h-24 bg-gray-800/30 rounded-lg relative">
                                            {/* Example Block: 16:30 - 18:30 (Class)
                                                Start index: 18 (16:30)
                                                Duration slots: 4 (2 hours)
                                            */}
                                            <div className="absolute left-[calc((100%/28)*18)] w-[calc((100%/28)*4)] top-1 bottom-1 p-1">
                                                <div className="bg-blue-500/20 border border-blue-500/50 rounded-md h-full p-2">
                                                    <div className="flex justify-between items-start mb-1">
                                                        <span className="text-xs text-gray-300">16:30 - 18:30</span>
                                                        <span className="text-xs bg-blue-500 text-white px-2 py-0.5 rounded-full">Class</span>
                                                    </div>
                                                    <p className="text-sm font-medium text-blue-200">Faculty: Patrick Elalto</p>
                                                    <p className="text-xs text-gray-400">Event: Class</p>
                                                </div>
                                            </div>

                                            {/* Example Block: 12:00 - 14:00 (Available) */}
                                            <div className="absolute left-[calc((100%/28)*9)] w-[calc((100%/28)*4)] top-1 bottom-1 p-1">
                                                <div className="bg-green-500/10 border border-green-500/30 rounded-md h-full p-2 flex items-center justify-center">
                                                    <span className="text-green-400 font-medium">Available</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Row 2 (if needed for overlap or different resource) */}
                                        <div className="h-24 bg-gray-800/30 rounded-lg relative">
                                            {/* Example Block: 16:30 - 18:30 (Queue) */}
                                            <div className="absolute left-[calc((100%/28)*18)] w-[calc((100%/28)*4)] top-1 bottom-1 p-1">
                                                <div className="bg-blue-900/40 border border-blue-700/50 rounded-md h-full p-2">
                                                    <div className="flex justify-between items-start mb-1">
                                                        <span className="text-xs text-gray-300">16:30 - 18:30</span>
                                                        <span className="text-xs bg-blue-700 text-white px-2 py-0.5 rounded-full">Queue</span>
                                                    </div>
                                                    <p className="text-sm font-medium text-blue-200">On Queue</p>
                                                    <p className="text-xs text-gray-400">Event: Student Use</p>
                                                </div>
                                            </div>
                                        </div>

                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
