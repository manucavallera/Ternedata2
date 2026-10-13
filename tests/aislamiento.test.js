require('dotenv').config({ path: __dirname + '/.env.test' });
const axios = require('axios');
const { Client } = require('pg');
const { retryOn429 } = require('./helpers/http');

// Crea cuentas, las verifica por base y las borra al final: corre solo contra el entorno local.
const TEST_DB_URL = process.env.TEST_DB_URL;
const crearApi = (baseURL) => {
  const api = axios.create({ baseURL, timeout: 20000, validateStatus: (status) => status !== 429 }); // el 429 se reintenta
  retryOn429(api, 5);
  return api;
};
const securityApi = crearApi(process.env.SECURITY_URL);
const businessApi = crearApi(process.env.BUSSINES_URL);
const con = (token, idEstablecimiento) => ({
  headers: { Authorization: `Bearer ${token}` },
  ...(idEstablecimiento ? { params: { id_establecimiento: idEstablecimiento } } : {}),
});
const hoy = new Date().toISOString().split('T')[0];
const sufijo = Date.now() % 99999;

// dueno: dueño del campo B. intruso: se registró solo (rol global admin) y en B es operario.
// vet: entró por invitación (rol global operario) y en B es veterinario.
const cuentas = {
  dueno: { email: `e2e_dueno_${sufijo}@ternedata.com`, password: 'ClaveDueno123' },
  intruso: { email: `e2e_intruso_${sufijo}@ternedata.com`, password: 'ClaveIntruso123' },
  vet: { email: `e2e_vet_${sufijo}@ternedata.com`, password: 'ClaveVet123' },
};

