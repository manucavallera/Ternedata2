-- ============================================================
-- ASEGURAR columnas de la tabla compartida users (Ganaderia)
-- Idempotente: ADD COLUMN IF NOT EXISTS. NO dropea ni altera nada.
-- Agrega solo lo que falte. Seguro de correr cuantas veces quieras.
-- ============================================================

-- Columnas que usa SECURITY (login / reset password / verificación email)
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_jti varchar(36);
-- DEFAULT true: usuarios existentes quedan verificados (no se rompe su login).
-- Los registros nuevos se insertan con false desde el código.
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verificado boolean NOT NULL DEFAULT true;

-- Columnas que usa BUSSINES (vínculo bot)
ALTER TABLE users ADD COLUMN IF NOT EXISTS bot_establecimiento_id int;
ALTER TABLE users ADD COLUMN IF NOT EXISTS bot_link_token varchar(8);
ALTER TABLE users ADD COLUMN IF NOT EXISTS bot_link_token_expires timestamp;

-- Columnas comunes (deberían existir; por si acaso)
ALTER TABLE users ADD COLUMN IF NOT EXISTS rol varchar(20) DEFAULT 'operario';
ALTER TABLE users ADD COLUMN IF NOT EXISTS estado varchar(20) DEFAULT 'activo';
ALTER TABLE users ADD COLUMN IF NOT EXISTS telefono varchar(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS id_establecimiento int;
ALTER TABLE users ADD COLUMN IF NOT EXISTS permisos_especiales text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS ultimo_acceso timestamp;
