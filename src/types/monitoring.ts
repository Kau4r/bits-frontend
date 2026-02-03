import type { HeartbeatStatus } from './heartbeat';

export interface MonitoringComputer {
  Computer_ID: number;
  Name: string;
  Status: HeartbeatStatus;  // 'ONLINE' | 'IDLE' | 'WARNING' | 'OFFLINE'
  Current_User: {
    User_ID: number;
    First_Name: string;
    Last_Name: string;
    Email: string;
  } | null;
  Last_Seen: string;  // ISO datetime
  Is_Online: boolean;
}

export interface RoomStatus {
  room_id: number;
  room_name: string;
  online_count: number;
  offline_count: number;
  total_count: number;
  computers: MonitoringComputer[];
}

export interface MonitoringDashboardState {
  rooms: RoomStatus[];
  selectedRoomId: number | null;  // null = "All Rooms"
  selectedStatus: HeartbeatStatus | 'ALL';
  isLoading: boolean;
  error: string | null;
}

// WebSocket message types (discriminated union)
export type MonitoringWSMessage =
  | { type: 'COMPUTER_STATUS_UPDATE'; data: { computer_id: number; status: HeartbeatStatus; is_online: boolean; last_seen: string } }
  | { type: 'COMPUTER_OFFLINE'; data: { computer_id: number; computer_name: string; room_name: string } };
