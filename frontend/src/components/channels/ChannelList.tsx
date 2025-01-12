import React, { useState } from 'react';
import { List, ListItem, ListItemButton, ListItemText, IconButton, Box, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '../../store/hooks';
import { RootState } from '../../store/store';
import CreateChannelDialog from './CreateChannelDialog';

const ChannelList = () => {
    const navigate = useNavigate();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const channels = useAppSelector((state: RootState) => state.channels.channels);

    return (
        <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2, py: 1 }}>
                <Typography variant="subtitle2" color="text.secondary">
                    CHANNELS
                </Typography>
                <IconButton size="small" onClick={() => setIsDialogOpen(true)}>
                    <AddIcon fontSize="small" />
                </IconButton>
            </Box>
            <List>
                {channels.map((channel) => (
                    <ListItem key={channel.id} disablePadding>
                        <ListItemButton onClick={() => navigate(`/channels/${channel.id}`)}>
                            <ListItemText primary={channel.name} />
                        </ListItemButton>
                    </ListItem>
                ))}
            </List>
            <CreateChannelDialog 
                open={isDialogOpen}
                onClose={() => setIsDialogOpen(false)}
            />
        </Box>
    );
};

export default ChannelList; 