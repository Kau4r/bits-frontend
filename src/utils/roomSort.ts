import type { Room } from "@/types/room";

const roomNameCollator = new Intl.Collator("en", {
    numeric: true,
    sensitivity: "base",
    ignorePunctuation: true,
});

export const sortRoomsForDisplay = <T extends Pick<Room, "Room_ID" | "Name">>(rooms: T[]): T[] => {
    return [...rooms].sort((a, b) => {
        const nameCompare = roomNameCollator.compare((a.Name || "").trim(), (b.Name || "").trim());
        if (nameCompare !== 0) return nameCompare;
        return (a.Room_ID || 0) - (b.Room_ID || 0);
    });
};
