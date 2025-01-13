-- Drop all policies first
DROP POLICY IF EXISTS "Users can view their messages" ON messages;
DROP POLICY IF EXISTS "Users can insert messages" ON messages;
DROP POLICY IF EXISTS "Users can update their messages" ON messages;
DROP POLICY IF EXISTS "Users can delete their messages" ON messages;
DROP POLICY IF EXISTS "Users can view their DM messages" ON messages;
DROP POLICY IF EXISTS "Users can view non-DM messages" ON messages;
DROP POLICY IF EXISTS "Users can insert messages to their channels" ON messages;
DROP POLICY IF EXISTS "Users can delete their own messages" ON messages;
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON messages;

-- Disable RLS on all tables
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE channel_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE channels DISABLE ROW LEVEL SECURITY;
ALTER TABLE presence DISABLE ROW LEVEL SECURITY;
ALTER TABLE attachments DISABLE ROW LEVEL SECURITY;
ALTER TABLE reactions DISABLE ROW LEVEL SECURITY;

-- Grant all privileges to authenticated users
GRANT ALL ON messages TO authenticated;
GRANT ALL ON channel_members TO authenticated;
GRANT ALL ON channels TO authenticated;
GRANT ALL ON presence TO authenticated;
GRANT ALL ON attachments TO authenticated;
GRANT ALL ON reactions TO authenticated; 