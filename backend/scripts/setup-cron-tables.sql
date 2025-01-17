-- Create table for tracking cron job status
CREATE TABLE IF NOT EXISTS cron_status (
    job_name TEXT PRIMARY KEY,
    last_run_time TIMESTAMP WITH TIME ZONE,
    last_run_status TEXT,
    consecutive_failures INTEGER DEFAULT 0,
    last_processed_count INTEGER DEFAULT 0,
    avg_processing_time FLOAT DEFAULT 0,
    health TEXT DEFAULT 'healthy',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create table for system alerts if it doesn't exist
CREATE TABLE IF NOT EXISTS system_alerts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    type TEXT NOT NULL,
    message TEXT NOT NULL,
    details JSONB,
    service TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    acknowledged BOOLEAN DEFAULT FALSE,
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    acknowledged_by UUID REFERENCES users(id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_cron_status_health ON cron_status(health);
CREATE INDEX IF NOT EXISTS idx_system_alerts_type ON system_alerts(type);
CREATE INDEX IF NOT EXISTS idx_system_alerts_service ON system_alerts(service);
CREATE INDEX IF NOT EXISTS idx_system_alerts_created_at ON system_alerts(created_at);

-- Add RLS policies
ALTER TABLE cron_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_alerts ENABLE ROW LEVEL SECURITY;

-- Cron status policies
CREATE POLICY "Allow read access to cron_status for authenticated users"
    ON cron_status FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow all access to cron_status for service role"
    ON cron_status FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- System alerts policies
CREATE POLICY "Allow read access to system_alerts for authenticated users"
    ON system_alerts FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow all access to system_alerts for service role"
    ON system_alerts FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true); 