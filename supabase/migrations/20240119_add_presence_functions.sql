-- Function to update presence
CREATE OR REPLACE FUNCTION update_presence(
    user_uuid UUID,
    status TEXT DEFAULT 'online',
    last_seen TIMESTAMPTZ DEFAULT NOW()
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO presence (user_id, status, last_seen)
    VALUES (user_uuid, status, last_seen)
    ON CONFLICT (user_id) 
    DO UPDATE SET 
        status = EXCLUDED.status,
        last_seen = EXCLUDED.last_seen;
END;
$$;

-- Function to update typing status
CREATE OR REPLACE FUNCTION update_typing_status(
    channel_uuid UUID,
    is_typing BOOLEAN,
    user_uuid UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    typing_data jsonb;
BEGIN
    -- Get current typing data for the user
    SELECT is_typing::jsonb INTO typing_data 
    FROM presence 
    WHERE user_id = user_uuid;

    -- Initialize typing_data if null
    IF typing_data IS NULL THEN
        typing_data := '{}'::jsonb;
    END IF;

    -- Update typing status for the channel
    IF is_typing THEN
        typing_data := jsonb_set(
            typing_data,
            array[channel_uuid::text],
            'true'::jsonb
        );
    ELSE
        typing_data := typing_data - channel_uuid::text;
    END IF;

    -- Update presence record
    UPDATE presence 
    SET is_typing = typing_data,
        last_seen = NOW()
    WHERE user_id = user_uuid;
END;
$$;