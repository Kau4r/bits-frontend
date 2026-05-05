import { useCallback } from 'react';
import { useRealtimeRefresh } from '@/hooks/useRealtimeRefresh';
import type { Notification } from '@/services/notifications';

type TicketEventCallback = () => void;

// Backend constants matched: TICKET_CREATED, TICKET_UPDATED, TICKET_ASSIGNED,
// TICKET_RESOLVED, TICKET_ARCHIVED. Match by `TICKET_` prefix on details.eventType
// so future specific event types (e.g. TICKET_REOPENED) automatically trigger
// refresh. Title-string fallback preserves the legacy TicketsPage behaviour.
/**
 * Subscribe to real-time ticket events. Fires the callback when a notification
 * arrives whose `details.eventType` starts with `TICKET_` or whose title
 * mentions TICKET. Use this to refresh ticket lists / dashboards.
 */
export const useTicketEvents = (onTicketEvent: TicketEventCallback) => {
    const predicate = useCallback((notification: Notification) => {
        const eventType = String(notification.details?.eventType ?? '').toUpperCase();
        if (eventType.startsWith('TICKET_')) return true;
        const title = String(notification.title ?? '').toUpperCase();
        return title.includes('TICKET');
    }, []);

    useRealtimeRefresh(predicate, onTicketEvent);
};

export default useTicketEvents;
