-- Create a table for property recruitment submissions
CREATE TABLE IF NOT EXISTS public.property_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('sale', 'rent')),
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'changes_requested', 'approved', 'rejected')),
    form_data JSONB DEFAULT '{}'::jsonb,
    rejection_reason TEXT,
    feedback TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Documentation for form_data structure:
-- {
--   "personal": { "name": "...", "phone": "...", ... },
--   "property": { "address": "...", "type": "...", ... },
--   "conditions": { "price": ..., "amenities": [...], ... },
--   "documents": { "id_url": "...", "predial_url": "..." },
--   "admin": { "keys_provided": bool, "service_interest": bool }
-- }

-- RLS Policies
ALTER TABLE public.property_submissions ENABLE ROW LEVEL SECURITY;

-- Users can see and edit their own submissions
CREATE POLICY "Users can view own submissions" 
ON public.property_submissions FOR SELECT 
USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert own submissions" 
ON public.property_submissions FOR INSERT 
WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own submissions" 
ON public.property_submissions FOR UPDATE 
USING (auth.uid() = owner_id);

-- Admins can do everything
CREATE POLICY "Admins have full access to submissions" 
ON public.property_submissions FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role = 'admin'
    )
);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_property_submissions_updated_at
    BEFORE UPDATE ON public.property_submissions
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();
