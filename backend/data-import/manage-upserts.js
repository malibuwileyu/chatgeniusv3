/**
 * @file manage-upserts.js
 * @description Script to manage upsertion of messages and documents to the vector store
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { gzip } from 'zlib';
import { promisify } from 'util';
import { supabase } from '../src/config/supabase.js';
import ragService from '../src/services/ragService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Dynamically import pdf-parse to avoid initialization issues
const pdfParse = async (buffer) => {
    const parser = await import('pdf-parse/lib/pdf-parse.js');
    return parser.default(buffer);
};

const DOCUMENTS_DIR = path.join(__dirname, 'documents');
const PDF_DIR = path.join(DOCUMENTS_DIR, 'pdf');
const BASE_URL = 'http://localhost:3000/api';

// Debug levels
const DEBUG_LEVELS = {
    ERROR: 0,
    WARN: 1,
    INFO: 2,
    DEBUG: 3
};

let currentDebugLevel = DEBUG_LEVELS.INFO;

const gzipAsync = promisify(gzip);

/**
 * Logger utility with timestamp and level-based output
 */
const logger = {
    error: (...args) => {
        if (currentDebugLevel >= DEBUG_LEVELS.ERROR) {
            console.error(`[${new Date().toISOString()}] ERROR:`, ...args);
        }
    },
    warn: (...args) => {
        if (currentDebugLevel >= DEBUG_LEVELS.WARN) {
            console.warn(`[${new Date().toISOString()}] WARN:`, ...args);
        }
    },
    info: (...args) => {
        if (currentDebugLevel >= DEBUG_LEVELS.INFO) {
            console.log(`[${new Date().toISOString()}] INFO:`, ...args);
        }
    },
    debug: (...args) => {
        if (currentDebugLevel >= DEBUG_LEVELS.DEBUG) {
            console.log(`[${new Date().toISOString()}] DEBUG:`, ...args);
        }
    },
    setLevel: (level) => {
        if (level in DEBUG_LEVELS) {
            currentDebugLevel = DEBUG_LEVELS[level];
            logger.info(`Log level set to ${level}`);
        }
    }
};

/**
 * Makes an authenticated request to the database
 * @param {string} endpoint - API endpoint
 * @param {string} token - Authentication token
 * @param {Object} options - Additional options
 */
