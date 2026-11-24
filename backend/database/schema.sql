
CREATE TABLE IF NOT EXISTS scan_history (
    id BIGSERIAL PRIMARY KEY,
    scan_type VARCHAR(30) NOT NULL,
    risk_score INTEGER NOT NULL CHECK (risk_score BETWEEN 0 AND 100),
    risk_level VARCHAR(20) NOT NULL,
    indicators JSONB NOT NULL DEFAULT '[]'::jsonb,
    analysis_status VARCHAR(20) NOT NULL DEFAULT 'demo',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scan_history_created_at
ON scan_history(created_at DESC);

SELECT
    id,
    scan_type,
    risk_score,
    risk_level,
    analysis_status,
    created_at
FROM scan_history
ORDER BY created_at DESC
LIMIT 10;

CREATE TABLE IF NOT EXISTS complaint_drafts (
    id BIGSERIAL PRIMARY KEY,
    scan_id BIGINT REFERENCES scan_history(id) ON DELETE SET NULL,
    incident_description TEXT NOT NULL,
    complaint_text TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);