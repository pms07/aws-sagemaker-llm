// src/components/AuthContext.jsx

import React, { createContext, useContext, useEffect, useState } from "react";
import { loginUser } from "../services/authService";

//
// ─── CONTEXT SETUP ────────────────────────────────────────────────────────
//
const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  // 1) Persist the Cognito idToken in state (initially read from localStorage, if present)
  const [idToken, setIdToken] = useState(() => {
    return localStorage.getItem("idToken") || null;
  });

  // 2) Persist the user’s email in state (initially read from localStorage)
  const [userEmail, setUserEmail] = useState(() => {
    return localStorage.getItem("userEmail") || null;
  });

  // 3) Persist userSub (“sub” claim from the JWT) in state
  const [userSub, setUserSub] = useState(() => {
    // If there’s already an idToken in localStorage, decode its “sub” right away
    const token = localStorage.getItem("idToken");
    if (token) {
      try {
        const payload = token.split(".")[1];
        // Standard Base64Url → Base64 conversion:
        const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
        // atob(base64) decodes a Base64‐encoded string:
        const jsonPayload = decodeURIComponent(
          Array.from(atob(base64))
            .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
            .join("")
        );
        const claims = JSON.parse(jsonPayload);
        return claims.sub || null;
      } catch {
        return null;
      }
    }
    return null;
  });

  //
  // ─── KEEP LOCALSTORAGE IN SYNC ────────────────────────────────────────────
  //
  useEffect(() => {
    if (idToken) {
      localStorage.setItem("idToken", idToken);

      // Whenever idToken changes, decode its payload to get “sub”
      try {
        const payload = idToken.split(".")[1];
        const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
        const jsonPayload = decodeURIComponent(
          Array.from(atob(base64))
            .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
            .join("")
        );
        const claims = JSON.parse(jsonPayload);
        setUserSub(claims.sub || null);
      } catch (err) {
        console.error("❌ Failed to decode idToken:", err);
        setUserSub(null);
      }
    } else {
      localStorage.removeItem("idToken");
      setUserSub(null);
    }
  }, [idToken]);

  useEffect(() => {
    if (userEmail) {
      localStorage.setItem("userEmail", userEmail);
    } else {
      localStorage.removeItem("userEmail");
    }
  }, [userEmail]);

  //
  // ─── LOGIN / LOGOUT HANDLERS ──────────────────────────────────────────────
  //
  const login = async (email, password) => {
    try {
      const data = await loginUser(email, password);
      // data = { idToken: "...", accessToken: "...", ... }
      const { idToken: newIdToken } = data;
      setIdToken(newIdToken);
      setUserEmail(email);
      return { success: true };
    } catch (err) {
      console.error("❌ Unexpected error in AuthContext.login:", err);
      if (err.response && err.response.data && err.response.data.message) {
        return { success: false, message: err.response.data.message };
      }
      return { success: false, message: "Login failed. Please try again." };
    }
  };

  const logout = () => {
    setIdToken(null);
    setUserEmail(null);
    setUserSub(null);
  };

  const isAuthenticated = Boolean(idToken);

  // The “value” we expose via context:
  const value = {
    idToken,
    userEmail,
    userSub,
    login,
    logout,
    isAuthenticated,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
