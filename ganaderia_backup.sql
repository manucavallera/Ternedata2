--
-- PostgreSQL database dump
--

-- Dumped from database version 16.4
-- Dumped by pg_dump version 16.4

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
-- Name: invitaciones_rol_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.invitaciones_rol_enum AS ENUM (
    'dueno',
    'veterinario',
    'operario'
);


ALTER TYPE public.invitaciones_rol_enum OWNER TO postgres;

--
-- Name: madres_estado_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.madres_estado_enum AS ENUM (
    'Seca',
    'En Tambo'
);


ALTER TYPE public.madres_estado_enum OWNER TO postgres;

--
-- Name: padres_estado_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.padres_estado_enum AS ENUM (
    'Vivo',
    'Muerto'
);


ALTER TYPE public.padres_estado_enum OWNER TO postgres;

--
-- Name: semen_estado_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.semen_estado_enum AS ENUM (
    'Vivo',
    'Muerto'
);


ALTER TYPE public.semen_estado_enum OWNER TO postgres;

--
-- Name: terneros_estado_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.terneros_estado_enum AS ENUM (
    'Vivo',
    'Muerto'
);


ALTER TYPE public.terneros_estado_enum OWNER TO postgres;

--
-- Name: terneros_metodo_calostrado_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.terneros_metodo_calostrado_enum AS ENUM (
    'sonda',
    'mamadera'
);


ALTER TYPE public.terneros_metodo_calostrado_enum OWNER TO postgres;

--
-- Name: terneros_sexo_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.terneros_sexo_enum AS ENUM (
    'Macho',
    'Hembra'
);


ALTER TYPE public.terneros_sexo_enum OWNER TO postgres;

--
-- Name: tratamientos_turno_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.tratamientos_turno_enum AS ENUM (
    'mañana',
    'tarde'
);


ALTER TYPE public.tratamientos_turno_enum OWNER TO postgres;

--
-- Name: user_establecimientos_rol_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.user_establecimientos_rol_enum AS ENUM (
    'dueno',
    'veterinario',
    'operario'
);


ALTER TYPE public.user_establecimientos_rol_enum OWNER TO postgres;

--
-- Name: users_estado_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.users_estado_enum AS ENUM (
    'activo',
    'inactivo'
);


ALTER TYPE public.users_estado_enum OWNER TO postgres;

--
-- Name: users_rol_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.users_rol_enum AS ENUM (
    'admin',
    'veterinario',
    'operario'
);


ALTER TYPE public.users_rol_enum OWNER TO postgres;

--
-- Name: update_rodeos_timestamp(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_rodeos_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.fecha_actualizacion = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_rodeos_timestamp() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: diarrea_terneros; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.diarrea_terneros OWNER TO postgres;

--
-- Name: diarrea_terneros_id_diarrea_ternero_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.diarrea_terneros_id_diarrea_ternero_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.diarrea_terneros_id_diarrea_ternero_seq OWNER TO postgres;

--
-- Name: diarrea_terneros_id_diarrea_ternero_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.diarrea_terneros_id_diarrea_ternero_seq OWNED BY public.diarrea_terneros.id_diarrea_ternero;


--
-- Name: establecimientos; Type: TABLE; Schema: public; Owner: postgres
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
    configuracion json
);


ALTER TABLE public.establecimientos OWNER TO postgres;

--
-- Name: establecimientos_id_establecimiento_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.establecimientos_id_establecimiento_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.establecimientos_id_establecimiento_seq OWNER TO postgres;

--
-- Name: establecimientos_id_establecimiento_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.establecimientos_id_establecimiento_seq OWNED BY public.establecimientos.id_establecimiento;


--
-- Name: eventos; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.eventos (
    id_evento integer NOT NULL,
    fecha_evento date NOT NULL,
    observacion character varying NOT NULL,
    id_establecimiento integer
);


ALTER TABLE public.eventos OWNER TO postgres;

--
-- Name: eventos_id_evento_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.eventos_id_evento_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.eventos_id_evento_seq OWNER TO postgres;

--
-- Name: eventos_id_evento_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.eventos_id_evento_seq OWNED BY public.eventos.id_evento;


--
-- Name: eventos_madres; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.eventos_madres (
    evento_id integer NOT NULL,
    madre_id integer NOT NULL
);


ALTER TABLE public.eventos_madres OWNER TO postgres;

--
-- Name: eventos_terneros; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.eventos_terneros (
    evento_id integer NOT NULL,
    ternero_id integer NOT NULL
);


ALTER TABLE public.eventos_terneros OWNER TO postgres;

--
-- Name: invitaciones; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.invitaciones OWNER TO postgres;

--
-- Name: invitaciones_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.invitaciones_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.invitaciones_id_seq OWNER TO postgres;

--
-- Name: invitaciones_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.invitaciones_id_seq OWNED BY public.invitaciones.id;


--
-- Name: madres; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.madres (
    id_madre integer NOT NULL,
    nombre character varying NOT NULL,
    rp_madre integer NOT NULL,
    observaciones character varying NOT NULL,
    fecha_nacimiento date NOT NULL,
    estado public.madres_estado_enum NOT NULL,
    id_establecimiento integer
);


ALTER TABLE public.madres OWNER TO postgres;

--
-- Name: madres_id_madre_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.madres_id_madre_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.madres_id_madre_seq OWNER TO postgres;

--
-- Name: madres_id_madre_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.madres_id_madre_seq OWNED BY public.madres.id_madre;


--
-- Name: madres_padres; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.madres_padres (
    madre_id integer NOT NULL,
    padre_id integer NOT NULL
);


ALTER TABLE public.madres_padres OWNER TO postgres;

--
-- Name: madres_semen; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.madres_semen (
    madre_id integer NOT NULL,
    semen_id integer NOT NULL
);


ALTER TABLE public.madres_semen OWNER TO postgres;

--
-- Name: padres; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.padres OWNER TO postgres;

--
-- Name: padres_id_padre_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.padres_id_padre_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.padres_id_padre_seq OWNER TO postgres;

--
-- Name: padres_id_padre_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.padres_id_padre_seq OWNED BY public.padres.id_padre;


--
-- Name: rodeos; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.rodeos OWNER TO postgres;

--
-- Name: rodeos_id_rodeo_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.rodeos_id_rodeo_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.rodeos_id_rodeo_seq OWNER TO postgres;

--
-- Name: rodeos_id_rodeo_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.rodeos_id_rodeo_seq OWNED BY public.rodeos.id_rodeo;


--
-- Name: semen; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.semen OWNER TO postgres;

--
-- Name: semen_id_semen_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.semen_id_semen_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.semen_id_semen_seq OWNER TO postgres;

--
-- Name: semen_id_semen_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.semen_id_semen_seq OWNED BY public.semen.id_semen;


--
-- Name: terneros; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.terneros (
    id_ternero integer NOT NULL,
    rp_ternero integer NOT NULL,
    sexo public.terneros_sexo_enum NOT NULL,
    estado public.terneros_estado_enum NOT NULL,
    peso_nacer double precision NOT NULL,
    peso_15d double precision NOT NULL,
    peso_30d double precision NOT NULL,
    peso_45d double precision NOT NULL,
    peso_largado double precision NOT NULL,
    observaciones character varying NOT NULL,
    fecha_nacimiento date NOT NULL,
    id_madre integer,
    semen character varying NOT NULL,
    peso_ideal double precision,
    estimativo text,
    litros_calostrado double precision,
    fecha_hora_calostrado timestamp without time zone,
    observaciones_calostrado text,
    metodo_calostrado public.terneros_metodo_calostrado_enum,
    grado_brix numeric(4,2),
    id_establecimiento integer,
    id_rodeo integer
);


