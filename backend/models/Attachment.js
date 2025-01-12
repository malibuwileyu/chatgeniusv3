const supabase = require('../config/database');

class Attachment {
    static async create({ messageId, fileUrl, fileType, fileName, fileSize }) {
        return await supabase
            .from('attachments')
            .insert([{
                message_id: messageId,
                file_url: fileUrl,
                file_type: fileType,
                file_name: fileName,
                file_size: fileSize
            }])
            .select();
    }

    static async findByMessage(messageId) {
        return await supabase
            .from('attachments')
            .select('*')
            .eq('message_id', messageId);
    }

    static async delete(id) {
        return await supabase
            .from('attachments')
            .delete()
            .eq('id', id);
    }
}

module.exports = Attachment; 