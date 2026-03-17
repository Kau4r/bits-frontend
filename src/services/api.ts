import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL + '/api',
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
            // Attach meta to the response for pagination etc.
            if (response.data.meta) {
                response.headers['x-meta'] = JSON.stringify(response.data.meta);
            }
            // Replace response.data with the actual data payload
            response.data = response.data.data;
        }
        return response;
    },
    (error) => {
        // Extract error message from envelope
        if (error.response?.data && typeof error.response.data === 'object') {
            const serverError = error.response.data.error || error.response.data.message;
            if (serverError) {
                error.message = serverError;
            }
        }
        return Promise.reject(error);
    }
);

export default api;