(TEST_DB_URL ? describe : describe.skip)('🔒 AISLAMIENTO — datos por establecimiento y rol dentro de cada uno', () => {
  let db;
  const tokens = {};
  const ids = {};
  const est = {};
  const b = {}; // registros del campo B

  const login = async (clave, cuenta) => {
    const res = await securityApi.post('/auth/login', cuenta);
    expect([200, 201]).toContain(res.status);
    tokens[clave] = res.data.token;
    ids[clave] = res.data.user.id;
    return res.data.user;
  };
  const refrescar = async (clave) => {
    tokens[clave] = (await securityApi.post('/auth/refresh', {}, con(tokens[clave]))).data.token;
  };
  const registrar = async (clave, extra = {}) => {
    const i = Object.keys(cuentas).indexOf(clave);
    const res = await securityApi.post('/auth/register', {
      name: `TEST ${clave}`, email: cuentas[clave].email, password: cuentas[clave].password, telefono: `15${sufijo}${i}`, ...extra,
    });
    expect([200, 201]).toContain(res.status);
    await db.query('UPDATE users SET email_verificado = true WHERE email = $1', [cuentas[clave].email]);
  };
  const crearEstablecimiento = async (clave, nombre) => {
    const res = await businessApi.post('/establecimientos', { nombre, ubicacion: 'TEST', responsable: 'TEST' }, con(tokens[clave]));
    expect([200, 201]).toContain(res.status);
    await refrescar(clave);
    return res.data.id_establecimiento;
  };
  const sumarAlCampoB = async (clave, rol) => {
    const invitacion = await businessApi.post(`/invitaciones/crear/${est.b}`, { rol }, con(tokens.dueno));
    expect([200, 201]).toContain(invitacion.status);
    const aceptada = await businessApi.post('/invitaciones/aceptar', { token: invitacion.data.token }, con(tokens[clave]));
    expect([200, 201]).toContain(aceptada.status);
    await refrescar(clave);
  };
  const crear = async (path, data, token, idEstablecimiento) => {
    const res = await businessApi.post(path, { ...data, id_establecimiento: idEstablecimiento }, con(token, idEstablecimiento));
    expect([200, 201]).toContain(res.status);
    return Array.isArray(res.data) ? res.data[0] : res.data;
  };

  beforeAll(async () => {
    db = new Client({ connectionString: TEST_DB_URL });
    await db.connect();

    const admin = await login('admin', { email: process.env.TEST_EMAIL, password: process.env.TEST_PASSWORD });
    est.a = admin.id_establecimiento;

    await registrar('dueno');
    await login('dueno', cuentas.dueno);
    est.b = await crearEstablecimiento('dueno', `TEST AISLAMIENTO B ${sufijo}`);

    await registrar('intruso');
    await login('intruso', cuentas.intruso);
    est.intruso = await crearEstablecimiento('intruso', `TEST AISLAMIENTO X ${sufijo}`);
    await sumarAlCampoB('intruso', 'operario');

    const invitacionVet = await businessApi.post(`/invitaciones/crear/${est.b}`, { rol: 'veterinario' }, con(tokens.dueno));
    await registrar('vet', { invitationToken: invitacionVet.data.token });
    await login('vet', cuentas.vet);
    expect([200, 201]).toContain((await businessApi.post('/invitaciones/aceptar', { token: invitacionVet.data.token }, con(tokens.vet))).status);
    await refrescar('vet');

    // Datos del campo B, cargados por su dueño.
    const madre = await crear('/madres/crear-madre', { nombre: 'TEST madre B', rp_madre: 830000 + sufijo, estado: 'Seca', fecha_nacimiento: '2021-01-15' }, tokens.dueno, est.b);
    b.madre = madre.id_madre;
    const ternero = await crear('/terneros/crear-ternero', {
      rp_ternero: 840000 + sufijo, sexo: 'Macho', estado: 'Vivo', peso_nacer: 34, fecha_nacimiento: '2026-09-01', semen: 'TEST', observaciones: 'TEST',
    }, tokens.dueno, est.b);
    b.ternero = ternero.id_ternero;
    const tratamiento = await crear('/tratamientos/crear-tratamiento', {
      nombre: 'TEST tratamiento B', descripcion: 'TEST', tipo_enfermedad: `Aislamiento${sufijo}`, turno: 'mañana', fecha_tratamiento: hoy, id_ternero: b.ternero,
    }, tokens.dueno, est.b);
    b.tratamiento = tratamiento.id_tratamiento;
    const diarrea = await crear('/diarrea-terneros/crear-diarrea-ternero', { fecha_diarrea_ternero: hoy, severidad: 'Leve', id_ternero: b.ternero, observaciones: 'TEST' }, tokens.dueno, est.b);
    b.diarrea = diarrea.id_diarrea_ternero;
    const evento = await crear('/eventos/crear-evento', { fecha_evento: hoy, observacion: 'TEST evento B', id_ternero: [b.ternero] }, tokens.dueno, est.b);
    b.evento = evento.id_evento;
    const rodeo = await crear('/rodeos', { nombre: `TEST rodeo B ${sufijo}`, tipo: 'cria' }, tokens.dueno, est.b);
    b.rodeo = rodeo.id_rodeo;
  }, 600000);

  afterAll(async () => {
    const borrar = (path) => businessApi.delete(path, con(tokens.dueno, est.b)).catch(() => null);
    await borrar(`/tratamientos/delete-tratamiento-by-id/${b.tratamiento}`);
    await borrar(`/diarrea-terneros/delete-diarrea-by-id/${b.diarrea}`);
    await borrar(`/eventos/delete-evento-by-id/${b.evento}`);
    for (const id of b.rodeosExtra || []) await borrar(`/rodeos/${id}`);
    await borrar(`/rodeos/${b.rodeo}`);
    await borrar(`/terneros/delete-ternero-by-id/${b.ternero}`);
    for (const id of b.madresExtra || []) await borrar(`/madres/delete-madre-by-id/${id}`);
    await borrar(`/madres/delete-madre-by-id/${b.madre}`);

    const emails = Object.values(cuentas).map((c) => c.email);
    const propios = [est.b, est.intruso].filter(Boolean);
    const usuarios = (await db.query('SELECT id FROM users WHERE email = ANY($1)', [emails])).rows.map((r) => r.id);
    await db.query('DELETE FROM invitaciones WHERE "establecimientoId" = ANY($1)', [propios]);
    await db.query('DELETE FROM user_establecimientos WHERE "userId" = ANY($1) OR "establecimientoId" = ANY($2)', [usuarios, propios]);
    await db.query('DELETE FROM users WHERE id = ANY($1)', [usuarios]);
    // Si quedó algún dato colgado, el establecimiento de prueba se deja.
    await db.query('DELETE FROM establecimientos WHERE id_establecimiento = ANY($1)', [propios]).catch(() => null);
    await db.end();
  });

  describe('un admin no llega a los datos de otro establecimiento', () => {
    // [nombre, leer, modificar (método, ruta, cuerpo), borrar]
    const recursos = () => [
      ['madre', `/madres/get-madre-by-id/${b.madre}`, ['patch', `/madres/patch-madre-by-id/${b.madre}`, { nombre: 'TOMADA' }], `/madres/delete-madre-by-id/${b.madre}`],
      ['ternero', `/terneros/get-ternero-by-id/${b.ternero}`, ['patch', `/terneros/patch-ternero-by-id/${b.ternero}`, { observaciones: 'TOMADO' }], `/terneros/delete-ternero-by-id/${b.ternero}`],
      ['tratamiento', `/tratamientos/get-tratamiento-by-id/${b.tratamiento}`, ['patch', `/tratamientos/patch-tratamiento-by-id/${b.tratamiento}`, { nombre: 'TOMADO' }], `/tratamientos/delete-tratamiento-by-id/${b.tratamiento}`],
      ['diarrea', `/diarrea-terneros/get-diarrea-ternero-by-id/${b.diarrea}`, ['patch', `/diarrea-terneros/patch-diarrea-ternero-by-id/${b.diarrea}`, { observaciones: 'TOMADA' }], `/diarrea-terneros/delete-diarrea-by-id/${b.diarrea}`],
      ['evento', `/eventos/get-evento-by-id/${b.evento}`, ['patch', `/eventos/patch-evento-by-id/${b.evento}`, { observacion: 'TOMADO' }], `/eventos/delete-evento-by-id/${b.evento}`],
      ['rodeo', `/rodeos/${b.rodeo}`, ['put', `/rodeos/${b.rodeo}`, { nombre: 'TOMADO' }], `/rodeos/${b.rodeo}`],
    ];
    // Rechazado sin romperse: un 500 también sería un error.
    const rechazado = (status) => status >= 400 && status < 500;

    test.each(['madre', 'ternero', 'tratamiento', 'diarrea', 'evento', 'rodeo'])('no lee, modifica ni borra: %s', async (nombre) => {
      const [, leer, [metodo, ruta, cuerpo], borrar] = recursos().find((r) => r[0] === nombre);
      // Trabajando en su propio establecimiento, con el id de un registro ajeno.
      const estados = {
        leer: (await businessApi.get(leer, con(tokens.admin))).status,
        modificar: (await businessApi[metodo](ruta, cuerpo, con(tokens.admin))).status,
        borrar: (await businessApi.delete(borrar, con(tokens.admin))).status,
      };
      expect(Object.entries(estados).filter(([, estado]) => !rechazado(estado))).toEqual([]);
      // Y pidiendo directamente el establecimiento ajeno.
      expect((await businessApi.get(leer, con(tokens.admin, est.b))).status).toBe(403);
      // El registro sigue ahí, sin tocar.
      const intacto = await businessApi.get(leer, con(tokens.dueno, est.b));
      expect(intacto.status).toBe(200);
      expect(JSON.stringify(intacto.data)).not.toMatch(/TOMAD[OA]/);
    });

    test('los listados filtrados de tratamientos no traen los de otro establecimiento', async () => {
      const rutas = [
        `/tratamientos/obtener-tratamientos-por-enfermedad/Aislamiento${sufijo}`,
        `/tratamientos/obtener-tratamientos-por-turno/${encodeURIComponent('mañana')}`,
        `/tratamientos/obtener-tratamientos-por-enfermedad-y-turno/Aislamiento${sufijo}/${encodeURIComponent('mañana')}`,
        '/tratamientos/obtener-listado-tratamientos',
      ];
      const conFuga = [];
      for (const ruta of rutas) {
        const res = await businessApi.get(ruta, con(tokens.admin));
        const lista = Array.isArray(res.data) ? res.data : res.data?.data || [];
        if (lista.some((t) => t.id_tratamiento === b.tratamiento)) conFuga.push(ruta);
      }
      expect(conFuga).toEqual([]);
      // El dueño sí lo ve.
      const propio = await businessApi.get(rutas[0], con(tokens.dueno, est.b));
      expect((Array.isArray(propio.data) ? propio.data : propio.data?.data).map((t) => t.id_tratamiento)).toContain(b.tratamiento);
    });

    test('no carga registros en un establecimiento ajeno ni sobre animales ajenos', async () => {
      const enAjeno = await businessApi.post('/madres/crear-madre', { nombre: 'TEST colada', estado: 'Seca', id_establecimiento: est.b }, con(tokens.admin, est.b));
      expect(enAjeno.status).toBe(403);

      const tratamiento = await businessApi.post('/tratamientos/crear-tratamiento', {
        nombre: 'TEST colado', descripcion: 'TEST', tipo_enfermedad: 'TEST', turno: 'mañana', fecha_tratamiento: hoy, id_ternero: b.ternero,
      }, con(tokens.admin));
      expect(rechazado(tratamiento.status)).toBe(true);
      const diarrea = await businessApi.post('/diarrea-terneros/crear-diarrea-ternero', {
        fecha_diarrea_ternero: hoy, severidad: 'Leve', id_ternero: b.ternero, observaciones: 'TEST colada',
      }, con(tokens.admin));
      expect(rechazado(diarrea.status)).toBe(true);
    });
  });

  describe('el rol vale dentro de cada establecimiento', () => {
    const enB = (clave) => con(tokens[clave], est.b);

    test('quien es operario en un campo no lo administra aunque sea admin en el suyo', async () => {
      expect((await businessApi.put(`/establecimientos/${est.b}`, { responsable: 'TOMADO' }, con(tokens.intruso))).status).toBe(403);
      expect((await businessApi.patch(`/establecimientos/${est.b}/toggle-estado`, {}, con(tokens.intruso))).status).toBe(403);
      expect((await businessApi.delete(`/establecimientos/${est.b}`, con(tokens.intruso))).status).toBe(403);
      const campo = await businessApi.get(`/establecimientos/${est.b}`, con(tokens.dueno));
      expect(campo.data).toMatchObject({ estado: 'activo', responsable: 'TEST' });
    });

    test('tampoco maneja su equipo: invitar, ver pendientes, sacar gente', async () => {
      expect((await businessApi.post(`/invitaciones/crear/${est.b}`, { rol: 'dueno' }, con(tokens.intruso))).status).toBe(403);
      expect((await businessApi.get(`/invitaciones/pendientes/${est.b}`, con(tokens.intruso))).status).toBe(403);
      expect((await businessApi.delete(`/establecimientos/${est.b}/equipo/${ids.vet}`, con(tokens.intruso))).status).toBe(403);
      expect((await businessApi.delete(`/establecimientos/${est.b}/equipo/${ids.dueno}`, con(tokens.intruso))).status).toBe(403);
    });

    test('ni cambia roles o estados de los usuarios de ese campo', async () => {
      expect((await businessApi.put(`/users/${ids.vet}/change-role`, { rol: 'operario' }, con(tokens.intruso))).status).toBe(403);
      expect((await businessApi.put(`/users/${ids.vet}/toggle-status`, {}, con(tokens.intruso))).status).toBe(403);
      expect((await businessApi.delete(`/users/${ids.vet}`, con(tokens.intruso))).status).toBe(403);
      const vet = (await db.query('SELECT rol, estado FROM users WHERE id = $1', [ids.vet])).rows[0];
      expect(vet).toEqual({ rol: 'operario', estado: 'activo' });
    });

    test('como operario carga datos pero no arma ni borra rodeos', async () => {
      const madre = await businessApi.post('/madres/crear-madre', { nombre: 'TEST madre de operario', estado: 'Seca', id_establecimiento: est.b }, enB('intruso'));
      expect([200, 201]).toContain(madre.status);
      b.madresExtra = [madre.data.id_madre];
      expect((await businessApi.get('/madres/obtener-listado-madres', enB('intruso'))).status).toBe(200);

      expect((await businessApi.post('/rodeos', { nombre: 'TEST rodeo colado', tipo: 'cria', id_establecimiento: est.b }, enB('intruso'))).status).toBe(403);
      expect((await businessApi.put(`/rodeos/${b.rodeo}`, { nombre: 'TOMADO' }, enB('intruso'))).status).toBe(403);
      expect((await businessApi.delete(`/rodeos/${b.rodeo}`, enB('intruso'))).status).toBe(403);
    });

    test('en su propio campo sigue siendo admin', async () => {
      const propio = con(tokens.intruso, est.intruso);
      expect((await businessApi.put(`/establecimientos/${est.intruso}`, { responsable: 'TEST propio' }, propio)).status).toBe(200);
      const rodeo = await businessApi.post('/rodeos', { nombre: `TEST rodeo X ${sufijo}`, tipo: 'cria', id_establecimiento: est.intruso }, propio);
      expect([200, 201]).toContain(rodeo.status);
      expect([200, 204]).toContain((await businessApi.delete(`/rodeos/${rodeo.data.id_rodeo}`, propio)).status);
    });

    test('un veterinario invitado arma rodeos pero no los borra ni administra el campo', async () => {
      const rodeo = await businessApi.post('/rodeos', { nombre: `TEST rodeo vet ${sufijo}`, tipo: 'cria', id_establecimiento: est.b }, enB('vet'));
      expect([200, 201]).toContain(rodeo.status);
      b.rodeosExtra = [rodeo.data.id_rodeo];
      expect((await businessApi.delete(`/rodeos/${rodeo.data.id_rodeo}`, enB('vet'))).status).toBe(403);
      expect((await businessApi.put(`/establecimientos/${est.b}`, { responsable: 'TOMADO' }, con(tokens.vet))).status).toBe(403);
      expect((await businessApi.post(`/invitaciones/crear/${est.b}`, { rol: 'operario' }, con(tokens.vet))).status).toBe(403);
    });

    test('el dueño administra su campo y su equipo', async () => {
      expect((await businessApi.put(`/establecimientos/${est.b}`, { responsable: 'TEST' }, con(tokens.dueno))).status).toBe(200);
      expect((await businessApi.get(`/invitaciones/pendientes/${est.b}`, con(tokens.dueno))).status).toBe(200);
      expect((await businessApi.put(`/users/${ids.vet}/toggle-status`, {}, con(tokens.dueno))).data.estado).toBe('inactivo');
      expect((await businessApi.put(`/users/${ids.vet}/toggle-status`, {}, con(tokens.dueno))).data.estado).toBe('activo');
      expect([200, 204]).toContain((await businessApi.delete(`/rodeos/${b.rodeosExtra[0]}`, enB('dueno'))).status);
      b.rodeosExtra = [];
    });
  });
});