ALTER TABLE public.terneros OWNER TO postgres;

--
-- Name: COLUMN terneros.grado_brix; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.terneros.grado_brix IS 'Grado Brix del calostrado (concentración de azúcares)';


--
-- Name: terneros_id_ternero_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.terneros_id_ternero_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.terneros_id_ternero_seq OWNER TO postgres;

--
-- Name: terneros_id_ternero_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.terneros_id_ternero_seq OWNED BY public.terneros.id_ternero;


--
-- Name: terneros_tratamientos; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.terneros_tratamientos (
    id_ternero_tratamiento integer NOT NULL,
    fecha_aplicacion date NOT NULL,
    id_ternero integer,
    id_tratamiento integer
);


ALTER TABLE public.terneros_tratamientos OWNER TO postgres;

--
-- Name: terneros_tratamientos_id_ternero_tratamiento_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.terneros_tratamientos_id_ternero_tratamiento_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.terneros_tratamientos_id_ternero_tratamiento_seq OWNER TO postgres;

--
-- Name: terneros_tratamientos_id_ternero_tratamiento_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.terneros_tratamientos_id_ternero_tratamiento_seq OWNED BY public.terneros_tratamientos.id_ternero_tratamiento;


--
-- Name: tratamientos; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.tratamientos OWNER TO postgres;

--
-- Name: tratamientos_id_tratamiento_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.tratamientos_id_tratamiento_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.tratamientos_id_tratamiento_seq OWNER TO postgres;

--
-- Name: tratamientos_id_tratamiento_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.tratamientos_id_tratamiento_seq OWNED BY public.tratamientos.id_tratamiento;


--
-- Name: user_establecimientos; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_establecimientos (
    id integer NOT NULL,
    "userId" integer NOT NULL,
    "establecimientoId" integer NOT NULL,
    rol public.user_establecimientos_rol_enum DEFAULT 'operario'::public.user_establecimientos_rol_enum NOT NULL
);


ALTER TABLE public.user_establecimientos OWNER TO postgres;

--
-- Name: user_establecimientos_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.user_establecimientos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_establecimientos_id_seq OWNER TO postgres;

--
-- Name: user_establecimientos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.user_establecimientos_id_seq OWNED BY public.user_establecimientos.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
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
    rol public.users_rol_enum DEFAULT 'operario'::public.users_rol_enum NOT NULL,
    estado public.users_estado_enum DEFAULT 'activo'::public.users_estado_enum NOT NULL
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: diarrea_terneros id_diarrea_ternero; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.diarrea_terneros ALTER COLUMN id_diarrea_ternero SET DEFAULT nextval('public.diarrea_terneros_id_diarrea_ternero_seq'::regclass);


--
-- Name: establecimientos id_establecimiento; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.establecimientos ALTER COLUMN id_establecimiento SET DEFAULT nextval('public.establecimientos_id_establecimiento_seq'::regclass);


--
-- Name: eventos id_evento; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.eventos ALTER COLUMN id_evento SET DEFAULT nextval('public.eventos_id_evento_seq'::regclass);


--
-- Name: invitaciones id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invitaciones ALTER COLUMN id SET DEFAULT nextval('public.invitaciones_id_seq'::regclass);


--
-- Name: madres id_madre; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.madres ALTER COLUMN id_madre SET DEFAULT nextval('public.madres_id_madre_seq'::regclass);


--
-- Name: padres id_padre; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.padres ALTER COLUMN id_padre SET DEFAULT nextval('public.padres_id_padre_seq'::regclass);


--
-- Name: rodeos id_rodeo; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rodeos ALTER COLUMN id_rodeo SET DEFAULT nextval('public.rodeos_id_rodeo_seq'::regclass);


--
-- Name: semen id_semen; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.semen ALTER COLUMN id_semen SET DEFAULT nextval('public.semen_id_semen_seq'::regclass);


--
-- Name: terneros id_ternero; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.terneros ALTER COLUMN id_ternero SET DEFAULT nextval('public.terneros_id_ternero_seq'::regclass);


--
-- Name: terneros_tratamientos id_ternero_tratamiento; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.terneros_tratamientos ALTER COLUMN id_ternero_tratamiento SET DEFAULT nextval('public.terneros_tratamientos_id_ternero_tratamiento_seq'::regclass);


--
-- Name: tratamientos id_tratamiento; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tratamientos ALTER COLUMN id_tratamiento SET DEFAULT nextval('public.tratamientos_id_tratamiento_seq'::regclass);


