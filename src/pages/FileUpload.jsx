// src/pages/FileUpload.jsx
import React, { useState, useRef } from "react";
import axios from "axios";
import { useAuth } from "../components/AuthContext";
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  Paper,
  LinearProgress,
  Alert,
} from "@mui/material";
import { styled } from "@mui/material/styles";

//
// Styled Logout button (red outline, dark‐red hover), same as Dashboard
//
const LogoutButton = styled(Button)(({ theme }) => ({
  color: theme.palette.error.main,
  borderColor: theme.palette.error.main,
  "&:hover": {
    backgroundColor: theme.palette.error.dark,
    borderColor: theme.palette.error.dark,
    color: theme.palette.common.white,
  },
}));

export default function FileUpload() {
  const { idToken, logout } = useAuth(); // we need logout for the topbar
  const fileInputRef = useRef(null);

  // Local state for file upload
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  // 1) Handle file selection & validation
  const handleFileChange = (e) => {
    setErrorMessage(null);
    setStatusMessage(null);
    setUploadProgress(0);

    const file = e.target.files[0];
    if (!file) return;

    // Only allow .xlsx or .csv, max 10 MB
    const allowedExtensions = [".xlsx", ".csv"];
    const fileNameLower = file.name.toLowerCase();
    if (!allowedExtensions.some((ext) => fileNameLower.endsWith(ext))) {
      setErrorMessage("Only .xlsx or .csv files are allowed.");
      e.target.value = null;
      return;
    }

    const maxSizeBytes = 10 * 1024 * 1024; // 10 MB
    if (file.size > maxSizeBytes) {
      setErrorMessage("File size must be under 10 MB.");
      e.target.value = null;
      return;
    }

    setSelectedFile(file);
  };

  // 2) When “Upload” is clicked, get a presigned URL and PUT to S3
  const handleUploadClick = async () => {
    if (!selectedFile) {
      setErrorMessage("Please select a file first.");
      return;
    }
    setErrorMessage(null);
    setStatusMessage(null);
    setIsUploading(true);

    try {
      // 2.1) Request a presigned URL from our backend
      const apiBase = import.meta.env.VITE_API_BASE_URL;
      const presignResponse = await axios.post(
        `${apiBase}/financial-data/upload-url`,
        {
          fileName: selectedFile.name,
          fileType: selectedFile.type,
        },
        {
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        }
      );

      const { uploadUrl, key } = presignResponse.data;

      // 2.2) Upload directly to S3 using the presigned URL
      await axios.put(uploadUrl, selectedFile, {
        headers: {
          "Content-Type": selectedFile.type,
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          setUploadProgress(percentCompleted);
        },
      });

      // 2.3) Show success
      setStatusMessage(`Upload successful! Key: ${key}`);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = null;
    } catch (err) {
      console.error("Upload error:", err);
      setErrorMessage(
        err.response?.data?.message || "Upload failed. Please try again."
      );
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      {/* ───────── Glass‐Effect Topbar ───────── */}
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          backgroundColor: "rgba(255, 255, 255, 0.6)",
          backdropFilter: "blur(10px)",
          borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
        }}
      >
        <Toolbar>
          {/* Left: “Upload File” title */}
          <Typography
            variant="h6"
            component="div"
            sx={{ flexGrow: 1, fontWeight: 600, color: "text.primary" }}
          >
            Upload File
          </Typography>

          {/* Right: Logout button */}
          <LogoutButton variant="outlined" onClick={logout} size="small">
            Logout
          </LogoutButton>
        </Toolbar>
      </AppBar>

      {/* ───────── File Upload Form ───────── */}
      <Box sx={{ maxWidth: 600, mx: "auto", mt: 4, p: 2 }}>
        <Paper elevation={2} sx={{ p: 3 }}>
          <Typography variant="h5" gutterBottom>
            Upload Quarterly Financial File
          </Typography>

          {/* Error Alert */}
          {errorMessage && (
            <Alert
              severity="error"
              sx={{ mb: 2 }}
              onClose={() => setErrorMessage(null)}
            >
              {errorMessage}
            </Alert>
          )}

          {/* Success Alert */}
          {statusMessage && (
            <Alert
              severity="success"
              sx={{ mb: 2 }}
              onClose={() => setStatusMessage(null)}
            >
              {statusMessage}
            </Alert>
          )}

          {/* File Picker Button */}
          <Button
            variant="contained"
            component="label"
            disabled={isUploading}
          >
            Select File
            <input
              type="file"
              accept=".xlsx, .csv"
              hidden
              ref={fileInputRef}
              onChange={handleFileChange}
            />
          </Button>

          {/* Display the selected file name */}
          {selectedFile && (
            <Typography variant="body2" sx={{ mt: 1, mb: 1 }}>
              Selected: <strong>{selectedFile.name}</strong>
            </Typography>
          )}

          {/* Upload Button */}
          <Button
            variant="contained"
            color="primary"
            sx={{ ml: 2 }}
            disabled={!selectedFile || isUploading}
            onClick={handleUploadClick}
          >
            {isUploading ? "Uploading…" : "Upload"}
          </Button>

          {/* Progress Bar */}
          {isUploading && (
            <Box sx={{ mt: 2 }}>
              <LinearProgress
                variant="determinate"
                value={uploadProgress}
              />
              <Typography
                variant="body2"
                align="center"
                sx={{ mt: 0.5 }}
              >
                {uploadProgress}%
              </Typography>
            </Box>
          )}
        </Paper>
      </Box>
    </Box>
  );
}
