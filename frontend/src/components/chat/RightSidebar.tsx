import React, { useState, useEffect } from 'react';
import { Box, Button, ButtonGroup, Typography, Avatar, List, ListItem, ListItemAvatar, ListItemText, TextField, InputAdornment } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import PeopleIcon from '@mui/icons-material/People';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import { useAppSelector } from '../../store/hooks';
import { RootState } from '../../store/store';

interface RightSidebarProps {
    onPresenceClick: () => void;
    onSearchClick: () => void;
}

// Dummy data for presence
const onlineUsers = [
    { id: 1, name: 'Alice Johnson', avatar: 'A', lastSeen: 'Active now' },
    { id: 2, name: 'Bob Smith', avatar: 'B', lastSeen: 'Active now' },
    { id: 3, name: 'Carol White', avatar: 'C', lastSeen: 'Active now' }
];

const offlineUsers = [
    { id: 4, name: 'David Brown', avatar: 'D', lastSeen: '2 hours ago' },
    { id: 5, name: 'Eve Wilson', avatar: 'E', lastSeen: '5 hours ago' },
    { id: 6, name: 'Frank Miller', avatar: 'F', lastSeen: '1 day ago' }
];

const RightSidebar = ({ onPresenceClick, onSearchClick }: RightSidebarProps) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [showSearch, setShowSearch] = useState(false);
    const [showPresence, setShowPresence] = useState(true);
    const messages = useAppSelector((state: RootState) => state.messages.messages);
    
    const filteredMessages = searchQuery.trim() ? messages.filter(message => 
        message.content.toLowerCase().includes(searchQuery.toLowerCase())
    ) : [];

    const handlePresenceClick = () => {
        setShowPresence(true);
        setShowSearch(false);
        onPresenceClick();
    };

    const handleSearchClick = () => {
        setShowPresence(false);
        setShowSearch(true);
        onSearchClick();
    };

    return (
        <Box
            sx={{
                width: 300,
                height: '100%',
                borderLeft: 1,
                borderColor: 'divider',
                backgroundColor: 'background.paper',
                display: 'flex',
                flexDirection: 'column'
            }}
        >
            <ButtonGroup 
                variant="outlined" 
                sx={{ 
                    width: '100%',
                    '& .MuiButton-root': {
                        flex: 1,
                        py: 1.5
                    }
                }}
            >
                <Button 
                    onClick={handlePresenceClick}
                    startIcon={<PeopleIcon />}
                    variant={showPresence ? "contained" : "outlined"}
                >
                    Presence
                </Button>
                <Button 
                    onClick={handleSearchClick}
                    startIcon={<SearchIcon />}
                    variant={showSearch ? "contained" : "outlined"}
                >
                    Search
                </Button>
            </ButtonGroup>
            <Box sx={{ flex: 1, p: 2, overflowY: 'auto' }}>
                {showSearch && (
                    <Box>
                        <TextField
                            fullWidth
                            size="small"
                            placeholder="Search messages..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon fontSize="small" />
                                    </InputAdornment>
                                ),
                            }}
                            sx={{ mb: 2 }}
                            autoFocus
                        />
                        {searchQuery.trim() && (
                            <>
                                <List>
                                    {filteredMessages.map((message) => (
                                        <ListItem 
                                            key={message.id}
                                            sx={{ 
                                                flexDirection: 'column', 
                                                alignItems: 'flex-start',
                                                bgcolor: 'background.default',
                                                borderRadius: 1,
                                                mb: 1
                                            }}
                                        >
                                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, width: '100%' }}>
                                                <ListItemAvatar>
                                                    <Avatar>{message.user?.full_name?.charAt(0) || 'U'}</Avatar>
                                                </ListItemAvatar>
                                                <ListItemText
                                                    primary={message.user?.full_name || 'Unknown User'}
                                                    secondary={new Date(message.created_at).toLocaleString()}
                                                    sx={{ m: 0 }}
                                                />
                                            </Box>
                                            <Typography 
                                                variant="body2" 
                                                sx={{ 
                                                    pl: 7,
                                                    width: '100%',
                                                    wordBreak: 'break-word'
                                                }}
                                            >
                                                {message.content}
                                            </Typography>
                                        </ListItem>
                                    ))}
                                </List>
                                {filteredMessages.length === 0 && (
                                    <Typography color="text.secondary" align="center" sx={{ mt: 2 }}>
                                        No messages found
                                    </Typography>
                                )}
                            </>
                        )}
                    </Box>
                )}
                {showPresence && (
                    <>
                        <Box>
                            <Typography variant="subtitle2" color="text.secondary" sx={{ px: 2, py: 1 }}>
                                ONLINE — {onlineUsers.length}
                            </Typography>
                            <List>
                                {onlineUsers.map(user => (
                                    <ListItem key={user.id}>
                                        <ListItemAvatar>
                                            <Avatar>{user.avatar}</Avatar>
                                        </ListItemAvatar>
                                        <ListItemText 
                                            primary={user.name}
                                            secondary={
                                                <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                    <FiberManualRecordIcon sx={{ fontSize: 10, color: 'success.main' }} />
                                                    {user.lastSeen}
                                                </Box>
                                            }
                                        />
                                    </ListItem>
                                ))}
                            </List>
                        </Box>
                        <Box sx={{ mt: 2 }}>
                            <Typography variant="subtitle2" color="text.secondary" sx={{ px: 2, py: 1 }}>
                                OFFLINE — {offlineUsers.length}
                            </Typography>
                            <List>
                                {offlineUsers.map(user => (
                                    <ListItem key={user.id}>
                                        <ListItemAvatar>
                                            <Avatar sx={{ opacity: 0.5 }}>{user.avatar}</Avatar>
                                        </ListItemAvatar>
                                        <ListItemText 
                                            primary={<Typography color="text.secondary">{user.name}</Typography>}
                                            secondary={user.lastSeen}
                                            sx={{ opacity: 0.7 }}
                                        />
                                    </ListItem>
                                ))}
                            </List>
                        </Box>
                    </>
                )}
            </Box>
        </Box>
    );
};

export default RightSidebar; 