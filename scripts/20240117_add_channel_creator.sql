-- Add created_by column to channels table
ALTER TABLE channels 
ADD COLUMN created_by UUID REFERENCES users(id);

-- Set all null created_by values to testuser1's UUID
UPDATE channels 
SET created_by = (
    SELECT id 
    FROM users 
    WHERE username = 'testuser1'
    LIMIT 1
)
WHERE created_by IS NULL;

-- Make created_by required for future channels
ALTER TABLE channels
ALTER COLUMN created_by SET NOT NULL; 