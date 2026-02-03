export type HeartbeatStatus = 'ONLINE' | 'IDLE' | 'OFFLINE' | 'WARNING';

export interface Computer {
  Computer_ID: number;
  Name: string;
  Room_ID: number | null;
  Mac_Address: string | null;
  IP_Address: string | null;
  Is_Online: boolean;
  Room?: {
    Room_ID: number;
    Name: string;
  };
}

export interface HeartbeatData {
  computer_id: number;
  session_id: string;
  status: HeartbeatStatus;
  is_page_hidden?: boolean;
}

export interface RegisterComputerResponse {
  success: boolean;
  computer?: {
    id: number;
    name: string;
    room_id: number;
    room_name: string;
    mac_address: string;
  };
  error?: string;
  message?: string;
  available_computers?: Computer[];
}

export interface HeartbeatResponse {
  success: boolean;
  next_interval: number;
  computer: {
    id: number;
    name: string;
    status: string;
  };
}

export interface EndSessionResponse {
  success: boolean;
  message: string;
}

export interface HeartbeatContextType {
  computer: Computer | null;
  isActive: boolean;
  sessionId: string | null;
  isDetecting: boolean;
  detectionFailed: boolean;
  startHeartbeat: (computer: Computer, sessionId: string) => void;
  stopHeartbeat: () => void;
}
