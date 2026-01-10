-- Migration to expand properties table for detailed submission form

-- 1. Add specific columns for critical searchable fields
ALTER TABLE public.properties 
ADD COLUMN IF NOT EXISTS contact_info JSONB DEFAULT '{}'::jsonb, -- Stores: fullName, placeOfOrigin, nationality, dob, occupation, maritalStatus, phone, homeAddress, isOwner
ADD COLUMN IF NOT EXISTS condition TEXT, -- Excellent, Good, Remodel, etc.
ADD COLUMN IF NOT EXISTS has_liens BOOLEAN DEFAULT false, -- Gravamen
ADD COLUMN IF NOT EXISTS occupancy_status TEXT, -- Inhabited, Vacant
ADD COLUMN IF NOT EXISTS furnished_status TEXT, -- Yes, No, Semi
ADD COLUMN IF NOT EXISTS min_contract_months INTEGER,
ADD COLUMN IF NOT EXISTS pets_allowed BOOLEAN,
ADD COLUMN IF NOT EXISTS special_conditions TEXT,
ADD COLUMN IF NOT EXISTS documents JSONB DEFAULT '[]'::jsonb, -- Array of { type: 'ID'|'Predial', url: '...' }
ADD COLUMN IF NOT EXISTS coordinates JSONB DEFAULT '{"lat": null, "lng": null}'::jsonb,
ADD COLUMN IF NOT EXISTS keys_provided BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS visit_availability TEXT, -- 'Cita', 'Llaves', etc.
ADD COLUMN IF NOT EXISTS admin_service_interest BOOLEAN DEFAULT false;

-- 2. Comment on usage of existing columns:
-- 'specs' column (JSONB) should store: 
--   age (antiquity), levels, rooms, bathrooms, half_bathrooms, parking, land_area, construction_area
-- 'services' column (Array/JSONB) should store:
--   water, light, gas, internet, maintenance
-- 'amenities' column (Array/JSONB) should store:
--   stove, fridge, security, etc. (The "Features" list)
