import React from 'react';
import { Box, Typography, CircularProgress, Chip, Dialog, DialogTitle, DialogContent, DialogActions, Button } from '@mui/material';
import { Close as CloseIcon, Download as DownloadIcon } from '@mui/icons-material';
import FileService from '../../services/fileService';

interface FilePreviewProps {
    fileUrl: string;
    fileName: string;
    fileType: string;
    fileSize: number;
    isUploading?: boolean;
    uploadProgress?: number;
    onRemove?: () => void;
}

const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

const FilePreview: React.FC<FilePreviewProps> = ({
    fileUrl,
    fileName,
    fileType,
    fileSize,
    isUploading = false,
    uploadProgress = 0,
    onRemove
}) => {
    const [showDownloadDialog, setShowDownloadDialog] = React.useState(false);

    const handleDownload = async () => {
        if (!fileUrl) return;
        
        try {
            await FileService.downloadFile(fileUrl, fileName);
            setShowDownloadDialog(false);
        } catch (error) {
            console.error('Error downloading file:', error);
            // You might want to show an error message to the user here
        }
    };

    const handleClick = () => {
        if (isUploading || !fileUrl) return;
        setShowDownloadDialog(true);
    };

    return (
        <>
            <Chip
                icon={<Typography>{FileService.getFileIcon(fileType)}</Typography>}
                deleteIcon={onRemove ? <CloseIcon /> : <DownloadIcon />}
                label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" noWrap>
                            {fileName} ({formatFileSize(fileSize)})
                        </Typography>
                        {isUploading && (
                            <CircularProgress 
                                size={16}
                                variant="determinate" 
                                value={uploadProgress} 
                            />
                        )}
                    </Box>
                }
                onDelete={onRemove || (fileUrl ? handleClick : undefined)}
                onClick={onRemove ? undefined : handleClick}
                sx={{
                    maxWidth: '100%',
                    height: 32,
                    cursor: onRemove ? 'default' : 'pointer',
                    '& .MuiChip-label': {
                        display: 'flex',
                        alignItems: 'center'
                    }
                }}
                variant="outlined"
            />

            <Dialog
                open={showDownloadDialog}
                onClose={() => setShowDownloadDialog(false)}
                maxWidth="xs"
                fullWidth
            >
                <DialogTitle>Download File</DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                        <Typography>{FileService.getFileIcon(fileType)}</Typography>
                        <Typography>{fileName}</Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                        Size: {formatFileSize(fileSize)}
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setShowDownloadDialog(false)}>Cancel</Button>
                    <Button onClick={handleDownload} variant="contained" startIcon={<DownloadIcon />}>
                        Download
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
};

export default FilePreview; 