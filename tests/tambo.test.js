require('dotenv').config({ path: __dirname + '/.env.test' });
const axios = require('axios');
const { retryOn429 } = require('./helpers/http');

// Crea campos de prueba y los borra al final: corre solo contra el entorno local.
const securityApi = axios.create({ baseURL: process.env.SECURITY_URL, timeout: 20000 });
const businessApi = axios.create({ baseURL: process.env.BUSSINES_URL, timeout: 20000, validateStatus: (status) => status !== 429 });
retryOn429(securityApi);
retryOn429(businessApi);

const state = { token: null, campo: null, otroCampo: null, forrajeria: null };
const sufijo = Date.now() % 99999;
const en = (idEstablecimiento) => ({
  headers: { Authorization: `Bearer ${state.token}` },
  params: { id_establecimiento: idEstablecimiento },
});

// Fecha de Argentina (UTC-3) corrida n días.
const haceDias = (n) => new Date(Date.now() - 3 * 3600e3 - n * 86400e3).toISOString().slice(0, 10);

const crearEstablecimiento = async (nombre, tipo) => {
  const res = await businessApi.post('/establecimientos', {
    nombre, ubicacion: 'TEST tambo', responsable: 'TEST QA', tipo_organizacion: tipo,
  }, { headers: { Authorization: `Bearer ${state.token}` } });
  expect([200, 201]).toContain(res.status);
  const refresh = await securityApi.post('/auth/refresh', {}, { headers: { Authorization: `Bearer ${state.token}` } });
  state.token = refresh.data.token;
  return res.data.id_establecimiento;
};

const crearVaca = async (campo, rp, estado = 'En Tambo') => {
  const res = await businessApi.post('/madres/crear-madre', { nombre: `TEST vaca ${rp}`, rp_madre: rp, estado }, en(campo));
  expect([200, 201]).toContain(res.status);
  return res.data.id_madre;
};

const evento = (campo, cuerpo) => businessApi.post('/tambo/eventos', cuerpo, en(campo));
const vaca = async (campo, id) => (await businessApi.get('/tambo/rodeo', en(campo))).data.find((m) => m.id_madre === id);
const pendientes = async (campo) => (await businessApi.get('/tambo/pendientes', en(campo))).data.pendientes;
const ids = (lista) => lista.map((i) => i.id_madre);

