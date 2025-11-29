import React from "react";
import {
  List,
  ListItem,
  ListItemText,
  Typography,
  Box,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  useTheme,
} from "@mui/material";
import {
  MoreVert as MoreIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from "@mui/icons-material";
import { Message, User, MessageListProps } from "../types";

/* -------------------------------------------------------- */

const MessageList: React.FC<MessageListProps> = ({
  messages,
  currentUser,
  onEditMessage,
}) => {
  const [menuAnchor, setMenuAnchor] = React.useState<null | HTMLElement>(null);
  const [editingMessage, setEditingMessage] = React.useState<Message | null>(
    null
  );
  const [editContent, setEditContent] = React.useState("");
  const [selectedMessage, setSelectedMessage] = React.useState<Message | null>(
    null
  );
  const theme = useTheme();

  // Remove duplicate messages based on ID
  const uniqueMessages = React.useMemo(() => {
    const seen = new Set();
    return messages.filter((message) => {
      if (seen.has(message.id)) {
        console.warn("Duplicate message ID found and removed:", message.id);
        return false;
      }
      seen.add(message.id);
      return true;
    });
  }, [messages]);

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

  const handleEditSubmit = () => {
    if (editingMessage && editContent.trim()) {
      onEditMessage(editingMessage.id, editContent.trim());
      setEditingMessage(null);
      setEditContent("");
    }
  };

  // Safe sender username - always use the stored username
  const getSafeSenderUsername = (message: Message): string => {
    return message.senderUsername || message.sender?.username || "Unknown User";
  };

  // Safe comparison with fallback
  const canModifyMessage = (message: Message): boolean => {
    return message.senderId === currentUser.id;
  };

  const formatTime = (timestamp: string): string => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Filter out invalid messages
  const validMessages = uniqueMessages.filter((message) => {
    const isValid = message && message.id && message.content !== undefined;
    if (!isValid) {
      console.warn("Invalid message found:", message);
    }
    return isValid;
  });

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
        {validMessages.map((message) => {
          const senderUsername = getSafeSenderUsername(message);
          const isCurrentUser = message.senderId === currentUser.id;

          return (
            <ListItem
              key={message.id}
              sx={{
                mb: 1,
                bgcolor: "background.paper",
                borderRadius: 2,
                boxShadow: 1,
                alignItems: isCurrentUser ? "flex-end" : "flex-start",
                justifyContent: isCurrentUser ? "flex-end" : "flex-start",
              }}
            >
              <ListItemText
                primary={
                  <Box
                    component="div"
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      mb: 0.5,
                    }}
                  >
                    {!isCurrentUser && (
                      <Typography
                        variant="subtitle2"
                        component="span"
                        color="text.primary"
                        fontWeight="bold"
                      >
                        {senderUsername}
                      </Typography>
                    )}

                    {message.messageType === "PRIVATE" && (
                      <Chip
                        label="Private"
                        size="small"
                        color="secondary"
                        variant="outlined"
                      />
                    )}

                    {message.lastEdited && (
                      <Chip
                        label="Edited"
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                    )}

                    <Typography
                      variant="caption"
                      component="span"
                      color="text.secondary"
                      sx={{ ml: "auto" }}
                    >
                      {formatTime(message.timestamp)}
                    </Typography>

                    {isCurrentUser && (
                      <Typography
                        variant="subtitle2"
                        component="span"
                        color="primary"
                        fontWeight="bold"
                      >
                        {senderUsername}
                      </Typography>
                    )}

                    {canModifyMessage(message) && (
                      <IconButton
                        size="small"
                        onClick={(e) => handleMenuOpen(e, message)}
                      >
                        <MoreIcon fontSize="small" />
                      </IconButton>
                    )}
                  </Box>
                }
                secondaryTypographyProps={{ component: "div" }}
                secondary={
                  <Box
                    component="div"
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: isCurrentUser ? "flex-end" : "flex-start",
                    }}
                  >
                    <Typography
                      variant="body1"
                      component="div"
                      sx={{
                        mt: 0.5,
                        p: 1.5,
                        borderRadius: 2,
                        bgcolor: isCurrentUser ? "primary.light" : "grey.100",
                        color: isCurrentUser
                          ? "primary.contrastText"
                          : "text.primary",
                        maxWidth: "70%",
                        fontStyle: "normal",
                      }}
                    >
                      {message.content}
                    </Typography>
                  </Box>
                }
              />
            </ListItem>
          );
        })}

        {validMessages.length === 0 && (
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
        <MenuItem onClick={handleEditClick}>
          <EditIcon fontSize="small" sx={{ mr: 1 }} />
          Edit
        </MenuItem>
      </Menu>

      {/* Edit Dialog */}
      <Dialog
        open={Boolean(editingMessage)}
        onClose={() => setEditingMessage(null)}
      >
        <DialogTitle>Edit Message</DialogTitle>
        <DialogContent>
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
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditingMessage(null)}>Cancel</Button>
          <Button onClick={handleEditSubmit} variant="contained">
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default MessageList;
