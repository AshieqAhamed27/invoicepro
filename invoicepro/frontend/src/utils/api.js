import axios from "axios";

// ✅ Dynamic base URL (supports dev + prod + env)
const fallbackBaseUrl =
    import.meta.env.PROD ?
    "https://invoicepro-527e.onrender.com/api" :
    "/api";

const baseURL =
    (
        import.meta.env.VITE_API_URL || "").trim() || fallbackBaseUrl;

// ✅ Create axios instance
const api = axios.create({
    baseURL,
    timeout: 10000, // keep timeout from your version
});

// ✅ REQUEST INTERCEPTOR - attach token
api.interceptors.request.use((config) => {
    const token = localStorage.getItem("token");

    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
});

// ✅ RESPONSE INTERCEPTOR - handle errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.code === "ECONNABORTED") {
            console.error("Request timeout - API is slow");
        }
        return Promise.reject(error);
    }
);

export default api;