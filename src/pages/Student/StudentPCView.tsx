import { useNavigate } from "react-router-dom"
import PCview from "@/components/student/PCview"
import SessionBar from "@/components/student/SessionBar"
import { useState, useEffect } from "react"

export default function StudentPCView() {
    const navigate = useNavigate()
    const [currentRoom, setCurrentRoom] = useState<string>("Not connected")
    const [currentPC, setCurrentPC] = useState<string>("N/A")

    // TODO: Implement MAC address detection
    // This would require either:
    // 1. A browser extension with native permissions
    // 2. A local agent/service running on the computer
    // 3. Server-side detection when the computer makes requests
    useEffect(() => {
        // Placeholder for MAC address detection
        // For now, students would need to manually select their PC
        // or the system could detect based on IP address from the backend
        console.log('MAC address detection not implemented - requires native code or server-side detection')
    }, [])

    return (
        <div className="h-screen w-full flex flex-col bg-white dark:bg-gray-900 overflow-hidden">
            <div className="p-4 sm:px-8 lg:px-10 flex justify-between items-center">
                <button
                    onClick={() => navigate('/student-room-view')}
                    className="text-gray-300 hover:text-white transition-colors flex items-center"
                >
                    ← Go to Room
                </button>
                <button
                    onClick={() => navigate('/student-session')}
                    className="text-gray-300 hover:text-white transition-colors flex items-center"
                >
                    Go to Session →
                </button>
            </div>
            <div className="px-4 sm:px-8 lg:px-10">
                <SessionBar
                    room={currentRoom}
                    pcNumber={currentPC}
                />
            </div>
            <div className="flex-1 overflow-auto p-4 sm:px-8 lg:px-10">
                <PCview />
            </div>
        </div>
    )
}