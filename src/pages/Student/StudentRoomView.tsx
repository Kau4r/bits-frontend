import SessionBar from "@/components/student/SessionBar"
import { useNavigate } from "react-router-dom"
import OpenedLabCard from "@/components/student/Rooms/OpenedLabCard"
import LectureCard from "@/components/student/Rooms/LectureCard"
import { useState, useEffect } from "react"
import api from "@/services/api"
import type { Room as RoomType } from "@/types/room"

interface OpenedLab extends RoomType {
    openedBy?: string;
    openedAt?: string;
    Opened_At?: string;
    Opened_By_User?: {
        First_Name: string;
        Last_Name: string;
    };
    Booked_Rooms?: Array<{
        Start_Time: string;
        End_Time: string;
    }>;
}

export default function StudentRoomView() {
    const navigate = useNavigate()
    const [openedLabs, setOpenedLabs] = useState<OpenedLab[]>([])
    const [lectureRooms, setLectureRooms] = useState<RoomType[]>([])
    const [isLoadingLabs, setIsLoadingLabs] = useState(true)
    const [isLoadingLectures, setIsLoadingLectures] = useState(true)

    // Fetch opened lab rooms
    useEffect(() => {
        const fetchOpenedLabs = async () => {
            try {
                setIsLoadingLabs(true)
                const response = await api.get('/rooms/opened-labs')
                setOpenedLabs(response.data as OpenedLab[])
            } catch (error) {
                console.error('Failed to fetch opened labs:', error)
            } finally {
                setIsLoadingLabs(false)
            }
        }
        fetchOpenedLabs()
    }, [])

    // Fetch lecture rooms
    useEffect(() => {
        const fetchLectureRooms = async () => {
            try {
                setIsLoadingLectures(true)
                const response = await api.get('/rooms')
                // Filter for lecture rooms only
                const lectures = (response.data as RoomType[]).filter((room: RoomType) => room.Room_Type === 'LECTURE')
                setLectureRooms(lectures)
            } catch (error) {
                console.error('Failed to fetch lecture rooms:', error)
            } finally {
                setIsLoadingLectures(false)
            }
        }
        fetchLectureRooms()
    }, [])

    // Convert backend room data to frontend format for OpenedLabCard
    const convertToLabRoom = (lab: OpenedLab) => {
        const openedByName = lab.Opened_By_User
            ? `${lab.Opened_By_User.First_Name} ${lab.Opened_By_User.Last_Name}`
            : 'Lab Tech'

        const booking = lab.Booked_Rooms?.[0]
        const schedule = booking
            ? `${new Date(booking.Start_Time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} - ${new Date(booking.End_Time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
            : 'Available'

        return {
            id: lab.Room_ID,
            name: lab.Name,
            type: 'MAC' as const,
            capacity: lab.Capacity,
            isAvailable: lab.Status === 'AVAILABLE' || lab.Status === 'IN_USE',
            schedule,
            nextAvailable: lab.Name,
            openedBy: openedByName,
            openedAt: booking?.Start_Time || lab.Opened_At || new Date().toISOString()
        }
    }

    // Convert backend room data to frontend format for LectureCard
    const convertToLectureRoom = (room: RoomType) => {
        return {
            id: room.Room_ID,
            name: room.Name,
            type: 'Lecture' as const,
            capacity: room.Capacity,
            isAvailable: room.Status === 'AVAILABLE',
            schedule: 'View Schedule',
            nextAvailable: room.Status === 'AVAILABLE' ? 'Available Now' : 'In Use'
        }
    }

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
                    room="Select a room"
                    pcNumber="N/A"
                />
            </div>
            <div className="flex-1 overflow-auto p-4 sm:px-8 lg:px-10">
                <h2 className="text-2xl font-bold text-white mb-6">Opened Laboratories</h2>

                {isLoadingLabs ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="text-gray-400">Loading opened laboratories...</div>
                    </div>
                ) : openedLabs.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {openedLabs.map((lab) => (
                            <OpenedLabCard key={lab.Room_ID} room={convertToLabRoom(lab)} />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-12 bg-gray-800 rounded-lg">
                        <p className="text-gray-400 text-lg">No laboratories currently opened</p>
                        <p className="text-gray-500 text-sm mt-2">Check back later or contact lab staff</p>
                    </div>
                )}

                <h2 className="text-2xl font-bold text-white mt-12 mb-6">Lecture Rooms</h2>

                {isLoadingLectures ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="text-gray-400">Loading lecture rooms...</div>
                    </div>
                ) : lectureRooms.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {lectureRooms.map((room) => (
                            <LectureCard key={room.Room_ID} room={convertToLectureRoom(room)} />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-12 bg-gray-800 rounded-lg">
                        <p className="text-gray-400 text-lg">No lecture rooms available</p>
                        <p className="text-gray-500 text-sm mt-2">Please check with administration</p>
                    </div>
                )}
            </div>
        </div>
    )
}