--
-- Name: user_establecimientos id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_establecimientos ALTER COLUMN id SET DEFAULT nextval('public.user_establecimientos_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Data for Name: diarrea_terneros; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.diarrea_terneros (id_diarrea_ternero, fecha_diarrea_ternero, id_ternero, severidad, numero_episodio, observaciones, id_establecimiento) FROM stdin;
5	2024-06-20	12	Leve	1	Primera diarrea del ternero, tratamiento iniciado	2
6	2024-06-25	13	Moderada	1	Diarrea con deshidrataci¢n leve	2
7	2025-05-02	10	Moderada	1	sdfsdf	1
8	2025-02-02	11	Severa	1	dfgdfg	1
9	2025-05-31	17	Moderada	1	sdfsdf	2
10	2025-08-02	33	Moderada	1	sgdfg	9
11	2026-02-09	35	Moderada	1	Deshidratación leve	1
12	2026-02-09	35	Severa	2	Está deshidratado.	1
13	2026-02-09	35	Severa	3	está bastante deshidratado	1
14	2026-02-12	36	Leve	1	deposiciones líquidas pero come bien	1
15	2026-02-12	35	Crítica	4	Muy mal, completamente deshidratado, necesita atención urgente	1
16	2026-02-12	35	Severa	5	Registrado por bot	1
17	2026-02-12	37	Leve	1	Registrado por bot	1
18	2024-05-13	49	Severa	1	Registrado por bot (manucavallera44)	7
19	2024-05-28	49	Severa	2	Diarrea severa en ternero RP 40	7
20	2026-03-02	49	Severa	3	Diarrea severa en ternero RP 40	7
\.


--
-- Data for Name: establecimientos; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.establecimientos (id_establecimiento, nombre, ubicacion, telefono, responsable, notas, estado, fecha_creacion, fecha_actualizacion, configuracion) FROM stdin;
1	Establecimiento Norte	Paran , Entre R¡os	343-1234567	Juan P‚rez	\N	activo	2025-10-15 10:22:35.78323	2025-10-15 10:22:35.78323	\N
2	Establecimiento Sur	Concordia, Entre R¡os	345-7654321	Mar¡a Garc¡a	\N	activo	2025-10-15 10:22:35.78323	2025-10-15 10:22:35.78323	\N
6	La esperanza	Ruta 15	3434156445655	fsdfsd	fsdf	activo	2025-10-17 09:53:44.179815	2025-10-17 09:53:44.179815	\N
5	Establecimiento Centro	Av. Principal 123	+54 379 4111222	Carlos Rodr¡guez	\N	inactivo	2025-10-17 09:37:17.560728	2025-10-17 09:37:17.560728	\N
3	Establecimiento Norte	Ruta 12, Km 45	+54 379 4123456	Juan Perez		inactivo	2025-10-17 09:37:17.560728	2025-10-17 14:15:39.670476	\N
4	Establecimiento Sur	Camino Rural 8	+54 379 4567890	Maria Gonz lez		inactivo	2025-10-17 09:37:17.560728	2025-10-17 14:15:47.479082	\N
8	La esperanza	Ruta 15	+575234234	Robert martinez	sdfsdf	activo	2026-01-15 15:35:27.968705	2026-01-15 15:35:27.968705	\N
9	uoco	ruta 20	235235235	juan	sdfsd	activo	2026-01-15 15:46:04.518584	2026-01-15 15:46:04.518584	\N
7	Estancia Durazno	Ruta 15	34345655751	Roberto frutos		activo	2026-01-07 11:55:24.398819	2026-01-19 10:04:36.613217	{"umbral_mortalidad":6,"umbral_morbilidad":13}
10	estancia las nubes	Ruta 29	32234234	sdfsdfs	sdfsdf	activo	2026-01-15 16:08:41.180988	2026-01-19 18:03:22.527599	{"umbral_mortalidad":8,"umbral_morbilidad":22}
\.


--
-- Data for Name: eventos; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.eventos (id_evento, fecha_evento, observacion, id_establecimiento) FROM stdin;
3	2025-02-04	fgd	1
13	2025-02-02	sdfsdf	1
14	2025-06-02	dfgdfg	1
15	2025-04-02	fdgd	1
16	2025-05-01	sdfsdf	1
17	2025-10-09	sdfsdf	1
18	2024-05-16	Vacunación contra Aftosa	1
19	2024-05-15	Vacunación	1
20	2024-05-16	Vacunación	1
21	2026-01-05	Vacunación	1
22	2024-05-15	Tacto rectal	1
23	2024-05-15	Tacto Rectal	1
24	2024-07-29	Tacto Rectal	1
25	2023-10-27	Tacto Rectal	1
26	2023-10-25	Tacto Rectal	1
27	2023-10-26	Vacuna	1
28	2024-05-15	Tacto	1
29	2024-05-16	Vacunación	1
30	2024-05-15	Tacto	1
31	2024-05-16	Vacunación	1
32	2023-10-26	tacto	1
33	2023-10-27	vacunación	1
34	2024-05-15	hice tacto	1
35	2024-05-16	vacuné	1
36	2023-10-26	tacto	2
37	2023-10-27	vacuné	2
38	2023-10-26	tacto	1
39	2023-10-27	vacuné	1
40	2025-06-02	ghfh	9
41	2026-02-05	Vacunación test bot	1
42	2026-02-09	Vacunación	1
43	2026-02-09	vacunación	1
44	2026-02-12	Tacto	1
45	2026-02-12	Vacunación	1
46	2026-02-12	Vacunación contra brucelosis	1
47	2024-07-29	Está enfermo, tiene mastitis.	1
48	2024-05-14	Tiene mastitis	7
49	2024-05-15	tiene un pique	7
50	2026-03-02	Ternero RP 40 tiene mastitis	7
51	2024-05-15	Vacunación de terneros RP 40 y 50	7
52	2026-03-02	Vacunación de terneros	7
\.


--
-- Data for Name: eventos_madres; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.eventos_madres (evento_id, madre_id) FROM stdin;
3	1
13	1
15	1
16	1
17	1
38	5
40	13
44	1
44	15
46	1
46	15
46	17
\.


--
-- Data for Name: eventos_terneros; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.eventos_terneros (evento_id, ternero_id) FROM stdin;
3	9
13	10
14	10
15	9
16	9
17	9
20	29
21	29
27	29
29	29
31	29
33	29
35	29
39	29
40	33
41	35
43	35
45	36
45	37
47	41
48	49
49	49
50	49
51	49
51	51
52	49
52	51
52	52
\.


--
-- Data for Name: invitaciones; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.invitaciones (id, token, "establecimientoId", rol, expiracion, usado, fecha_creacion, email) FROM stdin;
1	9bbb679d-4774-48e8-b537-13a89b5314a8	7	veterinario	2026-01-16 12:02:55.034	f	2026-01-14 12:02:55.036734	manucavallera12@gmail.com
2	96daaed6-20e5-4456-8d0e-11ae8bc690fa	7	operario	2026-01-16 12:03:58.042	f	2026-01-14 12:03:58.075027	manucavallera44@gmail.com
3	5f38dff8-c387-4260-9fa4-e7fe2cdafb18	7	operario	2026-01-16 12:09:19.911	f	2026-01-14 12:09:19.912574	manucavallera12@gmail.com
4	be033b72-214f-4ce9-8544-3b6e4925bdf9	7	operario	2026-01-16 12:11:35.535	f	2026-01-14 12:11:35.538084	manucavallera44@gmail.com
5	ed99696b-ac8b-414b-bf41-ce89cb749e73	7	operario	2026-01-16 12:13:23.546	f	2026-01-14 12:13:23.579787	manucavallera44@gmail.com
6	b413fb00-4a3e-4f89-8381-a4d1d1af6aa6	7	operario	2026-01-16 12:15:30.624	f	2026-01-14 12:15:30.627517	manucavallera44@gmail.com
7	2d413745-f4ff-4abb-b398-0c6ddc28ef89	7	operario	2026-01-16 12:18:22.937	f	2026-01-14 12:18:22.940614	manucavallera44@gmail.com
8	309042c3-6689-45a1-ad73-00718de59809	7	operario	2026-01-16 12:25:19.83	f	2026-01-14 12:25:19.865007	manucavallera12@gmail.com
9	34ca3df0-e3ac-4163-9b36-10067586cb9b	7	operario	2026-01-16 12:30:22.531	f	2026-01-14 12:30:22.532944	manucavallera12@gmail.com
10	f64fc272-14cf-47d2-b73c-4ad8faca8ea9	7	veterinario	2026-01-16 14:53:00.597	f	2026-01-14 14:53:00.597877	manuheck18@gmail.com
11	b9414bb1-30af-41e5-90b7-9ddfc65e3b55	7	veterinario	2026-01-16 15:24:40.606	f	2026-01-14 15:24:40.609688	manucavallera44+empleado@gmail.com
12	95856a93-7bac-4abd-a09c-9f151d37de7d	10	veterinario	2026-01-21 10:32:58.524	f	2026-01-19 10:32:58.527019	manucavallera44+admin@gmail.com
13	7384b1bb-501e-43b2-9cf8-eeef10755cb4	10	veterinario	2026-01-21 18:18:30.805	f	2026-01-19 18:18:30.809058	manucavallera44+vet3@gmail.com
14	939c7336-7772-4c46-a795-df442177283e	10	veterinario	2026-01-21 18:33:12.533	f	2026-01-19 18:33:12.534442	manucavallera44+pruebaFinal@gmail.com
15	049e03d6-14b0-403b-8e7b-fa9dfa004909	7	veterinario	2026-01-21 19:12:01.678	f	2026-01-19 19:12:01.681288	manucavallera44+vetFinal@gmail.com
16	ade0953e-fb34-4fa6-a4e4-54b037908a0d	7	veterinario	2026-01-21 19:29:24.136	f	2026-01-19 19:29:24.13728	manucavallera44+vetwarrior@gmail.com
17	13eff7b0-7726-4f8a-9340-8d29c11626dd	7	operario	2026-01-21 19:32:02.831	f	2026-01-19 19:32:02.832815	manucavallera44+iriri@gmail.com
18	859fe24d-e94a-4dc3-bd9e-0144d4269fd4	10	veterinario	2026-01-22 16:00:40.511	f	2026-01-20 16:00:40.554609	manucavallera44+test1@gmail.com
19	f0f4639a-dfcf-40a0-901e-614838dfb465	10	veterinario	2026-01-22 16:13:58.753	f	2026-01-20 16:13:58.755392	manucavallera44+solucionado@gmail.com
\.


--
-- Data for Name: madres; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.madres (id_madre, nombre, rp_madre, observaciones, fecha_nacimiento, estado, id_establecimiento) FROM stdin;
1	fran	22	sdfs	2025-06-25	Seca	1
4	Vaca Luna	2001	Madre de prueba Establecimiento Sur	2020-03-15	En Tambo	2
6	Vaca Sol	2003	Madre de prueba Establecimiento Sur	2021-01-10	Seca	2
7	Manu	236	sdfsf	2025-04-02	En Tambo	5
8	Vaca 0	0	Alta automática por IA	2018-01-01	Seca	1
9	La Colorada	888	Alta realizada por IA	2021-05-10	En Tambo	1
5	Vaca Estrella	2002	Madre de prueba Establecimiento Sur	2019-08-22	En Tambo	1
10	fgdfddf	22	sdfsf	2025-04-02	En Tambo	6
11	fgdfddf	232	sdfsf	2025-04-02	Seca	7
12	Maria	22	sdfsdf	2025-05-02	En Tambo	10
13	Juana	23	dfs	2025-05-02	En Tambo	9
15	TestBot	8888	Registrada por bot	2020-01-01	En Tambo	1
16	Luna	555	Registrada por bot	2020-01-01	En Tambo	1
17	Estrella	900	viene del campo vecino	2020-01-01	En Tambo	1
18	Reina	1100	Viene preñada.	2020-01-01	En Tambo	1
\.


--
-- Data for Name: madres_padres; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.madres_padres (madre_id, padre_id) FROM stdin;
\.


--
-- Data for Name: madres_semen; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.madres_semen (madre_id, semen_id) FROM stdin;
\.


--
-- Data for Name: padres; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.padres (id_padre, nombre, rp_padre, estado, observaciones, semen, fecha_nacimiento) FROM stdin;
\.


--
-- Data for Name: rodeos; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.rodeos (id_rodeo, nombre, descripcion, tipo, fecha_creacion, id_establecimiento, estado, fecha_actualizacion) FROM stdin;
1	Rodeo Destete 2024	Terneros destetados en marzo 2024	destete	2025-10-17	1	activo	2025-10-17 16:07:31.39971
3	Cria	Cria	cria	2025-10-22	2	activo	2025-10-28 11:05:53.795822
2	Rodeo Engorde	Engorde	engorde	2025-10-22	1	activo	2025-10-28 11:06:03.181757
4	Rodeo C1	ghjgj	cria	2026-01-15	10	activo	2026-01-15 16:53:55.390821
\.


--
-- Data for Name: semen; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.semen (id_semen, nombre_toro, rp_toro, estado, observaciones, identificador_pajuela, fecha_nacimiento) FROM stdin;
\.


--
-- Data for Name: terneros; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.terneros (id_ternero, rp_ternero, sexo, estado, peso_nacer, peso_15d, peso_30d, peso_45d, peso_largado, observaciones, fecha_nacimiento, id_madre, semen, peso_ideal, estimativo, litros_calostrado, fecha_hora_calostrado, observaciones_calostrado, metodo_calostrado, grado_brix, id_establecimiento, id_rodeo) FROM stdin;
18	12	Macho	Vivo	32	0	0	0	480	sdfsdf	2025-05-01	1	sdfsdf	64		\N	\N	\N	\N	\N	1	\N
20	0	Macho	Vivo	0	0	0	0	0	Ninguna	2025-12-27	1	No especificado	0	\N	\N	\N	\N	\N	\N	1	\N
21	0	Macho	Vivo	0	0	0	0	0	Ninguna	2025-12-27	1	No especificado	0	\N	\N	\N	\N	\N	\N	1	\N
14	3003	Macho	Vivo	38	48	58	68	78	Ternero de prueba Establecimiento Sur	2024-03-10	6	Angus Select	\N	\N	\N	\N	\N	\N	\N	2	\N
15	3004	Hembra	Vivo	33.5	43.5	53.5	63.5	73.5	Ternero de prueba Establecimiento Sur	2024-04-05	4	Holstein Premium	\N	\N	\N	\N	\N	\N	\N	2	\N
13	3002	Hembra	Vivo	32	42	52	62	72	Ternero de prueba Establecimiento Sur	2024-02-20	5	Jersey Elite	\N	\N	\N	\N	\N	\N	\N	2	\N
12	3001	Macho	Vivo	35.5	45	55	65	75	Ternero de prueba Establecimiento Sur	2024-01-15	4	Holstein Premium	\N	\N	\N	\N	\N	\N	\N	2	\N
22	0	Macho	Vivo	0	0	0	0	0	Ninguna	2025-12-27	1	No especificado	0	\N	\N	\N	\N	\N	\N	1	\N
23	0	Macho	Vivo	0	0	0	0	0	Ninguna	2025-12-27	1	No especificado	0	\N	\N	\N	\N	\N	\N	1	\N
24	0	Macho	Vivo	0	0	0	0	0	Ninguna	2025-12-27	1	No especificado	0	\N	\N	\N	\N	\N	\N	1	\N
10	98	Macho	Vivo	30	0	0	0	450	sdfsdfsdf	2025-05-01	1	booyah	60		2	2025-09-24 08:24:00	sdfsf	mamadera	25.00	1	1
9	502	Macho	Vivo	35	0	0	0	525	fgdfg	2025-08-01	1	booyah	70	24/9:35.9	2.7	2025-05-03 00:00:00	fgdfg	mamadera	\N	1	1
17	555	Macho	Vivo	34	0	0	0	510	sdfsdf	2025-05-01	5	sdfsdf	68		\N	\N	\N	\N	\N	2	\N
16	566	Macho	Vivo	55.8	0	0	0	837	dfsf	2025-05-01	1	booyah	111.6	1/4:60	\N	\N	\N	\N	\N	1	2
11	999	Macho	Vivo	40	0	0	0	0	Test multi-tenancy	2025-09-30	1	Test	70	\N	\N	\N	\N	\N	\N	1	2
25	0	Macho	Vivo	0	0	0	0	0	Ninguna	2025-12-27	1	No especificado	0	\N	\N	\N	\N	\N	\N	1	\N
26	2024	Macho	Vivo	40	0	0	0	0	Ninguna	2024-05-14	1	No especificado	80	\N	\N	\N	\N	\N	\N	1	\N
27	500	Hembra	Vivo	38	0	0	0	0	Ninguna	2024-05-20	1	No especificado	76	\N	\N	\N	\N	\N	\N	1	\N
28	204	Macho	Vivo	40	0	0	0	0	Todo normal.	2025-12-27	1	No especificado	80	\N	\N	\N	\N	\N	\N	1	\N
29	909	Hembra	Vivo	36	0	0	0	0	Ninguna	2025-12-27	1	No especificado	72	\N	2	\N	\N	mamadera	\N	1	\N
30	2342	Macho	Vivo	34	0	0	0	510	sdfsdf	2025-05-01	5	sdfsdf	68		\N	\N	\N	\N	\N	1	\N
31	100	Macho	Vivo	33.8	0	0	0	506.99999999999994	sdfsdf	2025-04-01	12	sdfsdf	67.6		\N	\N	\N	\N	\N	10	4
32	123	Macho	Vivo	23	0	0	0	345	sdsdf	2025-05-01	12	sdfsdf	46		\N	\N	\N	\N	\N	10	\N
33	120	Macho	Vivo	21	0	0	0	315	sdf	2025-05-01	13	sdfsdf	42		\N	\N	\N	\N	\N	9	\N
35	9999	Macho	Vivo	40	0	0	0	0	Registrado por bot	2026-02-04	1	Sin datos	\N	\N	\N	\N	\N	\N	\N	1	\N
36	1234	Macho	Vivo	38	0	0	0	0	Registrado por bot	2026-02-08	1	Sin datos	\N	\N	\N	\N	\N	\N	\N	1	\N
37	2500	Macho	Vivo	42	0	0	0	0	hijo de la madre 22	2026-02-08	1	Sin datos	\N	\N	\N	\N	\N	\N	\N	1	\N
38	3001	Hembra	Vivo	36	0	0	0	0	hija de la madre 22, semen Angus, se la ve bien activa	2026-02-08	1	Sin datos	\N	\N	\N	\N	\N	\N	\N	1	\N
39	5000	Macho	Vivo	40	0	0	0	0	Hijo de la madre RP 555.	2026-02-10	1	Sin datos	\N	\N	\N	\N	\N	\N	\N	1	\N
40	6000	Hembra	Vivo	35	0	0	0	0	Hija de la madre 900, semen Brahman.	2026-02-11	1	Sin datos	\N	\N	\N	\N	\N	\N	\N	1	\N
41	8000	Macho	Vivo	37	0	0	0	0	Registrado por bot	2026-02-12	1	Sin datos	\N	\N	\N	\N	\N	\N	\N	1	\N
42	8000	Macho	Vivo	0	0	0	0	0	Registrado por bot	2024-07-29	1	Sin datos	\N	\N	\N	\N	\N	\N	\N	1	\N
43	9500	Macho	Vivo	38	0	0	0	0	Nacimiento de ternero	2024-05-19	1	Sin datos	\N	\N	\N	\N	\N	\N	\N	1	\N
49	40	Macho	Vivo	35	0	0	0	0	Ternero de prueba	2026-01-15	\N	N/A	\N	\N	\N	\N	\N	\N	\N	7	\N
50	0	Macho	Vivo	38	0	0	0	0	Registrado por bot (manucavallera44)	2024-07-28	11	Sin datos	\N	\N	\N	\N	\N	\N	\N	7	\N
51	50	Macho	Vivo	38	0	0	0	0	Nacimiento normal	2024-05-29	11	N/A	\N	\N	\N	\N	\N	\N	\N	7	\N
52	60	Hembra	Vivo	35	0	0	0	0	Nacimiento de ternero hembra de 35 kg con RP 60, madre 120.	2026-03-01	11	N/A	\N	\N	\N	\N	\N	\N	\N	7	\N
53	0	Macho	Vivo	42	0	0	0	0	Nacimiento normal - RP no especificado	2024-05-14	11	N/A	\N	\N	\N	\N	\N	\N	\N	7	\N
\.


--
-- Data for Name: terneros_tratamientos; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.terneros_tratamientos (id_ternero_tratamiento, fecha_aplicacion, id_ternero, id_tratamiento) FROM stdin;
1	2026-04-02	\N	\N
\.


--
-- Data for Name: tratamientos; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.tratamientos (id_tratamiento, nombre, descripcion, fecha_tratamiento, turno, tipo_enfermedad, id_ternero, id_establecimiento) FROM stdin;
15	Desparasitante Sur	Tratamiento antiparasitario	2024-06-05	tarde	Parasitos intestinales	\N	2
14	Antibiotico Sur	Tratamiento para infecciones respiratorias	2024-06-01	mañana	Neumonia	\N	2
16	Manu	fgh	2025-04-01	mañana	Fiebre	\N	3
23	dfsdfsdf	sdffdf	2025-05-01	tarde	Diarrea bacterianaf	11	1
24	fgdfddf	dfgdg	2025-07-01	mañana	Deshidratación	33	9
25	Antibiótico Test	Tratamiento para infección	2026-02-08	mañana	Diarrea bacteriana	\N	1
26	amoxicilina	antibiótico amoxicilina	2026-02-08	mañana	diarrea	\N	1
27	Draxxin	problemas respiratorios, mucha tos	2026-02-11	tarde	Respiratorios	\N	1
28	Suero oral	Administración de suero oral.	2026-02-11	mañana	Diarrea	\N	1
29	Oxitetraciclina	Antibiótico	2026-02-11	mañana	Diarrea	\N	1
30	Diagnóstico	Está enfermo. Tiene mastitis.	2024-05-20	mañana	Mastitis	\N	1
31	antibiótico	por mastitis	2024-07-29	mañana	mastitis	\N	1
32	Suero	Aplicación de suero	2024-05-20	mañana	Diarrea	\N	1
33	antibiótico	aplicación de antibiótico	2024-05-13	mañana	General	\N	7
34	antibiótico	Aplicación de antibiótico	2024-07-28	mañana	infección	\N	7
35	Antibiótico	Aplicación de antibiótico al ternero	2026-03-01	mañana	Infección	\N	7
36	Suero	Aplicación de suero por diarrea severa	2024-05-27	mañana	Diarrea	\N	7
37	Suero	Aplicación de suero	2026-03-01	mañana	N/A	\N	7
\.


--
-- Data for Name: user_establecimientos; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_establecimientos (id, "userId", "establecimientoId", rol) FROM stdin;
1	2	7	dueno
2	1	8	dueno
3	1	9	dueno
4	1	10	dueno
5	23	10	veterinario
6	24	10	veterinario
7	25	10	veterinario
8	27	10	veterinario
9	28	10	veterinario
10	29	10	veterinario
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, name, email, password, telefono, permisos_especiales, fecha_creacion, fecha_actualizacion, ultimo_acceso, id_establecimiento, rol, estado) FROM stdin;
20	fdfs	manucavallera44+iriri@gmail.com	$2b$10$InBkKSiMA140xW2p.qwNV.sJDkwdVKaAJjOAtij67.QDsyc81DhV6		\N	2026-01-19 19:44:32.922533	2026-01-19 19:45:44.909937	\N	\N	veterinario	activo
21	kuka	manucavallera44+test1@gmail.com	$2b$10$dS7mIm6luqBkMINA.BNQZ.3wFeoFHwFF2io.LHwH5/F5lPjLFjVpq	\N	\N	2026-01-20 16:09:40.492606	2026-01-20 16:09:40.492606	\N	\N	operario	inactivo
22	kuka	manucavallera44+solucionado@gmail.com	$2b$10$U6pyV5w1o7tE/ElnSMl3Hen6MRMuFAwHNb6MJ9iAisYVKs9kMgBEi	\N	\N	2026-01-20 16:15:00.762869	2026-01-20 16:15:00.762869	\N	\N	operario	inactivo
23	manu	prueba_final@gmail.com	$2b$10$zfRI.rQDnGwJNyTyWxpxau3Xw5PoAKLqVl2SGct8yqFaOggaxNDOm	\N	\N	2026-01-20 16:44:40.382579	2026-01-20 16:44:40.382579	\N	\N	operario	activo
5	Dr. Veterinario Nuevo	vetnuevo@test.com	$2b$10$hp7/X85e1XU6zQCZOp7LGuY27FVyOQgLJe8zgAyqTJcXJL6HEWjg6	\N	\N	2025-10-15 10:57:11.266255	2025-10-15 10:57:11.266255	\N	1	veterinario	activo
24	Manu	usuario_link@gmail.com	$2b$10$GLTniHLRJGv.tqEP2hnCA.z.jbtUW2xbf.yYjBZxp27NuZFCR9tvW	\N	\N	2026-01-20 17:53:30.461363	2026-01-20 17:53:30.461363	\N	\N	operario	activo
25	Manuty	manucavallera44+veterinario1@gmail.com	$2b$10$yuVqSyK5HTf4RPtjzIPtY.yHEDYQ8pdDCDlRddsjZF3Wsmae18LAO	\N	\N	2026-01-21 11:23:58.407885	2026-01-21 11:23:58.407885	\N	\N	operario	activo
8	cavacoco12	manuheck18@gmail.com	$2b$10$fFsgVoPvTksR2FdZPRm69.z/N5Oa7YL3W0JclrhYQMurSiIaIprYW		\N	2025-10-17 09:30:02.013845	2026-01-07 11:54:31.163127	\N	6	admin	activo
13	fgd	dfg@hotmail.com	$2b$10$mt8Wi8zLfjnTGPvxF0IzjeNWV.v7m.91nMHj.VC1g/GKHAxs/KRzK		\N	2026-01-15 15:34:56.815526	2026-01-15 16:03:30.356471	\N	9	veterinario	activo
3	Dr. Veterinario	vet@test.com	$2b$10$hp7/X85e1XU6zQCZOp7LGuY27FVyOQgLJe8zgAyqTJcXJL6HEWjg6	\N	\N	2025-10-15 10:24:11.330531	2025-10-15 11:21:00.455326	2025-10-15 11:21:00.454	1	veterinario	activo
26	Manus	manucavallera44+admin_final@gmail.com	$2b$10$s5/lTArgPeBy.4obtX6DXOjawSHV8LBYfSufHEXM71ZtXtdpX6n7a	\N	\N	2026-01-21 11:40:08.854747	2026-01-21 11:40:08.854747	\N	\N	admin	activo
27	fds	manucavallera44+vet_final@gmail.com	$2b$10$Dyldp7wajKHwliLonutozeEhlaSjP0shVthIJRZs/uLnTt.7VGF8S	\N	\N	2026-01-21 11:42:50.841513	2026-01-21 11:42:50.841513	\N	\N	veterinario	activo
9	Kilian	manucavallera55@gmail.com	$2b$10$PJZt9WaD/7CbHxA9zMz9oO.T5jVaZcYD.JbiSB5MiYF6G6kdExLWO		\N	2026-01-07 10:49:37.258332	2026-01-16 12:04:54.011979	\N	8	operario	activo
28	sdfs	prueba_final_final@gmail.com	$2b$10$H.6W21qpMrbk.I9DZIEAZ.o700DmxqBkwLkReWV8SxTlpwB0QPiZu	\N	\N	2026-01-21 13:17:12.39422	2026-01-21 13:17:12.39422	\N	10	veterinario	activo
6	Dr. Veterinario Sur	vet.sur@test.com	$2b$10$hp7/X85e1XU6zQCZOp7LGuY27FVyOQgLJe8zgAyqTJcXJL6HEWjg6	\N	\N	2025-10-15 13:08:28.920194	2025-10-15 15:58:05.292821	2025-10-15 15:58:05.288	2	veterinario	activo
14	Pepe Vet	vet@prueba.com	$2b$10$pdN8XIm71Ov0nr8oLyp/IOTFONeQZXW6vcK7PJ..rdv3FCCMuf5FC	+543434165197	\N	2026-01-15 17:56:15.990445	2026-01-16 17:36:26.922637	\N	7	veterinario	activo
11	manu	manucavallera44+funcionaOfunciona@gmail.com	$2b$10$.PTvZnFmTQsa3Ac7rUPtKe.p2br2St0HNzmFiNonDfyRIx1ngrhLK		\N	2026-01-14 21:57:01.603808	2026-01-16 17:36:30.643283	\N	7	operario	inactivo
29	coco	manucavallera44+final@gmail.com	$2b$10$NgK6SBAyH7XONCGus/SzEegBoJ8SEgMMfw/M6fhXLcMfDOZ0VcKaG	\N	\N	2026-01-21 16:39:46.814846	2026-01-21 16:39:46.814846	\N	10	veterinario	activo
10	PepeTest	manucavallera44+empleado@gmail.com	$2b$10$O7MNF4yCFV/6CJXLlHFYNOG4Dw9M3/GOwMbpjUsBm2UTyr8qRvFpK		\N	2026-01-14 15:28:32.676557	2026-01-14 21:53:01.029504	\N	\N	operario	inactivo
2	manucavallera44	manucavallera44@gmail.com	$2b$10$wLQB107RmSvzc7shT3UlreztLLbx5n9NRFwutZc98203D1Rb1I2AG	5493434807989	\N	2025-10-13 17:54:22.121122	2026-01-16 16:59:55.517517	\N	7	admin	activo
15	manuco	manucavallera44+admin@gmail.com	$2b$10$a8wmdomNAw6oGO.A.QhU5.R8VSo5n3csPNVmq/Pftsdvm71/Sh9wC	\N	\N	2026-01-19 10:34:14.289424	2026-01-19 10:34:14.289424	\N	\N	operario	activo
1	manu	manucavallera12@gmail.com	$2b$10$3enZ8AqG6icPcTz1PXm/Cu7YW7IlYitGPiVPzK5qOLhn3adXm9vrW		\N	2025-10-13 17:54:22.121122	2026-01-19 18:04:59.154146	2025-10-17 16:06:45.265	10	admin	activo
7	Operario Sur	operario.sur@test.com	$2b$10$hp7/X85e1XU6zQCZOp7LGuY27FVyOQgLJe8zgAyqTJcXJL6HEWjg6		\N	2025-10-15 13:09:16.537457	2025-10-17 10:33:32.20284	2025-10-15 15:22:55.389	2	operario	activo
16	manolo	manucavallera44+vet3@gmail.com	$2b$10$ABbUaxN3T8N31fa49lt7l.98vnfCQkPLeBhhiEQXb97.Fm9dWGkza	\N	\N	2026-01-19 18:19:22.301682	2026-01-19 18:19:22.301682	\N	\N	operario	activo
12	kuka	manucavallera44+logrodesbloqueado@gmail.com	$2b$10$OHS1P3d5TEH8z9FQB2m45u7VxKz3ZZ9UihQkluuznwXvdZYyunxdm		\N	2026-01-14 22:00:01.632706	2026-01-15 12:57:59.409616	\N	\N	operario	activo
17	maki	manucavallera44+pruebaFinal@gmail.com	$2b$10$ULt8H4YzvQSuXB4Ov96XpuODyL.OJPG3hesyGLA1BWJtmJswmE2Eq	\N	\N	2026-01-19 18:33:53.820928	2026-01-19 18:33:53.820928	\N	\N	operario	activo
18	kuka	manucavallera44+vetFinal@gmail.com	$2b$10$KSXrSErjQmKhDknbn1KDN.k9f1fCDiP4oGZfM6hbX78rLLfILqC3i	\N	\N	2026-01-19 19:12:53.76961	2026-01-19 19:12:53.76961	\N	\N	operario	activo
19	Manuelo	manucavallera44+vetwarrior@gmail.com	$2b$10$.5qOUZWeD/UBpPi.6nTcCegGjFCRP4f9Y1Ay0o.QkXLpc2P62v466		\N	2026-01-19 19:31:03.702994	2026-01-19 19:43:38.02238	\N	7	operario	activo
\.


