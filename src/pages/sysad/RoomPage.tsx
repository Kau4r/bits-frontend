import { useState, useEffect, useMemo } from "react";
import { getRooms, createRoom, updateRoom } from "@/services/room";
import { type Room, type RoomStatus, roomStatuses } from "@/types/room";
import RoomCard from "@/pages/sysad/components/RoomCard";
import RoomModal from "@/pages/sysad/components/RoomModal";
import Search from "@/components/Search";
import { Plus, Building2, Filter } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useModal } from "@/context/ModalContext";
import toast from "react-hot-toast";
import { sortRoomsForDisplay } from "@/utils/roomSort";

export default function RoomPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit" | "view">("view");
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<RoomStatus | 'ALL'>('ALL');
  const { user } = useAuth();
  const modal = useModal();

  useEffect(() => {
    loadRooms();
  }, []);

  const loadRooms = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getRooms();
      setRooms(data);
    } catch (err) {
      console.error("Error fetching rooms:", err);
      setError("Failed to load rooms. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleRoomSubmit = async (room: Room) => {
    if (!user) {
      await modal.showError("You must be logged in to perform this action.", "Error");
      return;
    }

    try {
      if (modalMode === "add") {
        const payload = {
          Name: room.Name,
          Capacity: room.Capacity,
          Room_Type: room.Room_Type,
          Status: room.Status || "AVAILABLE",
          ...(room.Room_Type === 'LAB' && room.Lab_Type ? { Lab_Type: room.Lab_Type } : {}),
          Created_By: user.User_ID,
        };
        const newRoom = await createRoom(payload);
        setRooms((prev) => sortRoomsForDisplay([...prev, newRoom]));
        toast.success("Room created successfully");
      } else if (modalMode === "edit") {
        const payload = {
          Name: room.Name,
          Capacity: room.Capacity,
          Room_Type: room.Room_Type,
          Status: room.Status,
          ...(room.Room_Type === 'LAB' ? { Lab_Type: room.Lab_Type || undefined } : { Lab_Type: null }),
          Updated_By: user.User_ID,
        };

        if (!selectedRoom) return;

        const res = await updateRoom(room.Room_ID, payload);
        setRooms((prev) =>
          sortRoomsForDisplay(prev.map((r) => (r.Room_ID === room.Room_ID ? res : r)))
        );
        toast.success("Room updated successfully");
      }
      setIsModalOpen(false);
      setSelectedRoom(null);
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || "An error occurred";
      await modal.showError(message, "Failed to save room");
    }
  };

  const filteredRooms = useMemo(() => {
    return rooms.filter((room) => {
      const name = room.Name?.toLowerCase() ?? "";
      const type = room.Room_Type?.toLowerCase() ?? "";
      const matchesSearch = name.includes(searchTerm.toLowerCase()) || type.includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'ALL' || room.Status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [rooms, searchTerm, statusFilter]);

  const formatStatus = (status: string) => {
    return status
      .replace(/_/g, ' ')
      .toLowerCase()
      .split(' ')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  };

  const hasActiveFilters = searchTerm || statusFilter !== 'ALL';

  if (loading) {
    return (
      <div className="h-full w-full bg-white p-6 sm:px-8 lg:px-10 dark:bg-gray-900">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <div className="h-8 w-48 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
            <div className="mt-1 h-4 w-64 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
          </div>
          <div className="h-10 w-32 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
        </div>
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <div className="h-10 w-64 flex-1 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
          <div className="h-10 w-32 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
          <div className="h-10 w-24 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="h-48 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700"
            />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center bg-white p-4 dark:bg-gray-900">
        <div className="text-center">
          <Building2 className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
            {error}
          </h3>
          <button
            onClick={loadRooms}
            className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full bg-white p-6 sm:px-8 lg:px-10 dark:bg-gray-900">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Room Management</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Manage rooms, capacity, and availability</p>
        </div>
        <button
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-indigo-500 hover:shadow-md focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-none active:bg-indigo-700"
          onClick={() => {
            setSelectedRoom(null);
            setModalMode("add");
            setIsModalOpen(true);
          }}
        >
          <Plus className="h-5 w-5" />
          Add Room
        </button>
      </div>

      {/* Filters Bar */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="min-w-[280px] flex-1">
          <Search searchTerm={searchTerm} onChange={setSearchTerm} showLabel={false} placeholder="Search by name or type..." />
        </div>

        {/* Status Filter */}
        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as RoomStatus | 'ALL')}
            className="appearance-none rounded-lg border border-gray-300 bg-white py-2 pl-4 pr-10 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700"
          >
            <option value="ALL">All Status</option>
            {roomStatuses.map((status) => (
              <option key={status} value={status}>{formatStatus(status)}</option>
            ))}
          </select>
          <Filter className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        </div>

        {/* Results Count */}
        <div className="ml-auto flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <span className="font-semibold text-gray-900 dark:text-white">{filteredRooms.length}</span>
          <span>of {rooms.length} rooms</span>
        </div>
      </div>

      {filteredRooms.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12">
          <Building2 className="h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
            {hasActiveFilters ? "No rooms match your filters" : "No rooms yet"}
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {hasActiveFilters
              ? "Try adjusting your search or filter criteria"
              : "Get started by adding your first room"}
          </p>
          {hasActiveFilters ? (
            <button
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('ALL');
              }}
              className="mt-4 inline-flex items-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700"
            >
              Clear Filters
            </button>
          ) : (
            <button
              onClick={() => {
                setSelectedRoom(null);
                setModalMode("add");
                setIsModalOpen(true);
              }}
              className="mt-4 inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Room
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredRooms.map((room) => (
            <RoomCard
              key={room.Room_ID}
              room={room}
              onView={(selected: Room) => {
                setSelectedRoom(selected);
                setModalMode("view");
                setIsModalOpen(true);
              }}
            />
          ))}
        </div>
      )}

      {isModalOpen && (
        <RoomModal
          mode={modalMode}
          initialData={selectedRoom ?? undefined}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedRoom(null);
          }}
          onSubmit={handleRoomSubmit}
          onEditMode={() => setModalMode("edit")}
        />
      )}
    </div>
  );
}
