import SessionBar from "@/pages/student/components/SessionBar"
import { useNavigate } from "react-router-dom"
import OpenedLabCard from "@/pages/student/components/OpenedLabCard"
import LectureCard from "@/pages/student/components/LectureCard"
import { useState, useEffect } from "react"
import api from "@/services/api"
import type { Room as RoomType } from "@/types/room"
import { getOpenedLabs, type OpenedLabRoom } from "@/services/room"

export default function StudentRoomView() {
    const navigate = useNavigate()
    const [openedLabs, setOpenedLabs] = useState<OpenedLabRoom[]>([])
    const [lectureRooms, setLectureRooms] = useState<RoomType[]>([])
    const [isLoadingLabs, setIsLoadingLabs] = useState(true)
    const [isLoadingLectures, setIsLoadingLectures] = useState(true)

    // Fetch opened lab rooms
    useEffect(() => {
        let isMounted = true

        const fetchOpenedLabs = async (showLoading = false) => {
            try {
                if (showLoading) setIsLoadingLabs(true)
                const labs = await getOpenedLabs()
                if (isMounted) setOpenedLabs(labs)
            } catch (error) {
                console.error('Failed to fetch opened labs:', error)
            } finally {
                if (isMounted && showLoading) setIsLoadingLabs(false)
            }
        }

        fetchOpenedLabs(true)
        const refreshInterval = window.setInterval(() => fetchOpenedLabs(false), 60000)

        return () => {
            isMounted = false
            window.clearInterval(refreshInterval)
        }
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
    const convertToLabRoom = (lab: OpenedLabRoom) => {
        const booking = lab.Booked_Rooms?.[0]
        const opener = booking?.User || lab.Opened_By_User
        const openedByName = opener
            ? `${opener.First_Name} ${opener.Last_Name}`
            : 'Lab Tech'

        const schedule = booking
            ? `${new Date(booking.Start_Time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} - ${new Date(booking.End_Time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
            : 'Available'
        const startsAt = booking ? new Date(booking.Start_Time) : null
        const endsAt = booking ? new Date(booking.End_Time) : null
        const now = new Date()
        const isOpenNow = !!startsAt && !!endsAt && startsAt <= now && endsAt > now

        return {
            id: lab.Room_ID,
            name: lab.Name,
            type: lab.Lab_Type === 'MAC' ? 'MAC' as const : 'Windows' as const,
            capacity: lab.Capacity,
            isAvailable: true,
            schedule,
            nextAvailable: isOpenNow ? 'Open now for student usage' : startsAt ? `Opens ${startsAt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}` : 'Open for student usage',
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
                    className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                    Back to PC view
                </button>
            </div>
            <div className="px-4 sm:px-8 lg:px-10">
                <SessionBar />
            </div>
            <div className="flex-1 overflow-auto p-4 sm:px-8 lg:px-10">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Rooms Open for Student Usage</h2>

                {isLoadingLabs ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="text-gray-600 dark:text-gray-400">Loading opened laboratories...</div>
                    </div>
                ) : openedLabs.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {openedLabs.map((lab) => (
                            <OpenedLabCard key={lab.Room_ID} room={convertToLabRoom(lab)} />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg">
                        <p className="text-gray-600 dark:text-gray-400 text-lg">No rooms opened for student usage</p>
                        <p className="text-gray-500 text-sm mt-2">Check back later or contact lab staff</p>
                    </div>
                )}

                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-12 mb-6">Lecture Rooms</h2>

                {isLoadingLectures ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="text-gray-600 dark:text-gray-400">Loading lecture rooms...</div>
                    </div>
                ) : lectureRooms.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {lectureRooms.map((room) => (
                            <LectureCard key={room.Room_ID} room={convertToLectureRoom(room)} />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg">
                        <p className="text-gray-600 dark:text-gray-400 text-lg">No lecture rooms available</p>
                        <p className="text-gray-500 text-sm mt-2">Please check with administration</p>
                    </div>
                )}
            </div>
        </div>
    )
}
