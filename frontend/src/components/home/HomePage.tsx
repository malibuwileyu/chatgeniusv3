import React, { useState } from 'react';
import {
    AppBar,
    Box,
    Toolbar,
    Typography,
    Button,
    Container,
    Avatar,
    IconButton
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import { useNavigate } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import ChannelList from '../channels/ChannelList';

const DRAWER_WIDTH = 240;

const HomePage = () => {
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const [mobileOpen, setMobileOpen] = useState(false);

    const handleDrawerToggle = () => {
        setMobileOpen(!mobileOpen);
    };

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    return (
        <Box sx={{ display: 'flex' }}>
            <AppBar 
                position="fixed" 
                sx={{ 
                    width: { sm: `calc(100% - ${DRAWER_WIDTH}px)` },
                    ml: { sm: `${DRAWER_WIDTH}px` }
                }}
            >
                <Container maxWidth={false}>
                    <Toolbar disableGutters>
                        <IconButton
                            color="inherit"
                            aria-label="open drawer"
                            edge="start"
                            onClick={handleDrawerToggle}
                            sx={{ mr: 2, display: { sm: 'none' } }}
                        >
                            <MenuIcon />
                        </IconButton>
                        <Typography
                            variant="h6"
                            component="div"
                            sx={{ flexGrow: 1 }}
                        >
                            ChatGenius
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Typography variant="body1">
                                {user?.email}
                            </Typography>
                            <Avatar sx={{ bgcolor: 'secondary.main' }}>
                                {user?.email?.charAt(0).toUpperCase()}
                            </Avatar>
                            <Button color="inherit" onClick={handleLogout}>
                                Logout
                            </Button>
                        </Box>
                    </Toolbar>
                </Container>
            </AppBar>

            <ChannelList 
                mobileOpen={mobileOpen}
                handleDrawerToggle={handleDrawerToggle}
                drawerWidth={DRAWER_WIDTH}
            />

            <Box
                component="main"
                sx={{
                    flexGrow: 1,
                    p: 3,
                    width: { sm: `calc(100% - ${DRAWER_WIDTH}px)` },
                    mt: 8
                }}
            >
                <Typography variant="h4" gutterBottom align="center">
                    Welcome to ChatGenius
                </Typography>
                <Typography variant="body1" align="center">
                    Start chatting by selecting a channel from the sidebar.
                </Typography>
            </Box>
        </Box>
    );
};

export default HomePage; 