--
-- Name: diarrea_terneros_id_diarrea_ternero_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.diarrea_terneros_id_diarrea_ternero_seq', 20, true);


--
-- Name: establecimientos_id_establecimiento_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.establecimientos_id_establecimiento_seq', 10, true);


--
-- Name: eventos_id_evento_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.eventos_id_evento_seq', 52, true);


--
-- Name: invitaciones_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.invitaciones_id_seq', 19, true);


--
-- Name: madres_id_madre_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.madres_id_madre_seq', 18, true);


--
-- Name: padres_id_padre_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.padres_id_padre_seq', 1, false);


--
-- Name: rodeos_id_rodeo_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.rodeos_id_rodeo_seq', 4, true);


--
-- Name: semen_id_semen_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.semen_id_semen_seq', 2, true);


--
-- Name: terneros_id_ternero_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.terneros_id_ternero_seq', 53, true);


--
-- Name: terneros_tratamientos_id_ternero_tratamiento_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.terneros_tratamientos_id_ternero_tratamiento_seq', 1, true);


--
-- Name: tratamientos_id_tratamiento_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.tratamientos_id_tratamiento_seq', 37, true);


--
-- Name: user_establecimientos_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.user_establecimientos_id_seq', 10, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_id_seq', 29, true);


--
-- Name: eventos_terneros PK_025759f1c4ed3847908c1f1d39b; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.eventos_terneros
    ADD CONSTRAINT "PK_025759f1c4ed3847908c1f1d39b" PRIMARY KEY (evento_id, ternero_id);


