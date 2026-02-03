export type NotificationType = 'System' | 'Issue Report' | 'Asset Request' | 'Form Update';
export type NotificationRole = 'Lab Tech' | 'Lab Head';

export interface Notification {
    id: number;
    title: string;
    message: string;
    time: string;
    isRead: boolean;
    isArchived: boolean;
    type: NotificationType;
    role: NotificationRole;
}

export type NotificationView = 'all' | 'read' | 'archived';
