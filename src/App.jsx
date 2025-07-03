// src/App.jsx
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";

import Home from "./pages/Home";
import Login from "./pages/Login";       // The updated login we just wrote
import Register from "./pages/Register"; // The updated register we just wrote
import Dashboard from "./pages/Dashboard";
import Chat from "./pages/Chat";
import FileUpload from "./pages/FileUpload";
import ARInsights from "./pages/ARInsights"; 

function App() {
  return (
    <Routes>
      {/* 1) Landing page at “/” (Home.jsx) */}
      <Route path="/" element={<Home />} />

      {/* 2) Auth routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* 3) Protected */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/chat"
        element={
          <ProtectedRoute>
            <Chat />
          </ProtectedRoute>
        }
      />

      <Route
        path="/upload"
        element={
          <ProtectedRoute>
            <FileUpload />
          </ProtectedRoute>
        }
      />

      <Route path="/ar-insights" element={<ProtectedRoute><ARInsights /></ProtectedRoute>} />

      {/* 4) Fallback: anything else → landing */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
