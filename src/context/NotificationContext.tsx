import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'react-hot-toast';
import api from '@/services/api';
import { isLabStaffRole } from '@/types/user';
import {
    archiveNotification as archiveNotificationRequest,
    getNotifications,
    getUnreadCount,
    markAllNotificationsRead,
    markNotificationRead,
    markNotificationUnread,
    restoreNotification as restoreNotificationRequest,
    type Notification
} from '@/services/notifications';

interface NotificationContextType {
    notifications: Notification[];
    unreadCount: number;
    pendingTicketCount: number;
    loading: boolean;
    loadingMore: boolean;
    hasMore: boolean;
    loadMore: () => Promise<void>;
    markAsRead: (id: number) => Promise<void>;
    markAsUnread: (id: number) => Promise<void>;
    markAllAsRead: () => Promise<void>;
    archiveNotification: (id: number) => Promise<void>;
    restoreNotification: (id: number) => Promise<void>;
}

const PAGE_SIZE = 50;

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotifications must be used within a NotificationProvider');
    }
    return context;
};

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user, token } = useAuth();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [nextCursor, setNextCursor] = useState<number | null>(null);
    const wsRef = useRef<WebSocket | null>(null);
    const processedIdsRef = useRef(new Set<string>());
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const [pendingTicketCount, setPendingTicketCount] = useState(0);

    const fetchTicketCount = useCallback(async () => {
        if (!user || !token || !isLabStaffRole(user.User_Role, true)) {
            setPendingTicketCount(0);
            return;
        }
        try {
            const res = await api.get<{ count: number }>('/tickets/count', {
                params: { status: 'PENDING' }
            });
            setPendingTicketCount(res.data.count || 0);
        } catch (err) {
            console.error('Error fetching ticket count:', err);
        }
    }, [user, token]);

    // Initial fetch
    const fetchInitialData = useCallback(async () => {
        if (!user) return;
        try {
            setLoading(true);
            const [page, count] = await Promise.all([
                getNotifications({ limit: PAGE_SIZE }),
                getUnreadCount()
            ]);
            const loadedNotifs = page.notifications;
            setNotifications(loadedNotifs);
            setNextCursor(page.nextCursor);
            setUnreadCount(count);

            // Populate ref with initial IDs to avoid toasting them if they come in again via WS immediately
            processedIdsRef.current = new Set();
            loadedNotifs.forEach(n => processedIdsRef.current.add(String(n.id)));

            fetchTicketCount();
        } catch (err) {
            console.error('Error fetching initial notifications:', err);
        } finally {
            setLoading(false);
        }
    }, [user, fetchTicketCount]);

    // Append the next page of older notifications using the cursor.
    const loadMore = useCallback(async () => {
        if (!nextCursor || loadingMore) return;
        try {
            setLoadingMore(true);
            const page = await getNotifications({ limit: PAGE_SIZE, cursor: nextCursor });
            setNotifications(prev => {
                const seen = new Set(prev.map(n => String(n.id)));
                const fresh = page.notifications.filter(n => !seen.has(String(n.id)));
                fresh.forEach(n => processedIdsRef.current.add(String(n.id)));
                return [...prev, ...fresh];
            });
            setNextCursor(page.nextCursor);
        } catch (err) {
            console.error('Error loading more notifications:', err);
        } finally {
            setLoadingMore(false);
        }
    }, [nextCursor, loadingMore]);

    useEffect(() => {
        fetchInitialData();
    }, [fetchInitialData]);

    // WebSocket connection with reconnection logic
    useEffect(() => {
        if (!user || !token) {
            if (wsRef.current) {
                wsRef.current.close();
                wsRef.current = null;
            }
            return;
        }

        const connectWebSocket = () => {
            // Construct WebSocket URL
            const httpBase = import.meta.env.VITE_API_URL || 'http://localhost:3000';
            const wsProtocol = httpBase.startsWith('https') ? 'wss' : 'ws';
            const wsHost = httpBase.replace(/^https?:\/\//, '');
            const wsUrl = `${wsProtocol}://${wsHost}/ws/notifications?token=${token}`;

            console.log('[WebSocket] Connecting to notifications stream');
            const ws = new WebSocket(wsUrl);

            ws.onopen = () => {
                console.log('[WebSocket] Connected successfully!');
            };

            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);

                    // Ignore connection confirmation or pings
                    if (data.type === 'CONNECTED' || data.type === 'PING') {
                        console.log('[WebSocket] Server message:', data.message || data.type);
                        return;
                    }

                    // Handle notification
                    const rawData = data;

                    // Generate unique ID for real-time notifications that don't have one
                    // Backend SSE notifications (like borrowing) may not have an ID
                    const generatedId = rawData.id || `realtime-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                    const notifId = String(generatedId);

                    // Strict Deduplication: Check if we've already processed this ID
                    if (processedIdsRef.current.has(notifId)) {
                        console.log('[WebSocket] Duplicate notification prevented (Ref check):', notifId);
                        return;
                    }
                    processedIdsRef.current.add(notifId);

                    console.log('[WebSocket] New notification:', rawData);

                    if (rawData.type && rawData.type.includes('TICKET')) {
                        fetchTicketCount();
                    }

                    const rawDetails = rawData.data ?? rawData.borrowing ?? rawData.booking ?? {};
                    const normalizedDetails =
                        rawDetails && typeof rawDetails === 'object' && !Array.isArray(rawDetails)
                            ? { ...rawDetails, eventType: rawData.type, category: rawData.category }
                            : { payload: rawDetails, eventType: rawData.type, category: rawData.category };

                    // Normalize to match Notification interface
                    const newNotification: Notification = {
                        id: typeof generatedId === 'number' ? generatedId : parseInt(notifId.replace(/\D/g, '').slice(-9) || '0', 10) || Date.now(),
                        title: rawData.title || rawData.type?.replace(/_/g, ' ') || 'Notification',
                        message: rawData.message || 'New update received',
                        time: rawData.time ? new Date(rawData.time).toLocaleTimeString() : new Date().toLocaleTimeString(),
                        timestamp: rawData.timestamp || rawData.time || new Date().toISOString(),
                        read: false,
                        readAt: null,
                        archived: false,
                        archivedAt: null,
                        type: (rawData.type && (rawData.type.includes('ERROR') || rawData.type.includes('REJECT'))) ? 'warning' : 'info',
                        user: rawData.user,
                        details: normalizedDetails
                    };

                    // Check for duplicates using functional update to ensure thread safety
                    setNotifications(prev => {
                        // Secondary check just in case
                        if (prev.some(n => String(n.id) === String(newNotification.id))) {
                            return prev;
                        }

                        // Only increment unread count if we actually added the notification
                        setUnreadCount(c => c + 1);
                        return [newNotification, ...prev];
                    });

                    // Trigger Toast — adapt colors to the current theme
                    const isDark = typeof document !== 'undefined'
                        && document.documentElement.classList.contains('dark');
                    toast(newNotification.message || 'New notification', {
                        icon: '🔔',
                        duration: 5000,
                        style: {
                            borderRadius: '10px',
                            background: isDark ? '#1f2937' : '#ffffff',
                            color: isDark ? '#f9fafb' : '#111827',
                            border: isDark ? '1px solid #374151' : '1px solid #e5e7eb',
                            boxShadow: isDark
                                ? '0 10px 15px -3px rgba(0,0,0,0.4), 0 4px 6px -4px rgba(0,0,0,0.4)'
                                : '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)',
                        },
                    });
                } catch (err) {
                    console.error('[WebSocket] Error parsing message:', err);
                }
            };

            ws.onerror = (error) => {
                console.error('[WebSocket] Error:', error);
            };

            ws.onclose = (event) => {
                console.log('[WebSocket] Connection closed. Code:', event.code, 'Reason:', event.reason);
                wsRef.current = null;

                // Attempt reconnection after 5 seconds if not a normal closure
                if (event.code !== 1000 && user && token) {
                    console.log('[WebSocket] Attempting reconnection in 5 seconds...');
                    reconnectTimeoutRef.current = setTimeout(() => {
                        connectWebSocket();
                    }, 5000);
                }
            };

            wsRef.current = ws;
        };

        connectWebSocket();

        return () => {
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
            if (wsRef.current) {
                wsRef.current.close(1000, 'Component unmounting');
            }
        };
    }, [user, token, fetchTicketCount]);

    const markAsRead = async (id: number) => {
        // Optimistic update
        const readAt = new Date().toISOString();
        const notification = notifications.find(n => n.id === id);
        setNotifications(prev => prev.map(n =>
            n.id === id ? { ...n, read: true, readAt } : n
        ));
        if (notification && !notification.read) {
            setUnreadCount(prev => Math.max(0, prev - 1));
        }

        try {
            await markNotificationRead(id);
        } catch (err) {
            console.error('Failed to mark notification as read:', err);
            // Revert on error
            if (notification && !notification.read) {
                setUnreadCount(prev => prev + 1);
            }
            setNotifications(prev => prev.map(n =>
                n.id === id ? { ...n, read: notification?.read ?? false, readAt: notification?.readAt ?? null } : n
            ));
        }
    };

    const markAsUnread = async (id: number) => {
        // Optimistic flip back to unread.
        const notification = notifications.find(n => n.id === id);
        const wasRead = notification?.read ?? false;
        setNotifications(prev => prev.map(n =>
            n.id === id ? { ...n, read: false, readAt: null } : n
        ));
        if (wasRead) {
            setUnreadCount(prev => prev + 1);
        }

        try {
            await markNotificationUnread(id);
        } catch (err) {
            console.error('Failed to mark notification as unread:', err);
            // Revert on error
            setNotifications(prev => prev.map(n =>
                n.id === id ? { ...n, read: notification?.read ?? false, readAt: notification?.readAt ?? null } : n
            ));
            if (wasRead) {
                setUnreadCount(prev => Math.max(0, prev - 1));
            }
        }
    };

    const markAllAsRead = async () => {
        // Optimistic update
        const readAt = new Date().toISOString();
        setNotifications(prev => prev.map(n => ({ ...n, read: true, readAt: n.readAt || readAt })));
        setUnreadCount(0);

        try {
            await markAllNotificationsRead();
        } catch (err) {
            console.error('Failed to mark all as read:', err);
            fetchInitialData();
        }
    };

    const archiveNotification = async (id: number) => {
        const archivedAt = new Date().toISOString();
        const notification = notifications.find(n => n.id === id);
        setNotifications(prev => prev.map(n =>
            n.id === id ? { ...n, read: true, readAt: n.readAt || archivedAt, archived: true, archivedAt } : n
        ));
        if (notification && !notification.read) {
            setUnreadCount(prev => Math.max(0, prev - 1));
        }

        try {
            await archiveNotificationRequest(id);
        } catch (err) {
            console.error('Failed to archive notification:', err);
            if (notification && !notification.read) {
                setUnreadCount(prev => prev + 1);
            }
            setNotifications(prev => prev.map(n =>
                n.id === id
                    ? {
                        ...n,
                        read: notification?.read ?? false,
                        readAt: notification?.readAt ?? null,
                        archived: notification?.archived ?? false,
                        archivedAt: notification?.archivedAt ?? null
                    }
                    : n
            ));
        }
    };

    const restoreNotification = async (id: number) => {
        const notification = notifications.find(n => n.id === id);
        setNotifications(prev => prev.map(n =>
            n.id === id ? { ...n, archived: false, archivedAt: null } : n
        ));

        try {
            await restoreNotificationRequest(id);
        } catch (err) {
            console.error('Failed to restore notification:', err);
            setNotifications(prev => prev.map(n =>
                n.id === id
                    ? { ...n, archived: notification?.archived ?? false, archivedAt: notification?.archivedAt ?? null }
                    : n
            ));
        }
    };

    return (
        <NotificationContext.Provider value={{ notifications, unreadCount, pendingTicketCount, loading, loadingMore, hasMore: nextCursor !== null, loadMore, markAsRead, markAsUnread, markAllAsRead, archiveNotification, restoreNotification }}>
            {children}
        </NotificationContext.Provider>
    );
};
