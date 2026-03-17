import { useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';

type BookingEventType = 'BOOKING_CREATED' | 'BOOKING_CANCELLED' | 'BOOKING_APPROVED' | 'BOOKING_REJECTED';

interface BookingEventData {
    type: BookingEventType;
    category: 'BOOKING_UPDATE';
    timestamp: string;
    booking: {
        id: number;
        roomId: number;
        status: string;
        startTime: string;
        endTime: string;
        purpose?: string;
        userId?: number;
    };
}

type BookingEventCallback = (event: BookingEventData) => void;

/**
 * Hook to subscribe to real-time booking events via SSE.
 * When a booking event is received, the provided callback is invoked.
 * Use this to trigger data refresh in scheduling components.
 * 
 * @param onBookingEvent - Callback function to handle booking events
 */
export const useBookingEvents = (onBookingEvent: BookingEventCallback) => {
    const { token } = useAuth();
    const eventSourceRef = useRef<EventSource | null>(null);
    const callbackRef = useRef<BookingEventCallback>(onBookingEvent);

    // Keep callback ref up to date
    useEffect(() => {
        callbackRef.current = onBookingEvent;
    }, [onBookingEvent]);

    useEffect(() => {
        if (!token) {
            console.log('[useBookingEvents] No token, skipping SSE connection');
            return;
        }

        // Close existing connection if any
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
        }

        const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
        const streamUrl = `${backendUrl}/api/notifications/stream?token=${token}`;

        console.log('[useBookingEvents] Connecting to SSE stream...');
        const eventSource = new EventSource(streamUrl);
        eventSourceRef.current = eventSource;

        eventSource.onopen = () => {
            console.log('[useBookingEvents] SSE Connection established');
        };

        eventSource.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);

                // Only process booking update events
                if (data.category === 'BOOKING_UPDATE') {
                    console.log('[useBookingEvents] Received booking event:', data.type);
                    callbackRef.current(data);
                }
            } catch (err) {
                // Ignore parsing errors for non-JSON heartbeats
            }
        };

        eventSource.onerror = (err) => {
            console.error('[useBookingEvents] SSE Error:', err);
        };

        return () => {
            console.log('[useBookingEvents] Closing SSE connection');
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
                eventSourceRef.current = null;
            }
        };
    }, [token]);
};

export default useBookingEvents;
