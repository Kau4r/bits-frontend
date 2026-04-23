import { useEffect, useRef } from 'react';
import { useNotifications } from '@/context/NotificationContext';

type BorrowingEventType = 'BORROW_REQUESTED' | 'BORROW_APPROVED' | 'BORROW_REJECTED' | 'BORROW_RETURNED';

interface BorrowingEventData {
    type: BorrowingEventType;
    category: 'BORROWING_UPDATE';
    timestamp: string;
    borrowing: {
        id: number;
        itemId?: number;
        status: string;
    };
}

type BorrowingEventCallback = (event: BorrowingEventData) => void;

/**
 * Subscribe to real-time borrowing events. Events are delivered via the
 * shared NotificationContext WebSocket (see /ws/notifications). When a
 * notification with category === 'BORROWING_UPDATE' arrives, the callback
 * fires.
 *
 * The previous implementation opened a separate SSE EventSource to
 * /api/notifications/stream, which does not exist on the backend.
 */
export const useBorrowingEvents = (onBorrowingEvent: BorrowingEventCallback) => {
    const { notifications } = useNotifications();
    const callbackRef = useRef<BorrowingEventCallback>(onBorrowingEvent);
    const lastHandledIdRef = useRef<string | number | null>(null);

    useEffect(() => {
        callbackRef.current = onBorrowingEvent;
    }, [onBorrowingEvent]);

    useEffect(() => {
        if (notifications.length === 0) return;

        const latest = notifications[0];
        if (!latest || latest.id === lastHandledIdRef.current) return;

        const details = (latest.details ?? {}) as Partial<BorrowingEventData> & {
            category?: string;
            eventType?: BorrowingEventType;
        };

        if (details.category !== 'BORROWING_UPDATE') return;

        lastHandledIdRef.current = latest.id;

        callbackRef.current({
            type: (details.eventType ?? details.type ?? 'BORROW_REQUESTED') as BorrowingEventType,
            category: 'BORROWING_UPDATE',
            timestamp: latest.timestamp,
            borrowing: details.borrowing ?? { id: 0, status: '' },
        });
    }, [notifications]);
};

export default useBorrowingEvents;
