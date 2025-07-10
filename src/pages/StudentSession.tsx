// StudentSession.tsx
import SessionBar from "@/components/student/SessionBar"
import Shortcuts from "@/components/student/Shortcuts"
import { useNavigate } from "react-router-dom"

export default function StudentSession() {
    const navigate = useNavigate()
    return (
        <div className="h-screen w-full flex flex-col bg-white dark:bg-gray-900 overflow-hidden">
            <div className="p-4 sm:px-8 lg:px-10">
                <button 
                    onClick={() => navigate('/student-pc-view')} 
                    className="text-gray-300 hover:text-white transition-colors"
                >
                    ← Go to PC View
                </button>
            </div>
            <div className="px-4 sm:px-8 lg:px-10 pb-4">
                <SessionBar />
            </div>
            <div className="flex-1 overflow-auto p-4 sm:px-8 lg:px-10">
                <Shortcuts />
            </div>
        </div>
    )   
}