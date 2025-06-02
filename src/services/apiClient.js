// src/services/apiClient.js
import axios from "axios";

/**
 * We export a single default Axios instance (apiClient).
 * It automatically picks up VITE_API_BASE_URL from .env,
 * and it attaches an Authorization header (Bearer <idToken>)
 * on every request if you have an idToken in localStorage.
 */
const BASE_URL = import.meta.env.VITE_API_BASE_URL;

const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Interceptor: if an idToken is present in localStorage, attach it.
apiClient.interceptors.request.use(
  (config) => {
    const idToken = localStorage.getItem("idToken");
    if (idToken) {
      config.headers.Authorization = `Bearer ${idToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Export as the default export of this module:
export default apiClient;
