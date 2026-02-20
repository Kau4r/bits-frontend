import { useNavigate } from "react-router-dom"
import PCview from "@/components/student/PCview"
import SessionBar from "@/components/student/SessionBar"
export default function StudentPCView() {
    const navigate = useNavigate()

    return (
        <div className="h-screen w-full flex flex-col bg-white dark:bg-gray-900 overflow-hidden">
            <div className="p-4 sm:px-8 lg:px-10 flex justify-between items-center">
                <button
                    onClick={() => navigate('/student-room-view')}
                    className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors flex items-center"
                >
                    ← Go to Room
                </button>
                <button
                    onClick={() => navigate('/student-session')}
                    className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors flex items-center"
                >
                    Go to Session →
                </button>
            </div>
            <div className="px-4 sm:px-8 lg:px-10">
                <SessionBar />
            </div>
            <div className="flex-1 overflow-auto p-4 sm:px-8 lg:px-10">
                <PCview />
            </div>
        </div>
    )
}