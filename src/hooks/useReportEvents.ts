import { useCallback } from 'react';
import { useRealtimeRefresh } from '@/hooks/useRealtimeRefresh';
import type { Notification } from '@/services/notifications';

type ReportEventCallback = () => void;

// Backend constants matched: REPORT_SUBMITTED, REPORT_REVIEWED, REPORT_UPDATED.
// Match by `REPORT_` prefix because backend may add new specific event types
// (e.g. REPORT_RETURNED) we want to capture automatically.
/**
 * Subscribe to real-time weekly-report events. Fires the callback when a
 * notification arrives whose `details.eventType` starts with `REPORT_`.
 */
export const useReportEvents = (onReportEvent: ReportEventCallback) => {
    const predicate = useCallback((notification: Notification) => {
        const eventType = String(notification.details?.eventType ?? '').toUpperCase();
        return eventType.startsWith('REPORT_');
    }, []);

    useRealtimeRefresh(predicate, onReportEvent);
};

export default useReportEvents;
