// src/services/authService.js
import apiClient from "./apiClient";

/**
 * registerUser(email, password)
 *   → POST to /auth/register
 *   → returns response.data on success (e.g. { message, userSub })
 *   → throws if the backend returns a non‐2xx (e.g. 400 “UsernameExistsException”)
 */
export const registerUser = async (email, password) => {
  const response = await apiClient.post("/auth/register", { email, password });
  return response.data;
};

/**
 * loginUser(email, password)
 *   → POST to /auth/login
 *   → returns response.data on success (e.g. { idToken, accessToken, ... })
 *   → throws if the backend returns a non‐2xx (e.g. 400 “User is not confirmed”)
 */
export const loginUser = async (email, password) => {
  const response = await apiClient.post("/auth/login", { email, password });
  return response.data;
};
