import {
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  Typography,
  Divider,
  Chip,
  Box,
} from "@mui/material";
import { Circle as CircleIcon } from "@mui/icons-material";
import type { User } from "../types";

/* ------------------------------------------------------------------------------ */

type UserListProps = {
  users: User[];
  onlineUsers: User[];
  onSelectUser: (user: User) => void;
  currentUserId?: number; // Add current user ID prop
};

const UserList: React.FC<UserListProps> = ({
  users,
  onlineUsers,
  onSelectUser,
  currentUserId,
}) => {
  // Filter out current user from online users
  const otherOnlineUsers = onlineUsers.filter(
    (user) => user.id !== currentUserId
  );

  // Filter out current user from all users for display
  const otherUsers = users.filter((user) => user.id !== currentUserId);

  const isUserOnline = (userId: number): boolean => {
    return otherOnlineUsers.some((user) => user.id === userId);
  };

  const formatDate = (dateString?: string): string => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <List sx={{ overflow: "auto" }}>
      <ListItem>
        <Typography variant="h6" color="primary" sx={{ fontWeight: "bold" }}>
          Online Users ({otherOnlineUsers.length})
        </Typography>
      </ListItem>
      <Divider />

      {otherUsers.map((user) => (
        <ListItem key={user.id} disablePadding>
          <ListItemButton onClick={() => onSelectUser(user)}>
            <ListItemText
              primary={
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Typography
                    variant="body1"
                    sx={{
                      fontWeight: isUserOnline(user.id) ? "bold" : "normal",
                      color: isUserOnline(user.id)
                        ? "success.main"
                        : "text.primary",
                    }}
                  >
                    {user.username}
                  </Typography>

                  {isUserOnline(user.id) && (
                    <Chip
                      icon={<CircleIcon sx={{ fontSize: 8 }} />}
                      label="Online"
                      color="success"
                      size="small"
                      variant="outlined"
                    />
                  )}

                  {user.isDeleted && (
                    <Chip
                      label="Deleted"
                      size="small"
                      color="default"
                      variant="outlined"
                    />
                  )}
                </Box>
              }
              secondary={
                user.createdAt && (
                  <Typography variant="caption" color="text.secondary">
                    Joined {formatDate(user.createdAt)}
                  </Typography>
                )
              }
            />
          </ListItemButton>
        </ListItem>
      ))}

      {otherUsers.length === 0 && (
        <ListItem>
          <Typography variant="body2" color="text.secondary" align="center">
            No other users found
          </Typography>
        </ListItem>
      )}
    </List>
  );
};

export default UserList;
