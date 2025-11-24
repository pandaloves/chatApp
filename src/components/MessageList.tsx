"use client";

import { useState, useEffect } from "react";
import {
  List,
  ListItem,
  Paper,
  Typography,
  Box,
  IconButton,
  Menu,
  MenuItem,
  Chip,
  useTheme,
} from "@mui/material";
import {
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from "@mui/icons-material";
import { Message, User } from "../types";

interface MessageListProps {
  messages: Message[];
  currentUser: User;
  onEditMessage: (messageId: number, newContent: string) => void;
  onDeleteMessage: (messageId: number) => void;
  showEditDeleteForPrivate?: boolean;
}

export default function MessageList({
  messages,
  currentUser,
  onEditMessage,
  onDeleteMessage,
  showEditDeleteForPrivate = true,
}: MessageListProps) {
  const [editingMessageId, setEditingMessageId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState("");
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const theme = useTheme();

  const handleEditClick = (message: Message) => {
    setSelectedMessage(message);
    setEditingMessageId(message.id);
    setEditContent(message.content);
    setAnchorEl(null);
  };

  const handleDeleteClick = (message: Message) => {
    onDeleteMessage(message.id);
    setAnchorEl(null);
    setSelectedMessage(null);
  };

  const handleEditSubmit = () => {
    if (editingMessageId && editContent.trim()) {
      onEditMessage(editingMessageId, editContent.trim());
      setEditingMessageId(null);
      setEditContent("");
      setSelectedMessage(null);
    }
  };

  const handleEditCancel = () => {
    setEditingMessageId(null);
    setEditContent("");
    setSelectedMessage(null);
  };

  const canEditDeleteMessage = (message: Message): boolean => {
    // User can only edit/delete their own messages
    if (message.senderId !== currentUser.id) return false;

    // Cannot edit/delete already deleted messages
    if (message.isDeleted) return false;

    // Check if edit/delete is allowed for private messages
    if (message.messageType === "PRIVATE" && !showEditDeleteForPrivate) {
      return false;
    }

    return true;
  };

  const formatTimestamp = (timestamp: string): string => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <List
      sx={{
        flexGrow: 1,
        overflow: "auto",
        p: 1,
        bgcolor: "background.default",
      }}
    >
      {messages.map((message) => (
        <ListItem
          key={message.id}
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems:
              message.senderId === currentUser.id ? "flex-end" : "flex-start",
            mb: 1,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", mb: 0.5 }}>
            <Typography
              variant="caption"
              sx={{
                fontWeight: "bold",
                color:
                  message.senderId === currentUser.id
                    ? theme.palette.primary.main
                    : theme.palette.text.secondary,
              }}
            >
              {message.senderUsername}
            </Typography>
            {message.messageType === "PRIVATE" && (
              <Chip
                label="Private"
                size="small"
                color="secondary"
                sx={{ ml: 1, height: 20 }}
              />
            )}
            <Typography
              variant="caption"
              sx={{ ml: 1, color: "text.secondary" }}
            >
              {formatTimestamp(message.timestamp)}
            </Typography>
            {message.lastEdited && (
              <Typography variant="caption" sx={{ ml: 1, fontStyle: "italic" }}>
                (edited)
              </Typography>
            )}
          </Box>

          <Paper
            elevation={1}
            sx={{
              p: 1.5,
              maxWidth: "70%",
              minWidth: "100px",
              bgcolor:
                message.senderId === currentUser.id
                  ? "primary.light"
                  : "grey.100",
              color:
                message.senderId === currentUser.id
                  ? "primary.contrastText"
                  : "text.primary",
              position: "relative",
              opacity: message.isDeleted ? 0.7 : 1,
            }}
          >
            {editingMessageId === message.id ? (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                <input
                  type="text"
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === "Enter") handleEditSubmit();
                    if (e.key === "Escape") handleEditCancel();
                  }}
                  style={{
                    border: "1px solid #ccc",
                    borderRadius: "4px",
                    padding: "8px",
                    fontSize: "14px",
                  }}
                  autoFocus
                />
                <Box sx={{ display: "flex", gap: 1 }}>
                  <button onClick={handleEditSubmit}>Save</button>
                  <button onClick={handleEditCancel}>Cancel</button>
                </Box>
              </Box>
            ) : (
              <Box sx={{ display: "flex", alignItems: "center" }}>
                <Typography
                  variant="body2"
                  sx={{
                    fontStyle: message.isDeleted ? "italic" : "normal",
                    color: message.isDeleted ? "text.secondary" : "inherit",
                  }}
                >
                  {message.content}
                </Typography>

                {canEditDeleteMessage(message) && (
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      setSelectedMessage(message);
                      setAnchorEl(e.currentTarget);
                    }}
                    sx={{ ml: 1 }}
                  >
                    <MoreVertIcon fontSize="small" />
                  </IconButton>
                )}
              </Box>
            )}
          </Paper>

          {message.receiverId && message.messageType === "PRIVATE" && (
            <Typography
              variant="caption"
              sx={{ mt: 0.5, color: "text.secondary" }}
            >
              To: {message.receiverUsername}
            </Typography>
          )}
        </ListItem>
      ))}

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
      >
        <MenuItem
          onClick={() => selectedMessage && handleEditClick(selectedMessage)}
        >
          <EditIcon fontSize="small" sx={{ mr: 1 }} />
          Edit
        </MenuItem>
        <MenuItem
          onClick={() => selectedMessage && handleDeleteClick(selectedMessage)}
          sx={{ color: "error.main" }}
        >
          <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
          Delete
        </MenuItem>
      </Menu>
    </List>
  );
}
