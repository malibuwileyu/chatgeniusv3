-- Drop existing policies to start fresh
DROP POLICY IF EXISTS "Users can view all presence data" ON presence;
DROP POLICY IF EXISTS "Users can update their own presence" ON presence;
DROP POLICY IF EXISTS "Users can insert their own presence" ON presence;

-- Allow all authenticated users to view presence data
CREATE POLICY "Users can view all presence data"
ON presence FOR SELECT
TO authenticated
USING (true);

-- Combined policy for insert/update (upsert) operations
CREATE POLICY "Users can manage their own presence"
ON presence
FOR ALL
TO authenticated
USING (
    CASE 
        WHEN current_user = 'authenticated' THEN 
            auth.uid()::uuid = user_id
        ELSE 
            false
    END
)
WITH CHECK (
    CASE 
        WHEN current_user = 'authenticated' THEN 
            auth.uid()::uuid = user_id
        ELSE 
            false
    END
);

-- Ensure RLS is enabled
ALTER TABLE presence ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions to authenticated users
GRANT ALL ON presence TO authenticated;

-- Add status column if not exists (to ensure complete schema)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'presence' 
        AND column_name = 'status'
    ) THEN
        ALTER TABLE presence ADD COLUMN status TEXT NOT NULL DEFAULT 'online';
    END IF;
END $$; 