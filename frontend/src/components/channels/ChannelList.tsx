import React from 'react';
import {
    List,
    ListItem,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Typography,
    Box,
    Divider,
    IconButton,
    Drawer,
    useTheme,
    useMediaQuery,
    CircularProgress,
    Alert
} from '@mui/material';
import {
    Tag as TagIcon,
    Lock as LockIcon,
    Add as AddIcon
} from '@mui/icons-material';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { RootState } from '../../store/store';
import useChannels from '../../hooks/useChannels';

interface ChannelListProps {
    mobileOpen: boolean;
    handleDrawerToggle: () => void;
    drawerWidth?: number;
}

const ChannelList: React.FC<ChannelListProps> = ({
    mobileOpen,
    handleDrawerToggle,
    drawerWidth = 240
}) => {
    const theme = useTheme();
    const navigate = useNavigate();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const { channels, loading, error } = useSelector((state: RootState) => state.channels);

    // Initialize channel fetching
    useChannels();

    const handleChannelClick = (channelId: string) => {
        console.log('Channel clicked:', channelId);
        navigate(`/channels/${channelId}`);
        if (isMobile) {
            handleDrawerToggle();
        }
    };

    const channelList = loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
            <CircularProgress size={24} />
        </Box>
    ) : error ? (
        <Box sx={{ p: 2 }}>
            <Alert severity="error" sx={{ mb: 2 }}>
                Error loading channels
            </Alert>
            <Typography variant="body2" color="text.secondary">
                {error}
            </Typography>
        </Box>
    ) : channels.length === 0 ? (
        <ListItem>
            <ListItemText 
                primary="No channels yet" 
                secondary="Channels will appear here" 
                sx={{ textAlign: 'center', color: 'text.secondary' }}
            />
        </ListItem>
    ) : (
        channels.map((channel) => (
            <ListItem key={channel.id} disablePadding>
                <ListItemButton onClick={() => handleChannelClick(channel.id)}>
                    <ListItemIcon>
                        {channel.type === 'private' ? <LockIcon /> : <TagIcon />}
                    </ListItemIcon>
                    <ListItemText primary={channel.name} />
                </ListItemButton>
            </ListItem>
        ))
    );

    const drawer = (
        <Box sx={{ overflow: 'auto' }}>
            <Box sx={{ 
                p: 2, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between'
            }}>
                <Typography variant="h6" noWrap component="div">
                    Channels
                </Typography>
                <IconButton size="small">
                    <AddIcon />
                </IconButton>
            </Box>
            <Divider />
            <List>
                {channelList}
            </List>
        </Box>
    );

    return (
        <Box
            component="nav"
            sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
        >
            {/* Mobile drawer */}
            <Drawer
                variant="temporary"
                open={mobileOpen}
                onClose={handleDrawerToggle}
                ModalProps={{
                    keepMounted: true, // Better mobile performance
                }}
                sx={{
                    display: { xs: 'block', sm: 'none' },
                    '& .MuiDrawer-paper': { 
                        boxSizing: 'border-box', 
                        width: drawerWidth,
                        backgroundColor: 'background.paper'
                    },
                }}
            >
                {drawer}
            </Drawer>
            {/* Desktop drawer */}
            <Drawer
                variant="permanent"
                sx={{
                    display: { xs: 'none', sm: 'block' },
                    '& .MuiDrawer-paper': { 
                        boxSizing: 'border-box', 
                        width: drawerWidth,
                        backgroundColor: 'background.paper',
                        borderRight: `1px solid ${theme.palette.divider}`
                    },
                }}
                open
            >
                {drawer}
            </Drawer>
        </Box>
    );
};

export default ChannelList; 