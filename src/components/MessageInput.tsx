import  { useState } from 'react';
import { 
  Box, 
  TextField, 
  IconButton, 
  Fab,
  Tooltip
} from '@mui/material';
import { 
  Send as SendIcon,
  Person as PersonIcon
} from '@mui/icons-material';

interface MessageInputProps {
  onSendMessage: (content: string, receiver?: number | null) => void;
  onPrivateMessageClick?: () => void;
}

const MessageInput: React.FC<MessageInputProps> = ({ 
  onSendMessage, 
  onPrivateMessageClick 
}) => {
  const [message, setMessage] = useState<string>('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      onSendMessage(message.trim());
      setMessage('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <Box 
      component="form" 
      onSubmit={handleSubmit} 
      sx={{ 
        p: 2, 
        borderTop: 1, 
        borderColor: 'divider',
        bgcolor: 'background.paper'
      }}
    >
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
        {onPrivateMessageClick && (
          <Tooltip title="Start private conversation">
            <Fab
              color="secondary"
              size="small"
              onClick={onPrivateMessageClick}
              sx={{ flexShrink: 0 }}
            >
              <PersonIcon />
            </Fab>
          </Tooltip>
        )}
        
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Type a message..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          multiline
          maxRows={4}
          size="small"
        />
        
        <IconButton 
          type="submit" 
          color="primary" 
          disabled={!message.trim()}
          sx={{ flexShrink: 0 }}
        >
          <SendIcon />
        </IconButton>
      </Box>
    </Box>
  );
};

export default MessageInput;