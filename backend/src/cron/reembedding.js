/**
 * @file reembedding.js
 * @description Cron job to check for new messages and run the re-embedding process every 5 minutes.
 * Uses node-cron for scheduling and integrates with the RAG service for re-embedding.
 * Includes monitoring and alerts for job failures and performance issues.
 */

import cron from 'node-cron';
import { RAGService } from '../services/ragService.js';
import { supabase } from '../config/supabase.js';

// Initialize RAG service
const ragService = new RAGService();

// Job status tracking
let isJobRunning = false;
let lastRunTime = null;
let lastRunStatus = null;
let consecutiveFailures = 0;
let lastProcessedCount = 0;
let avgProcessingTime = 0;
const MAX_CONSECUTIVE_FAILURES = 3;
const MAX_PROCESSING_TIME = 240000; // 4 minutes (since job runs every 5 minutes)

/**
 * Send alert for job issues
 * @param {string} type Alert type ('error', 'warning', 'info')
 * @param {string} message Alert message
 * @param {Object} details Additional details
 */
async function sendAlert(type, message, details = {}) {
    // Log the alert
    console.error(`[ALERT] ${type.toUpperCase()}: ${message}`, details);

    // In a production environment, you would:
    // 1. Send to a monitoring service (e.g., Datadog, New Relic)
    // 2. Send email notifications
    // 3. Post to a Slack channel
    // 4. Update metrics dashboards

    // For now, we'll just log to Supabase
    try {
        await supabase
            .from('system_alerts')
            .insert({
                type,
                message,
                details,
                service: 're-embedding',
                created_at: new Date().toISOString()
            });
    } catch (error) {
        console.error('Failed to log alert:', error);
    }
}

/**
 * Main function to run the re-embedding process
 */
async function runReembedding() {
    if (isJobRunning) {
        console.log('Previous job still running, skipping this run');
        return;
    }

    const startTime = Date.now();
    try {
        isJobRunning = true;
        console.log('\n=== Starting Scheduled Re-embedding Job ===');
        console.log('Time:', new Date().toISOString());

        // Run the re-embedding process
        const result = await ragService.scheduleReembedding({ reembedAfterHours: 24 });

        // Update job status
        lastRunTime = new Date().toISOString();
        lastRunStatus = result.success ? 'success' : 'failed';
        lastProcessedCount = result.messagesProcessed || 0;

        // Calculate processing time
        const processingTime = Date.now() - startTime;
        avgProcessingTime = avgProcessingTime === 0 
            ? processingTime 
            : (avgProcessingTime * 0.8 + processingTime * 0.2); // Exponential moving average

        // Check for issues
        if (!result.success) {
            consecutiveFailures++;
            await sendAlert('error', 'Re-embedding job failed', {
                error: result.error,
                consecutiveFailures
            });

            if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
                await sendAlert('error', 'Re-embedding job has failed multiple times', {
                    consecutiveFailures,
                    lastError: result.error
                });
            }
        } else {
            consecutiveFailures = 0;
        }

        // Check processing time
        if (processingTime > MAX_PROCESSING_TIME) {
            await sendAlert('warning', 'Re-embedding job took longer than expected', {
                processingTime,
                maxAllowed: MAX_PROCESSING_TIME,
                messagesProcessed: lastProcessedCount
            });
        }

        // Log completion
        console.log('Job completed:', {
            success: result.success,
            messagesProcessed: result.messagesProcessed,
            processingTime,
            avgProcessingTime,
            status: result.status,
            error: result.error
        });

    } catch (error) {
        console.error('Error in re-embedding job:', error);
        lastRunStatus = 'error';
        await sendAlert('error', 'Re-embedding job threw an exception', {
            error: error.message,
            stack: error.stack
        });
    } finally {
        isJobRunning = false;
    }
}

// Schedule the job to run every 5 minutes
cron.schedule('*/5 * * * *', runReembedding);

// Export job status for monitoring
export const getJobStatus = () => ({
    isRunning: isJobRunning,
    lastRunTime,
    lastRunStatus,
    consecutiveFailures,
    lastProcessedCount,
    avgProcessingTime,
    health: consecutiveFailures >= MAX_CONSECUTIVE_FAILURES ? 'critical' : 'healthy'
});

// Run immediately on startup
runReembedding(); 