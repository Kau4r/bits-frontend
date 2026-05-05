import { useState, useEffect, useMemo } from "react";
import { getRooms, createRoom, updateRoom } from "@/services/room";
import { type Room, type RoomStatus, roomStatuses } from "@/types/room";
import RoomCard from "@/pages/sysad/components/RoomCard";
import RoomModal from "@/pages/sysad/components/RoomModal";
import Search from "@/components/Search";
import { Plus, Building2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useModal } from "@/context/ModalContext";
import toast from "react-hot-toast";
import { sortRoomsForDisplay } from "@/utils/roomSort";
import { FloatingSelect } from "@/ui/FloatingSelect";
import { Skeleton } from "@/ui";
import { SysAdEyebrow, SysAdPageShell } from "@/pages/sysad/components/SysAdPageShell";
import { useRoomEvents } from "@/hooks/useRoomEvents";

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

  useRoomEvents(() => {
    void loadRooms();
  });

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
          Is_Bookable: room.Is_Bookable !== false,
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
          Is_Bookable: room.Is_Bookable !== false,
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
          <div className="space-y-2">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-72" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <Skeleton className="h-10 min-w-[280px] flex-1" />
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-24" />
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
              <div className="mb-3 flex items-center justify-between">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <Skeleton className="mb-2 h-4 w-2/3" />
              <Skeleton className="mb-4 h-4 w-1/2" />
              <div className="flex justify-between border-t border-gray-100 pt-3 dark:border-gray-700">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
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
    <SysAdPageShell
      eyebrow={<SysAdEyebrow><Building2 className="h-4 w-4" />Admin Rooms</SysAdEyebrow>}
      title="Room Management"
      description="Manage rooms, capacity, availability, and lab room setup."
      action={(
        <button
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-indigo-500 hover:shadow-md focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-none active:bg-indigo-700"
          onClick={() => {
            setSelectedRoom(null);
            setModalMode("add");
            setIsModalOpen(true);
          }}
        >
          <Plus className="h-5 w-5" />
          Add Room
        </button>
      )}
    >
      <div className="flex h-full min-h-0 flex-col gap-4">

      {/* Filters Bar */}
      <div className="shrink-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="min-w-[280px] flex-1">
          <Search searchTerm={searchTerm} onChange={setSearchTerm} showLabel={false} placeholder="Search by name or type..." />
        </div>

        {/* Status Filter */}
        <div className="min-w-[180px]">
          <FloatingSelect
            id="room-status-filter"
            value={statusFilter}
            placeholder="All Status"
            options={[
              { value: 'ALL', label: 'All Status' },
              ...roomStatuses.map((status) => ({
                value: status,
                label: formatStatus(status),
              })),
            ]}
            onChange={(value) => setStatusFilter(value as RoomStatus | 'ALL')}
          />
        </div>

        {/* Results Count */}
        <div className="ml-auto flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <span className="font-semibold text-gray-900 dark:text-white">{filteredRooms.length}</span>
          <span>of {rooms.length} rooms</span>
        </div>
      </div>
      </div>

      {filteredRooms.length === 0 ? (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white py-12 shadow-sm dark:border-slate-700 dark:bg-slate-800">
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
        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
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
          onDeleted={(deleted) => {
            setRooms((prev) => prev.filter((r) => r.Room_ID !== deleted.Room_ID));
            setIsModalOpen(false);
            setSelectedRoom(null);
            toast.success(`Room "${deleted.Name}" deleted`);
          }}
        />
      )}
      </div>
    </SysAdPageShell>
  );
}
