-- Enable RLS
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their messages" ON messages;
DROP POLICY IF EXISTS "Users can insert messages" ON messages;
DROP POLICY IF EXISTS "Users can update their messages" ON messages;
DROP POLICY IF EXISTS "Users can delete their messages" ON messages;

-- Policy for viewing messages
CREATE POLICY "Users can view their messages"
ON messages
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM channel_members cm
        WHERE cm.channel_id = messages.channel_id
        AND cm.user_id = auth.uid()
    )
);

-- Policy for inserting messages
CREATE POLICY "Users can insert messages"
ON messages
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM channel_members cm
        WHERE cm.channel_id = channel_id
        AND cm.user_id = auth.uid()
    )
    AND auth.uid() = user_id
);

-- Policy for updating messages
CREATE POLICY "Users can update their messages"
ON messages
FOR UPDATE
USING (
    auth.uid() = user_id
);

-- Policy for deleting messages
CREATE POLICY "Users can delete their messages"
ON messages
FOR DELETE
USING (
    auth.uid() = user_id
); 