import React from "react";
import {
  List,
  ListItem,
  ListItemText,
  Typography,
  Box,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  CircularProgress,
} from "@mui/material";
import {
  MoreVert as MoreIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from "@mui/icons-material";
import { Message, User, MessageListProps } from "../types";

const MessageList: React.FC<MessageListProps> = ({
  messages,
  currentUser,
  onEditMessage,
  onDeleteMessage,
  showEditDeleteForPrivate = false,
}) => {
  const [menuAnchor, setMenuAnchor] = React.useState<null | HTMLElement>(null);
  const [editingMessage, setEditingMessage] = React.useState<Message | null>(
    null
  );
  const [editContent, setEditContent] = React.useState("");
  const [selectedMessage, setSelectedMessage] = React.useState<Message | null>(
    null
  );
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleMenuOpen = (
    event: React.MouseEvent<HTMLElement>,
    message: Message
  ) => {
    setMenuAnchor(event.currentTarget);
    setSelectedMessage(message);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
    setSelectedMessage(null);
  };

  const handleEditClick = () => {
    if (selectedMessage) {
      setEditingMessage(selectedMessage);
      setEditContent(selectedMessage.content);
      handleMenuClose();
    }
  };

  const handleDeleteClick = async () => {
    if (
      selectedMessage &&
      window.confirm("Are you sure you want to delete this message?")
    ) {
      setIsSubmitting(true);
      try {
        await onDeleteMessage(selectedMessage.id);
        handleMenuClose();
      } catch (error) {
        console.error("Error deleting message:", error);
        alert("Failed to delete message. Please try again.");
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleEditSubmit = async () => {
    if (editingMessage && editContent.trim()) {
      setIsSubmitting(true);
      try {
        await onEditMessage(editingMessage.id, editContent.trim());
        setEditingMessage(null);
        setEditContent("");
      } catch (error) {
        console.error("Error editing message:", error);
        alert("Failed to edit message. Please try again.");
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const canModifyMessage = (message: Message): boolean => {
    if (message.messageType === "PRIVATE" && !showEditDeleteForPrivate) {
      return false;
    }
    return message.senderId === currentUser.id && !message.isDeleted;
  };

  const formatTime = (timestamp: string): string => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Get display name for sender
  const getSenderDisplayName = (message: Message): string => {
    // Use senderUsername if available, otherwise fallback
    if (message.senderUsername) {
      return message.senderId === currentUser.id
        ? "You"
        : message.senderUsername;
    }
    // Fallback if username is missing
    return message.senderId === currentUser.id
      ? "You"
      : `User ${message.senderId}`;
  };

  // Get display name for receiver
  const getReceiverDisplayName = (message: Message): string => {
    // Use receiverUsername if available, otherwise fallback
    if (message.receiverUsername) {
      return message.receiverId === currentUser.id
        ? "You"
        : message.receiverUsername;
    }
    // Fallback if username is missing
    return message.receiverId === currentUser.id
      ? "You"
      : `User ${message.receiverId}`;
  };

  const renderMessageHeader = (message: Message) => {
    if (message.messageType === "PUBLIC") {
      return (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
          <Typography
            variant="subtitle2"
            color={
              message.senderId === currentUser.id ? "primary" : "text.primary"
            }
            fontWeight="bold"
          >
            {getSenderDisplayName(message)}
          </Typography>

          {message.lastEdited && (
            <Typography
              variant="caption"
              color="text.secondary"
              fontStyle="italic"
            >
              (edited)
            </Typography>
          )}

          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ ml: "auto" }}
          >
            {formatTime(message.timestamp)}
          </Typography>

          {canModifyMessage(message) && (
            <IconButton
              size="small"
              onClick={(e) => handleMenuOpen(e, message)}
              disabled={isSubmitting}
            >
              <MoreIcon fontSize="small" />
            </IconButton>
          )}
        </Box>
      );
    } else {
      return (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <Typography
              variant="subtitle2"
              color={
                message.senderId === currentUser.id ? "primary" : "secondary"
              }
              fontWeight="bold"
            >
              {getSenderDisplayName(message)}
            </Typography>

            <Typography variant="caption" color="text.secondary">
              to
            </Typography>

            <Typography
              variant="subtitle2"
              color={
                message.receiverId === currentUser.id ? "primary" : "secondary"
              }
              fontWeight="bold"
            >
              {getReceiverDisplayName(message)}
            </Typography>
          </Box>

          {message.lastEdited && (
            <Typography
              variant="caption"
              color="text.secondary"
              fontStyle="italic"
            >
              (edited)
            </Typography>
          )}

          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ ml: "auto" }}
          >
            {formatTime(message.timestamp)}
          </Typography>

          {canModifyMessage(message) && (
            <IconButton
              size="small"
              onClick={(e) => handleMenuOpen(e, message)}
              disabled={isSubmitting}
            >
              <MoreIcon fontSize="small" />
            </IconButton>
          )}
        </Box>
      );
    }
  };

  const renderMessageContent = (message: Message) => {
    if (message.isDeleted) {
      return (
        <Typography
          variant="body1"
          sx={{
            mt: 0.5,
            color: "text.disabled",
            fontStyle: "italic",
          }}
        >
          This message was deleted
        </Typography>
      );
    }

    return (
      <Typography
        variant="body1"
        sx={{
          mt: 0.5,
          color: "text.primary",
          wordBreak: "break-word",
        }}
      >
        {message.content}
      </Typography>
    );
  };

  return (
    <>
      <List
        sx={{
          flexGrow: 1,
          overflow: "auto",
          p: 2,
          bgcolor: "background.default",
        }}
      >
        {messages.map((message) => (
          <ListItem
            key={message.id}
            alignItems="flex-start"
            sx={{
              mb: 1,
              bgcolor: "background.paper",
              borderRadius: 2,
              boxShadow: 1,
              border: message.messageType === "PRIVATE" ? "1px solid" : "none",
              borderColor:
                message.messageType === "PRIVATE"
                  ? "secondary.light"
                  : "transparent",
            }}
          >
            <ListItemText
              primary={renderMessageHeader(message)}
              secondary={renderMessageContent(message)}
            />
          </ListItem>
        ))}

        {messages.length === 0 && (
          <Box sx={{ textAlign: "center", mt: 4 }}>
            <Typography variant="h6" color="text.secondary">
              No messages yet
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Start a conversation by sending a message!
            </Typography>
          </Box>
        )}
      </List>

      {/* Context Menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleEditClick} disabled={isSubmitting}>
          <EditIcon fontSize="small" sx={{ mr: 1 }} />
          Edit
        </MenuItem>
        <MenuItem onClick={handleDeleteClick} disabled={isSubmitting}>
          <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
          Delete
        </MenuItem>
      </Menu>

      {/* Edit Dialog */}
      <Dialog
        open={Boolean(editingMessage)}
        onClose={() => !isSubmitting && setEditingMessage(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Edit{" "}
          {editingMessage?.messageType === "PRIVATE" ? "Private" : "Public"}{" "}
          Message
        </DialogTitle>
        <DialogContent>
          {editingMessage?.messageType === "PRIVATE" &&
            editingMessage.receiverUsername && (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                To: {getReceiverDisplayName(editingMessage)}
              </Typography>
            )}
          <TextField
            autoFocus
            margin="dense"
            label="Message"
            fullWidth
            variant="outlined"
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            multiline
            rows={3}
            disabled={isSubmitting}
            onKeyPress={(e) => {
              if (
                e.key === "Enter" &&
                (e.ctrlKey || e.metaKey) &&
                !isSubmitting
              ) {
                handleEditSubmit();
              }
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setEditingMessage(null)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleEditSubmit}
            variant="contained"
            disabled={!editContent.trim() || isSubmitting}
            startIcon={isSubmitting ? <CircularProgress size={16} /> : null}
          >
            {isSubmitting ? "Saving..." : "Save Changes"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default MessageList;
