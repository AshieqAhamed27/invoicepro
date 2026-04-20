import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
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