-- Enable RLS on messages table
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies
DROP POLICY IF EXISTS "Users can view their DM messages" ON messages;
DROP POLICY IF EXISTS "Users can view non-DM messages" ON messages;

-- Policy for DM messages - only participants can view
CREATE POLICY "Users can view their DM messages"
ON messages
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM channels c
        WHERE c.id = messages.channel_id
        AND c.type = 'dm'
        AND auth.uid() = ANY(c.user_ids)
    )
);

-- Policy for non-DM messages (temporary, will be replaced later with channel-specific policies)
CREATE POLICY "Users can view non-DM messages"
ON messages
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM channels c
        WHERE c.id = messages.channel_id
        AND c.type != 'dm'
    )
);

-- Policy for inserting messages
CREATE POLICY "Users can insert messages to their channels"
ON messages
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM channels c
        WHERE c.id = channel_id
        AND (
            (c.type = 'dm' AND auth.uid() = ANY(c.user_ids))
            OR c.type != 'dm'
        )
    )
);

-- Policy for deleting messages
CREATE POLICY "Users can delete their own messages"
ON messages
FOR DELETE
USING (
    auth.uid() = user_id
);