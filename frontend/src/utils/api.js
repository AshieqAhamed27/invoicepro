import axios from "axios";

const api = axios.create({
  baseURL: "https://invoicepro-527e.onrender.com/api",
  timeout: 10000,
});

// ✅ REQUEST INTERCEPTOR - Add token & request pooling
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = "Bearer " + token;
  }
  return config;
});

// ✅ RESPONSE INTERCEPTOR - Handle errors gracefully
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