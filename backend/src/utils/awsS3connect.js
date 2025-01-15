/**
 * @file awsS3connect.js
 * @description AWS S3 utility functions for file operations in the chat application.
 * This file provides a comprehensive set of functions for interacting with AWS S3,
 * including file uploads, downloads, URL generation, and cleanup.
 * 
 * Core Functionality:
 * - S3 client initialization
 * - File upload and download
 * - Signed URL generation
 * - File availability checking
 * - File deletion
 * 
 * Features:
 * - Secure AWS credentials management
 * - Automatic local file cleanup
 * - Error handling and logging
 * - Configurable URL expiration
 * - File existence verification
 * 
 * Dependencies:
 * - @aws-sdk/client-s3
 * - @aws-sdk/s3-request-presigner
 * - fs
 * 
 * Environment Variables:
 * - AWS_REGION
 * - AWS_ACCESS_KEY_ID
 * - AWS_SECRET_ACCESS_KEY
 * - AWS_S3_BUCKET
 * 
 * @version 1.0.0
 * @created 2024-01-13
 */

import { S3Client, DeleteObjectCommand, GetObjectCommand, ListObjectsV2Command, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import fs from 'fs';

// Initialize S3 Client
const s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});

export const uploadFileToAws = async (fileName, filePath) => {
    try {
        console.log('Starting S3 upload:', { fileName, filePath });
        const uploadParams = {
            Bucket: process.env.AWS_S3_BUCKET,
            Key: fileName,
            Body: fs.createReadStream(filePath),
        };

        const result = await s3Client.send(new PutObjectCommand(uploadParams));
        console.log('S3 upload successful:', result);

        // Clean up the local file
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log('Local file cleaned up:', filePath);
        }

        return result;
    } catch (error) {
        console.error('Error uploading file to AWS S3:', error);
        // Clean up the local file in case of error
        if (fs.existsSync(filePath)) {
            try {
                fs.unlinkSync(filePath);
                console.log('Local file cleaned up after error:', filePath);
            } catch (cleanupError) {
                console.error('Error cleaning up local file:', cleanupError);
            }
        }
        throw error;
    }
};

export const getFileUrl = async (fileName, expireTime = 3600) => {
    try {
        console.log('Getting file URL for:', fileName);
        const command = new GetObjectCommand({
            Bucket: process.env.AWS_S3_BUCKET,
            Key: fileName
        });

        const url = await getSignedUrl(s3Client, command, {
            expiresIn: expireTime
        });
        console.log('Generated signed URL:', url);
        return url;
    } catch (error) {
        console.error('Error getting file URL from AWS S3:', error);
        throw error;
    }
};

export const isFileAvailable = async (fileName) => {
    try {
        console.log('Checking if file exists:', fileName);
        await s3Client.send(new HeadObjectCommand({
            Bucket: process.env.AWS_S3_BUCKET,
            Key: fileName
        }));
        return true;
    } catch (error) {
        console.error('Error checking file availability:', error);
        return false;
    }
};

export const deleteFile = async (fileName) => {
    try {
        console.log('Deleting file from S3:', fileName);
        const deleteParams = {
            Bucket: process.env.AWS_S3_BUCKET,
            Key: fileName
        };
        const result = await s3Client.send(new DeleteObjectCommand(deleteParams));
        console.log('File deleted successfully:', result);
        return result;
    } catch (error) {
        console.error('Error deleting file from AWS S3:', error);
        throw error;
    }
};