describe('🥛 TAMBO — eventos reproductivos, pendientes y resumen', () => {
  const v = {};

  beforeAll(async () => {
    const login = await securityApi.post('/auth/login', { email: process.env.TEST_EMAIL, password: process.env.TEST_PASSWORD });
    state.token = login.data.token;
    state.campo = await crearEstablecimiento(`TEST_Tambo_${sufijo}`, 'ganaderia');
    state.otroCampo = await crearEstablecimiento(`TEST_Tambo_B_${sufijo}`, 'ganaderia');
    state.forrajeria = await crearEstablecimiento(`TEST_Tambo_F_${sufijo}`, 'forrajeria');
    v.a = await crearVaca(state.campo, 9001);
    v.b = await crearVaca(state.campo, 9002, 'Seca');
    v.ajena = await crearVaca(state.otroCampo, 9003);
  }, 240000);

  afterAll(async () => {
    const auth = { headers: { Authorization: `Bearer ${state.token}` } };
    for (const [campo, id] of [[state.campo, v.a], [state.campo, v.b], [state.otroCampo, v.ajena]]) {
      if (id) await businessApi.delete(`/madres/delete-madre-by-id/${id}`, en(campo));
    }
    for (const id of [state.campo, state.otroCampo, state.forrajeria]) {
      if (id) await businessApi.delete(`/establecimientos/${id}`, auth);
    }
  });

  test('una forrajería no usa el tambo y sin token da 401', async () => {
    expect((await businessApi.get('/tambo/pendientes', en(state.forrajeria))).status).toBe(403);
    expect((await businessApi.get('/tambo/pendientes', { params: { id_establecimiento: state.campo } })).status).toBe(401);
  });

  test('acepta las categorías nuevas de vaca', async () => {
    const res = await businessApi.patch(`/madres/patch-madre-by-id/${v.b}`, { estado: 'Preparto' }, en(state.campo));
    expect(res.status).toBe(200);
    expect((await businessApi.patch(`/madres/patch-madre-by-id/${v.b}`, { estado: 'Seca' }, en(state.campo))).status).toBe(200);
    expect((await businessApi.patch(`/madres/patch-madre-by-id/${v.b}`, { estado: 'Inventada' }, en(state.campo))).status).toBe(400);
  });

  test('valida el evento', async () => {
    expect((await evento(state.campo, { id_madre: v.a, tipo: 'tacto', fecha: haceDias(1) })).status).toBe(400);
    expect((await evento(state.campo, { id_madre: v.a, tipo: 'vacunacion', fecha: haceDias(1) })).status).toBe(400);
    expect((await evento(state.campo, { id_madre: v.a, tipo: 'parto', fecha: haceDias(-3) })).status).toBe(400);
    expect((await evento(state.campo, { id_madre: v.ajena, tipo: 'parto', fecha: haceDias(1) })).status).toBe(404);
  });

  test('parto: la vaca queda parida, en tambo y aparece sin inseminar y para parchar', async () => {
    const res = await evento(state.campo, { id_madre: v.a, tipo: 'parto', fecha: haceDias(70) });
    expect(res.status).toBe(201);
    expect(res.data.madre).toMatchObject({ estado_reproductivo: 'parida', fecha_ultimo_parto: haceDias(70) });
    const m = await vaca(state.campo, v.a);
    expect(m).toMatchObject({ estado: 'En Tambo', dias_en_leche: 70, ok: true });
    const p = await pendientes(state.campo);
    expect(ids(p.sin_inseminar)).toContain(v.a);
    expect(ids(p.reemparche)).toContain(v.a);
  });

  test('parche e inseminación: sale de sin inseminar y del reemparche, entra a tactar a los 35 días', async () => {
    expect((await evento(state.campo, { id_madre: v.a, tipo: 'parche', fecha: haceDias(5) })).status).toBe(201);
    const ins = await evento(state.campo, { id_madre: v.a, tipo: 'inseminacion', fecha: haceDias(40), toro: 'TEST Pajuela 1' });
    expect(ins.status).toBe(201);
    expect(ins.data.madre).toMatchObject({ estado_reproductivo: 'inseminada', numero_servicios: 1 });
    const p = await pendientes(state.campo);
    expect(ids(p.sin_inseminar)).not.toContain(v.a);
    expect(ids(p.reemparche)).not.toContain(v.a);
    expect(p.a_tactar.find((i) => i.id_madre === v.a)).toMatchObject({ dias: 40, rp_madre: 9001 });
  });

  test('reconfirmación: preñada de más de 180 días sin tacto reciente', async () => {
    expect((await evento(state.campo, { id_madre: v.b, tipo: 'inseminacion', fecha: haceDias(200) })).status).toBe(201);
    expect((await evento(state.campo, { id_madre: v.b, tipo: 'tacto', fecha: haceDias(160), resultado: 'preñada' })).status).toBe(201);
    const p = await pendientes(state.campo);
    expect(p.a_reconfirmar.find((i) => i.id_madre === v.b)).toMatchObject({ dias: 200 });
    expect((await evento(state.campo, { id_madre: v.b, tipo: 'tacto', fecha: haceDias(1), resultado: 'preñada' })).status).toBe(201);
    expect(ids((await pendientes(state.campo)).a_reconfirmar)).not.toContain(v.b);
    expect((await vaca(state.campo, v.b)).fecha_ultimo_tacto).toBe(haceDias(1));
  });

  test('tacto positivo deja preñada; borrar el tacto la vuelve a inseminada', async () => {
    const tacto = await evento(state.campo, { id_madre: v.a, tipo: 'tacto', fecha: haceDias(1), resultado: 'preñada' });
    expect(tacto.status).toBe(201);
    expect(tacto.data.madre.estado_reproductivo).toBe('preñada');
    expect(tacto.data.madre.fecha_parto_probable).toBeTruthy();
    expect(ids((await pendientes(state.campo)).a_tactar)).not.toContain(v.a);

    const borrar = await businessApi.delete(`/tambo/eventos/${tacto.data.evento.id_evento}`, en(state.campo));
    expect(borrar.status).toBe(200);
    expect(borrar.data.madre.estado_reproductivo).toBe('inseminada');

    const otroCampo = await businessApi.delete(`/tambo/eventos/${tacto.data.evento.id_evento}`, en(state.otroCampo));
    expect(otroCampo.status).toBe(404);
  });

  test('una vaca seca preñada con parto cerca aparece para preparto; el evento preparto la pasa', async () => {
    // Ecografía de hace 1 día con 270 días de gestación: pare en unos 12 días.
    expect((await evento(state.campo, { id_madre: v.b, tipo: 'tacto', fecha: haceDias(1), resultado: 'preñada', dias_gestacion: 270 })).status).toBe(201);
    let p = await pendientes(state.campo);
    expect(ids(p.a_preparto)).toContain(v.b);
    expect((await evento(state.campo, { id_madre: v.b, tipo: 'preparto', fecha: haceDias(0) })).status).toBe(201);
    expect((await vaca(state.campo, v.b)).estado).toBe('Preparto');
    p = await pendientes(state.campo);
    expect(ids(p.a_preparto)).not.toContain(v.b);
  });

  test('un evento viejo no cambia la categoría actual', async () => {
    expect((await evento(state.campo, { id_madre: v.b, tipo: 'secado', fecha: haceDias(60) })).status).toBe(201);
    expect((await vaca(state.campo, v.b)).estado).toBe('Preparto');
  });

  test('resumen e historial de la vaca', async () => {
    const r = (await businessApi.get('/tambo/resumen', en(state.campo))).data;
    expect(r.total).toBe(2);
    expect(r.por_categoria).toMatchObject({ 'En Tambo': 1, Preparto: 1 });
    expect(r.por_estado).toMatchObject({ inseminada: 1, preñada: 1 });
    expect(r.promedio_dias_en_leche).toBe(70);

    const historial = (await businessApi.get('/tambo/eventos', { ...en(state.campo), params: { id_establecimiento: state.campo, id_madre: v.a } })).data;
    expect(historial.map((e) => e.tipo)).toEqual(['parche', 'inseminacion', 'parto']);
    expect(historial[1].toro).toBe('TEST Pajuela 1');
    expect((await businessApi.get('/tambo/eventos', en(state.otroCampo))).data).toEqual([]);
  });

  test('configuración por campo cambia los pendientes', async () => {
    const leer = await businessApi.get('/tambo/configuracion', en(state.campo));
    expect(leer.data).toMatchObject({ dias_espera: 45, dias_tacto: 35, dias_reparche: 14, dias_secado: 60, dias_preparto: 30, dias_reconfirmacion: 180 });
    expect((await businessApi.patch('/tambo/configuracion', { dias_tacto: 10 }, en(state.campo))).status).toBe(400);
    const cambiar = await businessApi.patch('/tambo/configuracion', { dias_tacto: 45 }, en(state.campo));
    expect(cambiar.status).toBe(200);
    expect(cambiar.data.dias_tacto).toBe(45);
    expect(ids((await pendientes(state.campo)).a_tactar)).not.toContain(v.a);
    expect((await businessApi.get('/tambo/configuracion', en(state.otroCampo))).data.dias_tacto).toBe(35);
  });

  describe('control lechero', () => {
    const control = (campo, cuerpo) => businessApi.post('/tambo/controles', cuerpo, en(campo));
    const delDia = async (campo, fecha) =>
      (await businessApi.get('/tambo/controles', { ...en(campo), params: { id_establecimiento: campo, fecha } })).data;

    test('valida la planilla', async () => {
      expect((await control(state.campo, { fecha: haceDias(0), vacas: [] })).status).toBe(400);
      expect((await control(state.campo, { fecha: haceDias(-1), vacas: [{ id_madre: v.a, litros_manana: 10 }] })).status).toBe(400);
      expect((await control(state.campo, { fecha: haceDias(0), vacas: [{ id_madre: v.a, litros_manana: 90 }] })).status).toBe(400);
      expect((await control(state.campo, { fecha: haceDias(0), vacas: [{ id_madre: v.a, litros_manana: 10.25 }] })).status).toBe(400);
      expect((await control(state.campo, { fecha: haceDias(0), vacas: [{ id_madre: v.a, litros_manana: 1 }, { id_madre: v.a, litros_manana: 2 }] })).status).toBe(400);
      expect((await control(state.campo, { fecha: haceDias(0), vacas: [{ id_madre: v.ajena, litros_manana: 10 }] })).status).toBe(404);
      expect((await control(state.forrajeria, { fecha: haceDias(0), vacas: [{ id_madre: v.a, litros_manana: 10 }] })).status).toBe(403);
      expect((await businessApi.get('/tambo/controles', { ...en(state.campo), params: { id_establecimiento: state.campo, fecha: 'ayer' } })).status).toBe(400);
    });

    test('guarda, reemplaza y borra el control del día', async () => {
      const fecha = haceDias(2);
      const res = await control(state.campo, { fecha, vacas: [{ id_madre: v.a, litros_manana: 14.5, litros_tarde: 12 }, { id_madre: v.b, litros_manana: 3 }] });
      expect(res.status).toBe(201);
      expect(res.data).toMatchObject({ fecha, vacas: 2, litros: 29.5, promedio: 14.8 });

      const otra = await control(state.campo, { fecha, vacas: [{ id_madre: v.a, litros_manana: 15, litros_tarde: 13 }, { id_madre: v.b, litros_manana: null, litros_tarde: null }] });
      expect(otra.status).toBe(201);
      expect(otra.data).toMatchObject({ vacas: 1, litros: 28 });
      expect(otra.data.controles).toEqual([expect.objectContaining({ id_madre: v.a, litros_manana: 15, litros_tarde: 13, total: 28 })]);

      expect((await delDia(state.otroCampo, fecha)).vacas).toBe(0);
    });

    test('el rodeo muestra el último control y la vaca tiene su historial', async () => {
      expect((await control(state.campo, { fecha: haceDias(9), vacas: [{ id_madre: v.a, litros_manana: 20, litros_tarde: 18.5 }] })).status).toBe(201);
      expect((await vaca(state.campo, v.a)).ultimo_control).toEqual({ fecha: haceDias(2), litros_manana: 15, litros_tarde: 13, total: 28 });
      expect((await vaca(state.campo, v.b)).ultimo_control).toBeNull();

      const historial = (await businessApi.get('/tambo/controles', { ...en(state.campo), params: { id_establecimiento: state.campo, id_madre: v.a } })).data;
      expect(historial.map((c) => c.fecha)).toEqual([haceDias(2), haceDias(9)]);
      expect((await businessApi.get('/tambo/controles', { ...en(state.otroCampo), params: { id_establecimiento: state.otroCampo, id_madre: v.a } })).status).toBe(404);

      const fechas = (await businessApi.get('/tambo/controles', en(state.campo))).data;
      expect(fechas).toEqual([
        { fecha: haceDias(2), vacas: 1, litros: 28, promedio: 28 },
        { fecha: haceDias(9), vacas: 1, litros: 38.5, promedio: 38.5 },
      ]);

      const viejo = historial[1].id_control;
      expect((await businessApi.delete(`/tambo/controles/${viejo}`, en(state.otroCampo))).status).toBe(404);
      expect((await businessApi.delete(`/tambo/controles/${viejo}`, en(state.campo))).status).toBe(200);
      expect((await businessApi.get('/tambo/controles', en(state.campo))).data).toHaveLength(1);
    });
  });

  describe('producción diaria', () => {
    test('guarda vacas en tratamiento y stats trae el conteo del rodeo', async () => {
      const alta = await businessApi.post('/litros/registrar', {
        fecha: haceDias(1), litros_vendido: 1800, litros_terneros: 60, cantidad_vacas: 80, vacas_en_tratamiento: 3,
      }, en(state.campo));
      expect(alta.status).toBe(201);
      expect(alta.data).toMatchObject({ cantidad_vacas: 80, vacas_en_tratamiento: 3, total: 1860 });

      const stats = (await businessApi.get('/litros/stats', en(state.campo))).data;
      expect(stats).toMatchObject({ cantidad_vacas: 80, vacas_en_tratamiento: 3, vacas_rodeo: 1, promedio: 23.25 });

      expect((await businessApi.post('/litros/registrar', { fecha: haceDias(1), litros_vendido: 1, litros_terneros: 0, vacas_en_tratamiento: -1 }, en(state.campo))).status).toBe(400);

      const editar = await businessApi.patch(`/litros/${alta.data.id_registro}`, { vacas_en_tratamiento: 0 }, en(state.campo));
      expect(editar.data.vacas_en_tratamiento).toBe(0);
      expect((await businessApi.delete(`/litros/${alta.data.id_registro}`, en(state.campo))).status).toBe(200);
    });
  });

  describe('mixers', () => {
    test('calcula kg por cabeza, por carga y parcial; valida rodeo y cargas', async () => {
      const rodeo = await businessApi.post('/rodeos', { nombre: `TEST mixer ${sufijo}`, tipo: 'otro', id_establecimiento: state.campo }, en(state.campo));
      expect([200, 201]).toContain(rodeo.status);
      const idRodeo = rodeo.data.id_rodeo;
      const rodeoAjeno = await businessApi.post('/rodeos', { nombre: `TEST mixer B ${sufijo}`, tipo: 'otro', id_establecimiento: state.otroCampo }, en(state.otroCampo));
      // Las dos vacas del campo pasan al rodeo del mixer.
      for (const id of [v.a, v.b]) {
        expect((await businessApi.patch(`/madres/patch-madre-by-id/${id}`, { id_rodeo: idRodeo }, en(state.campo))).status).toBe(200);
      }

      const cuerpo = {
        id_rodeo: idRodeo, modo: 'mezcla', nombre: 'TEST ración', cargas: 2,
        ingredientes: [{ nombre: 'Silo', kg: 100, icono: '🌽' }, { nombre: 'Expeller', kg: 30 }],
      };
      expect((await businessApi.post('/dietas/crear', { ...cuerpo, id_rodeo: rodeoAjeno.data.id_rodeo }, en(state.campo))).status).toBe(404);
      expect((await businessApi.post('/dietas/crear', { ...cuerpo, cargas: 0 }, en(state.campo))).status).toBe(400);

      const alta = await businessApi.post('/dietas/crear', cuerpo, en(state.campo));
      expect(alta.status).toBe(201);
      expect(alta.data).toMatchObject({ cargas: 2, cantidad_animales: 2, kg_por_carga: 65, total_rodeo: 130, kg_por_animal: 65 });
      expect(alta.data.ingredientes).toEqual([
        { nombre: 'Silo', icono: '🌽', kg: 100, kg_por_cabeza: 50, kg_por_carga: 50, parcial_carga: 50 },
        { nombre: 'Expeller', icono: null, kg: 30, kg_por_cabeza: 15, kg_por_carga: 15, parcial_carga: 65 },
      ]);

      // Cambiar el orden de carga y las cargas.
      const editar = await businessApi.patch(`/dietas/${alta.data.id_dieta}`, { cargas: 3, ingredientes: [cuerpo.ingredientes[1], cuerpo.ingredientes[0]] }, en(state.campo));
      expect(editar.status).toBe(200);
      expect(editar.data.ingredientes.map((i) => [i.nombre, i.kg_por_carga, i.parcial_carga])).toEqual([['Expeller', 10, 10], ['Silo', 33.33, 43.33]]);
      expect((await businessApi.patch(`/dietas/${alta.data.id_dieta}`, { id_rodeo: rodeoAjeno.data.id_rodeo }, en(state.campo))).status).toBe(404);

      const lista = (await businessApi.get('/dietas', { ...en(state.campo), params: { id_establecimiento: state.campo, modo: 'mezcla' } })).data;
      expect(lista).toEqual([expect.objectContaining({ id_dieta: alta.data.id_dieta, rodeo: { id_rodeo: idRodeo, nombre: `TEST mixer ${sufijo}` } })]);
      expect((await businessApi.get('/dietas', en(state.otroCampo))).data).toEqual([]);

      expect((await businessApi.delete(`/dietas/${alta.data.id_dieta}`, en(state.campo))).status).toBe(200);
      for (const id of [v.a, v.b]) await businessApi.patch(`/madres/patch-madre-by-id/${id}`, { id_rodeo: null }, en(state.campo));
      await businessApi.delete(`/rodeos/${idRodeo}`, en(state.campo));
      await businessApi.delete(`/rodeos/${rodeoAjeno.data.id_rodeo}`, en(state.otroCampo));
    });
  });
});
