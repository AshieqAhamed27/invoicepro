import axios from 'axios';

const cleanUrl = (url) => (url ? url.replace(/\/+$/, '') : '');
const withApiPath = (url) => {
    const cleanedUrl = cleanUrl(url);
    return cleanedUrl && !cleanedUrl.endsWith('/api') ? `${cleanedUrl}/api` : cleanedUrl;
};

const envApiUrl = withApiPath(import.meta.env.VITE_API_URL);
const isBrowser = typeof window !== 'undefined';
const host = isBrowser ? window.location.hostname : '';
const isLocalHost = host === 'localhost' || host === '127.0.0.1';
const fallbackApiUrl = isLocalHost
    ? 'http://localhost:5000/api'
    : (isBrowser ? `${window.location.origin}/api` : 'http://localhost:5000/api');

export const API_BASE_URL = envApiUrl || fallbackApiUrl;
export const API_ORIGIN = API_BASE_URL.replace(/\/api$/, '');

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json'
    }
});

// ✅ Attach token
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');

    if (token) {
        config.headers.Authorization = 'Bearer ' + token;
    }

    return config;
});

// ✅ FIXED RESPONSE HANDLING
api.interceptors.response.use(
    (response) => response,
    (error) => {

        // 🔥 ONLY logout for 401
        if (error.response && error.response.status === 401) {
            alert("Session expired. Please login again.");

            localStorage.removeItem('token');
            localStorage.removeItem('user');

            window.location.href = '/login';
        }

        // ❌ DO NOTHING for 403
        return Promise.reject(error);
    }
);

export default api;
