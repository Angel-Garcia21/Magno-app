-- SCRIPT: Permitir el rol 'asesor' en la base de datos
-- Si el admin funciona pero el asesor no, es porque la base de datos tiene una RESTRICCIÓN (CHECK constraint)
-- que solo permite ciertos valores. Este script agrega 'asesor' a la lista permitida.

-- Ejecuta esto en Supabase Dashboard > SQL Editor

-- 1. Primero eliminamos la restricción antigua (si existe con el nombre estándar)
-- Nota: Si el nombre es diferente, el error te lo dirá, pero usualmente es profiles_role_check
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- 2. Agregamos la nueva restricción que incluye a 'asesor' y 'marketing'
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('guest', 'owner', 'admin', 'tenant', 'marketing', 'asesor'));

-- 3. Verificamos que el trigger que creamos antes esté bien (por si acaso)
-- Este es el mismo código de fix_profile_trigger.sql pero actualizado
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, created_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Usuario Nuevo'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'guest'),
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
