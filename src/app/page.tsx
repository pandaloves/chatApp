"use client";

import { useState, useEffect } from "react";
import { Container } from "@mui/material";
import LoginForm from "../components/LoginForm";
import ChatRoom from "../components/ChatRoom";
import { userAPI } from "../services/api";
import type { User } from "../types";

/* -------------------------------------------------------- */

export default function HomePage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem("chatUser");
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const handleLogin = async (username: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await userAPI.login(username, password);
      const userData = response.data;
      setUser(userData);
      localStorage.setItem("chatUser", JSON.stringify(userData));
    } catch (error: any) {
      const errorMessage = "Wrong username or password. Please try again.";
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (username: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await userAPI.register(username, password);
      const userData = response.data;
      setUser(userData);
      localStorage.setItem("chatUser", JSON.stringify(userData));
    } catch (error: any) {
      const errorMessage =
        "Username already exists. Please choose a different one.";
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    if (user) {
      try {
        await userAPI.logout(user.id);
      } catch (error) {
        console.error("Logout error:", error);
      }
      localStorage.removeItem("chatUser");
      setUser(null);
      setError(null);
    }
  };

  const clearError = () => {
    setError(null);
  };

  if (user) {
    return <ChatRoom user={user} onLogout={handleLogout} />;
  }

  return (
    <Container maxWidth="xl" sx={{ height: "100vh", p: 0 }}>
      <LoginForm
        onLogin={handleLogin}
        onRegister={handleRegister}
        loading={loading}
      />
    </Container>
  );
}
