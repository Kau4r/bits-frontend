import { useEffect, useRef } from 'react';
import { useNotifications } from '@/context/NotificationContext';

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
    const { notifications } = useNotifications();
    const callbackRef = useRef<BookingEventCallback>(onBookingEvent);
    const processedNotificationRef = useRef<Set<string>>(new Set());

    // Keep callback ref up to date
    useEffect(() => {
        callbackRef.current = onBookingEvent;
    }, [onBookingEvent]);

    useEffect(() => {
        const latestNotification = notifications[0];
        if (!latestNotification) {
            return;
        }

        const notificationId = String(latestNotification.id);
        if (processedNotificationRef.current.has(notificationId)) {
            return;
        }

        const details = latestNotification.details ?? {};
        const eventType = String(
            details.eventType ||
            latestNotification.title?.replace(/\s+/g, '_') ||
            ''
        ).toUpperCase();

        const bookingEvents: BookingEventType[] = [
            'BOOKING_CREATED',
            'BOOKING_CANCELLED',
            'BOOKING_APPROVED',
            'BOOKING_REJECTED'
        ];

        if (!bookingEvents.includes(eventType as BookingEventType)) {
            return;
        }

        processedNotificationRef.current.add(notificationId);
        callbackRef.current({
            type: eventType as BookingEventType,
            category: 'BOOKING_UPDATE',
            timestamp: latestNotification.timestamp,
            booking: {
                id: Number(details.id ?? 0),
                roomId: Number(details.roomId ?? 0),
                status: String(details.status ?? ''),
                startTime: String(details.startTime ?? ''),
                endTime: String(details.endTime ?? ''),
                purpose: typeof details.purpose === 'string' ? details.purpose : undefined,
                userId: details.userId === undefined ? undefined : Number(details.userId),
            }
        });
    }, [notifications]);
};

export default useBookingEvents;
