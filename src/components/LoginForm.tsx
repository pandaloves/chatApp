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
  Alert,
  Snackbar,
} from "@mui/material";
import { useId } from "react";

/* ------------------------------------------------------------------------------ */

type LoginFormProps = {
  onLogin: (username: string, password: string) => Promise<void>;
  onRegister: (username: string, password: string) => Promise<void>;
  loading?: boolean;
  error?: string | null;
  clearError?: () => void;
};

export default function LoginForm({
  onLogin,
  onRegister,
  loading = false,
  error = null,
  clearError,
}: LoginFormProps) {
  const [activeTab, setActiveTab] = useState(0);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isClient, setIsClient] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState({
    username: "",
    password: "",
    confirmPassword: "",
  });

  const usernameId = useId();
  const passwordId = useId();
  const confirmPasswordId = useId();

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (error) {
      setLocalError(error);

      if (
        error.toLowerCase().includes("username") &&
        error.toLowerCase().includes("exist")
      ) {
        setFieldErrors((prev) => ({
          ...prev,
          username: "This username is already taken",
        }));
      } else if (
        error.toLowerCase().includes("invalid credentials") ||
        error.toLowerCase().includes("wrong password") ||
        error.toLowerCase().includes("user not found")
      ) {
        setFieldErrors((prev) => ({
          ...prev,
          username: "Invalid username or password",
          password: "Invalid username or password",
        }));
      }
    }
  }, [error]);

  const handleCloseError = () => {
    setLocalError(null);
    setFieldErrors({ username: "", password: "", confirmPassword: "" });
    if (clearError) {
      clearError();
    }
  };

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
    setLocalError(null);
    setFieldErrors({ username: "", password: "", confirmPassword: "" });
    if (clearError) {
      clearError();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setFieldErrors({ username: "", password: "", confirmPassword: "" });

    if (!username.trim()) {
      setFieldErrors((prev) => ({ ...prev, username: "Username is required" }));
      return;
    }

    if (!password.trim()) {
      setFieldErrors((prev) => ({ ...prev, password: "Password is required" }));
      return;
    }

    if (activeTab === 1) {
      if (password !== confirmPassword) {
        setFieldErrors((prev) => ({
          ...prev,
          confirmPassword: "Passwords don't match",
        }));
        return;
      }
      if (password.length < 3) {
        setFieldErrors((prev) => ({
          ...prev,
          password: "Password must be at least 3 characters",
        }));
        return;
      }
    }

    try {
      if (activeTab === 0) {
        await onLogin(username.trim(), password);
      } else {
        await onRegister(username.trim(), password);
      }
    } catch (err) {
      console.error("Form submission error:", err);
    }
  };

  const getErrorMessage = () => {
    if (!localError) return null;

    if (
      localError.toLowerCase().includes("invalid credentials") ||
      localError.toLowerCase().includes("wrong password") ||
      localError.toLowerCase().includes("user not found")
    ) {
      return "Invalid username or password. Please try again.";
    }

    if (
      localError.toLowerCase().includes("username") &&
      localError.toLowerCase().includes("exist")
    ) {
      return "Username already exists. Please choose a different username.";
    }

    return localError;
  };

  const getHelperText = () => {
    if (activeTab === 0 && localError) {
      return "Please check your username and password and try again.";
    }
    if (activeTab === 1 && fieldErrors.username) {
      return "This username is not available. Please choose another one.";
    }
    return "";
  };

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
    <>
      <Paper elevation={3} sx={{ p: 4, maxWidth: 400, mx: "auto", mt: 4 }}>
        <Typography variant="h5" component="h1" align="center" gutterBottom>
          Chat App
        </Typography>

        <Tabs value={activeTab} onChange={handleTabChange} centered>
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
            onChange={(e) => {
              setUsername(e.target.value);
              if (fieldErrors.username) {
                setFieldErrors((prev) => ({ ...prev, username: "" }));
              }
            }}
            required
            id={usernameId}
            disabled={loading}
            error={!!fieldErrors.username}
            helperText={
              fieldErrors.username ||
              (activeTab === 1 ? "Choose a unique username" : "")
            }
            autoComplete="username"
          />

          <TextField
            fullWidth
            label="Password"
            type="password"
            variant="outlined"
            margin="normal"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (fieldErrors.password) {
                setFieldErrors((prev) => ({ ...prev, password: "" }));
              }
            }}
            required
            id={passwordId}
            disabled={loading}
            error={!!fieldErrors.password}
            helperText={fieldErrors.password}
            autoComplete={activeTab === 0 ? "current-password" : "new-password"}
          />

          {activeTab === 1 && (
            <TextField
              fullWidth
              label="Confirm Password"
              type="password"
              variant="outlined"
              margin="normal"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                if (fieldErrors.confirmPassword) {
                  setFieldErrors((prev) => ({ ...prev, confirmPassword: "" }));
                }
              }}
              required
              id={confirmPasswordId}
              disabled={loading}
              error={!!fieldErrors.confirmPassword}
              helperText={fieldErrors.confirmPassword}
              autoComplete="new-password"
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

          {/* Help text for users */}
          {activeTab === 0 &&
            (fieldErrors.username || fieldErrors.password) && (
              <Alert severity="info" sx={{ mt: 1 }}>
                <Typography variant="body2">
                  <strong>Having trouble logging in?</strong>
                  <br />
                  • Check that your username and password are correct
                  <br />• Try registering a new account if you don't have one
                </Typography>
              </Alert>
            )}

          {activeTab === 1 && fieldErrors.username && (
            <Alert severity="info" sx={{ mt: 1 }}>
              <Typography variant="body2">
                <strong>Username already taken</strong>
                <br />
                • Please choose a different username
                <br />• Try adding numbers or special characters
              </Typography>
            </Alert>
          )}
        </Box>

        {/* General help text */}
        {activeTab === 0 && !fieldErrors.username && !fieldErrors.password && (
          <Typography
            variant="body2"
            color="text.secondary"
            align="center"
            sx={{ mt: 2 }}
          >
            First time here? Switch to the Register tab to create an account.
          </Typography>
        )}

        {activeTab === 1 && !fieldErrors.username && (
          <Typography
            variant="body2"
            color="text.secondary"
            align="center"
            sx={{ mt: 2 }}
          >
            Choose a unique username that others haven't used.
          </Typography>
        )}
      </Paper>

      {/* Global error snackbar */}
      <Snackbar
        open={!!localError}
        autoHideDuration={6000}
        onClose={handleCloseError}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert onClose={handleCloseError} severity="error" variant="filled">
          {getErrorMessage()}
        </Alert>
      </Snackbar>
    </>
  );
}
