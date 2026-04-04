import axios from 'axios';

const api = axios.create({
    baseURL: 'https://invoicepro-527e.onrender.com/api',
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

// ✅ Handle auth error (FIXED)
api.interceptors.response.use(
    (response) => response,
    (error) => {

        if (error.response && error.response.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
        }

        return Promise.reject(error);
    }
);

export default api;