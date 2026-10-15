-- Esquema de la base de TerneData para los tests de API en CI.
-- Generado con pg_dump --schema-only desde la base de pruebas (copia del esquema de producción
-- con todas las migraciones aplicadas). Sin datos, salvo las filas de la tabla migrations.
-- Si se agrega una migración, el CI la corre encima de este esquema.
--
-- PostgreSQL database dump
--


-- Dumped from database version 16.15 (Ubuntu 16.15-0ubuntu0.24.04.1)
-- Dumped by pg_dump version 16.15 (Ubuntu 16.15-0ubuntu0.24.04.1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: invitaciones_rol_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.invitaciones_rol_enum AS ENUM (
    'dueno',
    'veterinario',
    'operario'
);


--
-- Name: madres_estado_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.madres_estado_enum AS ENUM (
    'Seca',
    'En Tambo'
);


--
-- Name: padres_estado_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.padres_estado_enum AS ENUM (
    'Vivo',
    'Muerto'
);


--
-- Name: semen_estado_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.semen_estado_enum AS ENUM (
    'Vivo',
    'Muerto'
);


--
-- Name: terneros_estado_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.terneros_estado_enum AS ENUM (
    'Vivo',
    'Muerto'
);


--
-- Name: terneros_metodo_calostrado_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.terneros_metodo_calostrado_enum AS ENUM (
    'sonda',
    'mamadera'
);


--
-- Name: terneros_sexo_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.terneros_sexo_enum AS ENUM (
    'Macho',
    'Hembra'
);


--
-- Name: tratamientos_turno_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.tratamientos_turno_enum AS ENUM (
    'mañana',
    'tarde'
);


--
-- Name: fn_history_capture(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_history_capture() RETURNS trigger
    LANGUAGE plpgsql
    AS $_$
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
$_$;


--
-- Name: update_rodeos_timestamp(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_rodeos_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.fecha_actualizacion = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: alerts_config; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.alerts_config (
    id integer NOT NULL,
    "userId" integer NOT NULL,
    "umbralMortalidad" double precision DEFAULT '5'::double precision NOT NULL,
    "umbralMorbilidad" double precision DEFAULT '10'::double precision NOT NULL,
    "whatsappEnabled" boolean DEFAULT true NOT NULL,
    "emailEnabled" boolean DEFAULT true NOT NULL,
    "lastAlertSent" timestamp without time zone
);


--
-- Name: alerts_config_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.alerts_config_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: alerts_config_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.alerts_config_id_seq OWNED BY public.alerts_config.id;


--
-- Name: calculo_sustituto; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.calculo_sustituto (
    id_calculo integer NOT NULL,
    id_establecimiento integer NOT NULL,
    fecha date NOT NULL,
    numero_terneros integer DEFAULT 1 NOT NULL,
    litros_por_ternero numeric DEFAULT 0 NOT NULL,
    tomas_manana numeric DEFAULT 0 NOT NULL,
    tomas_tarde numeric DEFAULT 0 NOT NULL,
    concentracion numeric DEFAULT 0.125 NOT NULL,
    precio_sustituto_usd numeric DEFAULT 0 NOT NULL,
    precio_leche numeric DEFAULT 0 NOT NULL,
    cotizacion_dolar numeric DEFAULT 0 NOT NULL,
    observaciones character varying,
    creado_en timestamp without time zone DEFAULT now() NOT NULL,
    actualizado_en timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: calculo_sustituto_id_calculo_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.calculo_sustituto_id_calculo_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: calculo_sustituto_id_calculo_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.calculo_sustituto_id_calculo_seq OWNED BY public.calculo_sustituto.id_calculo;


--
-- Name: diarrea_terneros; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.diarrea_terneros (
    id_diarrea_ternero integer NOT NULL,
    fecha_diarrea_ternero date NOT NULL,
    id_ternero integer,
    severidad character varying NOT NULL,
    numero_episodio integer DEFAULT 1 NOT NULL,
    observaciones text,
    id_establecimiento integer
);


--
-- Name: diarrea_terneros_id_diarrea_ternero_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.diarrea_terneros_id_diarrea_ternero_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: diarrea_terneros_id_diarrea_ternero_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.diarrea_terneros_id_diarrea_ternero_seq OWNED BY public.diarrea_terneros.id_diarrea_ternero;


--
-- Name: establecimientos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.establecimientos (
    id_establecimiento integer NOT NULL,
    nombre character varying(100) NOT NULL,
    ubicacion character varying(200),
    telefono character varying(50),
    responsable character varying(100),
    notas text,
    estado character varying(20) DEFAULT 'activo'::character varying NOT NULL,
    fecha_creacion timestamp without time zone DEFAULT now() NOT NULL,
    fecha_actualizacion timestamp without time zone DEFAULT now() NOT NULL,
    configuracion json,
    tipo_organizacion character varying(20) DEFAULT 'ganaderia'::character varying NOT NULL
);


--
-- Name: establecimientos_id_establecimiento_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.establecimientos_id_establecimiento_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: establecimientos_id_establecimiento_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.establecimientos_id_establecimiento_seq OWNED BY public.establecimientos.id_establecimiento;


--
-- Name: eventos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.eventos (
    id_evento integer NOT NULL,
    fecha_evento date NOT NULL,
    observacion character varying NOT NULL,
    id_establecimiento integer
);


--
-- Name: eventos_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.eventos_history (
    history_id bigint NOT NULL,
    entity_id integer NOT NULL,
    id_establecimiento integer,
    data jsonb NOT NULL,
    operacion character(1) NOT NULL,
    valid_from timestamp with time zone DEFAULT now() NOT NULL,
    valid_to timestamp with time zone
);


--
-- Name: eventos_history_history_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.eventos_history_history_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: eventos_history_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.eventos_history_history_id_seq OWNED BY public.eventos_history.history_id;


--
-- Name: eventos_id_evento_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.eventos_id_evento_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: eventos_id_evento_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.eventos_id_evento_seq OWNED BY public.eventos.id_evento;


--
-- Name: eventos_madres; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.eventos_madres (
    evento_id integer NOT NULL,
    madre_id integer NOT NULL
);


--
-- Name: eventos_terneros; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.eventos_terneros (
    evento_id integer NOT NULL,
    ternero_id integer NOT NULL
);


--
-- Name: forrajeria_categorias; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.forrajeria_categorias (
    id_categoria integer NOT NULL,
    id_establecimiento integer NOT NULL,
    nombre character varying(100) NOT NULL,
    estado character varying(20) DEFAULT 'activo'::character varying NOT NULL,
    fecha_creacion timestamp without time zone DEFAULT now() NOT NULL,
    fecha_actualizacion timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: forrajeria_categorias_id_categoria_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.forrajeria_categorias_id_categoria_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: forrajeria_categorias_id_categoria_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.forrajeria_categorias_id_categoria_seq OWNED BY public.forrajeria_categorias.id_categoria;


--
-- Name: forrajeria_contactos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.forrajeria_contactos (
    id_contacto integer NOT NULL,
    id_establecimiento integer NOT NULL,
    tipo character varying(20) NOT NULL,
    nombre character varying(150) NOT NULL,
    documento character varying(30),
    telefono character varying(50),
    whatsapp character varying(50),
    email character varying(150),
    direccion character varying(200),
    zona character varying(100),
    limite_credito numeric(14,2) DEFAULT 0 NOT NULL,
    estado character varying(20) DEFAULT 'activo'::character varying NOT NULL,
    fecha_creacion timestamp without time zone DEFAULT now() NOT NULL,
    fecha_actualizacion timestamp without time zone DEFAULT now() NOT NULL,
    es_productor boolean DEFAULT false NOT NULL
);


--
-- Name: forrajeria_contactos_id_contacto_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.forrajeria_contactos_id_contacto_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: forrajeria_contactos_id_contacto_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.forrajeria_contactos_id_contacto_seq OWNED BY public.forrajeria_contactos.id_contacto;


--
-- Name: forrajeria_movimientos_cuenta; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.forrajeria_movimientos_cuenta (
    id_movimiento integer NOT NULL,
    id_establecimiento integer NOT NULL,
    id_contacto integer NOT NULL,
    concepto character varying(200) NOT NULL,
    debe numeric(14,2) DEFAULT 0 NOT NULL,
    haber numeric(14,2) DEFAULT 0 NOT NULL,
    fecha_creacion timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: forrajeria_movimientos_cuenta_id_movimiento_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.forrajeria_movimientos_cuenta_id_movimiento_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: forrajeria_movimientos_cuenta_id_movimiento_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.forrajeria_movimientos_cuenta_id_movimiento_seq OWNED BY public.forrajeria_movimientos_cuenta.id_movimiento;


--
-- Name: forrajeria_movimientos_stock; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.forrajeria_movimientos_stock (
    id_movimiento integer NOT NULL,
    id_establecimiento integer NOT NULL,
    id_producto integer NOT NULL,
    tipo character varying(20) NOT NULL,
    cantidad numeric(14,3) NOT NULL,
    stock_anterior numeric(14,3) NOT NULL,
    stock_nuevo numeric(14,3) NOT NULL,
    motivo character varying(200),
    fecha_creacion timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: forrajeria_movimientos_stock_id_movimiento_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.forrajeria_movimientos_stock_id_movimiento_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: forrajeria_movimientos_stock_id_movimiento_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.forrajeria_movimientos_stock_id_movimiento_seq OWNED BY public.forrajeria_movimientos_stock.id_movimiento;


--
-- Name: forrajeria_pedido_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.forrajeria_pedido_items (
    id_item integer NOT NULL,
    id_pedido integer NOT NULL,
    id_producto integer NOT NULL,
    cantidad numeric(14,3) NOT NULL,
    precio_unitario numeric(14,2) NOT NULL,
    subtotal numeric(14,2) NOT NULL
);


--
-- Name: forrajeria_pedido_items_id_item_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.forrajeria_pedido_items_id_item_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: forrajeria_pedido_items_id_item_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.forrajeria_pedido_items_id_item_seq OWNED BY public.forrajeria_pedido_items.id_item;


--
-- Name: forrajeria_pedidos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.forrajeria_pedidos (
    id_pedido integer NOT NULL,
    id_establecimiento integer NOT NULL,
    id_cliente integer NOT NULL,
    estado character varying(20) DEFAULT 'pendiente'::character varying NOT NULL,
    subtotal numeric(14,2) DEFAULT 0 NOT NULL,
    total numeric(14,2) DEFAULT 0 NOT NULL,
    forma_entrega character varying(20) DEFAULT 'retiro'::character varying NOT NULL,
    direccion_entrega character varying(200),
    zona_entrega character varying(100),
    observaciones text,
    fecha_creacion timestamp without time zone DEFAULT now() NOT NULL,
    fecha_actualizacion timestamp without time zone DEFAULT now() NOT NULL,
    forma_pago character varying(20) DEFAULT 'contado'::character varying NOT NULL
);


--
-- Name: forrajeria_pedidos_id_pedido_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.forrajeria_pedidos_id_pedido_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: forrajeria_pedidos_id_pedido_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.forrajeria_pedidos_id_pedido_seq OWNED BY public.forrajeria_pedidos.id_pedido;


--
-- Name: forrajeria_productos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.forrajeria_productos (
    id_producto integer NOT NULL,
    id_establecimiento integer NOT NULL,
    id_categoria integer,
    nombre character varying(150) NOT NULL,
    sku character varying(50),
    unidad_venta character varying(20) NOT NULL,
    costo numeric(14,2) DEFAULT 0 NOT NULL,
    precio numeric(14,2) DEFAULT 0 NOT NULL,
    stock_actual numeric(14,3) DEFAULT 0 NOT NULL,
    stock_minimo numeric(14,3) DEFAULT 0 NOT NULL,
    lote character varying(80),
    vencimiento date,
    estado character varying(20) DEFAULT 'activo'::character varying NOT NULL,
    fecha_creacion timestamp without time zone DEFAULT now() NOT NULL,
    fecha_actualizacion timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: forrajeria_productos_id_producto_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.forrajeria_productos_id_producto_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: forrajeria_productos_id_producto_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.forrajeria_productos_id_producto_seq OWNED BY public.forrajeria_productos.id_producto;


--
-- Name: invitaciones; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.invitaciones (
    id integer NOT NULL,
    token character varying NOT NULL,
    "establecimientoId" integer NOT NULL,
    rol public.invitaciones_rol_enum DEFAULT 'operario'::public.invitaciones_rol_enum NOT NULL,
    expiracion timestamp without time zone NOT NULL,
    usado boolean DEFAULT false NOT NULL,
    fecha_creacion timestamp without time zone DEFAULT now() NOT NULL,
    email character varying
);


--
-- Name: invitaciones_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.invitaciones_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: invitaciones_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.invitaciones_id_seq OWNED BY public.invitaciones.id;


--
-- Name: madres; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.madres (
    id_madre integer NOT NULL,
    nombre character varying NOT NULL,
    rp_madre integer,
    observaciones character varying,
    fecha_nacimiento date,
    estado character varying NOT NULL,
    id_establecimiento integer,
    id_rodeo integer,
    creado_en timestamp without time zone DEFAULT now() NOT NULL,
    actualizado_en timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: madres_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.madres_history (
    history_id bigint NOT NULL,
    entity_id integer NOT NULL,
    id_establecimiento integer,
    data jsonb NOT NULL,
    operacion character(1) NOT NULL,
    valid_from timestamp with time zone DEFAULT now() NOT NULL,
    valid_to timestamp with time zone
);


--
-- Name: madres_history_history_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.madres_history_history_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: madres_history_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.madres_history_history_id_seq OWNED BY public.madres_history.history_id;


--
-- Name: madres_id_madre_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.madres_id_madre_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: madres_id_madre_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.madres_id_madre_seq OWNED BY public.madres.id_madre;


--
-- Name: madres_padres; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.madres_padres (
    madre_id integer NOT NULL,
    padre_id integer NOT NULL
);


--
-- Name: madres_semen; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.madres_semen (
    madre_id integer NOT NULL,
    semen_id integer NOT NULL
);


--
-- Name: migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.migrations (
    id integer NOT NULL,
    "timestamp" bigint NOT NULL,
    name character varying NOT NULL
);


--
-- Name: migrations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.migrations_id_seq OWNED BY public.migrations.id;


--
-- Name: padres; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.padres (
    id_padre integer NOT NULL,
    nombre character varying NOT NULL,
    rp_padre integer NOT NULL,
    estado public.padres_estado_enum NOT NULL,
    observaciones character varying NOT NULL,
    semen character varying NOT NULL,
    fecha_nacimiento date NOT NULL
);


--
-- Name: padres_id_padre_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.padres_id_padre_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: padres_id_padre_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.padres_id_padre_seq OWNED BY public.padres.id_padre;


--
-- Name: registro_litros; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.registro_litros (
    id_registro integer NOT NULL,
    id_establecimiento integer NOT NULL,
    fecha date NOT NULL,
    litros_vendido numeric DEFAULT 0 NOT NULL,
    litros_terneros numeric DEFAULT 0 NOT NULL,
    observaciones character varying,
    creado_en timestamp without time zone DEFAULT now() NOT NULL,
    actualizado_en timestamp without time zone DEFAULT now() NOT NULL,
    cantidad_vacas integer
);


--
-- Name: registro_litros_id_registro_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.registro_litros_id_registro_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: registro_litros_id_registro_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.registro_litros_id_registro_seq OWNED BY public.registro_litros.id_registro;


--
-- Name: rodeo_dietas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rodeo_dietas (
    id_dieta integer NOT NULL,
    id_rodeo integer NOT NULL,
    id_establecimiento integer NOT NULL,
    modo character varying(20) NOT NULL,
    nota text,
    kg_por_animal numeric,
    nombre character varying,
    creado_en timestamp without time zone DEFAULT now() NOT NULL,
    actualizado_en timestamp without time zone DEFAULT now() NOT NULL,
    ingredientes jsonb
);


--
-- Name: rodeo_dietas_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rodeo_dietas_history (
    history_id bigint NOT NULL,
    entity_id integer NOT NULL,
    id_establecimiento integer,
    data jsonb NOT NULL,
    operacion character(1) NOT NULL,
    valid_from timestamp with time zone DEFAULT now() NOT NULL,
    valid_to timestamp with time zone
);


--
-- Name: rodeo_dietas_history_history_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.rodeo_dietas_history_history_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: rodeo_dietas_history_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.rodeo_dietas_history_history_id_seq OWNED BY public.rodeo_dietas_history.history_id;


--
-- Name: rodeo_dietas_id_dieta_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.rodeo_dietas_id_dieta_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: rodeo_dietas_id_dieta_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.rodeo_dietas_id_dieta_seq OWNED BY public.rodeo_dietas.id_dieta;


--
-- Name: rodeos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rodeos (
    id_rodeo integer NOT NULL,
    nombre character varying(100) NOT NULL,
    descripcion text,
    tipo character varying(50),
    fecha_creacion date DEFAULT ('now'::text)::date NOT NULL,
    id_establecimiento integer NOT NULL,
    estado character varying(20) DEFAULT 'activo'::character varying NOT NULL,
    fecha_actualizacion timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: rodeos_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rodeos_history (
    history_id bigint NOT NULL,
    entity_id integer NOT NULL,
    id_establecimiento integer,
    data jsonb NOT NULL,
    operacion character(1) NOT NULL,
    valid_from timestamp with time zone DEFAULT now() NOT NULL,
    valid_to timestamp with time zone
);


--
-- Name: rodeos_history_history_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.rodeos_history_history_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: rodeos_history_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.rodeos_history_history_id_seq OWNED BY public.rodeos_history.history_id;


--
-- Name: rodeos_id_rodeo_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.rodeos_id_rodeo_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: rodeos_id_rodeo_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.rodeos_id_rodeo_seq OWNED BY public.rodeos.id_rodeo;


--
-- Name: semen; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.semen (
    id_semen integer NOT NULL,
    nombre_toro character varying NOT NULL,
    rp_toro integer NOT NULL,
    estado public.semen_estado_enum NOT NULL,
    observaciones character varying NOT NULL,
    identificador_pajuela character varying NOT NULL,
    fecha_nacimiento date NOT NULL
);


--
-- Name: semen_id_semen_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.semen_id_semen_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: semen_id_semen_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.semen_id_semen_seq OWNED BY public.semen.id_semen;


--
-- Name: ternero_calostrados; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ternero_calostrados (
    id_calostrado integer NOT NULL,
    id_ternero integer NOT NULL,
    id_establecimiento integer NOT NULL,
    fecha_hora timestamp without time zone NOT NULL,
    metodo character varying(20) NOT NULL,
    litros numeric(8,2) NOT NULL,
    grado_brix numeric(5,2),
    observaciones text,
    creado_por integer,
    creado_en timestamp without time zone DEFAULT now() NOT NULL,
    actualizado_en timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT ternero_calostrados_grado_brix_check CHECK (((grado_brix IS NULL) OR ((grado_brix >= (0)::numeric) AND (grado_brix <= (50)::numeric)))),
    CONSTRAINT ternero_calostrados_metodo_check CHECK (((metodo)::text = ANY (ARRAY[('mamadera'::character varying)::text, ('sonda'::character varying)::text])))
);


--
-- Name: ternero_calostrados_id_calostrado_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.ternero_calostrados_id_calostrado_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ternero_calostrados_id_calostrado_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.ternero_calostrados_id_calostrado_seq OWNED BY public.ternero_calostrados.id_calostrado;


--
-- Name: ternero_pesajes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ternero_pesajes (
    id_pesaje integer NOT NULL,
    id_ternero integer NOT NULL,
    id_establecimiento integer NOT NULL,
    fecha date NOT NULL,
    peso numeric(8,2) NOT NULL,
    observaciones text,
    creado_por integer,
    creado_en timestamp without time zone DEFAULT now() NOT NULL,
    actualizado_en timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: ternero_pesajes_id_pesaje_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.ternero_pesajes_id_pesaje_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ternero_pesajes_id_pesaje_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.ternero_pesajes_id_pesaje_seq OWNED BY public.ternero_pesajes.id_pesaje;


--
-- Name: terneros; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.terneros (
    id_ternero integer NOT NULL,
    rp_ternero integer NOT NULL,
    sexo public.terneros_sexo_enum NOT NULL,
    estado character varying NOT NULL,
    peso_nacer double precision NOT NULL,
    peso_15d double precision DEFAULT '0'::double precision,
    peso_30d double precision DEFAULT '0'::double precision,
    peso_45d double precision DEFAULT '0'::double precision,
    peso_largado double precision DEFAULT '0'::double precision,
    observaciones character varying,
    fecha_nacimiento date NOT NULL,
    id_madre integer,
    semen character varying,
    peso_ideal double precision,
    estimativo text,
    litros_calostrado double precision,
    fecha_hora_calostrado timestamp without time zone,
    observaciones_calostrado text,
    metodo_calostrado public.terneros_metodo_calostrado_enum,
    grado_brix numeric(4,2),
    id_establecimiento integer,
    id_rodeo integer,
    creado_en timestamp without time zone DEFAULT now() NOT NULL,
    actualizado_en timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: terneros_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.terneros_history (
    history_id bigint NOT NULL,
    entity_id integer NOT NULL,
    id_establecimiento integer,
    data jsonb NOT NULL,
    operacion character(1) NOT NULL,
    valid_from timestamp with time zone DEFAULT now() NOT NULL,
    valid_to timestamp with time zone
);


--
-- Name: terneros_history_history_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.terneros_history_history_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: terneros_history_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.terneros_history_history_id_seq OWNED BY public.terneros_history.history_id;


--
-- Name: terneros_id_ternero_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.terneros_id_ternero_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: terneros_id_ternero_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.terneros_id_ternero_seq OWNED BY public.terneros.id_ternero;


--
-- Name: terneros_tratamientos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.terneros_tratamientos (
    id_ternero_tratamiento integer NOT NULL,
    fecha_aplicacion date NOT NULL,
    id_ternero integer,
    id_tratamiento integer
);


--
-- Name: terneros_tratamientos_id_ternero_tratamiento_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.terneros_tratamientos_id_ternero_tratamiento_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: terneros_tratamientos_id_ternero_tratamiento_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.terneros_tratamientos_id_ternero_tratamiento_seq OWNED BY public.terneros_tratamientos.id_ternero_tratamiento;


--
-- Name: tratamientos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tratamientos (
    id_tratamiento integer NOT NULL,
    nombre character varying(255) NOT NULL,
    descripcion character varying(255) NOT NULL,
    fecha_tratamiento date NOT NULL,
    turno public.tratamientos_turno_enum DEFAULT 'mañana'::public.tratamientos_turno_enum NOT NULL,
    tipo_enfermedad character varying(255),
    id_ternero integer,
    id_establecimiento integer
);


--
-- Name: tratamientos_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tratamientos_history (
    history_id bigint NOT NULL,
    entity_id integer NOT NULL,
    id_establecimiento integer,
    data jsonb NOT NULL,
    operacion character(1) NOT NULL,
    valid_from timestamp with time zone DEFAULT now() NOT NULL,
    valid_to timestamp with time zone
);


--
-- Name: tratamientos_history_history_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.tratamientos_history_history_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: tratamientos_history_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.tratamientos_history_history_id_seq OWNED BY public.tratamientos_history.history_id;


--
-- Name: tratamientos_id_tratamiento_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.tratamientos_id_tratamiento_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: tratamientos_id_tratamiento_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.tratamientos_id_tratamiento_seq OWNED BY public.tratamientos.id_tratamiento;


--
-- Name: user_establecimientos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_establecimientos (
    id integer NOT NULL,
    "userId" integer NOT NULL,
    "establecimientoId" integer NOT NULL,
    rol character varying(30) DEFAULT 'operario'::character varying
);


--
-- Name: user_establecimientos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.user_establecimientos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: user_establecimientos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.user_establecimientos_id_seq OWNED BY public.user_establecimientos.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    email character varying(100) NOT NULL,
    password character varying(500) NOT NULL,
    telefono character varying(20),
    permisos_especiales text,
    fecha_creacion timestamp without time zone DEFAULT now() NOT NULL,
    fecha_actualizacion timestamp without time zone DEFAULT now() NOT NULL,
    ultimo_acceso timestamp without time zone,
    id_establecimiento integer,
    rol character varying(20) DEFAULT 'operario'::character varying NOT NULL,
    estado character varying(20) DEFAULT 'activo'::character varying NOT NULL,
    bot_establecimiento_id integer,
    bot_link_token_expires timestamp without time zone,
    bot_link_token character varying(8),
    password_reset_jti character varying(36),
    email_verificado boolean DEFAULT true NOT NULL,
    bot_establecimiento_at timestamp without time zone,
    bot_pendiente text,
    bot_pendiente_at timestamp without time zone
);


--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: alerts_config id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alerts_config ALTER COLUMN id SET DEFAULT nextval('public.alerts_config_id_seq'::regclass);


--
-- Name: calculo_sustituto id_calculo; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calculo_sustituto ALTER COLUMN id_calculo SET DEFAULT nextval('public.calculo_sustituto_id_calculo_seq'::regclass);


--
-- Name: diarrea_terneros id_diarrea_ternero; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.diarrea_terneros ALTER COLUMN id_diarrea_ternero SET DEFAULT nextval('public.diarrea_terneros_id_diarrea_ternero_seq'::regclass);


--
-- Name: establecimientos id_establecimiento; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.establecimientos ALTER COLUMN id_establecimiento SET DEFAULT nextval('public.establecimientos_id_establecimiento_seq'::regclass);


--
-- Name: eventos id_evento; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.eventos ALTER COLUMN id_evento SET DEFAULT nextval('public.eventos_id_evento_seq'::regclass);


--
-- Name: eventos_history history_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.eventos_history ALTER COLUMN history_id SET DEFAULT nextval('public.eventos_history_history_id_seq'::regclass);


--
-- Name: forrajeria_categorias id_categoria; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forrajeria_categorias ALTER COLUMN id_categoria SET DEFAULT nextval('public.forrajeria_categorias_id_categoria_seq'::regclass);


--
-- Name: forrajeria_contactos id_contacto; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forrajeria_contactos ALTER COLUMN id_contacto SET DEFAULT nextval('public.forrajeria_contactos_id_contacto_seq'::regclass);


--
-- Name: forrajeria_movimientos_cuenta id_movimiento; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forrajeria_movimientos_cuenta ALTER COLUMN id_movimiento SET DEFAULT nextval('public.forrajeria_movimientos_cuenta_id_movimiento_seq'::regclass);


--
-- Name: forrajeria_movimientos_stock id_movimiento; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forrajeria_movimientos_stock ALTER COLUMN id_movimiento SET DEFAULT nextval('public.forrajeria_movimientos_stock_id_movimiento_seq'::regclass);


--
-- Name: forrajeria_pedido_items id_item; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forrajeria_pedido_items ALTER COLUMN id_item SET DEFAULT nextval('public.forrajeria_pedido_items_id_item_seq'::regclass);


--
-- Name: forrajeria_pedidos id_pedido; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forrajeria_pedidos ALTER COLUMN id_pedido SET DEFAULT nextval('public.forrajeria_pedidos_id_pedido_seq'::regclass);


--
-- Name: forrajeria_productos id_producto; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forrajeria_productos ALTER COLUMN id_producto SET DEFAULT nextval('public.forrajeria_productos_id_producto_seq'::regclass);


--
-- Name: invitaciones id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invitaciones ALTER COLUMN id SET DEFAULT nextval('public.invitaciones_id_seq'::regclass);


--
-- Name: madres id_madre; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.madres ALTER COLUMN id_madre SET DEFAULT nextval('public.madres_id_madre_seq'::regclass);


--
-- Name: madres_history history_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.madres_history ALTER COLUMN history_id SET DEFAULT nextval('public.madres_history_history_id_seq'::regclass);


--
-- Name: migrations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.migrations ALTER COLUMN id SET DEFAULT nextval('public.migrations_id_seq'::regclass);


--
-- Name: padres id_padre; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.padres ALTER COLUMN id_padre SET DEFAULT nextval('public.padres_id_padre_seq'::regclass);


--
-- Name: registro_litros id_registro; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.registro_litros ALTER COLUMN id_registro SET DEFAULT nextval('public.registro_litros_id_registro_seq'::regclass);


--
-- Name: rodeo_dietas id_dieta; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rodeo_dietas ALTER COLUMN id_dieta SET DEFAULT nextval('public.rodeo_dietas_id_dieta_seq'::regclass);


--
-- Name: rodeo_dietas_history history_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rodeo_dietas_history ALTER COLUMN history_id SET DEFAULT nextval('public.rodeo_dietas_history_history_id_seq'::regclass);


--
-- Name: rodeos id_rodeo; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rodeos ALTER COLUMN id_rodeo SET DEFAULT nextval('public.rodeos_id_rodeo_seq'::regclass);


--
-- Name: rodeos_history history_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rodeos_history ALTER COLUMN history_id SET DEFAULT nextval('public.rodeos_history_history_id_seq'::regclass);


--
-- Name: semen id_semen; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.semen ALTER COLUMN id_semen SET DEFAULT nextval('public.semen_id_semen_seq'::regclass);


--
-- Name: ternero_calostrados id_calostrado; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ternero_calostrados ALTER COLUMN id_calostrado SET DEFAULT nextval('public.ternero_calostrados_id_calostrado_seq'::regclass);


--
-- Name: ternero_pesajes id_pesaje; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ternero_pesajes ALTER COLUMN id_pesaje SET DEFAULT nextval('public.ternero_pesajes_id_pesaje_seq'::regclass);


--
-- Name: terneros id_ternero; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.terneros ALTER COLUMN id_ternero SET DEFAULT nextval('public.terneros_id_ternero_seq'::regclass);


--
-- Name: terneros_history history_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.terneros_history ALTER COLUMN history_id SET DEFAULT nextval('public.terneros_history_history_id_seq'::regclass);


--
-- Name: terneros_tratamientos id_ternero_tratamiento; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.terneros_tratamientos ALTER COLUMN id_ternero_tratamiento SET DEFAULT nextval('public.terneros_tratamientos_id_ternero_tratamiento_seq'::regclass);


--
-- Name: tratamientos id_tratamiento; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tratamientos ALTER COLUMN id_tratamiento SET DEFAULT nextval('public.tratamientos_id_tratamiento_seq'::regclass);


--
-- Name: tratamientos_history history_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tratamientos_history ALTER COLUMN history_id SET DEFAULT nextval('public.tratamientos_history_history_id_seq'::regclass);


--
-- Name: user_establecimientos id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_establecimientos ALTER COLUMN id SET DEFAULT nextval('public.user_establecimientos_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: eventos_terneros PK_025759f1c4ed3847908c1f1d39b; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.eventos_terneros
    ADD CONSTRAINT "PK_025759f1c4ed3847908c1f1d39b" PRIMARY KEY (evento_id, ternero_id);


--
-- Name: padres PK_128312dd4572aee505601aaeb4b; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.padres
    ADD CONSTRAINT "PK_128312dd4572aee505601aaeb4b" PRIMARY KEY (id_padre);


--
-- Name: invitaciones PK_224c1573f98dbf3c1c825bc447f; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invitaciones
    ADD CONSTRAINT "PK_224c1573f98dbf3c1c825bc447f" PRIMARY KEY (id);


--
-- Name: terneros PK_32b88bc5b83ff1af222e79d1d7c; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.terneros
    ADD CONSTRAINT "PK_32b88bc5b83ff1af222e79d1d7c" PRIMARY KEY (id_ternero);


--
-- Name: alerts_config PK_3830be82bb20ff01a38604e931c; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alerts_config
    ADD CONSTRAINT "PK_3830be82bb20ff01a38604e931c" PRIMARY KEY (id);


--
-- Name: terneros_tratamientos PK_44a832d7ff53b5f3b245d5fab24; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.terneros_tratamientos
    ADD CONSTRAINT "PK_44a832d7ff53b5f3b245d5fab24" PRIMARY KEY (id_ternero_tratamiento);


--
-- Name: eventos PK_49a3943f75e853f1760cde84e5c; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.eventos
    ADD CONSTRAINT "PK_49a3943f75e853f1760cde84e5c" PRIMARY KEY (id_evento);


--
-- Name: diarrea_terneros PK_64bb3f1fff3db03c2fd474495e2; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.diarrea_terneros
    ADD CONSTRAINT "PK_64bb3f1fff3db03c2fd474495e2" PRIMARY KEY (id_diarrea_ternero);


--
-- Name: establecimientos PK_72e4d1cfe352181f2b1fdc46d09; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.establecimientos
    ADD CONSTRAINT "PK_72e4d1cfe352181f2b1fdc46d09" PRIMARY KEY (id_establecimiento);


--
-- Name: tratamientos PK_7d2021e1aefdf08cddf2692d7af; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tratamientos
    ADD CONSTRAINT "PK_7d2021e1aefdf08cddf2692d7af" PRIMARY KEY (id_tratamiento);


--
-- Name: user_establecimientos PK_89f29d2e910f689a9f4b9c31dd3; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_establecimientos
    ADD CONSTRAINT "PK_89f29d2e910f689a9f4b9c31dd3" PRIMARY KEY (id);


--
-- Name: migrations PK_8c82d7f526340ab734260ea46be; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.migrations
    ADD CONSTRAINT "PK_8c82d7f526340ab734260ea46be" PRIMARY KEY (id);


--
-- Name: semen PK_8e4de9daaa0ac033ac5d978e45e; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.semen
    ADD CONSTRAINT "PK_8e4de9daaa0ac033ac5d978e45e" PRIMARY KEY (id_semen);


--
-- Name: madres_padres PK_914f9842a2d2b3935adfdcf08db; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.madres_padres
    ADD CONSTRAINT "PK_914f9842a2d2b3935adfdcf08db" PRIMARY KEY (madre_id, padre_id);


--
-- Name: eventos_madres PK_a25a55f4dc9fc02d2b28e0d4790; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.eventos_madres
    ADD CONSTRAINT "PK_a25a55f4dc9fc02d2b28e0d4790" PRIMARY KEY (evento_id, madre_id);


--
-- Name: users PK_a3ffb1c0c8416b9fc6f907b7433; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY (id);


--
-- Name: madres PK_cebc28c376748f9b3efb36d4c75; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.madres
    ADD CONSTRAINT "PK_cebc28c376748f9b3efb36d4c75" PRIMARY KEY (id_madre);


--
-- Name: madres_semen PK_f8424ff21ba55cf835cba119b2c; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.madres_semen
    ADD CONSTRAINT "PK_f8424ff21ba55cf835cba119b2c" PRIMARY KEY (madre_id, semen_id);


--
-- Name: alerts_config UQ_4ccb486b47dbdd8f113e4fe84af; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alerts_config
    ADD CONSTRAINT "UQ_4ccb486b47dbdd8f113e4fe84af" UNIQUE ("userId");


--
-- Name: users UQ_b04127989401368478678209bc4; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT "UQ_b04127989401368478678209bc4" UNIQUE (telefono);


--
-- Name: invitaciones UQ_eec7069e2883bb38a63800f8214; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invitaciones
    ADD CONSTRAINT "UQ_eec7069e2883bb38a63800f8214" UNIQUE (token);


--
-- Name: calculo_sustituto calculo_sustituto_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calculo_sustituto
    ADD CONSTRAINT calculo_sustituto_pkey PRIMARY KEY (id_calculo);


--
-- Name: eventos_history eventos_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.eventos_history
    ADD CONSTRAINT eventos_history_pkey PRIMARY KEY (history_id);


--
-- Name: forrajeria_categorias forrajeria_categorias_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forrajeria_categorias
    ADD CONSTRAINT forrajeria_categorias_pkey PRIMARY KEY (id_categoria);


--
-- Name: forrajeria_contactos forrajeria_contactos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forrajeria_contactos
    ADD CONSTRAINT forrajeria_contactos_pkey PRIMARY KEY (id_contacto);


--
-- Name: forrajeria_movimientos_cuenta forrajeria_movimientos_cuenta_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forrajeria_movimientos_cuenta
    ADD CONSTRAINT forrajeria_movimientos_cuenta_pkey PRIMARY KEY (id_movimiento);


--
-- Name: forrajeria_movimientos_stock forrajeria_movimientos_stock_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forrajeria_movimientos_stock
    ADD CONSTRAINT forrajeria_movimientos_stock_pkey PRIMARY KEY (id_movimiento);


--
-- Name: forrajeria_pedido_items forrajeria_pedido_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forrajeria_pedido_items
    ADD CONSTRAINT forrajeria_pedido_items_pkey PRIMARY KEY (id_item);


--
-- Name: forrajeria_pedidos forrajeria_pedidos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forrajeria_pedidos
    ADD CONSTRAINT forrajeria_pedidos_pkey PRIMARY KEY (id_pedido);


--
-- Name: forrajeria_productos forrajeria_productos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forrajeria_productos
    ADD CONSTRAINT forrajeria_productos_pkey PRIMARY KEY (id_producto);


--
-- Name: madres_history madres_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.madres_history
    ADD CONSTRAINT madres_history_pkey PRIMARY KEY (history_id);


--
-- Name: registro_litros registro_litros_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.registro_litros
    ADD CONSTRAINT registro_litros_pkey PRIMARY KEY (id_registro);


--
-- Name: rodeo_dietas_history rodeo_dietas_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rodeo_dietas_history
    ADD CONSTRAINT rodeo_dietas_history_pkey PRIMARY KEY (history_id);


--
-- Name: rodeo_dietas rodeo_dietas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rodeo_dietas
    ADD CONSTRAINT rodeo_dietas_pkey PRIMARY KEY (id_dieta);


--
-- Name: rodeos_history rodeos_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rodeos_history
    ADD CONSTRAINT rodeos_history_pkey PRIMARY KEY (history_id);


--
-- Name: rodeos rodeos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rodeos
    ADD CONSTRAINT rodeos_pkey PRIMARY KEY (id_rodeo);


--
-- Name: ternero_calostrados ternero_calostrados_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ternero_calostrados
    ADD CONSTRAINT ternero_calostrados_pkey PRIMARY KEY (id_calostrado);


--
-- Name: ternero_pesajes ternero_pesajes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ternero_pesajes
    ADD CONSTRAINT ternero_pesajes_pkey PRIMARY KEY (id_pesaje);


--
-- Name: terneros_history terneros_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.terneros_history
    ADD CONSTRAINT terneros_history_pkey PRIMARY KEY (history_id);


--
-- Name: tratamientos_history tratamientos_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tratamientos_history
    ADD CONSTRAINT tratamientos_history_pkey PRIMARY KEY (history_id);


--
-- Name: ternero_pesajes uq_ternero_pesaje_fecha; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ternero_pesajes
    ADD CONSTRAINT uq_ternero_pesaje_fecha UNIQUE (id_ternero, fecha);


--
-- Name: IDX_07c8c3f96a03617904ea2c1f11; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_07c8c3f96a03617904ea2c1f11" ON public.eventos_terneros USING btree (ternero_id);


--
-- Name: IDX_0b8d70da969a53d15b284819ac; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_0b8d70da969a53d15b284819ac" ON public.madres_semen USING btree (semen_id);


--
-- Name: IDX_1f5e6e3240f9e61a40adbb3fa0; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_1f5e6e3240f9e61a40adbb3fa0" ON public.eventos_madres USING btree (madre_id);


--
-- Name: IDX_37fc82274aa48c590fed210d31; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_37fc82274aa48c590fed210d31" ON public.eventos_terneros USING btree (evento_id);


--
-- Name: IDX_458fa25f9094c349c55a479430; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_458fa25f9094c349c55a479430" ON public.madres USING btree (id_establecimiento);


--
-- Name: IDX_58eed96fc874deeb0216090efb; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_58eed96fc874deeb0216090efb" ON public.terneros USING btree (id_establecimiento);


--
-- Name: IDX_5e83c48698ea17e1a71e57140a; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_5e83c48698ea17e1a71e57140a" ON public.eventos_madres USING btree (evento_id);


--
-- Name: IDX_61a9cfcb827b9b501ec617cc48; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_61a9cfcb827b9b501ec617cc48" ON public.madres_semen USING btree (madre_id);


--
-- Name: IDX_6e57fd7b3197e7e51f493ae14c; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_6e57fd7b3197e7e51f493ae14c" ON public.madres USING btree (rp_madre);


--
-- Name: IDX_6eb71bffad8bfa64d15e3ec680; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_6eb71bffad8bfa64d15e3ec680" ON public.tratamientos USING btree (id_establecimiento);


--
-- Name: IDX_75b02be1d4c1866194bdcf0f51; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_75b02be1d4c1866194bdcf0f51" ON public.eventos USING btree (id_establecimiento);


--
-- Name: IDX_85d601c0efb06ed1cd8c42ae4d; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_85d601c0efb06ed1cd8c42ae4d" ON public.madres_padres USING btree (padre_id);


--
-- Name: IDX_a0708625c4db559524e93579d5; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_a0708625c4db559524e93579d5" ON public.terneros USING btree (rp_ternero);


--
-- Name: IDX_b419d88526e0631a6f603f296d; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_b419d88526e0631a6f603f296d" ON public.diarrea_terneros USING btree (id_establecimiento);


--
-- Name: IDX_cd0ead34c7c3c4c8c0fcffb7d3; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_cd0ead34c7c3c4c8c0fcffb7d3" ON public.madres_padres USING btree (madre_id);


--
-- Name: IDX_e24f0c3a5713ca3a62738569c7; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_e24f0c3a5713ca3a62738569c7" ON public.rodeos USING btree (id_establecimiento);


--
-- Name: email_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX email_unique ON public.users USING btree (email);


--
-- Name: idx_forrajeria_contactos_org_tipo_nombre; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_forrajeria_contactos_org_tipo_nombre ON public.forrajeria_contactos USING btree (id_establecimiento, tipo, nombre);


--
-- Name: idx_forrajeria_cuentas_org_contacto; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_forrajeria_cuentas_org_contacto ON public.forrajeria_movimientos_cuenta USING btree (id_establecimiento, id_contacto, fecha_creacion);


--
-- Name: idx_forrajeria_movimientos_org_producto; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_forrajeria_movimientos_org_producto ON public.forrajeria_movimientos_stock USING btree (id_establecimiento, id_producto, fecha_creacion);


--
-- Name: idx_forrajeria_pedidos_org_estado; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_forrajeria_pedidos_org_estado ON public.forrajeria_pedidos USING btree (id_establecimiento, estado, fecha_creacion);


--
-- Name: idx_forrajeria_productos_org_nombre; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_forrajeria_productos_org_nombre ON public.forrajeria_productos USING btree (id_establecimiento, nombre);


--
-- Name: idx_registro_litros_estab; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_registro_litros_estab ON public.registro_litros USING btree (id_establecimiento);


--
-- Name: idx_rodeo_dietas_estab; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rodeo_dietas_estab ON public.rodeo_dietas USING btree (id_establecimiento);


--
-- Name: idx_rodeo_dietas_rodeo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rodeo_dietas_rodeo ON public.rodeo_dietas USING btree (id_rodeo);


--
-- Name: idx_ternero_calostrados_establecimiento; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ternero_calostrados_establecimiento ON public.ternero_calostrados USING btree (id_establecimiento);


--
-- Name: idx_ternero_calostrados_ternero_fecha; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ternero_calostrados_ternero_fecha ON public.ternero_calostrados USING btree (id_ternero, fecha_hora);


--
-- Name: idx_ternero_pesajes_establecimiento; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ternero_pesajes_establecimiento ON public.ternero_pesajes USING btree (id_establecimiento);


--
-- Name: ix_calculo_sustituto_estab; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_calculo_sustituto_estab ON public.calculo_sustituto USING btree (id_establecimiento);


--
-- Name: ix_eventos_history_lookup; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_eventos_history_lookup ON public.eventos_history USING btree (id_establecimiento, entity_id, valid_from);


--
-- Name: ix_eventos_history_period; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_eventos_history_period ON public.eventos_history USING btree (id_establecimiento, valid_from);


--
-- Name: ix_madres_history_lookup; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_madres_history_lookup ON public.madres_history USING btree (id_establecimiento, entity_id, valid_from);


--
-- Name: ix_madres_history_period; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_madres_history_period ON public.madres_history USING btree (id_establecimiento, valid_from);


--
-- Name: ix_rodeo_dietas_history_lookup; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_rodeo_dietas_history_lookup ON public.rodeo_dietas_history USING btree (id_establecimiento, entity_id, valid_from);


--
-- Name: ix_rodeo_dietas_history_period; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_rodeo_dietas_history_period ON public.rodeo_dietas_history USING btree (id_establecimiento, valid_from);


--
-- Name: ix_rodeos_history_lookup; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_rodeos_history_lookup ON public.rodeos_history USING btree (id_establecimiento, entity_id, valid_from);


--
-- Name: ix_rodeos_history_period; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_rodeos_history_period ON public.rodeos_history USING btree (id_establecimiento, valid_from);


--
-- Name: ix_terneros_history_lookup; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_terneros_history_lookup ON public.terneros_history USING btree (id_establecimiento, entity_id, valid_from);


--
-- Name: ix_terneros_history_period; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_terneros_history_period ON public.terneros_history USING btree (id_establecimiento, valid_from);


--
-- Name: ix_tratamientos_history_lookup; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_tratamientos_history_lookup ON public.tratamientos_history USING btree (id_establecimiento, entity_id, valid_from);


--
-- Name: ix_tratamientos_history_period; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_tratamientos_history_period ON public.tratamientos_history USING btree (id_establecimiento, valid_from);


--
-- Name: eventos trg_eventos_hist; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_eventos_hist AFTER INSERT OR DELETE OR UPDATE ON public.eventos FOR EACH ROW EXECUTE FUNCTION public.fn_history_capture('id_evento');


--
-- Name: madres trg_madres_hist; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_madres_hist AFTER INSERT OR DELETE OR UPDATE ON public.madres FOR EACH ROW EXECUTE FUNCTION public.fn_history_capture('id_madre');


--
-- Name: rodeo_dietas trg_rodeo_dietas_hist; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_rodeo_dietas_hist AFTER INSERT OR DELETE OR UPDATE ON public.rodeo_dietas FOR EACH ROW EXECUTE FUNCTION public.fn_history_capture('id_dieta');


--
-- Name: rodeos trg_rodeos_hist; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_rodeos_hist AFTER INSERT OR DELETE OR UPDATE ON public.rodeos FOR EACH ROW EXECUTE FUNCTION public.fn_history_capture('id_rodeo');


--
-- Name: terneros trg_terneros_hist; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_terneros_hist AFTER INSERT OR DELETE OR UPDATE ON public.terneros FOR EACH ROW EXECUTE FUNCTION public.fn_history_capture('id_ternero');


--
-- Name: tratamientos trg_tratamientos_hist; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_tratamientos_hist AFTER INSERT OR DELETE OR UPDATE ON public.tratamientos FOR EACH ROW EXECUTE FUNCTION public.fn_history_capture('id_tratamiento');


--
-- Name: rodeos trigger_update_rodeos_timestamp; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_rodeos_timestamp BEFORE UPDATE ON public.rodeos FOR EACH ROW EXECUTE FUNCTION public.update_rodeos_timestamp();


--
-- Name: eventos_terneros FK_07c8c3f96a03617904ea2c1f118; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.eventos_terneros
    ADD CONSTRAINT "FK_07c8c3f96a03617904ea2c1f118" FOREIGN KEY (ternero_id) REFERENCES public.terneros(id_ternero);


--
-- Name: madres_semen FK_0b8d70da969a53d15b284819ac4; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.madres_semen
    ADD CONSTRAINT "FK_0b8d70da969a53d15b284819ac4" FOREIGN KEY (semen_id) REFERENCES public.semen(id_semen);


--
-- Name: terneros FK_0bfd1cdbd781a43194877021d47; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.terneros
    ADD CONSTRAINT "FK_0bfd1cdbd781a43194877021d47" FOREIGN KEY (id_rodeo) REFERENCES public.rodeos(id_rodeo) ON DELETE SET NULL;


--
-- Name: tratamientos FK_1dd3aa65ccb0f503b94b001d4cb; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tratamientos
    ADD CONSTRAINT "FK_1dd3aa65ccb0f503b94b001d4cb" FOREIGN KEY (id_ternero) REFERENCES public.terneros(id_ternero) ON DELETE SET NULL;


--
-- Name: eventos_madres FK_1f5e6e3240f9e61a40adbb3fa05; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.eventos_madres
    ADD CONSTRAINT "FK_1f5e6e3240f9e61a40adbb3fa05" FOREIGN KEY (madre_id) REFERENCES public.madres(id_madre);


--
-- Name: eventos_terneros FK_37fc82274aa48c590fed210d31f; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.eventos_terneros
    ADD CONSTRAINT "FK_37fc82274aa48c590fed210d31f" FOREIGN KEY (evento_id) REFERENCES public.eventos(id_evento) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: diarrea_terneros FK_44e6d4b511f33dce340d15528ba; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.diarrea_terneros
    ADD CONSTRAINT "FK_44e6d4b511f33dce340d15528ba" FOREIGN KEY (id_ternero) REFERENCES public.terneros(id_ternero) ON DELETE SET NULL;


--
-- Name: madres FK_53960ba6d2cb4e4351b845682c6; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.madres
    ADD CONSTRAINT "FK_53960ba6d2cb4e4351b845682c6" FOREIGN KEY (id_rodeo) REFERENCES public.rodeos(id_rodeo);


--
-- Name: eventos_madres FK_5e83c48698ea17e1a71e57140a7; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.eventos_madres
    ADD CONSTRAINT "FK_5e83c48698ea17e1a71e57140a7" FOREIGN KEY (evento_id) REFERENCES public.eventos(id_evento) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: madres_semen FK_61a9cfcb827b9b501ec617cc480; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.madres_semen
    ADD CONSTRAINT "FK_61a9cfcb827b9b501ec617cc480" FOREIGN KEY (madre_id) REFERENCES public.madres(id_madre) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: user_establecimientos FK_7f6b4097d9a59be0b320d1dd588; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_establecimientos
    ADD CONSTRAINT "FK_7f6b4097d9a59be0b320d1dd588" FOREIGN KEY ("userId") REFERENCES public.users(id);


--
-- Name: madres_padres FK_85d601c0efb06ed1cd8c42ae4df; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.madres_padres
    ADD CONSTRAINT "FK_85d601c0efb06ed1cd8c42ae4df" FOREIGN KEY (padre_id) REFERENCES public.padres(id_padre);


--
-- Name: user_establecimientos FK_9fcc09c1de31c2a7475205e0728; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_establecimientos
    ADD CONSTRAINT "FK_9fcc09c1de31c2a7475205e0728" FOREIGN KEY ("establecimientoId") REFERENCES public.establecimientos(id_establecimiento);


--
-- Name: terneros_tratamientos FK_ad288c00b98edd58e3e78f5b25e; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.terneros_tratamientos
    ADD CONSTRAINT "FK_ad288c00b98edd58e3e78f5b25e" FOREIGN KEY (id_ternero) REFERENCES public.terneros(id_ternero) ON DELETE SET NULL;


--
-- Name: terneros_tratamientos FK_b4a0375cde1fb9d252b226f763a; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.terneros_tratamientos
    ADD CONSTRAINT "FK_b4a0375cde1fb9d252b226f763a" FOREIGN KEY (id_tratamiento) REFERENCES public.tratamientos(id_tratamiento) ON DELETE SET NULL;


--
-- Name: madres_padres FK_cd0ead34c7c3c4c8c0fcffb7d31; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.madres_padres
    ADD CONSTRAINT "FK_cd0ead34c7c3c4c8c0fcffb7d31" FOREIGN KEY (madre_id) REFERENCES public.madres(id_madre) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: invitaciones FK_d99dd0e6d6d19a151286a6d5807; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invitaciones
    ADD CONSTRAINT "FK_d99dd0e6d6d19a151286a6d5807" FOREIGN KEY ("establecimientoId") REFERENCES public.establecimientos(id_establecimiento) ON DELETE CASCADE;


--
-- Name: terneros FK_deeb18576f2c7bc77d34b9cdbb1; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.terneros
    ADD CONSTRAINT "FK_deeb18576f2c7bc77d34b9cdbb1" FOREIGN KEY (id_madre) REFERENCES public.madres(id_madre) ON DELETE SET NULL;


--
-- Name: rodeos FK_e24f0c3a5713ca3a62738569c71; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rodeos
    ADD CONSTRAINT "FK_e24f0c3a5713ca3a62738569c71" FOREIGN KEY (id_establecimiento) REFERENCES public.establecimientos(id_establecimiento);


--
-- Name: forrajeria_categorias forrajeria_categorias_id_establecimiento_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forrajeria_categorias
    ADD CONSTRAINT forrajeria_categorias_id_establecimiento_fkey FOREIGN KEY (id_establecimiento) REFERENCES public.establecimientos(id_establecimiento);


--
-- Name: forrajeria_contactos forrajeria_contactos_id_establecimiento_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forrajeria_contactos
    ADD CONSTRAINT forrajeria_contactos_id_establecimiento_fkey FOREIGN KEY (id_establecimiento) REFERENCES public.establecimientos(id_establecimiento);


--
-- Name: forrajeria_movimientos_cuenta forrajeria_movimientos_cuenta_id_contacto_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forrajeria_movimientos_cuenta
    ADD CONSTRAINT forrajeria_movimientos_cuenta_id_contacto_fkey FOREIGN KEY (id_contacto) REFERENCES public.forrajeria_contactos(id_contacto);


--
-- Name: forrajeria_movimientos_cuenta forrajeria_movimientos_cuenta_id_establecimiento_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forrajeria_movimientos_cuenta
    ADD CONSTRAINT forrajeria_movimientos_cuenta_id_establecimiento_fkey FOREIGN KEY (id_establecimiento) REFERENCES public.establecimientos(id_establecimiento);


--
-- Name: forrajeria_movimientos_stock forrajeria_movimientos_stock_id_establecimiento_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forrajeria_movimientos_stock
    ADD CONSTRAINT forrajeria_movimientos_stock_id_establecimiento_fkey FOREIGN KEY (id_establecimiento) REFERENCES public.establecimientos(id_establecimiento);


--
-- Name: forrajeria_movimientos_stock forrajeria_movimientos_stock_id_producto_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forrajeria_movimientos_stock
    ADD CONSTRAINT forrajeria_movimientos_stock_id_producto_fkey FOREIGN KEY (id_producto) REFERENCES public.forrajeria_productos(id_producto);


--
-- Name: forrajeria_pedido_items forrajeria_pedido_items_id_pedido_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forrajeria_pedido_items
    ADD CONSTRAINT forrajeria_pedido_items_id_pedido_fkey FOREIGN KEY (id_pedido) REFERENCES public.forrajeria_pedidos(id_pedido);


--
-- Name: forrajeria_pedido_items forrajeria_pedido_items_id_producto_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forrajeria_pedido_items
    ADD CONSTRAINT forrajeria_pedido_items_id_producto_fkey FOREIGN KEY (id_producto) REFERENCES public.forrajeria_productos(id_producto);


--
-- Name: forrajeria_pedidos forrajeria_pedidos_id_cliente_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forrajeria_pedidos
    ADD CONSTRAINT forrajeria_pedidos_id_cliente_fkey FOREIGN KEY (id_cliente) REFERENCES public.forrajeria_contactos(id_contacto);


--
-- Name: forrajeria_pedidos forrajeria_pedidos_id_establecimiento_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forrajeria_pedidos
    ADD CONSTRAINT forrajeria_pedidos_id_establecimiento_fkey FOREIGN KEY (id_establecimiento) REFERENCES public.establecimientos(id_establecimiento);


--
-- Name: forrajeria_productos forrajeria_productos_id_categoria_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forrajeria_productos
    ADD CONSTRAINT forrajeria_productos_id_categoria_fkey FOREIGN KEY (id_categoria) REFERENCES public.forrajeria_categorias(id_categoria);


--
-- Name: forrajeria_productos forrajeria_productos_id_establecimiento_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forrajeria_productos
    ADD CONSTRAINT forrajeria_productos_id_establecimiento_fkey FOREIGN KEY (id_establecimiento) REFERENCES public.establecimientos(id_establecimiento);


--
-- Name: ternero_calostrados ternero_calostrados_id_ternero_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ternero_calostrados
    ADD CONSTRAINT ternero_calostrados_id_ternero_fkey FOREIGN KEY (id_ternero) REFERENCES public.terneros(id_ternero) ON DELETE CASCADE;


--
-- Name: ternero_pesajes ternero_pesajes_id_ternero_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ternero_pesajes
    ADD CONSTRAINT ternero_pesajes_id_ternero_fkey FOREIGN KEY (id_ternero) REFERENCES public.terneros(id_ternero) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--


INSERT INTO public.migrations VALUES (1, 2026090921000, 'CreateTerneroSeguimiento2026090921000');
INSERT INTO public.migrations VALUES (2, 2026083100010, 'AddTipoOrganizacion2026083100010');
INSERT INTO public.migrations VALUES (3, 2026083100020, 'CreateForrajeriaCatalogoInventario2026083100020');
INSERT INTO public.migrations VALUES (4, 2026083100030, 'CreateForrajeriaContactosCuentas2026083100030');
INSERT INTO public.migrations VALUES (5, 2026083100040, 'CreateForrajeriaVentas2026083100040');
INSERT INTO public.migrations VALUES (6, 2026090200010, 'AddForrajeriaB2BOrderFields2026090200010');
SELECT pg_catalog.setval('public.migrations_id_seq', 6, true);
