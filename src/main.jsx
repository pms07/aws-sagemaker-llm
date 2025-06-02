import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

// React Router
import { BrowserRouter } from "react-router-dom";

import { AuthProvider } from "./components/AuthContext";  // ← import your AuthProvider

// MUI Theme
import { ThemeProvider, CssBaseline } from "@mui/material";
import theme from "./theme/theme";

// Optional global styles or CSS can be imported here
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  </React.StrictMode>
);
