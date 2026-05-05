import { useCallback } from 'react';
import { useRealtimeRefresh } from '@/hooks/useRealtimeRefresh';
import type { Notification } from '@/services/notifications';

type InventoryEventCallback = () => void;

// Backend constants matched: ITEM_CREATED, ITEM_UPDATED, ITEM_DELETED,
// ITEM_BORROWED, ITEM_RETURNED, ITEM_OVERDUE, ITEM_READY_FOR_PICKUP,
// ITEM_REPORTED, ITEM_SCHEDULE_ENDING, LOW_INVENTORY_ALERT. Match by
// `INVENTORY_` and `ITEM_` prefixes so future inventory-specific event types
// keep triggering refreshes without code changes here.
/**
 * Subscribe to real-time inventory/item events. Fires the callback when a
 * notification arrives whose `details.eventType` starts with `INVENTORY_`
 * or `ITEM_`.
 */
export const useInventoryEvents = (onInventoryEvent: InventoryEventCallback) => {
    const predicate = useCallback((notification: Notification) => {
        const eventType = String(notification.details?.eventType ?? '').toUpperCase();
        return eventType.startsWith('INVENTORY_') || eventType.startsWith('ITEM_');
    }, []);

    useRealtimeRefresh(predicate, onInventoryEvent);
};

export default useInventoryEvents;
