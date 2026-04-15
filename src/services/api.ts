import axios from 'axios';
import { getApiBaseUrl } from '@/utils/apiBaseUrl';

type ApiEnvelope = {
    success: unknown;
    data?: unknown;
    error?: string;
    message?: string;
    meta?: unknown;
};

const api = axios.create({
    baseURL: getApiBaseUrl(),
    headers: { "Content-Type": "application/json" },
});

// Attach token automatically
api.interceptors.request.use(config => {
    const token = localStorage.getItem('token');
    if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Unwrap the { success, data, error, meta } envelope
api.interceptors.response.use(
    (response) => {
        // If the response has our envelope format, unwrap it
        if (response.data && typeof response.data === 'object' && 'success' in response.data) {
            const envelope = response.data as ApiEnvelope;

            // Attach meta to the response for pagination etc.
            if (envelope.meta) {
                response.headers['x-meta'] = JSON.stringify(envelope.meta);
            }
            // Replace response.data with the actual data payload
            response.data = envelope.data;
        }
        return response;
    },
    (error) => {
        // Extract error message from envelope
        if (error.response?.data && typeof error.response.data === 'object') {
            const envelope = error.response.data as ApiEnvelope;
            const serverError = envelope.error || envelope.message;
            if (serverError) {
                error.message = serverError;
            }
        }
        return Promise.reject(error);
    }
);

export default api;
