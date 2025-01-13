import React from 'react';
import { Box, Typography, List, ListItem, ListItemText, ListItemAvatar, Avatar, IconButton } from '@mui/material';
import { Search, Close } from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';
import { usePresence, PresenceData } from '../../hooks/usePresence';

interface RightSidebarProps {
  showPresence: boolean;
  showSearch: boolean;
  channelId: string;
  onClose: () => void;
  onPresenceClick: () => void;
  onSearchClick: () => void;
}

export const RightSidebar: React.FC<RightSidebarProps> = ({ showPresence, showSearch, channelId, onClose, onPresenceClick, onSearchClick }) => {
  const { presenceData } = usePresence(channelId);

  const formatLastSeen = (lastSeen: string) => {
    try {
      return formatDistanceToNow(new Date(lastSeen), { addSuffix: true });
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Unknown';
    }
  };

  // Filter users by status
  const onlineUsers = Object.values(presenceData).filter(user => user.status === 'online');
  const awayUsers = Object.values(presenceData).filter(user => user.status === 'away');
  const offlineUsers = Object.values(presenceData).filter(user => user.status === 'offline');

  if (showPresence) {
    return (
      <Box sx={{ width: 250, height: '100%', borderLeft: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Members</Typography>
          <IconButton onClick={onClose} size="small">
            <Close />
          </IconButton>
        </Box>
        
        {/* Online Users */}
        <Box sx={{ px: 2, mb: 2 }}>
          <Typography variant="subtitle2" color="text.secondary">
            Online — {onlineUsers.length}
          </Typography>
          <List>
            {onlineUsers.map((user) => (
              <ListItem key={user.user_id}>
                <ListItemAvatar>
                  <Box position="relative">
                    <Avatar src={user.avatar_url}>
                      {user.full_name?.[0] || user.username?.[0]}
                    </Avatar>
                    <Box
                      sx={{
                        width: 12,
                        height: 12,
                        bgcolor: 'success.main',
                        borderRadius: '50%',
                        position: 'absolute',
                        bottom: 0,
                        right: 0,
                        border: 2,
                        borderColor: 'background.paper'
                      }}
                    />
                  </Box>
                </ListItemAvatar>
                <ListItemText 
                  primary={user.full_name || user.username}
                  secondary={user.username && user.full_name ? `@${user.username}` : user.custom_status || "Active now"}
                />
              </ListItem>
            ))}
          </List>
        </Box>

        {/* Away Users */}
        {awayUsers.length > 0 && (
          <Box sx={{ px: 2, mb: 2 }}>
            <Typography variant="subtitle2" color="text.secondary">
              Away — {awayUsers.length}
            </Typography>
            <List>
              {awayUsers.map((user) => (
                <ListItem key={user.user_id}>
                  <ListItemAvatar>
                    <Box position="relative">
                      <Avatar src={user.avatar_url}>
                        {user.full_name?.[0] || user.username?.[0]}
                      </Avatar>
                      <Box
                        sx={{
                          width: 12,
                          height: 12,
                          bgcolor: 'warning.main',
                          borderRadius: '50%',
                          position: 'absolute',
                          bottom: 0,
                          right: 0,
                          border: 2,
                          borderColor: 'background.paper'
                        }}
                      />
                    </Box>
                  </ListItemAvatar>
                  <ListItemText 
                    primary={user.full_name || user.username}
                    secondary={user.username && user.full_name ? `@${user.username}` : formatLastSeen(user.last_seen)}
                  />
                </ListItem>
              ))}
            </List>
          </Box>
        )}

        {/* Offline Users */}
        <Box sx={{ px: 2 }}>
          <Typography variant="subtitle2" color="text.secondary">
            Offline — {offlineUsers.length}
          </Typography>
          <List>
            {offlineUsers.map((user) => (
              <ListItem key={user.user_id}>
                <ListItemAvatar>
                  <Avatar sx={{ opacity: 0.5 }} src={user.avatar_url}>
                    {user.full_name?.[0] || user.username?.[0]}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText 
                  primary={user.full_name || user.username}
                  secondary={user.username && user.full_name ? `@${user.username}` : formatLastSeen(user.last_seen)}
                  sx={{ opacity: 0.7 }}
                />
              </ListItem>
            ))}
          </List>
        </Box>
      </Box>
    );
  }

  if (showSearch) {
    return (
      <Box sx={{ width: 250, height: '100%', borderLeft: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Search</Typography>
          <IconButton onClick={onClose} size="small">
            <Close />
          </IconButton>
        </Box>
        {/* Search content */}
      </Box>
    );
  }

  return null;
};

export default RightSidebar; 