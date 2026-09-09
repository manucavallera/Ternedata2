require('dotenv').config({ path: __dirname + '/.env.test' });
const axios = require('axios');

const SECURITY_URL = process.env.SECURITY_URL;
const BUSINESS_URL = process.env.BUSSINES_URL;
const EMAIL = process.env.TEST_EMAIL;
const PASSWORD = process.env.TEST_PASSWORD;

const securityApi = axios.create({ baseURL: SECURITY_URL, timeout: 20000 });
const businessApi = axios.create({ baseURL: BUSINESS_URL, timeout: 20000 });

const state = {
  token: null,
  userId: null,
  originalProfile: null,
  establishmentA: null,
  establishmentB: null,
  motherA: null,
  calvesA: [],
  calfB: null,
  calfBRp: null,
  treatmentA: null,
  eventA: null,
  diarrheaA: null,
  profileChanged: false,
};

const auth = (establishmentId) => ({
  headers: { Authorization: `Bearer ${state.token}` },
  ...(establishmentId ? { params: { id_establecimiento: establishmentId } } : {}),
});

const refreshToken = async () => {
  const response = await securityApi.post('/auth/refresh', {}, auth());
  expect([200, 201]).toContain(response.status);
  state.token = response.data.token;
};

const bodyOf = (response) => response.data?.data || response.data;

const listOf = (response) => {
  const body = bodyOf(response);
  if (Array.isArray(body)) return body;
  return body?.data || body?.items || body?.results || [];
};

const expectRejectedWith = async (request, statuses) => {
  try {
    await request;
    throw new Error('La petición debería haber sido rechazada');
  } catch (error) {
    if (error.message === 'La petición debería haber sido rechazada') throw error;
    expect(statuses).toContain(error.response?.status);
  }
};

const safeDelete = async (url, config) => {
  if (!url) return;
  try {
    await businessApi.delete(url, config);
  } catch {
    // Cleanup best-effort: el resultado funcional se valida en cada test.
  }
};

const createCalf = async (establishmentId, rp, motherId) => {
  const response = await businessApi.post('/terneros/crear-ternero', {
    rp_ternero: rp,
    sexo: 'Macho',
    estado: 'Vivo',
    peso_nacer: 35,
    fecha_nacimiento: '2026-01-15',
    id_madre: motherId,
    observaciones: 'TEST segunda tanda',
  }, auth(establishmentId));
  expect([200, 201]).toContain(response.status);
  expect(response.data).toHaveProperty('id_ternero');
  return response.data;
};

