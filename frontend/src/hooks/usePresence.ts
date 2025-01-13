import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { useAppSelector } from '../store/hooks';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

export interface PresenceData {
  user_id: string;
  status: 'online' | 'offline' | 'away';
  last_seen: string;
  custom_status?: string;
  username?: string;
  full_name?: string;
  avatar_url?: string;
}

export const usePresence = (channelId: string) => {
  const [presenceData, setPresenceData] = useState<Record<string, PresenceData>>({});
  const [error, setError] = useState<string | null>(null);
  const currentUser = useAppSelector(state => state.auth.user);

  useEffect(() => {
    if (!currentUser?.id || !channelId) return;

    const initializePresence = async () => {
      try {
        // Fetch all channel members
        const { data: members, error: membersError } = await supabase
          .from('channel_members')
          .select('user_id')
          .eq('channel_id', channelId);

        if (membersError) throw membersError;

        // Fetch user information for all members
        const { data: users, error: usersError } = await supabase
          .from('users')
          .select('id, username, full_name, avatar_url')
          .in('id', members.map(m => m.user_id));

        if (usersError) throw usersError;

        // Create a map of user information
        const userMap = users.reduce((acc, user) => {
          acc[user.id] = user;
          return acc;
        }, {} as Record<string, any>);

        // Initialize presence records for all members
        const presencePromises = members.map(async (member) => {
          const { data, error: upsertError } = await supabase
            .from('presence')
            .upsert({
              user_id: member.user_id,
              status: member.user_id === currentUser.id ? 'online' : 'offline',
              last_seen: new Date().toISOString()
            });

          if (upsertError) throw upsertError;
          return data;
        });

        await Promise.all(presencePromises);

        // Fetch initial presence data
        const { data: presenceRecords, error: presenceError } = await supabase
          .from('presence')
          .select('*')
          .in('user_id', members.map(m => m.user_id));

        if (presenceError) throw presenceError;

        // Combine presence data with user information
        const presenceMap = presenceRecords.reduce((acc, record) => {
          const user = userMap[record.user_id];
          acc[record.user_id] = {
            ...record,
            username: user?.username,
            full_name: user?.full_name,
            avatar_url: user?.avatar_url
          };
          return acc;
        }, {} as Record<string, PresenceData>);

        setPresenceData(presenceMap);
      } catch (err: any) {
        console.error('Error initializing presence:', err);
        setError(err?.message || 'Failed to initialize presence');
      }
    };

    initializePresence();

    // Subscribe to presence changes
    const subscription = supabase
      .channel(`presence:${channelId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'presence'
      }, async (payload: RealtimePostgresChangesPayload<PresenceData>) => {
        const newData = payload.new as PresenceData;
        
        // Fetch user information for the updated presence
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('username, full_name, avatar_url')
          .eq('id', newData.user_id)
          .single();

        if (!userError && userData) {
          setPresenceData(prev => ({
            ...prev,
            [newData.user_id]: {
              ...newData,
              username: userData.username,
              full_name: userData.full_name,
              avatar_url: userData.avatar_url
            }
          }));
        }
      })
      .subscribe();

    // Update current user's last_seen every 30 seconds
    const heartbeat = setInterval(async () => {
      if (currentUser?.id) {
        await supabase
          .from('presence')
          .upsert({
            user_id: currentUser.id,
            status: 'online',
            last_seen: new Date().toISOString()
          });
      }
    }, 30000);

    return () => {
      subscription.unsubscribe();
      clearInterval(heartbeat);
      // Set user as offline when leaving
      if (currentUser?.id) {
        supabase
          .from('presence')
          .upsert({
            user_id: currentUser.id,
            status: 'offline',
            last_seen: new Date().toISOString()
          });
      }
    };
  }, [channelId, currentUser?.id]);

  return { presenceData, error };
};

export default usePresence; 