--
-- Name: padres PK_128312dd4572aee505601aaeb4b; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.padres
    ADD CONSTRAINT "PK_128312dd4572aee505601aaeb4b" PRIMARY KEY (id_padre);


--
-- Name: invitaciones PK_224c1573f98dbf3c1c825bc447f; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invitaciones
    ADD CONSTRAINT "PK_224c1573f98dbf3c1c825bc447f" PRIMARY KEY (id);


--
-- Name: terneros PK_32b88bc5b83ff1af222e79d1d7c; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.terneros
    ADD CONSTRAINT "PK_32b88bc5b83ff1af222e79d1d7c" PRIMARY KEY (id_ternero);


--
-- Name: terneros_tratamientos PK_44a832d7ff53b5f3b245d5fab24; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.terneros_tratamientos
    ADD CONSTRAINT "PK_44a832d7ff53b5f3b245d5fab24" PRIMARY KEY (id_ternero_tratamiento);


--
-- Name: eventos PK_49a3943f75e853f1760cde84e5c; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.eventos
    ADD CONSTRAINT "PK_49a3943f75e853f1760cde84e5c" PRIMARY KEY (id_evento);


--
-- Name: diarrea_terneros PK_64bb3f1fff3db03c2fd474495e2; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.diarrea_terneros
    ADD CONSTRAINT "PK_64bb3f1fff3db03c2fd474495e2" PRIMARY KEY (id_diarrea_ternero);


