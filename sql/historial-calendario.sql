-- ============================================================
-- CALENDARIO HISTÓRICO — versionado temporal (snapshot por fecha)
-- Tablas *_history + fn_history_capture() + triggers + backfill baseline.
-- Idempotente: CREATE TABLE IF NOT EXISTS / CREATE OR REPLACE /
--   DROP TRIGGER IF EXISTS. Backfill solo inserta lo que falta.
-- Seguro de correr cuantas veces quieras. NO dropea datos.
--
-- Alcance: madres, terneros, rodeos, tratamientos, eventos.
-- Modelo: cada cambio (INSERT/UPDATE/DELETE) cierra la versión vigente
--   (valid_to = now()) e inserta una nueva. valid_to IS NULL = vigente.
-- Reconstrucción estado a fecha T:
--   SELECT DISTINCT ON (entity_id) data FROM X_history
--   WHERE id_establecimiento=$1 AND valid_from <= T
--     AND (valid_to IS NULL OR valid_to > T)
--   ORDER BY entity_id, valid_from DESC;  (descartar operacion='D')
-- ============================================================

-- ---------- 1. Tablas de historial (una por entidad) ----------
CREATE TABLE IF NOT EXISTS madres_history (
  history_id BIGSERIAL PRIMARY KEY,
  entity_id  INT NOT NULL,
  id_establecimiento INT,
  data JSONB NOT NULL,
  operacion CHAR(1) NOT NULL,        -- 'I' | 'U' | 'D'
  valid_from TIMESTAMPTZ NOT NULL DEFAULT now(),
  valid_to   TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS ix_madres_history_lookup ON madres_history (id_establecimiento, entity_id, valid_from);
CREATE INDEX IF NOT EXISTS ix_madres_history_period ON madres_history (id_establecimiento, valid_from);

CREATE TABLE IF NOT EXISTS terneros_history (
  history_id BIGSERIAL PRIMARY KEY,
  entity_id  INT NOT NULL,
  id_establecimiento INT,
  data JSONB NOT NULL,
  operacion CHAR(1) NOT NULL,
  valid_from TIMESTAMPTZ NOT NULL DEFAULT now(),
  valid_to   TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS ix_terneros_history_lookup ON terneros_history (id_establecimiento, entity_id, valid_from);
CREATE INDEX IF NOT EXISTS ix_terneros_history_period ON terneros_history (id_establecimiento, valid_from);

CREATE TABLE IF NOT EXISTS rodeos_history (
  history_id BIGSERIAL PRIMARY KEY,
  entity_id  INT NOT NULL,
  id_establecimiento INT,
  data JSONB NOT NULL,
  operacion CHAR(1) NOT NULL,
  valid_from TIMESTAMPTZ NOT NULL DEFAULT now(),
  valid_to   TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS ix_rodeos_history_lookup ON rodeos_history (id_establecimiento, entity_id, valid_from);
CREATE INDEX IF NOT EXISTS ix_rodeos_history_period ON rodeos_history (id_establecimiento, valid_from);

CREATE TABLE IF NOT EXISTS tratamientos_history (
  history_id BIGSERIAL PRIMARY KEY,
  entity_id  INT NOT NULL,
  id_establecimiento INT,
  data JSONB NOT NULL,
  operacion CHAR(1) NOT NULL,
  valid_from TIMESTAMPTZ NOT NULL DEFAULT now(),
  valid_to   TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS ix_tratamientos_history_lookup ON tratamientos_history (id_establecimiento, entity_id, valid_from);
CREATE INDEX IF NOT EXISTS ix_tratamientos_history_period ON tratamientos_history (id_establecimiento, valid_from);

CREATE TABLE IF NOT EXISTS eventos_history (
  history_id BIGSERIAL PRIMARY KEY,
  entity_id  INT NOT NULL,
  id_establecimiento INT,
  data JSONB NOT NULL,
  operacion CHAR(1) NOT NULL,
  valid_from TIMESTAMPTZ NOT NULL DEFAULT now(),
  valid_to   TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS ix_eventos_history_lookup ON eventos_history (id_establecimiento, entity_id, valid_from);
CREATE INDEX IF NOT EXISTS ix_eventos_history_period ON eventos_history (id_establecimiento, valid_from);

CREATE TABLE IF NOT EXISTS rodeo_dietas_history (
  history_id BIGSERIAL PRIMARY KEY,
  entity_id  INT NOT NULL,
  id_establecimiento INT,
  data JSONB NOT NULL,
  operacion CHAR(1) NOT NULL,
  valid_from TIMESTAMPTZ NOT NULL DEFAULT now(),
  valid_to   TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS ix_rodeo_dietas_history_lookup ON rodeo_dietas_history (id_establecimiento, entity_id, valid_from);
CREATE INDEX IF NOT EXISTS ix_rodeo_dietas_history_period ON rodeo_dietas_history (id_establecimiento, valid_from);

-- ---------- 2. Función de captura (compartida) ----------
-- Recibe el nombre de la PK por TG_ARGV[0]. Escribe en <tabla>_history.
CREATE OR REPLACE FUNCTION fn_history_capture() RETURNS TRIGGER AS $$
DECLARE
  hist TEXT := TG_TABLE_NAME || '_history';
  pk   TEXT := TG_ARGV[0];
  rec  JSON;
  op   CHAR(1);
  eid  INT;
  pkv  INT;
BEGIN
  IF (TG_OP = 'DELETE') THEN
    rec := row_to_json(OLD); op := 'D';
  ELSIF (TG_OP = 'INSERT') THEN
    rec := row_to_json(NEW); op := 'I';
  ELSE
    rec := row_to_json(NEW); op := 'U';
  END IF;

  pkv := (rec->>pk)::int;
  eid := NULLIF(rec->>'id_establecimiento', '')::int;

  -- cerrar la versión vigente anterior de esta entidad
  EXECUTE format('UPDATE %I SET valid_to = now() WHERE entity_id = $1 AND valid_to IS NULL', hist)
    USING pkv;

  -- insertar nueva versión (delete-marker: valid_to = now(), no queda vigente)
  EXECUTE format(
    'INSERT INTO %I (entity_id, id_establecimiento, data, operacion, valid_from, valid_to)
     VALUES ($1, $2, $3, $4, now(), CASE WHEN $4 = ''D'' THEN now() ELSE NULL END)', hist)
    USING pkv, eid, rec, op;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- ---------- 3. Triggers (uno por tabla) ----------
DROP TRIGGER IF EXISTS trg_madres_hist ON madres;
CREATE TRIGGER trg_madres_hist AFTER INSERT OR UPDATE OR DELETE ON madres
  FOR EACH ROW EXECUTE FUNCTION fn_history_capture('id_madre');

DROP TRIGGER IF EXISTS trg_terneros_hist ON terneros;
CREATE TRIGGER trg_terneros_hist AFTER INSERT OR UPDATE OR DELETE ON terneros
  FOR EACH ROW EXECUTE FUNCTION fn_history_capture('id_ternero');

DROP TRIGGER IF EXISTS trg_rodeos_hist ON rodeos;
CREATE TRIGGER trg_rodeos_hist AFTER INSERT OR UPDATE OR DELETE ON rodeos
  FOR EACH ROW EXECUTE FUNCTION fn_history_capture('id_rodeo');

DROP TRIGGER IF EXISTS trg_tratamientos_hist ON tratamientos;
CREATE TRIGGER trg_tratamientos_hist AFTER INSERT OR UPDATE OR DELETE ON tratamientos
  FOR EACH ROW EXECUTE FUNCTION fn_history_capture('id_tratamiento');

DROP TRIGGER IF EXISTS trg_eventos_hist ON eventos;
CREATE TRIGGER trg_eventos_hist AFTER INSERT OR UPDATE OR DELETE ON eventos
  FOR EACH ROW EXECUTE FUNCTION fn_history_capture('id_evento');

DROP TRIGGER IF EXISTS trg_rodeo_dietas_hist ON rodeo_dietas;
CREATE TRIGGER trg_rodeo_dietas_hist AFTER INSERT OR UPDATE OR DELETE ON rodeo_dietas
  FOR EACH ROW EXECUTE FUNCTION fn_history_capture('id_dieta');

-- ---------- 4. Backfill baseline (solo lo que falta) ----------
-- valid_from = mejor fecha de creación disponible por tabla.
-- WHERE NOT EXISTS evita duplicar si se re-corre el script.
INSERT INTO madres_history (entity_id, id_establecimiento, data, operacion, valid_from, valid_to)
SELECT m.id_madre, m.id_establecimiento, row_to_json(m), 'I',
       COALESCE(m.creado_en, '2020-01-01'::timestamptz), NULL
FROM madres m
WHERE NOT EXISTS (SELECT 1 FROM madres_history h WHERE h.entity_id = m.id_madre);

INSERT INTO terneros_history (entity_id, id_establecimiento, data, operacion, valid_from, valid_to)
SELECT t.id_ternero, t.id_establecimiento, row_to_json(t), 'I',
       COALESCE(t.creado_en, t.fecha_nacimiento::timestamptz, '2020-01-01'::timestamptz), NULL
FROM terneros t
WHERE NOT EXISTS (SELECT 1 FROM terneros_history h WHERE h.entity_id = t.id_ternero);

INSERT INTO rodeos_history (entity_id, id_establecimiento, data, operacion, valid_from, valid_to)
SELECT r.id_rodeo, r.id_establecimiento, row_to_json(r), 'I',
       COALESCE(r.fecha_creacion::timestamptz, '2020-01-01'::timestamptz), NULL
FROM rodeos r
WHERE NOT EXISTS (SELECT 1 FROM rodeos_history h WHERE h.entity_id = r.id_rodeo);

INSERT INTO tratamientos_history (entity_id, id_establecimiento, data, operacion, valid_from, valid_to)
SELECT tr.id_tratamiento, tr.id_establecimiento, row_to_json(tr), 'I',
       COALESCE(tr.fecha_tratamiento::timestamptz, '2020-01-01'::timestamptz), NULL
FROM tratamientos tr
WHERE NOT EXISTS (SELECT 1 FROM tratamientos_history h WHERE h.entity_id = tr.id_tratamiento);

INSERT INTO eventos_history (entity_id, id_establecimiento, data, operacion, valid_from, valid_to)
SELECT ev.id_evento, ev.id_establecimiento, row_to_json(ev), 'I',
       COALESCE(ev.fecha_evento::timestamptz, '2020-01-01'::timestamptz), NULL
FROM eventos ev
WHERE NOT EXISTS (SELECT 1 FROM eventos_history h WHERE h.entity_id = ev.id_evento);

INSERT INTO rodeo_dietas_history (entity_id, id_establecimiento, data, operacion, valid_from, valid_to)
SELECT d.id_dieta, d.id_establecimiento, row_to_json(d), 'I',
       COALESCE(d.creado_en::timestamptz, '2020-01-01'::timestamptz), NULL
FROM rodeo_dietas d
WHERE NOT EXISTS (SELECT 1 FROM rodeo_dietas_history h WHERE h.entity_id = d.id_dieta);

-- ============================================================
-- FIN. Verificar:  SELECT COUNT(*) FROM madres_history;
-- ============================================================
