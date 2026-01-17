-- SCRIPT 1: Limpiar usuarios huérfanos
-- Este script elimina usuarios de auth.users que NO tienen perfil en la tabla profiles

-- IMPORTANTE: Ejecuta este script en el SQL Editor de Supabase Dashboard
-- Ve a: Supabase Dashboard > SQL Editor > New Query > Pega este código > Run

-- 1. Ver usuarios huérfanos (solo para verificar antes de borrar)
SELECT 
  u.id,
  u.email,
  u.created_at
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
WHERE p.id IS NULL;

-- 2. ELIMINAR usuarios huérfanos de auth.users
-- DESCOMENTA LAS SIGUIENTES LÍNEAS CUANDO ESTÉS LISTO PARA EJECUTAR LA ELIMINACIÓN:

-- DELETE FROM auth.users
-- WHERE id IN (
--   SELECT u.id
--   FROM auth.users u
--   LEFT JOIN profiles p ON u.id = p.id
--   WHERE p.id IS NULL
-- );

-- Después de ejecutar, verifica que se hayan eliminado correctamente:
-- SELECT COUNT(*) as orphaned_count
-- FROM auth.users u
-- LEFT JOIN profiles p ON u.id = p.id
-- WHERE p.id IS NULL;
-- (Debería retornar 0)
