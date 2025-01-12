import React from 'react';
import { Box, Typography } from '@mui/material';

const Welcome: React.FC = () => {
    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h4" gutterBottom align="center">
                Welcome to ChatGenius
            </Typography>
            <Typography variant="body1" align="center">
                Start chatting by selecting a channel from the sidebar.
            </Typography>
        </Box>
    );
};

export default Welcome; 