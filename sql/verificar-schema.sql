-- ============================================================
-- VERIFICAR SCHEMA PROD (Ganaderia) — solo LEE, no modifica nada
-- Correr en psql:  \i verificar-schema.sql   (o pegar bloque)
-- Compara columnas reales vs las que esperan las entities.
-- ============================================================

-- Tabla compartida users (security + bussines) -> superset esperado:
--   id, name, email, password, rol, estado, telefono, id_establecimiento,
--   permisos_especiales, bot_establecimiento_id, bot_link_token,
--   bot_link_token_expires, fecha_creacion, fecha_actualizacion,
--   ultimo_acceso, password_reset_jti
SELECT 'users' AS tabla, column_name, data_type
FROM information_schema.columns
WHERE table_name = 'users'
ORDER BY ordinal_position;

-- establecimientos -> esperado: id_establecimiento, nombre, ubicacion,
--   telefono, responsable, notas, estado, configuracion,
--   fecha_creacion, fecha_actualizacion
SELECT 'establecimientos' AS tabla, column_name, data_type
FROM information_schema.columns
WHERE table_name = 'establecimientos'
ORDER BY ordinal_position;

-- Resto de tablas (bussines las mantuvo en sync; chequeo de control)
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_name IN (
  'user_establecimientos','terneros','madres','eventos','tratamientos',
  'diarrea_terneros','rodeos','invitaciones','alerts_config',
  'eventos_terneros','eventos_madres'
)
ORDER BY table_name, ordinal_position;
