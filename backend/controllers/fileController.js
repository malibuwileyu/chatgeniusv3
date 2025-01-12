const { supabase } = require('../services/supabase');

// Upload file
const uploadFile = async (req, res) => {
    try {
        // TODO: Implement file upload using Supabase storage
        res.status(501).json({ message: 'File upload not implemented yet' });
    } catch (error) {
        console.error('File upload error:', error);
        res.status(500).json({ message: 'Error uploading file' });
    }
};

// Get file
const getFile = async (req, res) => {
    try {
        // TODO: Implement file retrieval using Supabase storage
        res.status(501).json({ message: 'File retrieval not implemented yet' });
    } catch (error) {
        console.error('File retrieval error:', error);
        res.status(500).json({ message: 'Error retrieving file' });
    }
};

module.exports = {
    uploadFile,
    getFile
}; 