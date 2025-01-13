-- Function to update typing status
CREATE OR REPLACE FUNCTION update_typing_status(channel_id uuid, is_typing boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update the is_typing field in the presence table
  UPDATE presence 
  SET is_typing = jsonb_set(
    COALESCE(is_typing, '{}'::jsonb),
    array[channel_id::text],
    to_jsonb(is_typing)
  )
  WHERE user_id = auth.uid();
END;
$$; 