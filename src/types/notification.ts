export type NotificationType = 'System' | 'Issue Report' | 'Asset Request' | 'Form Update';
export type NotificationRole = 'Lab Tech' | 'Lab Head';

export interface Notification {
    id: number;
    title: string;
    message: string;
    /** Pre-formatted clock time used for the small "Clock 3:04 PM" badge */
    time: string;
    /** ISO timestamp — used for the relative ("2h ago") label */
    timestamp?: string;
    isRead: boolean;
    isArchived: boolean;
    type: NotificationType;
    role: NotificationRole;
    /** Display name of the user who triggered the notification, if known */
    senderName?: string;
}

export type NotificationView = 'all' | 'read' | 'archived';
