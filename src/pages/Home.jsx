// src/pages/Home.jsx
import React from "react";
import { Link } from "react-router-dom";

export default function Home() {
  // Path to your background image in /public:
  const backgroundImageUrl = "/banner.png"; // <-- Adjust if you named it differently

  // 1) Full-viewport container:
  //    position: fixed + inset: 0 forces this <div> to cover the entire screen
  const containerStyle = {
    position: "fixed",
    inset: 0,                // shorthand for top:0; right:0; bottom:0; left:0
    zIndex: 0,
    backgroundImage: `url(${backgroundImageUrl})`,
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
  };

  // 2) Semi-transparent overlay on top of the image
  const overlayStyle = {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    zIndex: 1,
  };

  // 3) Content wrapper (zIndex:2) → flex center both axes
  const contentStyle = {
    position: "relative",
    zIndex: 2,
    height: "100%",           // fill the parent (which is full viewport)
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    color: "#fff",
    textAlign: "center",
    padding: "0 1rem",        // a tiny bit of horizontal padding for very narrow screens
  };

  // 4) Button container: side-by-side
  const buttonContainerStyle = {
    marginTop: "2rem",
    display: "flex",
    gap: "1rem",
  };

  // 5) Shared button basics
  const buttonStyle = {
    padding: "0.75rem 1.5rem",
    fontSize: "1rem",
    borderRadius: "4px",
    border: "none",
    cursor: "pointer",
    fontWeight: 500,
  };

  // 6) “Register” = white BG, colored text
  const registerBtnStyle = {
    ...buttonStyle,
    backgroundColor: "#fff",
    color: "#1976d2", // you can swap this to any brand color
  };

  // 7) “Login” = transparent BG, white border/text
  const loginBtnStyle = {
    ...buttonStyle,
    backgroundColor: "transparent",
    color: "#fff",
    border: "2px solid #fff",
  };

  return (
    <div style={containerStyle}>
      {/* Overlay */}
      <div style={overlayStyle} />

      {/* Centered Content */}
      <div style={contentStyle}>
        <h3 style={{ fontSize: "2.5rem", marginTop: '20rem' }}>Mid Term Project</h3>
        <h5 style={{ fontSize: "1.25rem", marginTop: "0rem" }}>CSCI5411</h5>

        <div style={buttonContainerStyle}>
          <Link to="/register">
            <button style={registerBtnStyle}>Register</button>
          </Link>
          <Link to="/login">
            <button style={loginBtnStyle}>Login</button>
          </Link>
        </div>
      </div>
    </div>
  );
}
