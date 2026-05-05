import { useCallback } from 'react';
import { useRealtimeRefresh } from '@/hooks/useRealtimeRefresh';
import type { Notification } from '@/services/notifications';

type MaintenanceEventCallback = () => void;

// Match by `MAINTENANCE_` prefix because backend specific event names for the
// archive/cleanup workflow are not finalized — capturing the prefix avoids
// missing future MAINTENANCE_* events.
/**
 * Subscribe to real-time maintenance events (archive/cleanup workflow).
 * Fires the callback when a notification arrives whose `details.eventType`
 * starts with `MAINTENANCE_`.
 */
export const useMaintenanceEvents = (onMaintenanceEvent: MaintenanceEventCallback) => {
    const predicate = useCallback((notification: Notification) => {
        const eventType = String(notification.details?.eventType ?? '').toUpperCase();
        return eventType.startsWith('MAINTENANCE_');
    }, []);

    useRealtimeRefresh(predicate, onMaintenanceEvent);
};

export default useMaintenanceEvents;
