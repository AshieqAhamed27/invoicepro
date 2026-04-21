import axios from "axios";
import { clearAuth, getToken, setPostLoginRedirect } from "./auth";

export const API_BASE_URL = (import.meta.env.VITE_API_URL || "https://invoicepro-527e.onrender.com/api").replace(/\/$/, "");
export const API_ORIGIN = API_BASE_URL.replace(/\/api$/, "");

const api = axios.create({
    baseURL: API_BASE_URL,
});

let authRedirectInProgress = false;

const shouldIgnoreUnauthorized = (url = "") =>
    /\/auth\/(login|signup|google)$/.test(url);

const rememberCurrentPath = () => {
    if (typeof window === "undefined") return;

    const currentPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    setPostLoginRedirect(currentPath);
};

api.interceptors.request.use((config) => {
    const token = getToken();

    if (token) {
        config.headers.Authorization = "Bearer " + token;
    }

    return config;
});

api.interceptors.response.use(
    (res) => res,
    (err) => {
        const status =
            err && err.response && err.response.status;
        const requestUrl =
            err && err.config && err.config.url;

        if (status === 401 && !shouldIgnoreUnauthorized(requestUrl)) {
            if (!authRedirectInProgress) {
                authRedirectInProgress = true;
                rememberCurrentPath();
                clearAuth();
                alert("Session expired. Please login again");
                window.location.replace("/login");
            }
        }

        else if (status >= 500) {
            alert("Server error. Try again later.");
        }

        else if (!err || !err.response) {
            alert("Network error. Check your internet.");
        }

        return Promise.reject(err);
    }
);

export default api;
