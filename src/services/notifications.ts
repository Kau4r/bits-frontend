import api from "./api";

export interface Notification {
    id: number;
    type: 'info' | 'success' | 'warning';
    title: string;
    message: string;
    time: string;
    timestamp: string;
    read: boolean;
    readAt: string | null;
    user?: {
        First_Name: string;
        Last_Name: string;
        Email: string;
    };
    details?: Record<string, unknown>;
}

// Fetch notifications
export const getNotifications = async (params?: {
    limit?: number;
    unreadOnly?: boolean;
}): Promise<Notification[]> => {
    const { data } = await api.get<Notification[]>("/notifications", { params });
    return data;
};

// Mark single notification as read
export const markNotificationRead = async (id: number): Promise<void> => {
    await api.patch(`/notifications/${id}/read`);
};

// Mark all notifications as read
export const markAllNotificationsRead = async (): Promise<{ count: number }> => {
    const { data } = await api.patch<{ success: boolean; count: number }>("/notifications/read-all");
    return data;
};
