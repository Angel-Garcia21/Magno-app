-- SCRIPT 2: Configurar Eliminación en Cascada
-- Este script crea un trigger para que cuando se elimine un usuario de auth.users,
-- automáticamente se elimine su perfil de la tabla profiles

-- IMPORTANTE: Ejecuta este script en el SQL Editor de Supabase Dashboard
-- Ve a: Supabase Dashboard > SQL Editor > New Query > Pega este código > Run

-- Paso 1: Crear función que se ejecutará cuando se elimine un usuario
CREATE OR REPLACE FUNCTION public.handle_user_delete()
RETURNS TRIGGER AS $$
BEGIN
  -- Eliminar perfil asociado cuando se elimina el usuario de auth
  DELETE FROM public.profiles WHERE id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Paso 2: Crear el trigger en la tabla auth.users
DROP TRIGGER IF EXISTS on_auth_user_deleted ON auth.users;

CREATE TRIGGER on_auth_user_deleted
  BEFORE DELETE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_user_delete();

-- Verificación: El trigger ahora está activo
-- Cuando elimines un usuario desde Supabase Dashboard > Authentication > Users
-- También se eliminará automáticamente de la tabla profiles

-- NOTA: Si quieres el comportamiento inverso (eliminar de profiles elimina de auth.users)
-- necesitarías usar una Edge Function o RLS policy, ya que auth.users es una tabla del sistema
