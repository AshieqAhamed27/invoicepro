import axios from "axios";

const api = axios.create({
    baseURL: "https://invoicepro-527e.onrender.com/api",
});

// ✅ REQUEST
api.interceptors.request.use((config) => {
    const token = localStorage.getItem("token");

    if (token) {
        config.headers.Authorization = "Bearer " + token;
    }

    return config;
});

// ✅ RESPONSE (NO OPTIONAL CHAINING)
api.interceptors.response.use(
    (res) => res,
    (err) => {
        const status =
            err && err.response && err.response.status;

        // 🔴 401 → SESSION EXPIRED
        if (status === 401) {
            alert("Session expired. Please login again");

            localStorage.clear();
            window.location.href = "/login";
        }

        // 🔴 SERVER ERROR
        else if (status >= 500) {
            alert("Server error. Try again later.");
        }

        // 🔴 NETWORK ERROR
        else if (!err || !err.response) {
            alert("Network error. Check your internet.");
        }

        return Promise.reject(err);
    }
);

export default api;