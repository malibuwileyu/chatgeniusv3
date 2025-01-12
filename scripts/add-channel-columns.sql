-- Add last_message_at column if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'channels' 
        AND column_name = 'last_message_at'
    ) THEN
        ALTER TABLE channels 
        ADD COLUMN last_message_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- Add user_ids column if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'channels' 
        AND column_name = 'user_ids'
    ) THEN
        ALTER TABLE channels 
        ADD COLUMN user_ids UUID[] DEFAULT '{}'::UUID[];
    END IF;
END $$; 