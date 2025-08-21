-- Add new columns to session_history table for storing VAPI metrics
ALTER TABLE session_history 
ADD COLUMN IF NOT EXISTS vapi_call_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS score INTEGER CHECK (score >= 0 AND score <= 100),
ADD COLUMN IF NOT EXISTS summary TEXT;

-- Create index for faster queries on vapi_call_id
CREATE INDEX IF NOT EXISTS idx_session_history_vapi_call_id ON session_history(vapi_call_id);

-- Create index for filtering by score
CREATE INDEX IF NOT EXISTS idx_session_history_score ON session_history(score);