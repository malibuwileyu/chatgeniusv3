import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { useAppSelector } from '../store/hooks';
import { RootState } from '../store/store';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

interface PresenceData {
    user_id: string;
    status: 'online' | 'offline' | 'away';
    custom_status?: string;
    last_seen: Date;
    is_typing: boolean;
}

interface PresenceContextType {
    presenceData: Record<string, PresenceData>;
    typingUsers: Record<string, string[]>;
    setTyping: (channelId: string, isTyping: boolean) => Promise<void>;
    setStatus: (status: 'online' | 'offline' | 'away', customStatus?: string) => Promise<void>;
    error: Error | null;
}

const PresenceContext = createContext<PresenceContextType | undefined>(undefined);

export const PresenceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [presenceData, setPresenceData] = useState<Record<string, PresenceData>>({});
    const [typingUsers, setTypingUsers] = useState<Record<string, string[]>>({});
    const [error, setError] = useState<Error | null>(null);
    const currentUser = useAppSelector((state: RootState) => state.auth.user);

    useEffect(() => {
        if (!currentUser) return;

        // Initialize user presence
        const initializePresence = async () => {
            try {
                const { error: presenceError } = await supabase.rpc('update_presence', {
                    user_status: 'online'
                });

                if (presenceError) throw presenceError;

                // Subscribe to presence changes
                const presenceSubscription = supabase
                    .channel('presence_changes')
                    .on('postgres_changes', {
                        event: '*',
                        schema: 'public',
                        table: 'presence'
                    }, (payload: RealtimePostgresChangesPayload<PresenceData>) => {
                        const newData = payload.new as PresenceData;
                        if (newData) {
                            setPresenceData(prev => ({
                                ...prev,
                                [newData.user_id]: newData
                            }));
                        }
                    })
                    .subscribe();

                // Heartbeat to update last_seen
                const heartbeatInterval = setInterval(async () => {
                    await supabase.rpc('update_presence', {
                        user_status: 'online'
                    });
                }, 30000);

                return () => {
                    presenceSubscription.unsubscribe();
                    clearInterval(heartbeatInterval);
                };
            } catch (err) {
                setError(err as Error);
            }
        };

        initializePresence();
    }, [currentUser]);

    const setTyping = async (channelId: string, isTyping: boolean) => {
        if (!currentUser) return;
        
        try {
            const { error } = await supabase.rpc('update_typing_status', {
                channel_uuid: channelId,
                is_typing: isTyping,
                user_uuid: currentUser.id
            });

            if (error) {
                console.error('Error updating typing status:', error);
            }
        } catch (error) {
            console.error('Error updating typing status:', error);
        }
    };

    const setStatus = async (status: 'online' | 'offline' | 'away', customStatus?: string) => {
        if (!currentUser) return;

        try {
            const { error: statusError } = await supabase.rpc('update_presence', {
                user_status: status,
                custom_status: customStatus
            });

            if (statusError) throw statusError;
        } catch (err) {
            setError(err as Error);
        }
    };

    return (
        <PresenceContext.Provider value={{
            presenceData,
            typingUsers,
            setTyping,
            setStatus,
            error
        }}>
            {children}
        </PresenceContext.Provider>
    );
};

export const usePresence = (channelId?: string) => {
    const context = useContext(PresenceContext);
    if (context === undefined) {
        throw new Error('usePresence must be used within a PresenceProvider');
    }
    return context;
}; 