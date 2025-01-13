-- Create presence table
CREATE TABLE IF NOT EXISTS presence (
    user_id UUID REFERENCES users(id) PRIMARY KEY,
    status TEXT NOT NULL DEFAULT 'offline',
    custom_status TEXT,
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_typing JSONB DEFAULT '{}',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE presence ENABLE ROW LEVEL SECURITY;

-- Allow users to see all presence data
CREATE POLICY "Users can view all presence data"
ON presence FOR SELECT
TO authenticated
USING (true);

-- Allow users to update their own presence
CREATE POLICY "Users can update their own presence"
ON presence FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create function to update last_seen
CREATE OR REPLACE FUNCTION update_presence_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updating timestamp
CREATE TRIGGER update_presence_timestamp
    BEFORE UPDATE ON presence
    FOR EACH ROW
    EXECUTE FUNCTION update_presence_timestamp();

-- Create function to handle typing indicators
CREATE OR REPLACE FUNCTION update_typing_status(
    user_uuid UUID,
    channel_uuid UUID,
    is_typing BOOLEAN
)
RETURNS void AS $$
BEGIN
    -- Insert or update the presence record
    INSERT INTO presence (user_id, is_typing)
    VALUES (
        user_uuid,
        jsonb_build_object(channel_uuid::text, is_typing)
    )
    ON CONFLICT (user_id) DO UPDATE
    SET is_typing = presence.is_typing || 
                   jsonb_build_object(channel_uuid::text, is_typing),
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql; 