import { useCallback } from 'react';
import { useRealtimeRefresh } from '@/hooks/useRealtimeRefresh';
import type { Notification } from '@/services/notifications';

type UserEventCallback = () => void;

// Backend constants matched: USER_CREATED, USER_DEACTIVATED, USER_LOGIN,
// USER_LOGOUT. Match by `USER_` prefix because backend may add new specific
// event types (e.g. USER_ROLE_CHANGED) we want to capture automatically.
/**
 * Subscribe to real-time user-account events. Fires the callback when a
 * notification arrives whose `details.eventType` starts with `USER_`.
 */
export const useUserEvents = (onUserEvent: UserEventCallback) => {
    const predicate = useCallback((notification: Notification) => {
        const eventType = String(notification.details?.eventType ?? '').toUpperCase();
        return eventType.startsWith('USER_');
    }, []);

    useRealtimeRefresh(predicate, onUserEvent);
};

export default useUserEvents;
