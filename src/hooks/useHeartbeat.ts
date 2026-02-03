import { useEffect, useState } from 'react';
import { useHeartbeat as useHeartbeatContext } from '@/context/HeartbeatContext';
import { sendHeartbeat } from '@/services/heartbeat';

/**
 * Hook for managing heartbeat intervals with page visibility awareness
 *
 * Based on Dan Abramov's useInterval pattern:
 * https://overreacted.io/making-setinterval-declarative-with-react-hooks/
 *
 * Features:
 * - Adaptive intervals: 30s visible, 120s hidden
 * - Page Visibility API integration
 * - navigator.sendBeacon for reliable cleanup
 * - beforeunload fallback for desktop
 */
export const useHeartbeatInterval = () => {
  const { computer, isActive, sessionId } = useHeartbeatContext();
  const [isPageVisible, setIsPageVisible] = useState(
    typeof document !== 'undefined' ? document.visibilityState === 'visible' : true
  );

  // Track page visibility
  useEffect(() => {
    const handleVisibilityChange = () => {
      const visible = document.visibilityState === 'visible';
      setIsPageVisible(visible);

      // Send beacon when page becomes hidden (primary cleanup)
      if (!visible && sessionId) {
        navigator.sendBeacon(
          `${import.meta.env.VITE_API_URL}/api/heartbeat/session/${sessionId}`,
          JSON.stringify({ ended_at: new Date().toISOString() })
        );
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [sessionId]);

  // beforeunload fallback for desktop
  useEffect(() => {
    if (!sessionId) return;

    const handleBeforeUnload = () => {
      navigator.sendBeacon(
        `${import.meta.env.VITE_API_URL}/api/heartbeat/session/${sessionId}`,
        JSON.stringify({ ended_at: new Date().toISOString() })
      );
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [sessionId]);

  // Adaptive heartbeat interval
  useEffect(() => {
    if (!isActive || !computer || !sessionId) return;

    // Determine interval: 30s visible, 120s hidden
    const interval = isPageVisible ? 30000 : 120000;

    const sendHeartbeatSignal = async () => {
      try {
        await sendHeartbeat({
          computer_id: computer.Computer_ID,
          session_id: sessionId,
          status: 'ONLINE',
          is_page_hidden: !isPageVisible
        });
      } catch (error) {
        console.error('Heartbeat failed:', error);
      }
    };

    // Send immediately, then start interval
    sendHeartbeatSignal();
    const intervalId = setInterval(sendHeartbeatSignal, interval);

    return () => clearInterval(intervalId);
  }, [isActive, computer, sessionId, isPageVisible]);

  return {
    isPageVisible,
    isActive: isActive && !!computer && !!sessionId
  };
};