async function makeRequest(endpoint, token, options = {}) {
    try {
        const url = `${BASE_URL}${endpoint}`;
        const headers = {
            'Authorization': `Bearer ${token}`,
            ...options.headers
        };

        const requestOptions = {
            method: options.method || 'GET',
            headers,
            ...options
        };

        // Remove headers from options to avoid duplication
        delete requestOptions.headers;
        requestOptions.headers = headers;

        const response = await fetch(url, requestOptions);
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`Request failed: ${response.status} ${response.statusText} - ${errorData.error || ''}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        logger.error('Request error:', {
            endpoint,
            error: error.message,
            stack: error.stack
        });
        throw error;
    }
}

/**
 * Check and upsert any pending messages
 * @param {string} token - Authentication token
 */
async function checkAndUpsertMessages(token) {
    logger.info('=== Checking Messages for Upsertion ===');
    
    try {
        // First check what needs to be upserted
        logger.debug('Fetching upsert status...');
        const checkResult = await ragService.checkUpsertedMessages();

        if (!checkResult.success) {
            logger.error('Check failed:', checkResult.error);
            throw new Error(`Failed to check messages: ${checkResult.error}`);
        }

        const { pendingIds } = checkResult;
        logger.info(`Found ${pendingIds.length} messages pending upsertion`);
        logger.debug('Upsert status:', {
            pendingCount: pendingIds.length,
            pendingIds
        });
        
        if (pendingIds.length === 0) {
            logger.info('No messages need to be upserted');
            return;
        }

        // Upsert pending messages
        logger.info('Upserting pending messages...');
        const upsertResult = await ragService.upsertPendingMessages();

        if (!upsertResult.success) {
            logger.error('Upsert failed:', upsertResult.error);
            throw new Error(`Failed to upsert messages: ${upsertResult.error}`);
        }

        logger.info(`Successfully upserted ${upsertResult.upsertedCount} messages`);
        logger.debug('Upsert result:', upsertResult);
    } catch (error) {
        logger.error('Error in checkAndUpsertMessages:', error);
        throw error;
    }
}

/**
 * Convert PDF files to text documents
 * @returns {Promise<Array<{success: boolean, file: string, error?: string}>>}
 */
async function convertPDFsToText() {
    logger.info('=== Converting PDFs to Text ===');
    
    try {
        // Ensure PDF directory exists
        try {
            await fs.access(PDF_DIR);
        } catch (error) {
            logger.warn(`PDF directory not found at ${PDF_DIR}, creating it...`);
            await fs.mkdir(PDF_DIR, { recursive: true });
            return []; // No PDFs to process yet
        }

        // Read all PDF files
        const files = await fs.readdir(PDF_DIR);
        const pdfFiles = files.filter(f => f.toLowerCase().endsWith('.pdf'));
        
        if (pdfFiles.length === 0) {
            logger.info('No PDF files found for conversion');
            return [];
        }

        logger.info(`Found ${pdfFiles.length} PDF files to convert`);
        const results = [];

        // Process each PDF
        for (const file of pdfFiles) {
            const pdfPath = path.join(PDF_DIR, file);
            const txtPath = path.join(DOCUMENTS_DIR, `${path.basename(file, '.pdf')}.txt`);
            
            try {
                logger.debug(`Processing PDF: ${file}`);
                
                // Validate PDF file
                const stats = await fs.stat(pdfPath);
                logger.debug(`PDF file size: ${stats.size} bytes`);
                if (stats.size === 0) {
                    throw new Error('PDF file is empty (0 bytes)');
                }
                if (stats.size < 100) {
                    logger.warn(`PDF file ${file} is suspiciously small: ${stats.size} bytes`);
                }
                
                // Read PDF file with retries
                let dataBuffer;
                let data;
                let retryCount = 0;
                const maxRetries = 3;
                
                while (retryCount < maxRetries) {
                    try {
                        dataBuffer = await fs.readFile(pdfPath);
                        const pdfHeader = dataBuffer.slice(0, Math.min(20, dataBuffer.length)).toString();
                        logger.debug(`PDF header check: ${pdfHeader}`);
                        
                        // Basic PDF header check
                        if (!pdfHeader.includes('%PDF-')) {
                            throw new Error(`Invalid PDF format - header: "${pdfHeader}"`);
                        }
                        
                        logger.debug(`Attempting PDF parse (attempt ${retryCount + 1}/${maxRetries})`);
                        data = await pdfParse(dataBuffer);
                        
                        // Validate parsed data
                        if (!data) {
                            throw new Error('PDF parse returned null/undefined');
                        }
                        if (!data.text) {
                            throw new Error('PDF parse returned no text property');
                        }
                        
                        const rawText = data.text.trim();
                        if (!rawText) {
                            throw new Error('PDF parse returned empty text');
                        }
                        
                        logger.debug(`Raw text length: ${rawText.length} chars`);
                        logger.debug(`First 100 chars: ${rawText.substring(0, 100)}`);
                        break; // Successful parse
                        
                    } catch (parseError) {
                        retryCount++;
                        logger.error(`Parse error (attempt ${retryCount}/${maxRetries}):`, {
                            file,
                            error: parseError.message,
                            stack: parseError.stack,
                            dataBufferLength: dataBuffer ? dataBuffer.length : 0
                        });
                        
                        if (retryCount === maxRetries) {
                            throw parseError;
                        }
                        
                        logger.warn(`Retry ${retryCount}/${maxRetries} for ${file}: ${parseError.message}`);
                        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retryCount)));
                    }
                }

                // Clean up the text
                const originalLength = data.text.length;
                let cleanedText = data.text
                    .replace(/\r\n/g, '\n') // Normalize line endings
                    .replace(/\n{3,}/g, '\n\n') // Remove excessive newlines
                    .replace(/[^\x20-\x7E\n]/g, '') // Remove non-printable characters
                    .trim();
                
                logger.debug('Text cleaning stats:', {
                    originalLength,
                    cleanedLength: cleanedText.length,
                    removalPercentage: ((originalLength - cleanedText.length) / originalLength * 100).toFixed(2) + '%'
                });

                // Validate extracted text
                if (cleanedText.length < 10) {
                    throw new Error(`Extracted text too short (${cleanedText.length} chars) - likely conversion error`);
                }
                if (cleanedText.length < originalLength * 0.1) {
                    logger.warn(`Suspicious text cleaning result - removed ${((originalLength - cleanedText.length) / originalLength * 100).toFixed(2)}% of content`);
                }

                // Write to text file
                await fs.writeFile(txtPath, cleanedText, 'utf8');
                logger.info(`Successfully converted ${file} to text (${cleanedText.length} chars)`);
                
                // Move processed PDF to archive
                const pdfArchiveDir = path.join(PDF_DIR, 'processed');
                await fs.mkdir(pdfArchiveDir, { recursive: true });
                const archivePath = path.join(pdfArchiveDir, `${Date.now()}_${file}`);
                await fs.rename(pdfPath, archivePath);
                
                results.push({
                    success: true,
                    file,
                    charCount: cleanedText.length,
                    cleaningStats: {
                        originalLength,
                        cleanedLength: cleanedText.length,
                        removalPercentage: ((originalLength - cleanedText.length) / originalLength * 100).toFixed(2)
                    }
                });

            } catch (error) {
                logger.error(`Error converting PDF ${file}:`, {
                    error: error.message,
                    stack: error.stack,
                    type: error.constructor.name,
                    code: error.code
                });
                
                // Move failed PDF to error directory with error info
                const errorDir = path.join(PDF_DIR, 'error');
                await fs.mkdir(errorDir, { recursive: true });
                const errorPath = path.join(errorDir, `${Date.now()}_${file}`);
                await fs.rename(pdfPath, errorPath);
                
                // Write detailed error info to companion file
                const errorInfoPath = errorPath + '.error.txt';
                const errorInfo = [
                    `Error converting PDF: ${error.message}`,
                    `Error type: ${error.constructor.name}`,
                    `Error code: ${error.code || 'N/A'}`,
                    `Timestamp: ${new Date().toISOString()}`,
                    '\nStack trace:',
                    error.stack,
                    '\nError details:',
                    JSON.stringify(error, Object.getOwnPropertyNames(error), 2)
                ].join('\n');
                
                await fs.writeFile(errorInfoPath, errorInfo, 'utf8');
                
                results.push({
                    success: false,
                    file,
                    error: error.message,
                    errorType: error.constructor.name,
                    errorCode: error.code
                });
            }
        }

        // Log summary
        const successful = results.filter(r => r.success);
        const failed = results.filter(r => !r.success);
        
        logger.info('PDF Conversion Summary:', {
            total: results.length,
            successful: successful.length,
            failed: failed.length,
            successRate: `${((successful.length / results.length) * 100).toFixed(2)}%`
        });
        
        if (failed.length > 0) {
            logger.error('Failed conversions:', failed.map(r => ({
                file: r.file,
                error: r.error,
                type: r.errorType,
                code: r.errorCode
            })));
        }
        
        if (successful.length > 0) {
            logger.info('Successful conversions:', successful.map(r => ({
                file: r.file,
                charCount: r.charCount,
                cleaningStats: r.cleaningStats
            })));
        }

        return results;
    } catch (error) {
        logger.error('Fatal error in PDF conversion:', {
            error: error.message,
            stack: error.stack,
            type: error.constructor.name,
            code: error.code
        });
        throw error;
    }
}

/**
 * Chunks text content into smaller pieces
 * @param {string} content - The text content to chunk
 * @param {number} maxChunkSize - Maximum characters per chunk
 * @returns {Array<string>} Array of content chunks
 */
function chunkContent(content, maxChunkSize = 4000) {
    const chunks = [];
    const sentences = content.split(/(?<=[.!?])\s+/);
    let currentChunk = '';

    for (const sentence of sentences) {
        if ((currentChunk + sentence).length > maxChunkSize) {
            if (currentChunk) {
                chunks.push(currentChunk.trim());
                currentChunk = '';
            }
            // If single sentence is too long, split it
            if (sentence.length > maxChunkSize) {
                const words = sentence.split(/\s+/);
                let wordChunk = '';
                for (const word of words) {
                    if ((wordChunk + ' ' + word).length > maxChunkSize) {
                        chunks.push(wordChunk.trim());
                        wordChunk = word;
                    } else {
                        wordChunk += (wordChunk ? ' ' : '') + word;
                    }
                }
                if (wordChunk) {
                    currentChunk = wordChunk;
                }
            } else {
                currentChunk = sentence;
            }
        } else {
            currentChunk += (currentChunk ? ' ' : '') + sentence;
        }
    }
    
    if (currentChunk) {
        chunks.push(currentChunk.trim());
    }
    
    return chunks;
}

/**
 * Import and upsert documents from the documents directory
 * @param {string} token - Authentication token
 */
async function importAndUpsertDocuments(token) {
    logger.info('=== Checking Documents for Import ===');
    
    try {
        // First convert any PDFs to text
        await convertPDFsToText();

        // Verify documents directory exists
        try {
            await fs.access(DOCUMENTS_DIR);
        } catch (error) {
            logger.warn(`Documents directory not found at ${DOCUMENTS_DIR}, creating it...`);
            await fs.mkdir(DOCUMENTS_DIR, { recursive: true });
        }

        // Read files from both main documents directory and processed folder
        const mainDirFiles = await fs.readdir(DOCUMENTS_DIR);
        const processedDirPath = path.join(DOCUMENTS_DIR, 'processed');
        let processedDirFiles = [];
        
        try {
            processedDirFiles = await fs.readdir(processedDirPath);
            logger.debug('Files in processed directory:', processedDirFiles);
        } catch (error) {
            logger.warn('No processed directory found, will be created if needed');
        }

        // Filter for text and markdown files from both locations
        const mainDocuments = mainDirFiles
            .filter(f => (f.endsWith('.txt') || f.endsWith('.md')) && f !== 'processed')
            .map(f => ({ file: f, dir: DOCUMENTS_DIR }));
            
        const processedDocuments = processedDirFiles
            .filter(f => f.endsWith('.txt') || f.endsWith('.md'))
            .map(f => ({ file: f, dir: processedDirPath }));

        const allDocuments = [...mainDocuments, ...processedDocuments];
        logger.debug('All document files:', allDocuments);
        
        if (allDocuments.length === 0) {
            logger.info('No documents found for import');
            return;
        }

        logger.info(`Found ${allDocuments.length} total documents to import (${mainDocuments.length} new, ${processedDocuments.length} from processed)`);
        
        let totalImported = 0;
        let processedFiles = new Set();
        
        // Process one document at a time
        for (let i = 0; i < allDocuments.length; i++) {
            const { file, dir } = allDocuments[i];
            logger.info(`Processing document ${i + 1}/${allDocuments.length}: ${file}`);
            
            try {
                const filePath = path.join(dir, file);
                logger.debug(`Reading file: ${filePath}`);
                
                const content = await fs.readFile(filePath, 'utf8');
                const baseTitle = path.basename(file, path.extname(file));
                
                // Split content into chunks
                const chunks = chunkContent(content);
                logger.debug(`Split content into ${chunks.length} chunks`);
                
                // Create document objects with chunk numbers in titles and proper message structure
                const documents = chunks.map((chunk, idx) => ({
                    title: chunks.length > 1 ? `${baseTitle} (part ${idx + 1}/${chunks.length})` : baseTitle,
                    content: chunk,
                    type: 'system',
                    sender_id: null,
                    channel_id: process.env.DEFAULT_CHANNEL_ID,
                    dm_id: null
                }));
                
                // Import document chunks in smaller batches
                const batchSize = 5;
                for (let j = 0; j < documents.length; j += batchSize) {
                    const batch = documents.slice(j, j + batchSize);
                    logger.info(`Importing batch ${Math.floor(j / batchSize) + 1}/${Math.ceil(documents.length / batchSize)} for ${file}...`);
                    
                    const compressedContent = await gzipAsync(Buffer.from(JSON.stringify({ documents: batch })));
                    logger.debug(`Batch size - Original: ${JSON.stringify(batch).length} chars, Compressed: ${compressedContent.length} bytes`);
                    
                    const importResult = await makeRequest('/rag/documents/import', token, {
                        method: 'POST',
                        headers: {
                            'Content-Encoding': 'gzip',
                            'Content-Type': 'application/json'
                        },
                        body: compressedContent
                    });

                    if (!importResult.success) {
                        throw new Error(`Failed to import document ${file}: ${importResult.error}`);
                    }

                    logger.info(`Successfully imported batch ${Math.floor(j / batchSize) + 1} of ${file}`);
                    
                    // Add small delay between batches
                    if (j + batchSize < documents.length) {
                        await new Promise(resolve => setTimeout(resolve, 500));
                    }
                }

                logger.info(`Successfully imported ${file} (${documents.length} chunks)`);
                processedFiles.add(filePath);
                
                // Add small delay between documents
                if (i < allDocuments.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
                
                totalImported += documents.length;
            } catch (error) {
                logger.error(`Error processing ${file}:`, {
                    error: error.message,
                    stack: error.stack
                });
                // Continue with next document instead of failing completely
                continue;
            }
        }

        logger.info(`Total documents imported: ${totalImported}`);

        // Move all successfully processed files to archive
        const archiveDir = path.join(DOCUMENTS_DIR, 'processed');
        logger.debug(`Creating archive directory: ${archiveDir}`);
        await fs.mkdir(archiveDir, { recursive: true });

        await Promise.all([...processedFiles].map(async (originalPath) => {
            const fileName = path.basename(originalPath);
            // Only move if not already in processed directory
            if (!originalPath.includes('processed')) {
                const newPath = path.join(archiveDir, `${Date.now()}_${fileName}`);
                logger.debug(`Moving ${originalPath} to ${newPath}`);
                await fs.rename(originalPath, newPath);
            }
        }));

        logger.info('Moved newly processed documents to archive');

        // Trigger upsertion of the newly imported documents
        logger.info('Upserting imported documents...');
        await checkAndUpsertMessages(token);

    } catch (error) {
        logger.error('Error in importAndUpsertDocuments:', {
            error: error.message,
            stack: error.stack
        });
        throw error;
    }
}

/**
 * Main function to manage upsertion of messages and documents
 * @param {string} token - Authentication token
 * @param {Object} options - Configuration options
 * @param {string} options.debugLevel - Debug level (ERROR, WARN, INFO, DEBUG)
 */
export async function manageUpserts(token, options = {}) {
    if (!token) {
        throw new Error('Authentication token is required');
    }

    // Set debug level if provided
    if (options.debugLevel) {
        logger.setLevel(options.debugLevel);
    }

    logger.info('Starting upsert management process...');
    logger.debug('Configuration:', {
        documentsDir: DOCUMENTS_DIR,
        baseUrl: BASE_URL,
        debugLevel: Object.keys(DEBUG_LEVELS)[currentDebugLevel]
    });

    try {
        // First check and upsert any pending messages
        await checkAndUpsertMessages(token);

        // Then import and upsert any new documents
        await importAndUpsertDocuments(token);

        logger.info('=== Upsert Management Complete ===');
        return true;
    } catch (error) {
        logger.error('Error in upsert management:', {
            error: error.message,
            stack: error.stack
        });
        throw error;
    }
}

// Allow running directly from command line
if (process.argv[1] === fileURLToPath(import.meta.url)) {
    const token = process.argv[2];
    const debugLevel = process.argv[3]?.toUpperCase() || 'INFO';

    if (!token) {
        logger.error('Please provide an authentication token');
        process.exit(1);
    }

    manageUpserts(token, { debugLevel }).catch(error => {
        logger.error('Failed to manage upserts:', error);
        process.exit(1);
    });
} 