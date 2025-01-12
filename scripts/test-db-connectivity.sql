-- Test Database Connectivity Script
-- Run each section separately and verify the results

-- 1. Test Basic Connectivity
SELECT current_database(), current_user, version();

-- 2. Test Users Table
INSERT INTO users (id, email, username, full_name, status, password_hash)
VALUES 
    ('123e4567-e89b-12d3-a456-426614174001', 'test@example.com', 'testuser', 'Test User', 'ONLINE', 'dummy_hash');
    ('873421dd-6fcb-42c4-ba40-6f27d1ea532d', 'test@example.com', 'testuser2', 'Test User 2', 'ONLINE', 'dummy_hash');
    ('615c7f18-369b-4aa2-8900-2ba28e5c5db6', 'test@example.com', 'testuser3', 'Test User 3', 'ONLINE', 'dummy_hash');

SELECT * FROM users WHERE email = 'test@example.com';

-- 3. Test Channels Table
INSERT INTO channels (id, name, description, type)
VALUES 
    ('223e4567-e89b-12d3-a456-426614174002', 'test-channel', 'Test Channel', 'PUBLIC');

SELECT * FROM channels WHERE name = 'test-channel';

-- 4. Test Channel Membership
INSERT INTO channel_members (channel_id, user_id)
VALUES 
    ('223e4567-e89b-12d3-a456-426614174002', '123e4567-e89b-12d3-a456-426614174001');

SELECT u.username, c.name 
FROM channel_members cm
JOIN users u ON u.id = cm.user_id
JOIN channels c ON c.id = cm.channel_id;

-- 5. Test Messages Table
INSERT INTO messages (id, channel_id, user_id, content, type)
VALUES 
    ('323e4567-e89b-12d3-a456-426614174003', 
     '223e4567-e89b-12d3-a456-426614174002',
     '123e4567-e89b-12d3-a456-426614174001',
     'Test message', 'TEXT');

SELECT m.content, u.username, c.name
FROM messages m
JOIN users u ON u.id = m.user_id
JOIN channels c ON c.id = m.channel_id;

-- 6. Test Reactions
INSERT INTO reactions (id, message_id, user_id, emoji)
VALUES 
    ('423e4567-e89b-12d3-a456-426614174004',
     '323e4567-e89b-12d3-a456-426614174003',
     '123e4567-e89b-12d3-a456-426614174001',
     '👍');

SELECT m.content, r.emoji, u.username
FROM reactions r
JOIN messages m ON m.id = r.message_id
JOIN users u ON u.id = r.user_id;

-- 7. Test Attachments
INSERT INTO attachments (id, message_id, file_url, file_type, file_name, file_size)
VALUES 
    ('523e4567-e89b-12d3-a456-426614174005',
     '323e4567-e89b-12d3-a456-426614174003',
     'https://example.com/test.txt',
     'text/plain',
     'test.txt',
     1024);

SELECT m.content, a.file_name, a.file_type
FROM attachments a
JOIN messages m ON m.id = a.message_id;

-- 8. Cleanup Test Data
DELETE FROM reactions WHERE message_id = '323e4567-e89b-12d3-a456-426614174003';
DELETE FROM attachments WHERE message_id = '323e4567-e89b-12d3-a456-426614174003';
DELETE FROM messages WHERE channel_id = '223e4567-e89b-12d3-a456-426614174002';
DELETE FROM channel_members WHERE channel_id = '223e4567-e89b-12d3-a456-426614174002';
DELETE FROM channels WHERE id = '223e4567-e89b-12d3-a456-426614174002';
DELETE FROM users WHERE id = '123e4567-e89b-12d3-a456-426614174001';
``` 