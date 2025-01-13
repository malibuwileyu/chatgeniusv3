-- Create presence table
CREATE TABLE IF NOT EXISTS presence (
    user_id UUID REFERENCES users(id) PRIMARY KEY,
    status TEXT NOT NULL DEFAULT 'offline',
    custom_status TEXT,
    last_seen TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    is_typing BOOLEAN NOT NULL DEFAULT false,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE presence ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view all presence data"
    ON presence FOR SELECT
    USING (true);

CREATE POLICY "Users can update their own presence"
    ON presence FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert their own presence"
    ON presence FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Function to update timestamp
CREATE OR REPLACE FUNCTION update_presence_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for timestamp updates
CREATE TRIGGER update_presence_timestamp
    BEFORE UPDATE ON presence
    FOR EACH ROW
    EXECUTE FUNCTION update_presence_timestamp();

-- Function to update typing status
CREATE OR REPLACE FUNCTION update_typing_status(user_id UUID, is_typing BOOLEAN)
RETURNS void AS $$
BEGIN
    INSERT INTO presence (user_id, is_typing, last_seen)
    VALUES (user_id, is_typing, NOW())
    ON CONFLICT (user_id)
    DO UPDATE SET
        is_typing = EXCLUDED.is_typing,
        last_seen = EXCLUDED.last_seen,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql; 