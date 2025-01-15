import ragService from '../services/ragService.js';

class RagController {
    constructor() {
        this.ragService = ragService;
    }

    async getVectorStoreStats(req, res) {
        try {
            const result = await this.ragService.getStats();
            res.json(result);
        } catch (error) {
            console.error('Error getting vector store stats:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }

    async upsertVectors(req, res) {
        try {
            const { messages } = req.body;
            
            if (!messages || !Array.isArray(messages)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid request: messages array is required'
                });
            }

            // First generate embeddings
            const messagesWithEmbeddings = await this.ragService.generateEmbeddings(messages);
            
            // Then upsert to vector store
            const upsertResult = await this.ragService.upsertVectors(messagesWithEmbeddings);
            
            res.json({
                success: true,
                ...upsertResult,
                embeddingStatus: this.ragService.getEmbeddingStatus()
            });
        } catch (error) {
            console.error('Error upserting vectors:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to upsert vectors',
                details: error.message
            });
        }
    }

    /**
     * Check which messages have been upserted to the vector store
     */
    async checkUpsertedMessages(req, res) {
        try {
            const result = await this.ragService.checkUpsertedMessages();
            return result;
        } catch (error) {
            console.error('Controller error checking upserted messages:', error);
            throw error;
        }
    }

    /**
     * Import documents as messages
     */
    async importDocuments(req, res) {
        try {
            const { documents } = req.body;
            const result = await this.ragService.importDocuments(documents);
            return result;
        } catch (error) {
            console.error('Controller error importing documents:', error);
            throw error;
        }
    }

    /**
     * Upsert all pending messages
     */
    async upsertPendingMessages(req, res) {
        try {
            const result = await this.ragService.upsertPendingMessages();
            return result;
        } catch (error) {
            console.error('Controller error upserting pending messages:', error);
            throw error;
        }
    }
}

// Export a singleton instance
export default new RagController(); 