--
-- Name: establecimientos PK_72e4d1cfe352181f2b1fdc46d09; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.establecimientos
    ADD CONSTRAINT "PK_72e4d1cfe352181f2b1fdc46d09" PRIMARY KEY (id_establecimiento);


--
-- Name: tratamientos PK_7d2021e1aefdf08cddf2692d7af; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tratamientos
    ADD CONSTRAINT "PK_7d2021e1aefdf08cddf2692d7af" PRIMARY KEY (id_tratamiento);


--
-- Name: user_establecimientos PK_89f29d2e910f689a9f4b9c31dd3; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_establecimientos
    ADD CONSTRAINT "PK_89f29d2e910f689a9f4b9c31dd3" PRIMARY KEY (id);


--
-- Name: semen PK_8e4de9daaa0ac033ac5d978e45e; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.semen
    ADD CONSTRAINT "PK_8e4de9daaa0ac033ac5d978e45e" PRIMARY KEY (id_semen);


--
-- Name: madres_padres PK_914f9842a2d2b3935adfdcf08db; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.madres_padres
    ADD CONSTRAINT "PK_914f9842a2d2b3935adfdcf08db" PRIMARY KEY (madre_id, padre_id);


--
-- Name: eventos_madres PK_a25a55f4dc9fc02d2b28e0d4790; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.eventos_madres
    ADD CONSTRAINT "PK_a25a55f4dc9fc02d2b28e0d4790" PRIMARY KEY (evento_id, madre_id);


