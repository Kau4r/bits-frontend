import api from "@/services/api";

export interface Notification {
    id: number;
    type: 'info' | 'success' | 'warning';
    title: string;
    message: string;
    time: string;
    timestamp: string;
    read: boolean;
    readAt: string | null;
    archived: boolean;
    archivedAt: string | null;
    user?: {
        First_Name: string;
        Last_Name: string;
        Email: string;
    };
    details?: Record<string, unknown>;
}

// Fetch notifications. Returns the page plus a cursor for the next older page.
export const getNotifications = async (params?: {
    limit?: number;
    unreadOnly?: boolean;
    cursor?: number;
}): Promise<{ notifications: Notification[]; nextCursor: number | null }> => {
    const response = await api.get<any[]>("/notifications", { params });
    const notifications: Notification[] = response.data.map((log: any) => ({
        id: log.Log_ID,
        type: (log.Action.includes('ERROR') || log.Action.includes('REJECT') ? 'warning' : 'info') as Notification['type'],
        title: log.Action.replace(/_/g, ' '),
        message: log.Details,
        time: new Date(log.Timestamp).toLocaleTimeString(),
        timestamp: log.Timestamp,
        read: !!log.Notification_Read_At,
        readAt: log.Notification_Read_At,
        archived: !!log.Notification_Archived_At,
        archivedAt: log.Notification_Archived_At,
        user: log.User,
        details: log.Notification_Data || {}
    }));

    // The api interceptor stashes `meta` on the response headers as JSON.
    let nextCursor: number | null = null;
    const rawMeta = response.headers?.['x-meta'];
    if (typeof rawMeta === 'string') {
        try {
            const parsed = JSON.parse(rawMeta);
            nextCursor = parsed?.nextCursor ?? null;
        } catch {
            // ignore malformed meta
        }
    }

    return { notifications, nextCursor };
};

// Mark single notification as read
export const markNotificationRead = async (id: number): Promise<void> => {
    await api.patch(`/notifications/${id}/read`);
};

// Mark single notification as unread (flip back for follow-up)
export const markNotificationUnread = async (id: number): Promise<void> => {
    await api.patch(`/notifications/${id}/unread`);
};

// Mark all notifications as read
export const markAllNotificationsRead = async (): Promise<{ count: number }> => {
    const { data } = await api.post<{ count: number }>("/notifications/mark-all-read");
    return data;
};

export const archiveNotification = async (id: number): Promise<void> => {
    await api.patch(`/notifications/${id}/archive`);
};

export const restoreNotification = async (id: number): Promise<void> => {
    await api.patch(`/notifications/${id}/restore`);
};

// Get unread notification count
export const getUnreadCount = async (): Promise<number> => {
    const { data } = await api.get<{ count: number }>("/notifications/unread-count");
    return data.count;
};
