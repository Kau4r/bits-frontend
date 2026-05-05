import { useCallback } from 'react';
import { useRealtimeRefresh } from '@/hooks/useRealtimeRefresh';
import type { Notification } from '@/services/notifications';

type FormEventCallback = () => void;

// Backend constants matched: FORM_SUBMITTED, FORM_UPDATED, FORM_PENDING,
// FORM_IN_REVIEW, FORM_APPROVED, FORM_CANCELLED, FORM_TRANSFERRED,
// FORM_RECEIVED, FORM_ARCHIVED, FORM_UNARCHIVED, FORM_ATTACHMENT_ADDED,
// FORM_ATTACHMENT_REMOVED. Match by `FORM_` prefix; preserve title/message
// substring fallback (and the "Status updated" generic) for older payloads.
/**
 * Subscribe to real-time form events. Fires the callback when a notification
 * arrives whose `details.eventType` starts with `FORM_`, with fallback to
 * title/message text matching to preserve the prior FormsPage behaviour.
 */
export const useFormEvents = (onFormEvent: FormEventCallback) => {
    const predicate = useCallback((notification: Notification) => {
        const eventType = String(notification.details?.eventType ?? '').toUpperCase();
        if (eventType.startsWith('FORM_')) return true;
        const title = String(notification.title ?? '').toLowerCase();
        const message = String(notification.message ?? '').toLowerCase();
        if (title.includes('form') || message.includes('form')) return true;
        return notification.type === 'info' && message.includes('status updated');
    }, []);

    useRealtimeRefresh(predicate, onFormEvent);
};

export default useFormEvents;
