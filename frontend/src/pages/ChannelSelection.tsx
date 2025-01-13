import React, { useState, useEffect } from 'react';
import { Box, Typography, List, ListItem, ListItemButton, ListItemIcon, ListItemText, TextField, InputAdornment, Paper, Grid } from '@mui/material';
import TagIcon from '@mui/icons-material/Tag';
import LockIcon from '@mui/icons-material/Lock';
import SearchIcon from '@mui/icons-material/Search';
import { supabase } from '../services/supabase';
import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '../store/hooks';
import JoinChannelDialog from '../components/channels/JoinChannelDialog';

export const ChannelSelection: React.FC = () => {
    const [channels, setChannels] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedChannel, setSelectedChannel] = useState<any>(null);
    const [isJoinDialogOpen, setIsJoinDialogOpen] = useState(false);
    const navigate = useNavigate();
    const currentUser = useAppSelector(state => state.auth.user);

    useEffect(() => {
        const fetchChannels = async () => {
            // Get all channels where user is not a member
            const { data: memberChannels } = await supabase
                .from('channel_members')
                .select('channel_id')
                .eq('user_id', currentUser?.id);

            const memberChannelIds = memberChannels?.map(mc => mc.channel_id) || [];

            const { data, error } = await supabase
                .from('channels')
                .select(`
                    *,
                    channel_members (count)
                `)
                .neq('type', 'dm')
                .not('id', 'in', `(${memberChannelIds.join(',')})`)
                .order('created_at', { ascending: true });

            if (error) {
                console.error('Error fetching channels:', error);
                return;
            }

            // Transform the data to include member count
            const channelsWithCount = data?.map(channel => ({
                ...channel,
                member_count: channel.channel_members?.[0]?.count || 0
            })) || [];

            setChannels(channelsWithCount);
        };

        if (currentUser?.id) {
            fetchChannels();
        }
    }, [currentUser?.id]);

    const filteredChannels = channels.filter(channel =>
        channel.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const publicChannels = filteredChannels.filter(channel => channel.type !== 'private');
    const privateChannels = filteredChannels.filter(channel => channel.type === 'private');

    const handleChannelClick = (channel: any) => {
        setSelectedChannel(channel);
        setIsJoinDialogOpen(true);
    };

    const handleJoinChannel = async (channelId: string, password?: string) => {
        // For private channels, verify password first
        const selectedChannel = channels.find(c => c.id === channelId);
        if (selectedChannel?.type === 'private') {
            // Get the channel's password from the database
            const { data, error: pwError } = await supabase
                .from('channels')
                .select('password')
                .eq('id', channelId)
                .single();

            if (pwError || !data) {
                console.error('Error verifying password:', pwError);
                return false;
            }

            if (data.password !== password) {
                return false;
            }
        }

        const { error } = await supabase
            .from('channel_members')
            .insert({
                channel_id: channelId,
                user_id: currentUser?.id,
                role: 'member'
            });

        if (error) {
            console.error('Error joining channel:', error);
            return false;
        }

        navigate(`/channels/${channelId}`);
        return true;
    };

    const ChannelList = ({ channels, title }: { channels: any[], title: string }) => (
        <Paper sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Typography variant="h6" gutterBottom color="text.secondary">
                {title}
            </Typography>
            <List sx={{ width: '80%' }}>
                {channels.map((channel) => (
                    <ListItem key={channel.id} disablePadding>
                        <ListItemButton onClick={() => handleChannelClick(channel)}>
                            <ListItemIcon>
                                {channel.type === 'private' ? <LockIcon /> : <TagIcon />}
                            </ListItemIcon>
                            <ListItemText 
                                primary={channel.name}
                                secondary={channel.description || 'No description'}
                            />
                        </ListItemButton>
                    </ListItem>
                ))}
                {channels.length === 0 && (
                    <Typography color="text.secondary" align="center" sx={{ py: 2 }}>
                        No {title.toLowerCase()} found
                    </Typography>
                )}
            </List>
        </Paper>
    );

    return (
        <Box sx={{ p: 3, maxWidth: 1800, mx: 'auto' }}>
            <Typography variant="h4" gutterBottom>
                Browse Channels
            </Typography>
            
            <TextField
                fullWidth
                size="small"
                placeholder="Search channels..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{
                    startAdornment: (
                        <InputAdornment position="start">
                            <SearchIcon />
                        </InputAdornment>
                    ),
                }}
                sx={{ mb: 3, maxWidth: 800 }}
            />

            <Grid container spacing={4}>
                <Grid item xs={12} md={6} sx={{ minWidth: 600 }}>
                    <ChannelList channels={publicChannels} title="PUBLIC CHANNELS" />
                </Grid>
                <Grid item xs={12} md={6} sx={{ minWidth: 600 }}>
                    <ChannelList channels={privateChannels} title="PRIVATE CHANNELS" />
                </Grid>
            </Grid>

            <JoinChannelDialog
                open={isJoinDialogOpen}
                onClose={() => setIsJoinDialogOpen(false)}
                channel={selectedChannel}
                onJoin={handleJoinChannel}
            />
        </Box>
    );
};

export default ChannelSelection; 