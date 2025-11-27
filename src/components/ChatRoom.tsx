"use client";

import { useState, useEffect, useRef } from "react";
import {
  Box,
  Paper,
  Typography,
  AppBar,
  Toolbar,
  IconButton,
  Drawer,
  useTheme,
  useMediaQuery,
  Fab,
  Snackbar,
  Alert,
} from "@mui/material";
import {
  Menu as MenuIcon,
  Logout as LogoutIcon,
  Delete as DeleteIcon,
} from "@mui/icons-material";
import MessageList from "./MessageList";
import MessageInput from "./MessageInput";
import UserList from "./UserList";
import PrivateMessageDialog from "./PrivateMessageDialog";
import WebSocketService from "../services/websocket";
import { userAPI, messageAPI } from "../services/api";
import { User, Message, ChatMessageDTO, ChatRoomProps } from "../types";

/* ------------------------------------------------------------------------------ */

export default function ChatRoom({ user, onLogout }: ChatRoomProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<User[]>([]);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [privateMessageOpen, setPrivateMessageOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "info" as "info" | "error" | "warning" | "success",
  });
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Fixed: Added missing JSX element
  const connectionStatus = (
    <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
      Chat App - {user.username} {isConnected ? "🟢" : "🔴"}
    </Typography>
  );

  useEffect(() => {
    WebSocketService.onUserEvent((event) => {
      console.log("User event:", event);

      switch (event.type) {
        case "USER_UPDATE":
          setUsers((prev) => [
            ...prev.filter((u) => u.id !== event.payload.id),
            event.payload,
          ]);
          break;

        case "USER_ONLINE":
          setOnlineUsers((prev) => [
            ...prev.filter((u) => u.id !== event.payload.id),
            event.payload,
          ]);
          break;

        case "USER_OFFLINE":
          setOnlineUsers((prev) =>
            prev.filter((u) => u.id !== event.payload.id)
          );
          break;

        case "USER_DELETE":
          const userId = event.payload;
          setUsers((prev) => prev.filter((u) => u.id !== userId));
          setOnlineUsers((prev) => prev.filter((u) => u.id !== userId));
          break;
      }
    });
  }, []);

  useEffect(() => {
    if (!user) return;

    // Load initial data
    loadUsers();
    loadMessageHistory();

    // Setup WebSocket with connection monitoring
    WebSocketService.connect(user.id, handleNewMessage, (error) => {
      console.error("WebSocket error:", error);
      showSnackbar("Connection error", "error");
      setIsConnected(false);
    });

    // Add connection listeners
    WebSocketService.onConnect(() => {
      console.log("WebSocket connected successfully");
      setIsConnected(true);
      showSnackbar("Connected to chat", "success");
    });

    WebSocketService.onDisconnect(() => {
      console.log("WebSocket disconnected");
      setIsConnected(false);
      showSnackbar("Disconnected from chat", "warning");
    });

    // Set up interval to refresh online users
    const interval = setInterval(() => {
      loadOnlineUsers();
    }, 10000);

    // Handle beforeunload for logout
    const handleBeforeUnload = () => {
      navigator.sendBeacon(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/users/logout/${user.id}`
      );
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      WebSocketService.disconnect();
      clearInterval(interval);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [user?.id]);

  const showSnackbar = (
    message: string,
    severity: "info" | "error" | "warning" | "success" = "info"
  ) => {
    setSnackbar({ open: true, message, severity });
  };

  useEffect(() => {
    if (!user) return;

    const handleBeforeUnload = () => {
      navigator.sendBeacon(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/users/logout/${user.id}`
      );
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [user]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadUsers = async () => {
    try {
      const response = await userAPI.getAllUsers();
      setUsers(response.data);
    } catch (error) {
      console.error("Error loading users:", error);
    }
  };

  const loadOnlineUsers = async () => {
    try {
      const response = await userAPI.getOnlineUsers();
      const currentUserId = user?.id; // Fixed: use 'user' prop

      if (currentUserId) {
        const filteredOnlineUsers = response.data.filter(
          (onlineUser) => onlineUser.id !== currentUserId
        );
        setOnlineUsers(filteredOnlineUsers);
      } else {
        setOnlineUsers(response.data);
      }
    } catch (error) {
      console.error("Failed to load online users:", error);
    }
  };

  const removeDuplicates = (messages: Message[]): Message[] => {
    const seen = new Set<string>();
    return messages
      .sort(
        (a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      )
      .filter((msg) => {
        const key = `${msg.senderId}-${msg.receiverId || "public"}-${
          msg.content
        }-${new Date(msg.timestamp).getTime()}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  };

  const loadMessageHistory = async () => {
    try {
      const [publicResponse, userResponse] = await Promise.all([
        messageAPI.getPublicMessages(),
        messageAPI.getUserMessages(user.id),
      ]);

      const allMessages = [...publicResponse.data, ...userResponse.data].sort(
        (a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );

      const uniqueMessages = removeDuplicates(allMessages);
      setMessages(uniqueMessages);
    } catch (error) {
      console.error("Error loading messages:", error);
    }
  };

  // Helper function to get username by ID
  const getUsernameById = (userId: number): string => {
    const foundUser =
      users.find((u) => u.id === userId) ||
      onlineUsers.find((u) => u.id === userId);
    return foundUser?.username || `User${userId}`;
  };

  const handleNewMessage = (message: ChatMessageDTO) => {
    console.log(" New WebSocket message received:", {
      type: message.type,
      id: message.id,
      content: message.content,
      sender: message.sender,
      receiver: message.receiver,
    });

    setMessages((prev) => {
      const existingIds = new Set(prev.map((m) => m.id));

      // Handle message edits
      if (message.type === "MESSAGE_EDIT") {
        console.log(" Processing message edit for ID:", message.id);
        const updated = prev.map((m) =>
          m.id === message.id
            ? {
                ...m,
                content: message.content,
                lastEdited: new Date().toISOString(),
              }
            : m
        );
        console.log(" Message edit processed");
        return updated;
      }

      // Handle message deletions
      if (message.type === "MESSAGE_DELETE") {
        console.log(" Processing message deletion for ID:", message.id);
        const updated = prev.map((m) =>
          m.id === message.id
            ? {
                ...m,
                isDeleted: true,
                content: "[This message was deleted]",
              }
            : m
        );
        console.log(" Message deletion processed");
        return updated;
      }

      // Handle new messages (PUBLIC or PRIVATE)
      if (message.type === "PUBLIC" || message.type === "PRIVATE") {
        // Check if message already exists to prevent duplicates
        if (message.id && existingIds.has(message.id)) {
          console.log("⏩ Skipping duplicate message:", message.id);
          return prev;
        }

        const newMessage: Message = {
          id: message.id || Date.now(),
          content: message.content,
          senderId: parseInt(message.sender),
          senderUsername: message.senderUsername || `User${message.sender}`,
          receiverId: message.receiver ? parseInt(message.receiver) : null,
          receiverUsername: message.receiverUsername || null,
          messageType: message.type as "PUBLIC" | "PRIVATE",
          timestamp: message.timestamp || new Date().toISOString(),
          lastEdited: message.lastEdited || null,
        };

        console.log("➕ Adding new message:", {
          id: newMessage.id,
          type: newMessage.messageType,
          content: newMessage.content,
          sender: newMessage.senderId,
          receiver: newMessage.receiverId,
        });

        const updated = [...prev, newMessage].sort(
          (a, b) =>
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );

        console.log(" Total messages after addition:", updated.length);
        return updated;
      }

      console.log(" Unknown message type:", message.type);
      return prev;
    });
  };

  const handleSendMessage = (
    content: string,
    receiver: number | null = null
  ) => {
    if (receiver) {
      WebSocketService.sendPrivateMessage(content, user.id, receiver);
    } else {
      WebSocketService.sendPublicMessage(content, user.id);
    }
  };

  const handleEditMessage = async (messageId: number, newContent: string) => {
    console.log(" [EDIT] Attempting to edit message:", {
      messageId,
      newContent,
      userId: user.id,
      currentTime: new Date().toISOString(),
    });

    // Find the message to edit
    const messageToEdit = messages.find((m) => m.id === messageId);
    if (!messageToEdit) {
      console.error(" [EDIT] Message not found for editing:", messageId);
      showSnackbar("Message not found", "error");
      return;
    }

    console.log(" [EDIT] Found message to edit:", {
      id: messageToEdit.id,
      currentContent: messageToEdit.content,
      sender: messageToEdit.senderId,
      type: messageToEdit.messageType,
    });

    // Validate the new content
    if (!newContent || newContent.trim().length === 0) {
      console.error(" [EDIT] Empty content provided");
      showSnackbar("Message content cannot be empty", "error");
      return;
    }

    if (newContent.trim() === messageToEdit.content) {
      console.log("ℹ [EDIT] Content unchanged, skipping edit");
      showSnackbar("No changes made", "info");
      return;
    }

    try {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId
            ? {
                ...msg,
                content: newContent,
                lastEdited: new Date().toISOString(),
              }
            : msg
        )
      );

      console.log("[EDIT] Sending edit request via WebSocket service...");

      const success = await WebSocketService.editMessage(
        messageId,
        user.id,
        newContent
      );

      if (success) {
        console.log("[EDIT] Message edited successfully");
        showSnackbar("Message edited successfully", "success");
      } else {
        console.error("[EDIT] WebSocket service returned failure");
        // Revert local changes
        setMessages((prev) =>
          prev.map((msg) => (msg.id === messageId ? messageToEdit : msg))
        );
        showSnackbar("Failed to edit message", "error");
      }
    } catch (error: any) {
      console.error("[EDIT] Exception during edit:", {
        error: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });

      // Revert local changes
      setMessages((prev) =>
        prev.map((msg) => (msg.id === messageId ? messageToEdit : msg))
      );

      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.error ||
        "Failed to edit message";
      showSnackbar(errorMessage, "error");
    }
  };

  const handleDeleteAccount = async () => {
    if (
      window.confirm(
        "Are you sure you want to delete your account? This action cannot be undone."
      )
    ) {
      try {
        await userAPI.deleteUser(user.id, user.id);
        showSnackbar("Account deleted successfully", "success");
        onLogout();
      } catch (error: any) {
        showSnackbar(
          error.response?.data || "Failed to delete account",
          "error"
        );
      }
    }
  };

  const handleUserSelect = (selectedUser: User) => {
    setSelectedUser(selectedUser);
    setPrivateMessageOpen(true);
    if (isMobile) setMobileOpen(false);
  };

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handlePrivateMessageSend = (content: string) => {
    if (selectedUser) {
      const tempMessage: Message = {
        id: Number(`${Date.now()}${user.id}${selectedUser.id}`),
        content: content,
        senderId: user.id,
        senderUsername: user.username,
        receiverId: selectedUser.id,
        receiverUsername: selectedUser.username,
        messageType: "PRIVATE",
        timestamp: new Date().toISOString(),
        lastEdited: null,
      };

      // Add to messages immediately
      setMessages((prev) => {
        // Prevent duplicates
        if (
          prev.find(
            (m) =>
              m.id === tempMessage.id ||
              (m.content === tempMessage.content &&
                m.senderId === tempMessage.senderId &&
                m.receiverId === tempMessage.receiverId)
          )
        )
          return prev;
        return [...prev, tempMessage];
      });

      // Send via WebSocket
      handleSendMessage(content, selectedUser.id);
      setPrivateMessageOpen(false);
      setSelectedUser(null);

      // Scroll to show the new message
      setTimeout(scrollToBottom, 100);
    }
  };

  return (
    <Box sx={{ display: "flex", height: "100vh" }}>
      <AppBar position="fixed" sx={{ zIndex: theme.zIndex.drawer + 1 }}>
        <Toolbar>
          <IconButton
            color="inherit"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { md: "none" } }}
          >
            <MenuIcon />
          </IconButton>
          {connectionStatus} {/* Use the connection status JSX */}
          <IconButton
            color="inherit"
            onClick={handleDeleteAccount}
            title="Delete Account"
          >
            <DeleteIcon />
          </IconButton>
          <IconButton color="inherit" onClick={onLogout} title="Logout">
            <LogoutIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Drawer
        variant={isMobile ? "temporary" : "permanent"}
        open={mobileOpen}
        onClose={handleDrawerToggle}
        sx={{
          width: 280,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: {
            width: 280,
            boxSizing: "border-box",
            mt: 8,
          },
        }}
      >
        <UserList
          users={users}
          onlineUsers={onlineUsers}
          onSelectUser={handleUserSelect}
          currentUserId={user.id} // Pass current user ID to filter in UserList
        />
      </Drawer>

      <Box
        component="main"
        sx={{ flexGrow: 1, display: "flex", flexDirection: "column" }}
      >
        <Toolbar />
        <Paper
          sx={{
            flexGrow: 1,
            m: 1,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          <MessageList
            messages={messages}
            currentUser={user}
            onEditMessage={handleEditMessage}
          />
          <MessageInput onSendMessage={handleSendMessage} />
          <div ref={messagesEndRef} />
        </Paper>
      </Box>

      {!isMobile && (
        <Fab
          color="primary"
          sx={{
            position: "fixed",
            bottom: 16,
            right: 16,
            display: { md: "none" },
          }}
          onClick={handleDrawerToggle}
        >
          <MenuIcon />
        </Fab>
      )}

      <PrivateMessageDialog
        open={privateMessageOpen}
        user={selectedUser}
        onClose={() => setPrivateMessageOpen(false)}
        onSendMessage={handlePrivateMessageSend}
      />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
