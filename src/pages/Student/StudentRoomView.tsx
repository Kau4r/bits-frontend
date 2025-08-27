import SessionBar from "@/components/student/SessionBar"
import { useNavigate } from "react-router-dom"
import OpenedLabCard from "@/components/student/Rooms/OpenedLabCard"
import { laboratoryRooms } from "@/components/student/Rooms/Room"
import LectureCard from "@/components/student/Rooms/LectureCard"
import { lectureRooms } from "@/components/student/Rooms/Room"

export default function StudentRoomView() {
    const navigate = useNavigate()
    
    return (
        <div className="h-screen w-full flex flex-col bg-white dark:bg-gray-900 overflow-hidden">
            <div className="p-4 sm:px-8 lg:px-10 flex justify-end">
                <button 
                    onClick={() => navigate("/student-pc-view")}
                    className="text-gray-300 hover:text-white transition-colors"
                >
                    Back to PC view →
                </button>
            </div>
            <div className="px-4 sm:px-8 lg:px-10">
                <SessionBar 
                  room="LB 467"
                  pcNumber="14"
                />
            </div>
            <div className="flex-1 overflow-auto p-4 sm:px-8 lg:px-10">
                <h2 className="text-2xl font-bold text-white mb-6">Opened Laboratories</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {laboratoryRooms.map((room) => (
                        <OpenedLabCard key={room.id} room={room} />
                    ))}
                </div>
                
                <h2 className="text-2xl font-bold text-white mt-12 mb-6 ">Lecture Rooms</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {lectureRooms.map((room) => (
                        <LectureCard key={room.id} room={room} />
                    ))}
                </div>
            </div>
        </div>
    )
}