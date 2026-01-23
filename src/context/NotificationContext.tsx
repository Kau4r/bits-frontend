import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { toast } from 'react-hot-toast';
import { getNotifications, getUnreadCount, markNotificationRead, markAllNotificationsRead, type Notification } from '@/services/notifications';

interface NotificationContextType {
    notifications: Notification[];
    unreadCount: number;
    pendingTicketCount: number;
    loading: boolean;
    markAsRead: (id: number) => Promise<void>;
    markAllAsRead: () => Promise<void>;
}

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
    const wsRef = useRef<WebSocket | null>(null);
    const processedIdsRef = useRef(new Set<string>());
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const [pendingTicketCount, setPendingTicketCount] = useState(0);

    const fetchTicketCount = useCallback(async () => {
        if (!user || !token) return;
        try {
            const httpBase = import.meta.env.VITE_API_URL || 'http://localhost:3000';
            const res = await fetch(`${httpBase}/api/tickets/count?status=PENDING`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setPendingTicketCount(data.count || 0);
            }
        } catch (err) {
            console.error('Error fetching ticket count:', err);
        }
    }, [user, token]);

    // Initial fetch
    const fetchInitialData = useCallback(async () => {
        if (!user) return;
        try {
            setLoading(true);
            const [notifs, count] = await Promise.all([
                getNotifications(),
                getUnreadCount()
            ]);
            const loadedNotifs = Array.isArray(notifs) ? notifs : [];
            setNotifications(loadedNotifs);
            setUnreadCount(count);

            // Populate ref with initial IDs to avoid toasting them if they come in again via WS immediately
            loadedNotifs.forEach(n => processedIdsRef.current.add(String(n.id)));

            fetchTicketCount();
        } catch (err) {
            console.error('Error fetching initial notifications:', err);
        } finally {
            setLoading(false);
        }
    }, [user, fetchTicketCount]);

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

            console.log('[WebSocket] Connecting to:', wsUrl);
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
                    const notifId = String(rawData.id);

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

                    // Normalize to match Notification interface
                    const newNotification: Notification = {
                        id: rawData.id,
                        title: rawData.title || 'Notification',
                        message: rawData.message || 'New update received',
                        time: rawData.time ? new Date(rawData.time).toLocaleTimeString() : new Date().toLocaleTimeString(),
                        timestamp: rawData.time || new Date().toISOString(),
                        read: false,
                        readAt: null,
                        type: (rawData.type && (rawData.type.includes('ERROR') || rawData.type.includes('REJECT'))) ? 'warning' : 'info',
                        user: rawData.user,
                        details: rawData.data || {}
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

                    // Trigger Toast
                    toast(newNotification.message || 'New notification', {
                        icon: '🔔',
                        duration: 5000,
                        style: {
                            borderRadius: '10px',
                            background: '#333',
                            color: '#fff',
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
        setNotifications(prev => prev.map(n =>
            n.id === id ? { ...n, read: true, Notification_Read_At: new Date().toISOString() } : n
        ));
        setUnreadCount(prev => Math.max(0, prev - 1));

        try {
            await markNotificationRead(id);
        } catch (err) {
            console.error('Failed to mark notification as read:', err);
            // Revert on error
            setUnreadCount(prev => prev + 1);
            setNotifications(prev => prev.map(n =>
                n.id === id ? { ...n, read: false, Notification_Read_At: null } : n
            ));
        }
    };

    const markAllAsRead = async () => {
        // Optimistic update
        setNotifications(prev => prev.map(n => ({ ...n, read: true, Notification_Read_At: new Date().toISOString() })));
        setUnreadCount(0);

        try {
            await markAllNotificationsRead();
        } catch (err) {
            console.error('Failed to mark all as read:', err);
            fetchInitialData();
        }
    };

    return (
        <NotificationContext.Provider value={{ notifications, unreadCount, pendingTicketCount, loading, markAsRead, markAllAsRead }}>
            {children}
        </NotificationContext.Provider>
    );
};
