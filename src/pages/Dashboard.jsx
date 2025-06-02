// src/pages/Dashboard.jsx
import React from "react";
import { useAuth } from "../components/AuthContext";
import { Link } from "react-router-dom";

// MUI imports
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import { styled } from "@mui/material/styles";

// Styled Logout button (red outline, dark‐red hover)
const LogoutButton = styled(Button)(({ theme }) => ({
  color: theme.palette.error.main,
  borderColor: theme.palette.error.main,
  "&:hover": {
    backgroundColor: theme.palette.error.dark,
    borderColor: theme.palette.error.dark,
    color: theme.palette.common.white,
  },
}));

export default function Dashboard() {
  const { userEmail, logout } = useAuth();

  return (
    <Box sx={{ flexGrow: 1 }}>
      {/* ───────── Glass‐Effect Topbar ───────── */}
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          backgroundColor: "rgba(255, 255, 255, 0.6)", // semi‐transparent white
          backdropFilter: "blur(10px)",               // frosted glass blur
          borderBottom: (theme) => `1px solid ${theme.palette.divider}`, // subtle bottom border
        }}
      >
        <Toolbar>
          {/* Left: “Dashboard” title */}
          <Typography
            variant="h6"
            component="div"
            sx={{ flexGrow: 1, fontWeight: 600, color: "text.primary" }}
          >
            Dashboard
          </Typography>

          {/* Right: Logout button */}
          <LogoutButton variant="outlined" onClick={logout} size="small">
            Logout
          </LogoutButton>
        </Toolbar>
      </AppBar>

      {/* ───────── Boxed “Welcome” Section ───────── */}
      <Box
        sx={{
          mt: 4,
          display: "flex",
          justifyContent: "center",
        }}
      >
        <Paper
          elevation={2}
          sx={{
            width: { xs: "90%", sm: "70%", md: "50%" },
            p: 3,
            borderRadius: 2,
          }}
        >
          <Typography variant="h5" component="h1" sx={{ mb: 2, fontWeight: 500 }}>
            Welcome
          </Typography>
          <Typography variant="body1" sx={{ mb: 1 }}>
            You are logged in as:{" "}
            <Typography
              component="span"
              variant="subtitle1"
              sx={{ fontWeight: 600 }}
            >
              {userEmail}
            </Typography>
          </Typography>

          <Box sx={{ mt: 3 }}>
            <Button component={Link} to="/chat" variant="contained" color="primary">
              Go to Chat
            </Button>
          </Box>

          <Box sx={{ mt: 3 }}>
            <Button component={Link} to="/upload" variant="contained" color="primary">
              Go to File Upload
            </Button>
          </Box>
        </Paper>
      </Box>
    </Box>
  );
}
