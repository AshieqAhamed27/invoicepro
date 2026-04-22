import axios from 'axios';

const fallbackBaseUrl = import.meta.env.PROD
  ? 'https://invoicepro-527e.onrender.com/api'
  : '/api';

const baseURL = (import.meta.env.VITE_API_URL || '').trim() || fallbackBaseUrl;

const api = axios.create({ baseURL });

// Add token to every request (when available)
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export default api;
