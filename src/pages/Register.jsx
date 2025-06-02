// src/pages/Register.jsx
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { registerUser } from "../services/authService";

export default function Register() {
  const navigate = useNavigate();

  const [email, setEmail]                    = useState("");
  const [password, setPassword]              = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError]       = useState(null);
  const [successMsg, setSuccessMsg] = useState("");
  const [loading, setLoading]   = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const data = await registerUser(email, password);
      setSuccessMsg("Registration successful! Redirecting to Login…");

      setTimeout(() => {
        navigate("/login");
      }, 1500);
    } catch (err) {
      if (err.response && err.response.data && err.response.data.message) {
        setError(err.response.data.message);
      } else {
        setError("Registration failed. Please try again.");
      }
    }
    setLoading(false);
  };

  return (
    <div className="register-wrapper">
      <div className="register-card">
        <h2>Register</h2>

        {error && (
          <div style={{ marginBottom: "1rem", color: "#d32f2f", fontSize: "0.9rem" }}>
            {error}
          </div>
        )}
        {successMsg && (
          <div style={{ marginBottom: "1rem", color: "#2e7d32", fontSize: "0.9rem" }}>
            {successMsg}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email:</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value.trim())}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password:</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password:</label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="primary-button"
          >
            {loading ? "Registering…" : "Register"}
          </button>
        </form>

        <div className="bottom-text">
          Already have an account? <Link to="/login">Login here.</Link>
        </div>
        <div className="back-home-btn">
          <button onClick={() => navigate("/")}>← Back to Home</button>
        </div>
      </div>
    </div>
  );
}
