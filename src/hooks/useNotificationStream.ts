import { useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';

export const useNotificationStream = () => {
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

                // Show toast
                toast(data.message, {
                    icon: '🔔',
                    duration: 5000,
                    position: 'top-right'
                });

                // Logic to update global notification count can be added here
                // or by refetching notifications
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
    }, [token]);
};