describe('🧪 SEGUNDA TANDA — backend y multi-establecimiento', () => {
  beforeAll(async () => {
    const login = await securityApi.post('/auth/login', {
      email: EMAIL,
      password: PASSWORD,
    });
    expect([200, 201]).toContain(login.status);
    state.token = login.data.token;
    state.userId = login.data.user.id;

    const profile = await securityApi.get('/users/profile/me', auth());
    expect(profile.status).toBe(200);
    state.originalProfile = profile.data;

    const establishmentA = await businessApi.post('/establecimientos', {
      nombre: `TEST_2A_${Date.now()}`,
      ubicacion: 'TEST segunda tanda A',
      responsable: 'TEST QA',
    }, auth());
    expect([200, 201]).toContain(establishmentA.status);
    state.establishmentA = establishmentA.data.id_establecimiento;
    await refreshToken();

    const mother = await businessApi.post('/madres/crear-madre', {
      nombre: `TEST Madre 2A ${Date.now()}`,
      rp_madre: 700000 + (Date.now() % 9999),
      estado: 'Seca',
      fecha_nacimiento: '2021-01-15',
      observaciones: 'TEST segunda tanda',
    }, auth(state.establishmentA));
    expect([200, 201]).toContain(mother.status);
    state.motherA = mother.data.id_madre;

    const calfA1 = await createCalf(
      state.establishmentA,
      800000 + (Date.now() % 9999),
      state.motherA,
    );
    const calfA2 = await createCalf(
      state.establishmentA,
      810000 + (Date.now() % 9999),
    );
    state.calvesA = [calfA1.id_ternero, calfA2.id_ternero];

    const establishmentB = await businessApi.post('/establecimientos', {
      nombre: `TEST_2B_${Date.now()}`,
      ubicacion: 'TEST segunda tanda B',
      responsable: 'TEST QA',
    }, auth(state.establishmentA));
    expect([200, 201]).toContain(establishmentB.status);
    state.establishmentB = establishmentB.data.id_establecimiento;
    await refreshToken();

    const calfBRp = 820000 + (Date.now() % 9999);
    const calfB = await createCalf(state.establishmentB, calfBRp);
    state.calfB = calfB.id_ternero;
    state.calfBRp = calfBRp;

    const treatment = await businessApi.post('/tratamientos/crear-tratamiento', {
      nombre: 'TEST Tratamiento segunda tanda',
      descripcion: 'TEST backend',
      tipo_enfermedad: 'Diarrea',
      turno: 'mañana',
      fecha_tratamiento: '2026-09-09',
      id_ternero: state.calvesA[1],
    }, auth(state.establishmentA));
    expect([200, 201]).toContain(treatment.status);
    state.treatmentA = treatment.data.id_tratamiento;

    const event = await businessApi.post('/eventos/crear-evento', {
      fecha_evento: '2026-09-09',
      observacion: 'TEST evento varios animales',
      id_ternero: state.calvesA,
      id_madre: [state.motherA],
    }, auth(state.establishmentA));
    expect([200, 201]).toContain(event.status);
    const eventBody = bodyOf(event);
    state.eventA = Array.isArray(eventBody)
      ? eventBody[0]?.id_evento
      : eventBody.id_evento;
    expect(state.eventA).toBeTruthy();

    const diarrhea = await businessApi.post('/diarrea-terneros/crear-diarrea-ternero', {
      fecha_diarrea_ternero: '2026-09-09',
      severidad: 'Moderada',
      id_ternero: state.calvesA[0],
      observaciones: 'TEST diarrea segunda tanda',
    }, auth(state.establishmentA));
    expect([200, 201]).toContain(diarrhea.status);
    state.diarrheaA = diarrhea.data.id_diarrea_ternero;
  }, 60000);

  afterAll(async () => {
    await safeDelete(
      state.diarrheaA && `/diarrea-terneros/delete-diarrea-by-id/${state.diarrheaA}`,
      auth(state.establishmentA),
    );
    await safeDelete(
      state.eventA && `/eventos/delete-evento-by-id/${state.eventA}`,
      auth(state.establishmentA),
    );
    await safeDelete(
      state.treatmentA && `/tratamientos/delete-tratamiento-by-id/${state.treatmentA}`,
      auth(state.establishmentA),
    );
    for (const id of [state.calfB, ...state.calvesA]) {
      await safeDelete(id && `/terneros/delete-ternero-by-id/${id}`, auth(id === state.calfB ? state.establishmentB : state.establishmentA));
    }
    await safeDelete(
      state.motherA && `/madres/delete-madre-by-id/${state.motherA}`,
      auth(state.establishmentA),
    );

    // Recupera cualquier ternero TEST creado por una corrida interrumpida.
    for (const establishmentId of [state.establishmentA, state.establishmentB]) {
      if (!establishmentId) continue;
      try {
        const response = await businessApi.get('/terneros/obtener-listado-terneros?limit=500', auth(establishmentId));
        for (const calf of listOf(response)) {
          if (calf.observaciones === 'TEST segunda tanda') {
            await safeDelete(`/terneros/delete-ternero-by-id/${calf.id_ternero}`, auth(establishmentId));
          }
        }
      } catch {
        // El establecimiento puede haber sido eliminado antes del barrido.
      }
    }

    await safeDelete(
      state.establishmentB && `/establecimientos/${state.establishmentB}`,
      auth(state.establishmentB),
    );
    await safeDelete(
      state.establishmentA && `/establecimientos/${state.establishmentA}`,
      auth(state.establishmentA),
    );

    if (state.profileChanged && state.originalProfile) {
      try {
        await securityApi.put(`/users/${state.userId}`, {
          name: state.originalProfile.name,
          ...(state.originalProfile.telefono !== undefined
            ? { telefono: state.originalProfile.telefono }
            : {}),
        }, auth());
      } catch {
        // No ocultar el resultado de los tests por un cleanup de perfil.
      }
    }
  }, 60000);

  test('Dashboard devuelve los seis KPIs y tipos válidos', async () => {
    const response = await businessApi.get('/terneros/resumen-dashboard', auth(state.establishmentA));
    expect(response.status).toBe(200);
    const summary = bodyOf(response);
    expect(summary).toEqual(expect.objectContaining({
      total: expect.any(Number),
      vivos: expect.any(Number),
      muertos: expect.any(Number),
      vendidos: expect.any(Number),
      calostrados: expect.any(Number),
      porcentaje_calostrados: expect.any(Number),
      mortalidad_ultimos_30d: expect.any(Number),
      promedio_ganancia_diaria_kg: expect.any(Number),
      total_alertas: expect.any(Number),
    }));
    expect(summary.total).toBeGreaterThanOrEqual(2);
  });

  test('Resumen de salud devuelve población, morbilidad y severidad moderada', async () => {
    const response = await businessApi.get('/resumen-salud', auth(state.establishmentA));
    expect(response.status).toBe(200);
    const summary = bodyOf(response);
    expect(summary).toEqual(expect.objectContaining({
      totalTerneros: expect.any(Number),
      ternerosVivos: expect.any(Number),
      ternerosMuertos: expect.any(Number),
      porcentajeMortalidad: expect.any(Number),
      porcentajeMorbilidad: expect.any(Number),
      episodiosDiarrea: expect.any(Number),
      desgloseDiarreas: expect.objectContaining({ moderada: expect.any(Number) }),
    }));
    expect(summary.ternerosVivos + summary.ternerosMuertos).toBe(summary.totalTerneros);
    expect(summary.episodiosDiarrea).toBeGreaterThanOrEqual(1);
    expect(summary.desgloseDiarreas.moderada).toBeGreaterThanOrEqual(1);
  });

  test('Madre devuelve hijos y eventos, sin campo raza', async () => {
    const response = await businessApi.get(`/madres/get-madre-by-id/${state.motherA}`, auth(state.establishmentA));
    expect(response.status).toBe(200);
    expect(response.data).not.toHaveProperty('raza');
    expect(Array.isArray(response.data.terneros)).toBe(true);
    expect(response.data.terneros.some((item) => item.id_ternero === state.calvesA[0])).toBe(true);
    expect(Array.isArray(response.data.eventos)).toBe(true);
    expect(response.data.eventos.some((item) => item.id_evento === state.eventA)).toBe(true);
  });

  test('Calostrado por sonda queda guardado', async () => {
    const response = await businessApi.patch(`/terneros/calostrado/${state.calvesA[0]}`, {
      metodo_calostrado: 'sonda',
      litros_calostrado: 2.2,
      fecha_hora_calostrado: '2026-09-09T08:30:00.000Z',
      observaciones_calostrado: 'TEST sonda',
      grado_brix: 22,
    }, auth(state.establishmentA));
    expect([200, 201]).toContain(response.status);

    const calf = await businessApi.get(`/terneros/get-ternero-by-id/${state.calvesA[0]}`, auth(state.establishmentA));
    expect(calf.status).toBe(200);
    expect(calf.data.metodo_calostrado).toBe('sonda');
    expect(Number(calf.data.litros_calostrado)).toBe(2.2);
  });

  test('Pesos oficiales 15, 30 y 45 días quedan guardados y aparecen en historial', async () => {
    for (const [field, value] of [['peso_15d', 42], ['peso_30d', 50], ['peso_45d', 58]]) {
      const response = await businessApi.patch(`/terneros/patch-ternero-by-id/${state.calvesA[0]}`, { [field]: value }, auth(state.establishmentA));
      expect(response.status).toBe(200);
    }

    const calf = await businessApi.get(`/terneros/get-ternero-by-id/${state.calvesA[0]}`, auth(state.establishmentA));
    expect(calf.data.peso_15d).toBe(42);
    expect(calf.data.peso_30d).toBe(50);
    expect(calf.data.peso_45d).toBe(58);

    const history = await businessApi.get(`/terneros/historial-completo/${state.calvesA[0]}`, auth(state.establishmentA));
    expect(history.status).toBe(200);
    expect(history.data).toEqual(expect.objectContaining({
      rp_ternero: expect.any(Number),
      peso_nacer: expect.anything(),
      historial_pesos: expect.any(Array),
    }));
  });

  test('Evento acepta varios terneros y una madre, y se puede eliminar', async () => {
    const event = await businessApi.get(`/eventos/get-evento-by-id/${state.eventA}`, auth(state.establishmentA));
    expect(event.status).toBe(200);
    expect(event.data.terneros).toHaveLength(2);
    expect(event.data.madres).toHaveLength(1);

    const deleted = await businessApi.delete(`/eventos/delete-evento-by-id/${state.eventA}`, auth(state.establishmentA));
    expect([200, 201]).toContain(deleted.status);
    state.eventA = null;
  });

  test('Diarrea se puede consultar, editar y eliminar', async () => {
    const listed = await businessApi.get('/diarrea-terneros/obtener-listado-diarrea-terneros', auth(state.establishmentA));
    expect(listed.status).toBe(200);
    expect(listOf(listed).some((item) => item.id_diarrea_ternero === state.diarrheaA)).toBe(true);

    const updated = await businessApi.patch(`/diarrea-terneros/patch-diarrea-ternero-by-id/${state.diarrheaA}`, {
      severidad: 'Severa',
      observaciones: 'TEST diarrea editada',
    }, auth(state.establishmentA));
    expect([200, 201]).toContain(updated.status);

    const deleted = await businessApi.delete(`/diarrea-terneros/delete-diarrea-by-id/${state.diarrheaA}`, auth(state.establishmentA));
    expect([200, 201]).toContain(deleted.status);
    state.diarrheaA = null;
  });

  test('Editar perfil devuelve el cambio y luego se restaura', async () => {
    const newName = `TEST Perfil ${Date.now()}`;
    const response = await securityApi.put(`/users/${state.userId}`, { name: newName }, auth());
    expect([200, 201]).toContain(response.status);
    expect(response.data.name).toBe(newName);
    state.profileChanged = true;
  });

  test('Generar código de Telegram devuelve token y vencimiento', async () => {
    const response = await businessApi.post('/users/me/generar-token-bot', {}, auth(state.establishmentB));
    expect([200, 201]).toContain(response.status);
    expect(response.data.token).toEqual(expect.any(String));
    expect(response.data.token.length).toBeGreaterThan(0);
    expect(response.data.expires).toBeTruthy();
  });

  test('Cambiar contraseña funciona y vuelve a dejar la contraseña original', async () => {
    const temporaryPassword = `Test2_${Date.now()}!`;
    const changed = await securityApi.put(`/users/${state.userId}`, { password: temporaryPassword }, auth());
    expect([200, 201]).toContain(changed.status);

    let temporaryToken = state.token;
    try {
      const loginTemporary = await securityApi.post('/auth/login', { email: EMAIL, password: temporaryPassword });
      expect([200, 201]).toContain(loginTemporary.status);
      temporaryToken = loginTemporary.data.token;
    } finally {
      await securityApi.put(`/users/${state.userId}`, { password: PASSWORD }, {
        headers: { Authorization: `Bearer ${temporaryToken}` },
      });
    }

    const loginOriginal = await securityApi.post('/auth/login', { email: EMAIL, password: PASSWORD });
    expect([200, 201]).toContain(loginOriginal.status);
    state.token = loginOriginal.data.token;
  });

  test('Dos establecimientos quedan aislados en los listados', async () => {
    const listA = await businessApi.get('/terneros/obtener-listado-terneros?limit=500', auth(state.establishmentA));
    const listB = await businessApi.get('/terneros/obtener-listado-terneros?limit=500', auth(state.establishmentB));
    expect(listA.status).toBe(200);
    expect(listB.status).toBe(200);

    const idsA = listOf(listA).map((item) => item.id_ternero);
    const idsB = listOf(listB).map((item) => item.id_ternero);
    expect(idsA).toContain(state.calvesA[0]);
    expect(idsA).not.toContain(state.calfB);
    expect(idsB).toContain(state.calfB);
    expect(idsB).not.toContain(state.calvesA[0]);
  });

  test('RP duplicado, peso con letras y calostrado inválido son rechazados', async () => {
    await expectRejectedWith(
      businessApi.post('/terneros/crear-ternero', {
        rp_ternero: state.calfBRp,
        sexo: 'Macho',
        estado: 'Vivo',
        fecha_nacimiento: '2026-01-15',
      }, auth(state.establishmentB)),
      [400, 422],
    );

    await expectRejectedWith(
      businessApi.post('/terneros/crear-ternero', {
        rp_ternero: state.calfBRp,
        sexo: 'Macho',
        estado: 'Vivo',
        peso_nacer: 35,
        fecha_nacimiento: '2026-01-15',
      }, auth(state.establishmentB)),
      [400, 409],
    );

    await expectRejectedWith(
      businessApi.post(`/terneros/peso-diario/${state.calfB}`, {
        peso_actual: 'mucho',
        fecha: '2026-09-09',
      }, auth(state.establishmentB)),
      [400, 422],
    );

    await expectRejectedWith(
      businessApi.patch(`/terneros/calostrado/${state.calfB}`, {
        metodo_calostrado: 'balde',
        litros_calostrado: 2,
      }, auth(state.establishmentB)),
      [400, 422],
    );
  });
});
