import api from '@/services/api';
import type { RegisterComputerResponse, HeartbeatData, HeartbeatResponse, EndSessionResponse } from '@/types/heartbeat';

/**
 * Register computer via auto-detection or manual selection
 */
export const registerComputer = async (clientIp: string | null): Promise<RegisterComputerResponse> => {
  try {
    const response = await api.post<RegisterComputerResponse>('/heartbeat/register', { client_ip: clientIp }, { silent: true });
    // After interceptor unwraps envelope, response.data is the payload directly.
    // Add success: true since the interceptor strips it from the envelope.
    return { ...response.data, success: true };
  } catch (error: any) {
    console.error('Failed to register computer:', error);
    return {
      success: false,
      error: error.message || 'Failed to register computer',
      available_computers: error.response?.data?.available_computers || []
    };
  }
};

/**
 * Send heartbeat signal
 */
export const sendHeartbeat = async (data: HeartbeatData): Promise<HeartbeatResponse> => {
  const response = await api.post<HeartbeatResponse>('/heartbeat', data);
  return { ...response.data, success: true };
};

/**
 * End heartbeat session
 */
export const endSession = async (sessionId: string): Promise<EndSessionResponse> => {
  const response = await api.delete<EndSessionResponse>(`/heartbeat/session/${sessionId}`);
  return { ...response.data, success: true };
};
