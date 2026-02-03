import api from './api';
import type { RoomStatus } from '../types/monitoring';

/**
 * Get monitoring status summary for all rooms
 * @param includeComputers - Whether to include detailed computer arrays per room
 * @returns Array of room status objects with optional computer details
 */
export const getMonitoringStatus = async (includeComputers = true): Promise<RoomStatus[]> => {
  const response = await api.get<RoomStatus[]>('/heartbeat/status', {
    params: { include_computers: includeComputers }
  });
  return response.data;
};

export interface HeartbeatRecord {
  id: number;
  session_id: string;
  status: string;
  timestamp: string;
  session_start: string | null;
  session_end: string | null;
  is_active: boolean;
  user: {
    User_ID: number;
    First_Name: string;
    Last_Name: string;
    Email: string;
  } | null;
}

export interface ComputerHistoryResponse {
  success: boolean;
  computer: {
    id: number;
    name: string;
    mac_address: string | null;
    is_online: boolean;
    room: {
      Room_ID: number;
      Name: string;
    } | null;
    current_user: {
      User_ID: number;
      First_Name: string;
      Last_Name: string;
      Email: string;
    } | null;
  };
  heartbeats: HeartbeatRecord[];
}

/**
 * Get heartbeat history for a specific computer
 * @param computerId - The computer ID to fetch history for
 * @returns Computer details and heartbeat history
 */
export const getComputerHistory = async (computerId: number): Promise<ComputerHistoryResponse> => {
  const response = await api.get<ComputerHistoryResponse>(`/heartbeat/computer/${computerId}`);
  return response.data;
};
