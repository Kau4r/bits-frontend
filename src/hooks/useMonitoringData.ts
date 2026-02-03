import { useReducer, useEffect, useRef, useCallback } from 'react';
import type { MonitoringDashboardState, RoomStatus, MonitoringWSMessage } from '../types/monitoring';
import type { HeartbeatStatus } from '../types/heartbeat';
import { getMonitoringStatus } from '../services/monitoring';
import { useNotifications } from '../context/NotificationContext';

const initialState: MonitoringDashboardState = {
  rooms: [],
  selectedRoomId: null,
  selectedStatus: 'ALL',
  isLoading: true,
  error: null,
};

type Action =
  | { type: 'LOAD_START' }
  | { type: 'LOAD_SUCCESS'; payload: RoomStatus[] }
  | { type: 'LOAD_ERROR'; payload: string }
  | { type: 'UPDATE_COMPUTER'; payload: { computer_id: number; status: HeartbeatStatus; is_online: boolean; last_seen: string } }
  | { type: 'COMPUTER_OFFLINE'; payload: { computer_id: number } }
  | { type: 'SET_ROOM_FILTER'; payload: number | null }
  | { type: 'SET_STATUS_FILTER'; payload: HeartbeatStatus | 'ALL' };

function monitoringReducer(state: MonitoringDashboardState, action: Action): MonitoringDashboardState {
  switch (action.type) {
    case 'LOAD_START':
      return { ...state, isLoading: true, error: null };

    case 'LOAD_SUCCESS':
      return { ...state, rooms: action.payload, isLoading: false, error: null };

    case 'LOAD_ERROR':
      return { ...state, error: action.payload, isLoading: false };

    case 'UPDATE_COMPUTER': {
      // Update computer status in the rooms array
      const { computer_id, status, is_online, last_seen } = action.payload;
      return {
        ...state,
        rooms: state.rooms.map(room => ({
          ...room,
          computers: room.computers.map(computer =>
            computer.Computer_ID === computer_id
              ? { ...computer, Status: status, Is_Online: is_online, Last_Seen: last_seen }
              : computer
          ),
          // Recalculate room counts
          online_count: room.computers.filter(c =>
            c.Computer_ID === computer_id ? is_online : c.Is_Online
          ).length,
          offline_count: room.computers.filter(c =>
            c.Computer_ID === computer_id ? !is_online : !c.Is_Online
          ).length,
        })),
      };
    }

    case 'COMPUTER_OFFLINE': {
      // Mark computer as offline
      const { computer_id } = action.payload;
      return {
        ...state,
        rooms: state.rooms.map(room => ({
          ...room,
          computers: room.computers.map(computer =>
            computer.Computer_ID === computer_id
              ? { ...computer, Status: 'OFFLINE', Is_Online: false, Last_Seen: new Date().toISOString() }
              : computer
          ),
          // Recalculate room counts
          online_count: room.computers.filter(c =>
            c.Computer_ID === computer_id ? false : c.Is_Online
          ).length,
          offline_count: room.computers.filter(c =>
            c.Computer_ID === computer_id ? true : !c.Is_Online
          ).length,
        })),
      };
    }

    case 'SET_ROOM_FILTER':
      return { ...state, selectedRoomId: action.payload };

    case 'SET_STATUS_FILTER':
      return { ...state, selectedStatus: action.payload };

    default:
      return state;
  }
}

export function useMonitoringData() {
  const [state, dispatch] = useReducer(monitoringReducer, initialState);
  const wsMessageBufferRef = useRef<MonitoringWSMessage[]>([]);
  const flushIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const { notifications } = useNotifications();

  // Initial load
  useEffect(() => {
    const loadInitialData = async () => {
      dispatch({ type: 'LOAD_START' });
      try {
        const rooms = await getMonitoringStatus(true);
        dispatch({ type: 'LOAD_SUCCESS', payload: rooms });
      } catch (error: any) {
        console.error('Failed to load monitoring data:', error);
        dispatch({ type: 'LOAD_ERROR', payload: error.message || 'Failed to load monitoring data' });
      }
    };

    loadInitialData();
  }, []);

  // WebSocket message processing (buffered)
  const processMessage = useCallback((message: MonitoringWSMessage) => {
    switch (message.type) {
      case 'COMPUTER_STATUS_UPDATE':
        dispatch({ type: 'UPDATE_COMPUTER', payload: message.data });
        break;
      case 'COMPUTER_OFFLINE':
        dispatch({ type: 'COMPUTER_OFFLINE', payload: message.data });
        break;
    }
  }, []);

  // Flush buffered messages every 100ms
  useEffect(() => {
    flushIntervalRef.current = setInterval(() => {
      if (wsMessageBufferRef.current.length > 0) {
        const messages = wsMessageBufferRef.current.splice(0);
        messages.forEach(processMessage);
      }
    }, 100);

    return () => {
      if (flushIntervalRef.current) {
        clearInterval(flushIntervalRef.current);
      }
    };
  }, [processMessage]);

  // WebSocket subscription using NotificationContext
  useEffect(() => {
    const latestNotification = notifications[notifications.length - 1];
    if (!latestNotification) return;

    // Filter for monitoring events based on notification title/type
    const notifTitle = latestNotification.title?.toLowerCase() || '';
    const notifDetails: any = latestNotification.details || {};

    // Check if this is a computer status update or offline event
    if (notifTitle.includes('computer') || notifTitle.includes('status') || notifTitle.includes('heartbeat')) {
      // Extract computer_id from details
      const computer_id = notifDetails.computer_id || notifDetails.Computer_ID;

      if (computer_id && typeof computer_id === 'number') {
        if (notifTitle.includes('offline')) {
          // Computer offline event
          const computer_name: string = notifDetails.computer_name || notifDetails.Name || 'Unknown';
          const room_name: string = notifDetails.room_name || notifDetails.Room_Name || 'Unknown';

          const msg: MonitoringWSMessage = {
            type: 'COMPUTER_OFFLINE',
            data: { computer_id, computer_name, room_name }
          };
          wsMessageBufferRef.current.push(msg);
        } else {
          // Computer status update
          const status: HeartbeatStatus = notifDetails.status || notifDetails.Status || 'ONLINE';
          const is_online: boolean = notifDetails.is_online ?? notifDetails.Is_Online ?? true;
          const last_seen: string = notifDetails.last_seen || notifDetails.Last_Seen || new Date().toISOString();

          const msg: MonitoringWSMessage = {
            type: 'COMPUTER_STATUS_UPDATE',
            data: {
              computer_id,
              status,
              is_online,
              last_seen
            }
          };
          wsMessageBufferRef.current.push(msg);
        }
      }
    }
  }, [notifications]);

  // Filter setter callbacks
  const setRoomFilter = useCallback((roomId: number | null) => {
    dispatch({ type: 'SET_ROOM_FILTER', payload: roomId });
  }, []);

  const setStatusFilter = useCallback((status: HeartbeatStatus | 'ALL') => {
    dispatch({ type: 'SET_STATUS_FILTER', payload: status });
  }, []);

  return {
    ...state,
    setRoomFilter,
    setStatusFilter,
  };
}
