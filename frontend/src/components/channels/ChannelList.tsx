import React, { useState, useEffect } from 'react';
import { List, ListItem, ListItemButton, ListItemText, ListItemIcon, IconButton, Box, Typography, Drawer, Button, Avatar } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import TagIcon from '@mui/icons-material/Tag';
import LockIcon from '@mui/icons-material/Lock';
import SearchIcon from '@mui/icons-material/Search';
import PersonIcon from '@mui/icons-material/Person';
import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '../../store/hooks';
import { RootState } from '../../store/store';
import CreateChannelDialog from './CreateChannelDialog';
import CreateDMDialog from '../messages/CreateDMDialog';
import useChannels from '../../hooks/useChannels';
import { supabase } from '../../services/supabase';

interface ChannelListProps {
    mobileOpen: boolean;
    handleDrawerToggle: () => void;
    drawerWidth: number;
}

const ChannelList = ({ mobileOpen, handleDrawerToggle, drawerWidth }: ChannelListProps) => {
    const navigate = useNavigate();
    const [isChannelDialogOpen, setIsChannelDialogOpen] = useState(false);
    const [isDMDialogOpen, setIsDMDialogOpen] = useState(false);
    const channels = useAppSelector((state: RootState) => state.channels.channels);
    const currentUser = useAppSelector((state: RootState) => state.auth.user);
    const [dmUsers, setDmUsers] = useState<Record<string, any>>({});

    // Initialize channel fetching
    useChannels();

    // Filter channels into regular and DM channels
    const regularChannels = channels.filter(channel => channel.type !== 'dm');
    const dmChannels = channels.filter(channel => channel.type === 'dm');

    // Fetch DM users' info
    useEffect(() => {
        const fetchDMUsers = async () => {
            const userIds = new Set<string>();
            dmChannels.forEach(channel => {
                if (channel.user_ids) {
                    channel.user_ids.forEach((id: string) => {
                        if (id !== currentUser?.id) {
                            userIds.add(id);
                        }
                    });
                }
            });

            if (userIds.size === 0) return;

            const { data: users, error } = await supabase
                .from('users')
                .select('id, username, full_name, avatar_url')
                .in('id', Array.from(userIds));

            if (error) {
                console.error('Error fetching DM users:', error);
                return;
            }

            const userMap = (users || []).reduce((acc, user) => {
                acc[user.id] = user;
                return acc;
            }, {} as Record<string, any>);

            setDmUsers(userMap);
        };

        fetchDMUsers();
    }, [dmChannels, currentUser?.id]);

    const handleChannelClick = (channelId: string) => {
        navigate(`/channels/${channelId}`);
        if (window.innerWidth < 600) { // Close drawer on mobile
            handleDrawerToggle();
        }
    };

    const getDMChannelName = (channel: any) => {
        if (!channel.user_ids || !currentUser) return 'Unknown User';
        const otherUserId = channel.user_ids.find((id: string) => id !== currentUser.id);
        const otherUser = dmUsers[otherUserId];
        return otherUser ? otherUser.full_name : 'Unknown User';
    };

    const drawer = (
        <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2, py: 1 }}>
                <Typography variant="h6" color="text.primary">
                    CHANNELS
                </Typography>
                <IconButton size="small" onClick={() => setIsChannelDialogOpen(true)}>
                    <AddIcon fontSize="small" />
                </IconButton>
            </Box>
            <List>
                {regularChannels.map((channel) => (
                    <ListItem key={channel.id} disablePadding>
                        <ListItemButton onClick={() => handleChannelClick(channel.id)}>
                            <ListItemIcon sx={{ minWidth: 36 }}>
                                {channel.type === 'private' ? <LockIcon fontSize="small" /> : <TagIcon fontSize="small" />}
                            </ListItemIcon>
                            <ListItemText primary={channel.name} />
                        </ListItemButton>
                    </ListItem>
                ))}
            </List>
            <Box sx={{ px: 2, mt: 2 }}>
                <Button
                    startIcon={<SearchIcon />}
                    variant="text"
                    fullWidth
                    sx={{ justifyContent: 'flex-start', color: 'text.secondary' }}
                >
                    Browse Channels
                </Button>
            </Box>
            <Box sx={{ mt: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2 }}>
                    <Typography variant="h6" color="text.primary">
                        DIRECT MESSAGES
                    </Typography>
                    <IconButton size="small" onClick={() => setIsDMDialogOpen(true)}>
                        <AddIcon fontSize="small" />
                    </IconButton>
                </Box>
                <List>
                    {dmChannels.map((channel) => {
                        const otherUserId = channel.user_ids?.find((id: string) => id !== currentUser?.id);
                        const otherUser = otherUserId ? dmUsers[otherUserId] : null;
                        return (
                            <ListItem key={channel.id} disablePadding>
                                <ListItemButton onClick={() => handleChannelClick(channel.id)}>
                                    <ListItemIcon sx={{ minWidth: 36 }}>
                                        <Avatar 
                                            sx={{ width: 24, height: 24 }}
                                            src={otherUser?.avatar_url}
                                        >
                                            {otherUser?.full_name?.[0] || <PersonIcon fontSize="small" />}
                                        </Avatar>
                                    </ListItemIcon>
                                    <ListItemText 
                                        primary={getDMChannelName(channel)}
                                    />
                                </ListItemButton>
                            </ListItem>
                        );
                    })}
                </List>
            </Box>
            <CreateChannelDialog 
                open={isChannelDialogOpen}
                onClose={() => setIsChannelDialogOpen(false)}
            />
            <CreateDMDialog
                open={isDMDialogOpen}
                onClose={() => setIsDMDialogOpen(false)}
            />
        </Box>
    );

    return (
        <Box component="nav" sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}>
            <Drawer
                variant="temporary"
                open={mobileOpen}
                onClose={handleDrawerToggle}
                ModalProps={{ keepMounted: true }}
                sx={{
                    display: { xs: 'block', sm: 'none' },
                    '& .MuiDrawer-paper': { width: drawerWidth }
                }}
            >
                {drawer}
            </Drawer>
            <Drawer
                variant="permanent"
                sx={{
                    display: { xs: 'none', sm: 'block' },
                    '& .MuiDrawer-paper': { width: drawerWidth }
                }}
                open
            >
                {drawer}
            </Drawer>
        </Box>
    );
};

export default ChannelList; 