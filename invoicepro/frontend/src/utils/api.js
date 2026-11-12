import axios from "axios";
import { clearAuth, setPostLoginRedirect } from "./auth";

const productionApiUrl = "https://invoicepro-527e.onrender.com/api";
const localApiUrl = "http://127.0.0.1:5000/api";

const isLocalHost = () => {
    if (typeof window === "undefined") return false;
    return ["localhost", "127.0.0.1", "0.0.0.0"].includes(window.location.hostname);
};

const baseURL =
    (import.meta.env.VITE_API_URL || "").trim() ||
    (isLocalHost() ? localApiUrl : productionApiUrl);

const requestTimeout =
    Number(import.meta.env.VITE_API_TIMEOUT_MS) ||
    (import.meta.env.PROD ? 45000 : 30000);

const api = axios.create({
    baseURL,
    timeout: requestTimeout,
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem("token");

    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
});

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const config = error.config;

        // Auto-retry once on network drops/cold-start connection closures for idempotent GET requests
        if (
            config &&
            !config.__isRetry &&
            config.method?.toLowerCase() === "get" &&
            (error.code === "ERR_NETWORK" || error.message === "Network Error" || error.code === "ECONNABORTED")
        ) {
            config.__isRetry = true;
            // Short 2.5s backoff to allow free-tier Render container to complete booting
            await new Promise((resolve) => setTimeout(resolve, 2500));
            try {
                return await api(config);
            } catch (retryErr) {
                error = retryErr;
            }
        }

        if (error.code === "ECONNABORTED") {
            error.friendlyMessage = "The API is waking up or responding slowly. Please try again.";
            console.warn("API request timed out", {
                baseURL,
                timeout: requestTimeout,
                url: error.config?.url
            });
        }

        if (error.code === "ERR_NETWORK" || error.message === "Network Error") {
            error.friendlyMessage = isLocalHost()
                ? "Local backend is not reachable. Start the backend server, then retry."
                : "The backend server is waking up from sleep. Please wait a moment or click retry.";
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
