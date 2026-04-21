import axios from "axios";

const api = axios.create({
    baseURL: "https://invoicepro-527e.onrender.com/api",
});

// ✅ ADD TOKEN TO EVERY REQUEST
api.interceptors.request.use((config) => {
    const token = localStorage.getItem("token");

    console.log("TOKEN:", token); // 🔍 debug

    if (token) {
        config.headers.Authorization = "Bearer " + token;
    }

    return config;
});

export default api;