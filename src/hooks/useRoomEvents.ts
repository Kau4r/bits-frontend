import { useCallback } from 'react';
import { useRealtimeRefresh } from '@/hooks/useRealtimeRefresh';
import type { Notification } from '@/services/notifications';

type RoomEventCallback = () => void;

// Backend constants matched: ROOM_UPDATED, ROOM_AVAILABLE, ROOM_BOOKED,
// ROOM_CLOSED, ROOM_FULL, ROOM_OPENED, ROOM_OPENED_FOR_STUDENTS, ROOM_QUEUE.
// Match by `ROOM_` prefix because backend may add new specific event types
// (e.g. ROOM_CREATED, ROOM_DELETED) we want to capture automatically.
/**
 * Subscribe to real-time room events. Fires the callback when a notification
 * arrives whose `details.eventType` starts with `ROOM_`.
 */
export const useRoomEvents = (onRoomEvent: RoomEventCallback) => {
    const predicate = useCallback((notification: Notification) => {
        const eventType = String(notification.details?.eventType ?? '').toUpperCase();
        return eventType.startsWith('ROOM_');
    }, []);

    useRealtimeRefresh(predicate, onRoomEvent);
};

export default useRoomEvents;
