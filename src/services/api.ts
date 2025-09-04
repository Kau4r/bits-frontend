import axios from "axios";

// Create an Axios instance
const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL, // adjust base URL
    headers: {
        "Content-Type": "application/json",
    },
});

export default api;
