-- Migration: Complete Investigation Flow Support
-- Description: Adds all necessary columns for the investigation approval workflow

-- Add payment status tracking
ALTER TABLE leads_prospectos ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending';
-- Values: 'pending', 'under_review', 'approved', 'rejected'

-- Add investigation link and approval tracking
ALTER TABLE leads_prospectos ADD COLUMN IF NOT EXISTS investigation_link TEXT;
ALTER TABLE leads_prospectos ADD COLUMN IF NOT EXISTS investigation_approved_at TIMESTAMPTZ;
ALTER TABLE leads_prospectos ADD COLUMN IF NOT EXISTS investigation_approved_by UUID REFERENCES auth.users(id);

-- Add investigation document tracking
ALTER TABLE leads_prospectos ADD COLUMN IF NOT EXISTS investigation_document_url TEXT;
ALTER TABLE leads_prospectos ADD COLUMN IF NOT EXISTS investigation_password TEXT;
ALTER TABLE leads_prospectos ADD COLUMN IF NOT EXISTS investigation_completed_at TIMESTAMPTZ;

-- Add investigation score tracking
ALTER TABLE leads_prospectos ADD COLUMN IF NOT EXISTS investigation_score INTEGER;
ALTER TABLE leads_prospectos ADD COLUMN IF NOT EXISTS investigation_score_submitted_at TIMESTAMPTZ;

-- Add document signing tracking
ALTER TABLE leads_prospectos ADD COLUMN IF NOT EXISTS documents_signed BOOLEAN DEFAULT false;
ALTER TABLE leads_prospectos ADD COLUMN IF NOT EXISTS documents_signed_at TIMESTAMPTZ;

-- Add commission tracking
ALTER TABLE leads_prospectos ADD COLUMN IF NOT EXISTS commission_requested BOOLEAN DEFAULT false;
ALTER TABLE leads_prospectos ADD COLUMN IF NOT EXISTS commission_requested_at TIMESTAMPTZ;
ALTER TABLE leads_prospectos ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;

-- Create commissions table
CREATE TABLE IF NOT EXISTS commissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID REFERENCES leads_prospectos(id) ON DELETE CASCADE,
  advisor_id UUID REFERENCES auth.users(id),
  amount DECIMAL(10,2),
  status TEXT DEFAULT 'pending', -- pending, approved, paid, rejected
  requested_at TIMESTAMPTZ DEFAULT now(),
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES auth.users(id),
  paid_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_leads_payment_status ON leads_prospectos(payment_status);
CREATE INDEX IF NOT EXISTS idx_commissions_status ON commissions(status);
CREATE INDEX IF NOT EXISTS idx_commissions_advisor ON commissions(advisor_id);

-- Add RLS policies for commissions table
ALTER TABLE commissions ENABLE ROW LEVEL SECURITY;

-- Advisors can view their own commissions
CREATE POLICY "Advisors can view own commissions" ON commissions
  FOR SELECT
  USING (auth.uid() = advisor_id);

-- Admins can view all commissions
CREATE POLICY "Admins can view all commissions" ON commissions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Advisors can create their own commission requests
CREATE POLICY "Advisors can create commissions" ON commissions
  FOR INSERT
  WITH CHECK (auth.uid() = advisor_id);

-- Admins can update commissions
CREATE POLICY "Admins can update commissions" ON commissions
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
