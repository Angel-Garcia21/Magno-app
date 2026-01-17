-- SCRIPT: Arreglar el trigger de auto-creación de perfiles
-- Este script crea/reemplaza el trigger que automáticamente crea perfiles cuando se registra un usuario

-- Ejecuta esto en Supabase Dashboard > SQL Editor

-- Paso 1: Crear o reemplazar la función que crea el perfil automáticamente
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

-- Paso 2: Eliminar el trigger existente si existe
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Paso 3: Crear el nuevo trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Verificación: El trigger ahora está activo y creará perfiles automáticamente
-- con los datos correctos cuando se registre un nuevo usuario
