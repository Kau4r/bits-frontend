import { useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';

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
 * Hook to subscribe to real-time borrowing events via SSE.
 * When a borrowing event is received, the provided callback is invoked.
 * Use this to trigger data refresh in borrowing components.
 * 
 * @param onBorrowingEvent - Callback function to handle borrowing events
 */
export const useBorrowingEvents = (onBorrowingEvent: BorrowingEventCallback) => {
    const { token } = useAuth();
    const eventSourceRef = useRef<EventSource | null>(null);
    const callbackRef = useRef<BorrowingEventCallback>(onBorrowingEvent);

    // Keep callback ref up to date
    useEffect(() => {
        callbackRef.current = onBorrowingEvent;
    }, [onBorrowingEvent]);

    useEffect(() => {
        if (!token) {
            return;
        }

        // Close existing connection if any
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
        }

        const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
        const streamUrl = `${backendUrl}/api/notifications/stream?token=${token}`;

        console.log('[useBorrowingEvents] Connecting to SSE stream...');
        const eventSource = new EventSource(streamUrl);
        eventSourceRef.current = eventSource;

        eventSource.onopen = () => {
            console.log('[useBorrowingEvents] SSE Connection established');
        };

        eventSource.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);

                // Only process borrowing update events
                if (data.category === 'BORROWING_UPDATE') {
                    console.log('[useBorrowingEvents] Received borrowing event:', data.type);
                    callbackRef.current(data);
                }
            } catch (err) {
                // Ignore parsing errors for non-JSON heartbeats
            }
        };

        eventSource.onerror = (err) => {
            console.error('[useBorrowingEvents] SSE Error:', err);
        };

        return () => {
            console.log('[useBorrowingEvents] Closing SSE connection');
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
                eventSourceRef.current = null;
            }
        };
    }, [token]);
};

export default useBorrowingEvents;
