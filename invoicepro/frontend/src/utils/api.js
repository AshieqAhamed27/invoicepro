import axios from "axios";
import { clearAuth, setPostLoginRedirect } from "./auth";

// ✅ Dynamic base URL (supports dev + prod + env)
const fallbackBaseUrl =
    import.meta.env.PROD ?
    "https://invoicepro-527e.onrender.com/api" :
    "/api";

const baseURL =
    (
        import.meta.env.VITE_API_URL || "").trim() || fallbackBaseUrl;

const requestTimeout =
    Number(import.meta.env.VITE_API_TIMEOUT_MS) ||
    (import.meta.env.PROD ? 45000 : 30000);

// ✅ Create axios instance
const api = axios.create({
    baseURL,
    timeout: requestTimeout,
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
            error.friendlyMessage = "The API is waking up or responding slowly. Please try again.";
            console.warn("API request timed out", {
                baseURL,
                timeout: requestTimeout,
                url: error.config?.url
            });
        }

        const status = error.response?.status;
        const requestUrl = String(error.config?.url || "");
        const isLoginRequest =
            requestUrl.includes("/auth/login") ||
            requestUrl.includes("/auth/signup") ||
            requestUrl.includes("/auth/google");

        if (status === 401 && !isLoginRequest) {
            const currentPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;

            clearAuth();

            if (!["/login", "/signup", "/"].includes(window.location.pathname)) {
                setPostLoginRedirect(currentPath);
                window.location.replace("/login?session=expired");
            }
        }

        return Promise.reject(error);
    }
);

export default api;
