import { supabase } from './supabase';
import { store } from '../store/store';

export interface FileUploadProgress {
    progress: number;
    bytesUploaded: number;
    totalBytes: number;
}

export interface FileUploadResult {
    url: string;
    fileName: string;
    fileType: string;
    fileSize: number;
}

class FileService {
    private static generateFileName(originalName: string): string {
        const timestamp = new Date().getTime();
        const random = Math.random().toString(36).substring(7);
        const ext = originalName.split('.').pop();
        return `${timestamp}-${random}.${ext}`;
    }

    static async uploadFile(
        file: File, 
        channelId: string,
        onProgress?: (progress: FileUploadProgress) => void
    ): Promise<FileUploadResult> {
        const currentUser = store.getState().auth.user;
        if (!currentUser) {
            throw new Error('User must be authenticated to upload files');
        }

        const fileName = this.generateFileName(file.name);
        const filePath = `channels/${channelId}/${fileName}`;

        // Return file info immediately for preview
        const fileInfo = {
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size,
            url: '' // Will be updated after upload
        };

        try {
            console.log('Attempting to upload file:', {
                name: file.name,
                type: file.type,
                size: file.size,
                path: filePath,
                userId: currentUser.id
            });

            // Upload file to Supabase storage
            const { data, error: uploadError } = await supabase.storage
                .from('attachments')
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: true // Changed to true to allow overwrites
                });

            if (uploadError) {
                console.error('Supabase upload error:', uploadError);
                throw uploadError;
            }

            console.log('Upload successful:', data);

            // Get the public URL
            const { data: urlData } = supabase.storage
                .from('attachments')
                .getPublicUrl(filePath);

            if (!urlData.publicUrl) {
                throw new Error('Failed to get public URL for uploaded file');
            }

            // Simulate progress since we can't track it directly
            if (onProgress) {
                onProgress({
                    progress: 100,
                    bytesUploaded: file.size,
                    totalBytes: file.size
                });
            }

            return {
                ...fileInfo,
                url: urlData.publicUrl
            };
        } catch (error) {
            console.error('Detailed upload error:', {
                error,
                file: {
                    name: file.name,
                    type: file.type,
                    size: file.size
                },
                path: filePath
            });
            throw error;
        }
    }

    static async deleteFile(filePath: string): Promise<void> {
        try {
            const { error } = await supabase.storage
                .from('attachments')
                .remove([filePath]);

            if (error) {
                console.error('Delete file error:', error);
                throw error;
            }
        } catch (error) {
            console.error('Error deleting file:', error);
            throw error;
        }
    }

    static async downloadFile(fileUrl: string, fileName: string): Promise<void> {
        try {
            // Extract the path from the public URL
            const path = fileUrl.split('/attachments/')[1];
            if (!path) throw new Error('Invalid file URL');

            // Use Supabase download method
            const { data, error } = await supabase.storage
                .from('attachments')
                .download(path);

            if (error) throw error;
            if (!data) throw new Error('No data received');

            // Create a blob with octet-stream MIME type to force download
            const blob = new Blob([data], { type: 'application/octet-stream' });
            const url = window.URL.createObjectURL(blob);
            
            // Create a temporary link and trigger download
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', fileName); // Force download attribute
            link.style.display = 'none';
            document.body.appendChild(link);
            link.click();
            
            // Clean up
            setTimeout(() => {
                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);
            }, 100);
        } catch (error) {
            console.error('Error downloading file:', error);
            throw error;
        }
    }

    static getFileUrl(filePath: string): string {
        const { data: { publicUrl } } = supabase.storage
            .from('attachments')
            .getPublicUrl(filePath);
        return publicUrl;
    }

    static isImage(fileType: string): boolean {
        return fileType.startsWith('image/');
    }

    static getFileIcon(fileType: string): string {
        if (this.isImage(fileType)) return '🖼️';
        switch (fileType) {
            case 'application/pdf': return '📄';
            case 'application/msword':
            case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
                return '📝';
            case 'text/plain': return '📃';
            default: return '📎';
        }
    }
}

export default FileService; 