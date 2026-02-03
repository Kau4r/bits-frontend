import api from './api';
import type { RegisterComputerResponse, HeartbeatData, HeartbeatResponse, EndSessionResponse } from '@/types/heartbeat';

/**
 * Register computer via auto-detection or manual selection
 */
export const registerComputer = async (clientIp: string | null): Promise<RegisterComputerResponse> => {
  try {
    const response = await api.post<RegisterComputerResponse>('/heartbeat/register', { client_ip: clientIp });
    return response.data;
  } catch (error: any) {
    console.error('Failed to register computer:', error);
    return {
      success: false,
      error: error.response?.data?.message || 'Failed to register computer',
      available_computers: error.response?.data?.available_computers || []
    };
  }
};

/**
 * Send heartbeat signal
 */
export const sendHeartbeat = async (data: HeartbeatData): Promise<HeartbeatResponse> => {
  const response = await api.post<HeartbeatResponse>('/heartbeat', data);
  return response.data;
};

/**
 * End heartbeat session
 */
export const endSession = async (sessionId: string): Promise<EndSessionResponse> => {
  const response = await api.delete<EndSessionResponse>(`/heartbeat/session/${sessionId}`);
  return response.data;
};