--
-- Name: users PK_a3ffb1c0c8416b9fc6f907b7433; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY (id);


--
-- Name: madres PK_cebc28c376748f9b3efb36d4c75; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.madres
    ADD CONSTRAINT "PK_cebc28c376748f9b3efb36d4c75" PRIMARY KEY (id_madre);


--
-- Name: madres_semen PK_f8424ff21ba55cf835cba119b2c; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.madres_semen
    ADD CONSTRAINT "PK_f8424ff21ba55cf835cba119b2c" PRIMARY KEY (madre_id, semen_id);


--
-- Name: invitaciones UQ_eec7069e2883bb38a63800f8214; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invitaciones
    ADD CONSTRAINT "UQ_eec7069e2883bb38a63800f8214" UNIQUE (token);


--
-- Name: rodeos rodeos_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rodeos
    ADD CONSTRAINT rodeos_pkey PRIMARY KEY (id_rodeo);


--
-- Name: IDX_07c8c3f96a03617904ea2c1f11; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_07c8c3f96a03617904ea2c1f11" ON public.eventos_terneros USING btree (ternero_id);


--
-- Name: IDX_0b8d70da969a53d15b284819ac; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_0b8d70da969a53d15b284819ac" ON public.madres_semen USING btree (semen_id);


--
-- Name: IDX_1f5e6e3240f9e61a40adbb3fa0; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_1f5e6e3240f9e61a40adbb3fa0" ON public.eventos_madres USING btree (madre_id);


