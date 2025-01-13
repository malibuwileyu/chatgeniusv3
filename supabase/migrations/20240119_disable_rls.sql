-- Disable RLS on all tables
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE channel_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE channels DISABLE ROW LEVEL SECURITY;
ALTER TABLE presence DISABLE ROW LEVEL SECURITY;
ALTER TABLE attachments DISABLE ROW LEVEL SECURITY;
ALTER TABLE reactions DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can view their messages" ON messages;
DROP POLICY IF EXISTS "Users can insert messages" ON messages;
DROP POLICY IF EXISTS "Users can update their messages" ON messages;
DROP POLICY IF EXISTS "Users can delete their messages" ON messages;

DROP POLICY IF EXISTS "Users can view their DM messages" ON messages;
DROP POLICY IF EXISTS "Users can view non-DM messages" ON messages;
DROP POLICY IF EXISTS "Users can insert messages to their channels" ON messages;
DROP POLICY IF EXISTS "Users can delete their own messages" ON messages;

-- Allow all operations for authenticated users
ALTER TABLE messages FORCE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all operations for authenticated users" ON messages
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated'); 