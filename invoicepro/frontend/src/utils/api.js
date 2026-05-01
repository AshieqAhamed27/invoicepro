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
    (error) => {
        if (error.code === "ECONNABORTED") {
            error.friendlyMessage = "The API is waking up or responding slowly. Please try again.";
            console.warn("API request timed out", {
                baseURL,
                timeout: requestTimeout,
                url: error.config?.url
            });
        }

        if (error.code === "ERR_NETWORK") {
            error.friendlyMessage = isLocalHost()
                ? "Local backend is not reachable. Start the backend server, then retry."
                : "The server is not reachable right now. Please retry in a moment.";
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
