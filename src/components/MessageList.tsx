import React from 'react';
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
  useTheme
} from '@mui/material';
import {
  MoreVert as MoreIcon,
  Edit as EditIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import { Message, User, MessageListProps } from '../types';

const MessageList: React.FC<MessageListProps> = ({ 
  messages, 
  currentUser, 
  onEditMessage, 
  onDeleteMessage 
}) => {
  const [menuAnchor, setMenuAnchor] = React.useState<null | HTMLElement>(null);
  const [editingMessage, setEditingMessage] = React.useState<Message | null>(null);
  const [editContent, setEditContent] = React.useState('');
  const [selectedMessage, setSelectedMessage] = React.useState<Message | null>(null);
  const theme = useTheme();

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, message: Message) => {
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

  const handleDeleteClick = () => {
    if (selectedMessage && window.confirm('Are you sure you want to delete this message?')) {
      onDeleteMessage(selectedMessage.id);
      handleMenuClose();
    }
  };

  const handleEditSubmit = () => {
    if (editingMessage && editContent.trim()) {
      onEditMessage(editingMessage.id, editContent.trim());
      setEditingMessage(null);
      setEditContent('');
    }
  };

  const canModifyMessage = (message: Message): boolean => {
    return message.sender.id === currentUser.id;
  };

  const formatTime = (timestamp: string): string => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <>
      <List sx={{ 
        flexGrow: 1, 
        overflow: 'auto', 
        p: 2,
        bgcolor: 'background.default'
      }}>
        {messages.map((message) => (
          <ListItem 
            key={message.id} 
            alignItems="flex-start"
            sx={{
              mb: 1,
              bgcolor: 'background.paper',
              borderRadius: 2,
              boxShadow: 1
            }}
          >
            <ListItemText
              primary={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                  <Typography
                    variant="subtitle2"
                    color={message.sender.id === currentUser.id ? 'primary' : 'text.primary'}
                    fontWeight="bold"
                  >
                    {message.sender.username}
                  </Typography>
                  
                  {message.messageType === 'PRIVATE' && (
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
                      color="default" 
                      variant="outlined"
                    />
                  )}
                  
                  <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
                    {formatTime(message.timestamp)}
                  </Typography>

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
              secondary={
                <Typography 
                  variant="body1" 
                  sx={{ 
                    mt: 0.5,
                    color: message.isDeleted ? 'text.disabled' : 'text.primary',
                    fontStyle: message.isDeleted ? 'italic' : 'normal'
                  }}
                >
                  {message.content}
                </Typography>
              }
            />
          </ListItem>
        ))}
        
        {messages.length === 0 && (
          <Box sx={{ textAlign: 'center', mt: 4 }}>
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
        <MenuItem onClick={handleDeleteClick}>
          <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
          Delete
        </MenuItem>
      </Menu>

      {/* Edit Dialog */}
      <Dialog open={Boolean(editingMessage)} onClose={() => setEditingMessage(null)}>
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