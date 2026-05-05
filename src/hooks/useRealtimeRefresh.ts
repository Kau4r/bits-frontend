import { useEffect, useRef } from 'react';
import { useNotifications } from '@/context/NotificationContext';
import type { Notification } from '@/services/notifications';

type RealtimeRefreshCallback = () => void;

/**
 * Generic primitive that powers all typed real-time refresh hooks.
 * Subscribes to NotificationContext, inspects only the head of the queue
 * (notifications are prepended), dedupes by id with a ref so the same
 * notification never fires the callback twice across re-renders, and keeps
 * the callback in a ref so inline arrow functions don't cause re-subscription.
 *
 * First-mount stale notifications are ignored: when the ref is empty we just
 * record the latest id without firing — matches the behaviour established by
 * `useBookingEvents`/`useTicketEvents` so pages don't reload on initial load.
 *
 * @param predicate - Returns true if the notification is relevant to this hook
 * @param onMatch - Called once per matching notification
 */
export function useRealtimeRefresh(
    predicate: (notification: Notification) => boolean,
    onMatch: RealtimeRefreshCallback
): void {
    const { notifications } = useNotifications();
    const callbackRef = useRef<RealtimeRefreshCallback>(onMatch);
    const processedNotificationRef = useRef<Set<string>>(new Set());

    useEffect(() => {
        callbackRef.current = onMatch;
    }, [onMatch]);

    useEffect(() => {
        const latest = notifications[0];
        if (!latest) return;

        const notificationId = String(latest.id);
        if (processedNotificationRef.current.has(notificationId)) return;

        if (!predicate(latest)) {
            // Still mark as seen so we don't reprocess if predicate flips.
            processedNotificationRef.current.add(notificationId);
            return;
        }

        processedNotificationRef.current.add(notificationId);
        callbackRef.current();
    }, [notifications, predicate]);
}

export default useRealtimeRefresh;
