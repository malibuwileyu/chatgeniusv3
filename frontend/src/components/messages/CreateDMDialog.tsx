import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    List,
    ListItem,
    ListItemText,
    ListItemAvatar,
    Avatar,
    Box,
    Radio,
    Typography,
    ListItemButton
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import { useAppSelector } from '../../store/hooks';
import { RootState } from '../../store/store';

interface CreateDMDialogProps {
    open: boolean;
    onClose: () => void;
}

interface User {
    id: string;
    username: string;
    full_name: string;
    avatar_url?: string;
}

const CreateDMDialog: React.FC<CreateDMDialogProps> = ({ open, onClose }) => {
    const navigate = useNavigate();
    const [users, setUsers] = useState<User[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const currentUser = useAppSelector((state: RootState) => state.auth.user);

    useEffect(() => {
        const fetchUsers = async () => {
            const { data, error } = await supabase
                .from('users')
                .select('id, username, full_name, avatar_url')
                .neq('id', currentUser?.id) // Exclude current user
                .order('username');

            if (error) {
                console.error('Error fetching users:', error);
                return;
            }

            setUsers(data || []);
        };

        if (open) {
            fetchUsers();
        }
    }, [open, currentUser?.id]);

    const filteredUsers = users.filter(user =>
        user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.full_name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleCreateDM = async () => {
        if (!selectedUserId || !currentUser) return;

        setIsSubmitting(true);
        try {
            // Check if DM channel already exists
            const { data: existingChannels, error: fetchError } = await supabase
                .from('channels')
                .select('id')
                .eq('type', 'dm')
                .contains('user_ids', [currentUser.id, selectedUserId]);

            if (fetchError) throw fetchError;

            let channelId;

            if (existingChannels && existingChannels.length > 0) {
                // DM exists, move it to top (we'll handle this in the channels slice)
                channelId = existingChannels[0].id;
            } else {
                // Create new DM channel
                const { data: newChannel, error: createError } = await supabase
                    .from('channels')
                    .insert({
                        type: 'dm',
                        user_ids: [currentUser.id, selectedUserId],
                        name: `DM:${currentUser.id}:${selectedUserId}`, // We'll display actual usernames in UI
                        created_by: currentUser.id
                    })
                    .select()
                    .single();

                if (createError) throw createError;
                channelId = newChannel.id;

                // Add both users as members
                const memberPromises = [
                    supabase
                        .from('channel_members')
                        .insert({ channel_id: channelId, user_id: currentUser.id, role: 'member' }),
                    supabase
                        .from('channel_members')
                        .insert({ channel_id: channelId, user_id: selectedUserId, role: 'member' })
                ];

                const results = await Promise.all(memberPromises);
                const errors = results.filter(r => r.error).map(r => r.error);
                if (errors.length > 0) throw errors[0];
            }

            onClose();
            // Navigate to the DM channel
            navigate(`/channels/${channelId}`);
        } catch (error) {
            console.error('Error creating/accessing DM:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>Create Direct Message</DialogTitle>
            <DialogContent>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
                    <TextField
                        autoFocus
                        label="Search Users"
                        fullWidth
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        size="small"
                    />
                    <List sx={{ maxHeight: 300, overflow: 'auto' }}>
                        {filteredUsers.map((user) => (
                            <ListItem
                                key={user.id}
                                disablePadding
                                sx={{
                                    borderRadius: 1,
                                    mb: 0.5
                                }}
                            >
                                <ListItemButton onClick={() => setSelectedUserId(user.id)}>
                                    <Radio
                                        checked={selectedUserId === user.id}
                                        onChange={() => setSelectedUserId(user.id)}
                                    />
                                    <ListItemAvatar>
                                        <Avatar src={user.avatar_url}>
                                            {user.full_name.charAt(0)}
                                        </Avatar>
                                    </ListItemAvatar>
                                    <ListItemText
                                        primary={user.full_name}
                                        secondary={`@${user.username}`}
                                    />
                                </ListItemButton>
                            </ListItem>
                        ))}
                        {filteredUsers.length === 0 && (
                            <Typography color="text.secondary" align="center">
                                No users found
                            </Typography>
                        )}
                    </List>
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button
                    onClick={handleCreateDM}
                    disabled={!selectedUserId || isSubmitting}
                    variant="contained"
                >
                    Create DM
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default CreateDMDialog; 