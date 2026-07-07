-- ============================================================
-- CÁLCULO SUSTITUTO LÁCTEO PARA TERNEROS
-- Tabla de registros por día. Idempotente (IF NOT EXISTS).
-- synchronize:false -> se crea a mano en prod (como registro_litros / rodeo_dietas).
-- Los resultados (litros totales, kg, costos) se calculan al leer, no se guardan.
-- ============================================================

CREATE TABLE IF NOT EXISTS calculo_sustituto (
  id_calculo          SERIAL PRIMARY KEY,
  id_establecimiento  INT NOT NULL,
  fecha               DATE NOT NULL,
  numero_terneros     INT NOT NULL DEFAULT 1,
  litros_por_ternero  NUMERIC NOT NULL DEFAULT 0,
  tomas_manana        NUMERIC NOT NULL DEFAULT 0,
  tomas_tarde         NUMERIC NOT NULL DEFAULT 0,
  concentracion       NUMERIC NOT NULL DEFAULT 0.125,   -- kg/L (12,5% = 0,125)
  precio_sustituto_usd NUMERIC NOT NULL DEFAULT 0,       -- u$s/Kg
  precio_leche        NUMERIC NOT NULL DEFAULT 0,        -- $/L
  cotizacion_dolar    NUMERIC NOT NULL DEFAULT 0,        -- $ por u$s
  observaciones       VARCHAR NULL,
  creado_en           TIMESTAMP NOT NULL DEFAULT now(),
  actualizado_en      TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_calculo_sustituto_estab
  ON calculo_sustituto (id_establecimiento);
