import { useState, useEffect } from "react";
import { getRooms, createRoom, updateRoom } from "@/services/room";
import { type Room } from "@/types/room";
import RoomCard from "@/components/SysAd/room/RoomCard";
import RoomModal from "@/components/SysAd/room/RoomModal";
import Search from "@/components/Search";
import { PlusIcon } from "@heroicons/react/24/outline";
import { useAuth } from "@/context/AuthContext";

export default function RoomPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit" | "view">("view");
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    getRooms()
      .then((data) => {
        console.log("Fetched rooms:", data);
        setRooms(data);
      })
      .catch((err) => console.error("Error fetching rooms:", err));
  }, []);

  const handleRoomSubmit = async (room: Room) => {
    if (!user) throw new Error("User not logged in");
    console.log("Received in RoomPage:", room, modalMode);

    try {
      if (modalMode === "add") {
        const payload = {
          Name: room.Name,
          Capacity: room.Capacity,
          Room_Type: room.Room_Type,
          Status: room.Status || "AVAILABLE",
          Created_By: user.User_ID,
        };
        console.log("Creating room:", payload);
        const newRoom = await createRoom(payload);
        setRooms((prev) => [...prev, newRoom]);

      } else if (modalMode === "edit") {
        const payload = {
          Name: room.Name,
          Capacity: room.Capacity,
          Room_Type: room.Room_Type,
          Status: room.Status,
          Updated_By: user.User_ID,
        };
        console.log("Updating room:", payload, "with ID:", room.Room_ID)

        if (!selectedRoom) return; // nothing to update

        const res = await updateRoom(room.Room_ID, payload);
        setRooms(prev =>
          prev.map(r => r.Room_ID === room.Room_ID ? res : r)
        );
      }

    } catch (error: any) {
      if (error.response) {
        console.error("Server error:", error.response.data);
      } else {
        console.error("Network error:", error.message);
      }
    } finally {
      setIsModalOpen(false);
      setSelectedRoom(null);
    }
  };

  return (
    <div className="h-full w-full bg-white p-4 sm:px-8 lg:px-10 dark:bg-gray-900">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="text-2xl font-semibold">Room Management</h2>
        <Search searchTerm={searchTerm} onChange={setSearchTerm} showLabel={false} />
        <button
          className="inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
          onClick={() => {
            setSelectedRoom(null);
            setModalMode("add");
            setIsModalOpen(true);
          }}
        >
          <PlusIcon className="mr-2 h-5 w-5" />
          Add Room
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {rooms
          .filter((room) => {
            const name = room.Name?.toLowerCase() ?? "";
            const type = room.Room_Type?.toLowerCase() ?? "";
            return name.includes(searchTerm.toLowerCase()) || type.includes(searchTerm.toLowerCase());
          })
          .map((room) => (
            <RoomCard
              key={room.Room_ID}
              room={room}
              onView={(selected) => {
                console.log("Selected room before opening modal:", selected); // <-- log here
                setSelectedRoom(selected);
                setModalMode("view");
                setIsModalOpen(true);
              }}
            />
          ))}

      </div>

      {isModalOpen && (
        <RoomModal
          mode={modalMode}
          initialData={selectedRoom ?? undefined}
          onClose={(room) => {
            setIsModalOpen(false);
            setSelectedRoom(null);
          }}
          onSubmit={handleRoomSubmit}
          onEditMode={() => setModalMode("edit")} // sync parent
        />
      )}


    </div>
  );
}
