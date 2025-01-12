import React, { useState } from 'react';
import { Box, Button, ButtonGroup, Typography, Divider, TextField, InputAdornment } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import PeopleIcon from '@mui/icons-material/People';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import { useAppSelector } from '../../store/hooks';
import { RootState } from '../../store/store';

interface RightSidebarProps {
    onPresenceClick: () => void;
    onSearchClick: () => void;
    showPresence?: boolean;
    showSearch?: boolean;
    channelId?: string;
}

const RightSidebar: React.FC<RightSidebarProps> = ({ 
    onPresenceClick, 
    onSearchClick,
    showPresence = false,
    showSearch = false,
    channelId
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const messages = useAppSelector((state: RootState) => state.messages.messages);
    
    // Filter messages based on search query
    const searchResults = messages.filter(message => 
        message.content.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Simulated users - replace with real data later
    const onlineUsers = [1, 2, 3].map(i => ({ id: `online-${i}`, name: `Online User ${i}` }));
    const offlineUsers = [1, 2, 3].map(i => ({ id: `offline-${i}`, name: `Offline User ${i}` }));

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
                    onClick={onPresenceClick}
                    startIcon={<PeopleIcon />}
                    color={showPresence ? "primary" : "inherit"}
                >
                    Presence
                </Button>
                <Button 
                    onClick={onSearchClick}
                    startIcon={<SearchIcon />}
                    color={showSearch ? "primary" : "inherit"}
                >
                    Search
                </Button>
            </ButtonGroup>

            {showSearch && (
                <Box sx={{ 
                    display: 'flex',
                    flexDirection: 'column',
                    flex: 1,
                    overflow: 'hidden'
                }}>
                    <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
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
                        />
                    </Box>
                    <Box sx={{ 
                        flex: 1,
                        overflowY: 'auto',
                        '&::-webkit-scrollbar': {
                            width: '4px',
                        },
                        '&::-webkit-scrollbar-track': {
                            background: 'transparent',
                        },
                        '&::-webkit-scrollbar-thumb': {
                            background: 'rgba(0, 0, 0, 0.1)',
                            borderRadius: '4px',
                        }
                    }}>
                        {searchQuery && searchResults.map((message) => (
                            <Box 
                                key={message.id}
                                sx={{ 
                                    p: 2,
                                    borderBottom: 1,
                                    borderColor: 'divider',
                                    '&:hover': {
                                        backgroundColor: 'action.hover'
                                    }
                                }}
                            >
                                <Typography variant="subtitle2" color="text.secondary">
                                    {message.user?.full_name || 'Unknown User'}
                                </Typography>
                                <Typography variant="body2" 
                                    sx={{ 
                                        mt: 0.5,
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        display: '-webkit-box',
                                        WebkitLineClamp: 3,
                                        WebkitBoxOrient: 'vertical',
                                    }}
                                >
                                    {message.content}
                                </Typography>
                            </Box>
                        ))}
                        {searchQuery && searchResults.length === 0 && (
                            <Box sx={{ p: 2 }}>
                                <Typography color="text.secondary" align="center">
                                    No messages found
                                </Typography>
                            </Box>
                        )}
                    </Box>
                </Box>
            )}

            {showPresence && (
                <Box sx={{ 
                    flex: 1, 
                    display: 'flex', 
                    flexDirection: 'column',
                    overflow: 'hidden'
                }}>
                    {/* Online Users Section */}
                    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                        <Typography variant="subtitle2" sx={{ p: 2, pb: 1 }}>
                            Online Users
                        </Typography>
                        <Box sx={{ 
                            overflowY: 'auto',
                            px: 2,
                            '&::-webkit-scrollbar': {
                                width: '4px',
                            },
                            '&::-webkit-scrollbar-track': {
                                background: 'transparent',
                            },
                            '&::-webkit-scrollbar-thumb': {
                                background: 'rgba(0, 0, 0, 0.1)',
                                borderRadius: '4px',
                            }
                        }}>
                            {onlineUsers.map((user) => (
                                <Box 
                                    key={user.id}
                                    sx={{ 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        gap: 1,
                                        py: 1
                                    }}
                                >
                                    <FiberManualRecordIcon 
                                        sx={{ 
                                            fontSize: 12, 
                                            color: 'success.main'
                                        }} 
                                    />
                                    <Typography>{user.name}</Typography>
                                </Box>
                            ))}
                        </Box>
                    </Box>

                    <Divider sx={{ my: 2 }} />

                    {/* Offline Users Section */}
                    <Box sx={{ 
                        display: 'flex', 
                        flexDirection: 'column',
                        flex: 1,
                        minHeight: 0
                    }}>
                        <Typography variant="subtitle2" sx={{ px: 2, pb: 1 }}>
                            Offline Users
                        </Typography>
                        <Box sx={{ 
                            flex: 1,
                            overflowY: 'auto',
                            px: 2,
                            '&::-webkit-scrollbar': {
                                width: '4px',
                            },
                            '&::-webkit-scrollbar-track': {
                                background: 'transparent',
                            },
                            '&::-webkit-scrollbar-thumb': {
                                background: 'rgba(0, 0, 0, 0.1)',
                                borderRadius: '4px',
                            }
                        }}>
                            {offlineUsers.map((user) => (
                                <Box 
                                    key={user.id}
                                    sx={{ 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        gap: 1,
                                        py: 1
                                    }}
                                >
                                    <FiberManualRecordIcon 
                                        sx={{ 
                                            fontSize: 12, 
                                            color: 'text.disabled'
                                        }} 
                                    />
                                    <Typography color="text.secondary">
                                        {user.name}
                                    </Typography>
                                </Box>
                            ))}
                        </Box>
                    </Box>
                </Box>
            )}
        </Box>
    );
};

export default RightSidebar; 