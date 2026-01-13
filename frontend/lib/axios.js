import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:8001/api",
  headers: {
    "X-Requested-With": "XMLHttpRequest",
    Accept: "application/json",
  },
  // withCredentials: true, // Not needed for Bearer token auth
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Add response interceptor to handle 401 errors (token expired)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const requestUrl = error.config?.url || "";
    const isAuthRequest = [
      "/login",
      "/register",
      "/verify-otp",
      "/resend-otp",
      "/forgot-password",
      "/verify-reset-otp",
      "/reset-password",
    ].some((path) => requestUrl.includes(path));
    if (status === 401 && !isAuthRequest) {
      // Token is invalid/expired, clear it
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default api;
