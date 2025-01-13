-- Enable RLS but make it permissive
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Create a public bucket for file attachments if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('attachments', 'attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Users Can Upload" ON storage.objects;
DROP POLICY IF EXISTS "Users Can Update Own Files" ON storage.objects;
DROP POLICY IF EXISTS "Users Can Delete Own Files" ON storage.objects;
DROP POLICY IF EXISTS "Allow All Operations" ON storage.objects;
DROP POLICY IF EXISTS "Public Storage Access" ON storage.objects;

-- Create a single permissive policy for all operations
CREATE POLICY "Allow Everything"
ON storage.objects
FOR ALL
USING (bucket_id = 'attachments')
WITH CHECK (bucket_id = 'attachments'); 