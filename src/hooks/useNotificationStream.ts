import { useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';

interface UseNotificationStreamOptions {
    onNotification?: (data: unknown) => void;
    showToast?: boolean;
}

export const useNotificationStream = (options: UseNotificationStreamOptions = {}) => {
    const { onNotification, showToast = true } = options;
    const { token } = useAuth();
    const eventSourceRef = useRef<EventSource | null>(null);

    useEffect(() => {
        if (!token) return;

        // Close existing connection if any
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
        }

        const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
        // Connect with token in query param
        const streamUrl = `${backendUrl}/api/notifications/stream?token=${token}`;

        console.log('Connecting to SSE stream...');
        const eventSource = new EventSource(streamUrl);
        eventSourceRef.current = eventSource;

        eventSource.onopen = () => {
            console.log('SSE Connection Established');
        };

        eventSource.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);

                // Ignore initial ping or keep-alive
                if (data.type === 'PING') return;

                // Handle valid notification
                console.log('New Notification:', data);

                // Show toast if enabled
                if (showToast) {
                    toast(data.message, {
                        icon: '🔔',
                        duration: 5000,
                        position: 'top-right'
                    });
                }

                // Invoke callback if provided (for list refresh, etc.)
                if (onNotification) {
                    onNotification(data);
                }
            } catch (err) {
                // Ignore parsing errors for non-JSON heartbeats
            }
        };

        eventSource.onerror = (err) => {
            console.error('SSE Error:', err);
            // Browser automatically attempts reconnect, but we can manage it here if needed
        };

        return () => {
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
                eventSourceRef.current = null;
            }
        };
    }, [token, onNotification, showToast]);
};
