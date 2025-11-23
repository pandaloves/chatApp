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

  const showSnackbar = (
    message: string,
    severity: "info" | "error" | "warning" | "success" = "info"
  ) => {
    setSnackbar({ open: true, message, severity });
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Load initial data
    loadUsers();
    loadMessageHistory();

    // Setup WebSocket
    WebSocketService.connect(user.id, handleNewMessage, (error) => {
      console.error("WebSocket error:", error);
      showSnackbar("Connection error", "error");
    });

    // Set up interval to refresh online users
    const interval = setInterval(() => {
      loadOnlineUsers();
    }, 10000);

    return () => {
      WebSocketService.disconnect();
      clearInterval(interval);
    };
  }, [user.id]);

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
      setOnlineUsers(response.data);
    } catch (error) {
      console.error("Error loading online users:", error);
    }
  };

  const removeDuplicates = (messages: Message[]): Message[] => {
    const seen = new Set<string>();
    return messages
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      .filter((msg) => {
        // Use a more comprehensive key to identify duplicates
        const key = `${msg.senderId}-${msg.receiverId || "public"}-${msg.content}-${new Date(msg.timestamp).getTime()}`;
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
    const foundUser = users.find(u => u.id === userId) || onlineUsers.find(u => u.id === userId);
    return foundUser?.username || `User${userId}`;
  };

  const handleNewMessage = (message: ChatMessageDTO) => {
  setMessages(prev => {
    if (message.type === 'MESSAGE_EDIT') {
      return prev.map(m =>
        m.id === message.id
          ? { ...m, content: message.content, lastEdited: message.lastEdited }
          : m
      );
    }
    if (message.type === 'MESSAGE_DELETE') {
      return prev.map(m =>
        m.id === message.id ? { ...m, isDeleted: true, content: "This message was deleted" } : m
      );
    }

    const newMessage: Message = {
      id: message.id || Date.now(),
      content: message.content,
      senderId: parseInt(message.sender),
      senderUsername: message.senderUsername || getUsernameById(parseInt(message.sender)),
      receiverId: message.receiver ? parseInt(message.receiver) : null,
      receiverUsername: message.receiverUsername || (message.receiver ? getUsernameById(parseInt(message.receiver)) : null),
      messageType: message.type as 'PUBLIC' | 'PRIVATE',
      timestamp: message.timestamp || new Date().toISOString(),
      lastEdited: message.lastEdited || null,
      isDeleted: message.isDeleted || false
    };

    // Append logic (private/public as you already have)
    return [...prev, newMessage];
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

  const handleEditMessage = (messageId: number, newContent: string ) => {
  console.log('Attempting to edit message:', { messageId, newContent, userId: user.id });
  
  // Find the message to edit
  const messageToEdit = messages.find(m => m.id === messageId);
  if (messageToEdit) {
    console.log('Found message to edit:', messageToEdit);
    
    // Update locally immediately for better UX
    setMessages(prev => prev.map(msg => 
      msg.id === messageId 
        ? { ...msg, content: newContent, lastEdited: new Date().toISOString() }
        : msg
    ));
    
    // Send via WebSocket
    WebSocketService.editMessage(messageId, user.id, newContent);
    showSnackbar("Message edited successfully", "success");

    return Promise.resolve();
  } else {
    console.error('Message not found for editing:', messageId);
    showSnackbar("Message not found", "error");
  }
};

  const handleDeleteMessage = (messageId: number) => {
    // Find the message to delete
    const messageToDelete = messages.find(m => m.id === messageId);
    if (messageToDelete) {
      // Update locally immediately for better UX
      setMessages(prev => prev.map(msg => 
        msg.id === messageId 
          ? { ...msg, isDeleted: true, content: "This message was deleted" }
          : msg
      ));
      
      // Send via WebSocket
      WebSocketService.deleteMessage(messageId, user.id);
      showSnackbar("Message deleted successfully", "success");
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
      // Create temporary message for immediate UI update
      const tempMessage: Message = {
        id: Date.now(), // Temporary ID
        content: content,
        senderId: user.id,
        senderUsername: user.username,
        receiverId: selectedUser.id,
        receiverUsername: selectedUser.username,
        messageType: 'PRIVATE',
        timestamp: new Date().toISOString(),
        lastEdited: null,
        isDeleted: false
      };

      // Add to messages immediately
      setMessages(prev => {
        // Prevent duplicates
        if (prev.find(m => 
          m.id === tempMessage.id || 
          (m.content === tempMessage.content && 
           m.senderId === tempMessage.senderId && 
           m.receiverId === tempMessage.receiverId)
        )) return prev;
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
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Chat App - {user.username}
          </Typography>
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
            onDeleteMessage={handleDeleteMessage}
            showEditDeleteForPrivate={true} // Enable edit/delete for private messages
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