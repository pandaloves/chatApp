"use client";

import React, { useState, useEffect } from "react";
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Tabs,
  Tab,
  CircularProgress,
} from "@mui/material";
import { useId } from "react";

interface LoginFormProps {
  onLogin: (username: string, password: string) => Promise<void>;
  onRegister: (username: string, password: string) => Promise<void>;
  loading?: boolean;
}

export default function LoginForm({
  onLogin,
  onRegister,
  loading = false,
}: LoginFormProps) {
  const [activeTab, setActiveTab] = useState(0);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isClient, setIsClient] = useState(false);

  // Generate stable IDs
  const usernameId = useId();
  const passwordId = useId();
  const confirmPasswordId = useId();

  // Ensure this only runs on client
  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (activeTab === 0) {
      // Login
      await onLogin(username, password);
    } else {
      // Register
      if (password !== confirmPassword) {
        alert("Passwords don't match");
        return;
      }
      await onRegister(username, password);
    }
  };

  // Don't render on server to avoid hydration mismatch
  if (!isClient) {
    return (
      <Paper elevation={3} sx={{ p: 4, maxWidth: 400, mx: "auto", mt: 4 }}>
        <Typography variant="h5" component="h1" align="center" gutterBottom>
          Chat App
        </Typography>
        <Box sx={{ textAlign: "center" }}>
          <CircularProgress />
        </Box>
      </Paper>
    );
  }

  return (
    <Paper elevation={3} sx={{ p: 4, maxWidth: 400, mx: "auto", mt: 4 }}>
      <Typography variant="h5" component="h1" align="center" gutterBottom>
        Chat App
      </Typography>

      <Tabs
        value={activeTab}
        onChange={(_, newValue) => setActiveTab(newValue)}
        centered
      >
        <Tab label="Login" />
        <Tab label="Register" />
      </Tabs>

      <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
        <TextField
          fullWidth
          label="Username"
          variant="outlined"
          margin="normal"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          id={usernameId}
          disabled={loading}
        />

        <TextField
          fullWidth
          label="Password"
          type="password"
          variant="outlined"
          margin="normal"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          id={passwordId}
          disabled={loading}
        />

        {activeTab === 1 && (
          <TextField
            fullWidth
            label="Confirm Password"
            type="password"
            variant="outlined"
            margin="normal"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            id={confirmPasswordId}
            disabled={loading}
          />
        )}

        <Button
          type="submit"
          fullWidth
          variant="contained"
          sx={{ mt: 3, mb: 2 }}
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} /> : null}
        >
          {loading ? "Processing..." : activeTab === 0 ? "Login" : "Register"}
        </Button>
      </Box>
    </Paper>
  );
}
