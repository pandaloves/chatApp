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
  currentUserId?: number;
};

export default function UserList({
  users,
  onlineUsers,
  onSelectUser,
  currentUserId,
}: UserListProps) {
  const otherOnlineUsers = onlineUsers.filter(
    (user) => user.id !== currentUserId && !user.isDeleted
  );

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

      {otherOnlineUsers.map((user) => (
        <ListItem key={user.id} disablePadding>
          <ListItemButton onClick={() => onSelectUser(user)}>
            <ListItemText
              primary={
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Typography
                    variant="body1"
                    sx={{
                      fontWeight: "bold",
                      color: "success.main",
                    }}
                  >
                    {user.username}
                  </Typography>

                  <Chip
                    icon={<CircleIcon sx={{ fontSize: 8 }} />}
                    label="Online"
                    color="success"
                    size="small"
                    variant="outlined"
                  />

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

      {otherOnlineUsers.length === 0 && (
        <ListItem>
          <Typography variant="body2" color="text.secondary" align="center">
            No other users online
          </Typography>
        </ListItem>
      )}
    </List>
  );
}
