import { useCallback } from 'react';
import { useRealtimeRefresh } from '@/hooks/useRealtimeRefresh';
import type { Notification } from '@/services/notifications';

type ScheduleImportEventCallback = () => void;

// Match by `SCHEDULE_` prefix but exclude SCHEDULING_/scheduling events that
// are already covered by useBookingEvents — we only want class-schedule
// import lifecycle events here (e.g. SCHEDULE_IMPORTED, SCHEDULE_DELETED).
/**
 * Subscribe to real-time schedule import events. Fires the callback when a
 * notification arrives whose `details.eventType` starts with `SCHEDULE_`.
 * Booking/scheduling events are intentionally not included here — use
 * `useBookingEvents` for those.
 */
export const useScheduleImportEvents = (onScheduleImportEvent: ScheduleImportEventCallback) => {
    const predicate = useCallback((notification: Notification) => {
        const eventType = String(notification.details?.eventType ?? '').toUpperCase();
        return eventType.startsWith('SCHEDULE_');
    }, []);

    useRealtimeRefresh(predicate, onScheduleImportEvent);
};

export default useScheduleImportEvents;
