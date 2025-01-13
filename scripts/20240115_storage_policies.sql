-- Enable RLS
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Create a public bucket for file attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('attachments', 'attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Policy to allow anyone to download files (since bucket is public)
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'attachments');

-- Policy to allow authenticated users to upload files
CREATE POLICY "Authenticated Users Can Upload"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'attachments'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = 'channels'
);

-- Policy to allow users to update their own files
CREATE POLICY "Users Can Update Own Files"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'attachments'
    AND auth.uid()::text = (storage.foldername(name))[2]
);

-- Policy to allow users to delete their own files
CREATE POLICY "Users Can Delete Own Files"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'attachments'
    AND auth.uid()::text = (storage.foldername(name))[2]
); 