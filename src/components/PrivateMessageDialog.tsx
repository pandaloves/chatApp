import { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Typography,
  Box,
} from "@mui/material";
import { Send as SendIcon } from "@mui/icons-material";
import type { User } from "../types";

type PrivateMessageDialogProps = {
  open: boolean;
  user: User | null;
  onClose: () => void;
  onSendMessage: (content: string) => void;
};

const PrivateMessageDialog: React.FC<PrivateMessageDialogProps> = ({
  open,
  user,
  onClose,
  onSendMessage,
}) => {
  const [message, setMessage] = useState<string>("");

  const handleSend = () => {
    if (message.trim() && user) {
      onSendMessage(message.trim());
      setMessage("");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClose = () => {
    setMessage("");
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        Private Message
        {user && (
          <Typography variant="body2" color="text.secondary">
            To: {user.username}
          </Typography>
        )}
      </DialogTitle>

      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          label="Private message"
          fullWidth
          variant="outlined"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          multiline
          rows={3}
          placeholder={
            user
              ? `Send a private message to ${user.username}...`
              : "Select a user to send a private message"
          }
        />
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button
          onClick={handleSend}
          variant="contained"
          disabled={!message.trim() || !user}
          startIcon={<SendIcon />}
        >
          Send
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PrivateMessageDialog;
