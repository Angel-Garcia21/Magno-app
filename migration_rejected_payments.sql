-- Migration: Create rejected_payments table
-- Description: Store rejected payment proofs for audit trail and prevent loss of data
-- Author: Payment Management System
-- Date: 2026-01-06

-- Create rejected_payments table
CREATE TABLE IF NOT EXISTS rejected_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Original payment proof data
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  month_year TEXT NOT NULL, -- Format: YYYY-MM
  amount NUMERIC(10, 2),
  proof_url TEXT NOT NULL,
  
  -- Rejection metadata
  rejected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  rejected_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  rejection_reason TEXT,
  
  -- Original submission data
  originally_submitted_at TIMESTAMPTZ,
  original_payment_proof_id UUID, -- Reference to original payment_proofs record
  
  -- Indexes
  CONSTRAINT rejected_payments_unique_month UNIQUE (user_id, property_id, month_year, rejected_at)
);

-- Add index for faster queries
CREATE INDEX idx_rejected_payments_user ON rejected_payments(user_id);
CREATE INDEX idx_rejected_payments_property ON rejected_payments(property_id);
CREATE INDEX idx_rejected_payments_month ON rejected_payments(month_year);
CREATE INDEX idx_rejected_payments_rejected_at ON rejected_payments(rejected_at);

-- Enable Row Level Security
ALTER TABLE rejected_payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Admins can see all rejected payments
CREATE POLICY "Admins can view all rejected payments"
  ON rejected_payments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Users can see their own rejected payments
CREATE POLICY "Users can view their own rejected payments"
  ON rejected_payments
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Only admins can insert (when rejecting)
CREATE POLICY "Admins can insert rejected payments"
  ON rejected_payments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Grant permissions
GRANT SELECT, INSERT ON rejected_payments TO authenticated;

-- Add comment
COMMENT ON TABLE rejected_payments IS 'Stores payment proofs that were rejected by admins for audit trail';