--
-- Name: IDX_37fc82274aa48c590fed210d31; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_37fc82274aa48c590fed210d31" ON public.eventos_terneros USING btree (evento_id);


--
-- Name: IDX_5e83c48698ea17e1a71e57140a; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_5e83c48698ea17e1a71e57140a" ON public.eventos_madres USING btree (evento_id);


--
-- Name: IDX_61a9cfcb827b9b501ec617cc48; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_61a9cfcb827b9b501ec617cc48" ON public.madres_semen USING btree (madre_id);


--
-- Name: IDX_6eb71bffad8bfa64d15e3ec680; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_6eb71bffad8bfa64d15e3ec680" ON public.tratamientos USING btree (id_establecimiento);


--
-- Name: IDX_75b02be1d4c1866194bdcf0f51; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_75b02be1d4c1866194bdcf0f51" ON public.eventos USING btree (id_establecimiento);


--
-- Name: IDX_85d601c0efb06ed1cd8c42ae4d; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_85d601c0efb06ed1cd8c42ae4d" ON public.madres_padres USING btree (padre_id);


--
-- Name: IDX_b419d88526e0631a6f603f296d; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_b419d88526e0631a6f603f296d" ON public.diarrea_terneros USING btree (id_establecimiento);


--
-- Name: IDX_cd0ead34c7c3c4c8c0fcffb7d3; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_cd0ead34c7c3c4c8c0fcffb7d3" ON public.madres_padres USING btree (madre_id);


--
-- Name: email_unique; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX email_unique ON public.users USING btree (email);


--
-- Name: rodeos trigger_update_rodeos_timestamp; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_update_rodeos_timestamp BEFORE UPDATE ON public.rodeos FOR EACH ROW EXECUTE FUNCTION public.update_rodeos_timestamp();


--
-- Name: eventos_terneros FK_07c8c3f96a03617904ea2c1f118; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.eventos_terneros
    ADD CONSTRAINT "FK_07c8c3f96a03617904ea2c1f118" FOREIGN KEY (ternero_id) REFERENCES public.terneros(id_ternero);


--
-- Name: madres_semen FK_0b8d70da969a53d15b284819ac4; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.madres_semen
    ADD CONSTRAINT "FK_0b8d70da969a53d15b284819ac4" FOREIGN KEY (semen_id) REFERENCES public.semen(id_semen);


--
-- Name: terneros FK_0bfd1cdbd781a43194877021d47; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.terneros
    ADD CONSTRAINT "FK_0bfd1cdbd781a43194877021d47" FOREIGN KEY (id_rodeo) REFERENCES public.rodeos(id_rodeo) ON DELETE SET NULL;


--
-- Name: tratamientos FK_1dd3aa65ccb0f503b94b001d4cb; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tratamientos
    ADD CONSTRAINT "FK_1dd3aa65ccb0f503b94b001d4cb" FOREIGN KEY (id_ternero) REFERENCES public.terneros(id_ternero) ON DELETE SET NULL;


--
-- Name: eventos_madres FK_1f5e6e3240f9e61a40adbb3fa05; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.eventos_madres
    ADD CONSTRAINT "FK_1f5e6e3240f9e61a40adbb3fa05" FOREIGN KEY (madre_id) REFERENCES public.madres(id_madre);


--
-- Name: eventos_terneros FK_37fc82274aa48c590fed210d31f; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.eventos_terneros
    ADD CONSTRAINT "FK_37fc82274aa48c590fed210d31f" FOREIGN KEY (evento_id) REFERENCES public.eventos(id_evento) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: diarrea_terneros FK_44e6d4b511f33dce340d15528ba; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.diarrea_terneros
    ADD CONSTRAINT "FK_44e6d4b511f33dce340d15528ba" FOREIGN KEY (id_ternero) REFERENCES public.terneros(id_ternero) ON DELETE SET NULL;


--
-- Name: eventos_madres FK_5e83c48698ea17e1a71e57140a7; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.eventos_madres
    ADD CONSTRAINT "FK_5e83c48698ea17e1a71e57140a7" FOREIGN KEY (evento_id) REFERENCES public.eventos(id_evento) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: madres_semen FK_61a9cfcb827b9b501ec617cc480; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.madres_semen
    ADD CONSTRAINT "FK_61a9cfcb827b9b501ec617cc480" FOREIGN KEY (madre_id) REFERENCES public.madres(id_madre) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: user_establecimientos FK_7f6b4097d9a59be0b320d1dd588; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_establecimientos
    ADD CONSTRAINT "FK_7f6b4097d9a59be0b320d1dd588" FOREIGN KEY ("userId") REFERENCES public.users(id);


--
-- Name: madres_padres FK_85d601c0efb06ed1cd8c42ae4df; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.madres_padres
    ADD CONSTRAINT "FK_85d601c0efb06ed1cd8c42ae4df" FOREIGN KEY (padre_id) REFERENCES public.padres(id_padre);


--
-- Name: user_establecimientos FK_9fcc09c1de31c2a7475205e0728; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_establecimientos
    ADD CONSTRAINT "FK_9fcc09c1de31c2a7475205e0728" FOREIGN KEY ("establecimientoId") REFERENCES public.establecimientos(id_establecimiento);


--
-- Name: terneros_tratamientos FK_ad288c00b98edd58e3e78f5b25e; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.terneros_tratamientos
    ADD CONSTRAINT "FK_ad288c00b98edd58e3e78f5b25e" FOREIGN KEY (id_ternero) REFERENCES public.terneros(id_ternero) ON DELETE SET NULL;


--
-- Name: terneros_tratamientos FK_b4a0375cde1fb9d252b226f763a; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.terneros_tratamientos
    ADD CONSTRAINT "FK_b4a0375cde1fb9d252b226f763a" FOREIGN KEY (id_tratamiento) REFERENCES public.tratamientos(id_tratamiento) ON DELETE SET NULL;


--
-- Name: madres_padres FK_cd0ead34c7c3c4c8c0fcffb7d31; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.madres_padres
    ADD CONSTRAINT "FK_cd0ead34c7c3c4c8c0fcffb7d31" FOREIGN KEY (madre_id) REFERENCES public.madres(id_madre) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: invitaciones FK_d99dd0e6d6d19a151286a6d5807; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invitaciones
    ADD CONSTRAINT "FK_d99dd0e6d6d19a151286a6d5807" FOREIGN KEY ("establecimientoId") REFERENCES public.establecimientos(id_establecimiento) ON DELETE CASCADE;


--
-- Name: terneros FK_deeb18576f2c7bc77d34b9cdbb1; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.terneros
    ADD CONSTRAINT "FK_deeb18576f2c7bc77d34b9cdbb1" FOREIGN KEY (id_madre) REFERENCES public.madres(id_madre) ON DELETE SET NULL;


--
-- Name: rodeos FK_e24f0c3a5713ca3a62738569c71; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rodeos
    ADD CONSTRAINT "FK_e24f0c3a5713ca3a62738569c71" FOREIGN KEY (id_establecimiento) REFERENCES public.establecimientos(id_establecimiento);


--
-- PostgreSQL database dump complete
--

