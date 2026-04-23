import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getLocalIP } from '@/lib/networkUtils';
import { registerComputer } from '@/services/heartbeat';
import { normalizeUserRole, ROLES } from '@/types/user';
import type { HeartbeatContextType, Computer } from '@/types/heartbeat';

const HeartbeatContext = createContext<HeartbeatContextType | undefined>(undefined);

export const useHeartbeat = () => {
  const context = useContext(HeartbeatContext);
  if (!context) {
    throw new Error('useHeartbeat must be used within a HeartbeatProvider');
  }
  return context;
};

export const HeartbeatProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { isAuthenticated, user, userRole } = useAuth();
  const [computer, setComputer] = useState<Computer | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectionFailed, setDetectionFailed] = useState(false);

  // Auto-detect computer on mount if authenticated AND role is STUDENT.
  // Staff roles (labtech, labhead, etc.) don't need computer registration
  // and would otherwise hit a 400 on /api/heartbeat/register.
  useEffect(() => {
    if (!isAuthenticated || !user) return;
    if (normalizeUserRole(userRole) !== ROLES.STUDENT) return;

    const detectComputer = async () => {
      setIsDetecting(true);
      setDetectionFailed(false);

      try {
        // Try to get local IP
        const localIp = await getLocalIP();

        // Register with backend
        const result = await registerComputer(localIp);

        if (result.success && result.computer) {
          // Success - computer detected
          const detectedComputer: Computer = {
            Computer_ID: result.computer.id,
            Name: result.computer.name,
            Room_ID: result.computer.room_id,
            Mac_Address: result.computer.mac_address,
            IP_Address: localIp,
            Is_Online: true,
            Room: {
              Room_ID: result.computer.room_id,
              Name: result.computer.room_name
            }
          };

          // Generate session ID
          const newSessionId = crypto.randomUUID?.() || `session-${Date.now()}`;

          setComputer(detectedComputer);
          setSessionId(newSessionId);
          setIsActive(true);
          setDetectionFailed(false);
        } else {
          // Failed - show manual selector
          setDetectionFailed(true);
        }
      } catch (error) {
        console.error('Computer detection failed:', error);
        setDetectionFailed(true);
      } finally {
        setIsDetecting(false);
      }
    };

    detectComputer();
  }, [isAuthenticated, user]);

  const startHeartbeat = useCallback((selectedComputer: Computer, newSessionId: string) => {
    setComputer(selectedComputer);
    setSessionId(newSessionId);
    setIsActive(true);
    setDetectionFailed(false);
  }, []);

  const stopHeartbeat = useCallback(() => {
    setIsActive(false);
    setSessionId(null);
  }, []);

  const value: HeartbeatContextType = {
    computer,
    isActive,
    sessionId,
    isDetecting,
    detectionFailed,
    startHeartbeat,
    stopHeartbeat
  };

  // React 19: use <HeartbeatContext value={}> directly, NOT <HeartbeatContext.Provider>
  return (
    <HeartbeatContext value={value}>
      {children}
    </HeartbeatContext>
  );
};
