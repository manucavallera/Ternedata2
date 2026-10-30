require('dotenv').config({ path: __dirname + '/.env.test' });
const fs = require('fs');
const axios = require('axios');
const { retryOn429 } = require('./helpers/http');

// La clave del bot vive en el .env del backend (solo disponible con el backend local).
const leerClaveBot = () => {
  if (process.env.BOT_API_KEY) return process.env.BOT_API_KEY;
  const env = fs.readFileSync(__dirname + '/../ms-nestjs-bussines/.env', 'utf8');
  return (env.match(/^BOT_API_KEY=(.+)$/m) || [])[1]?.trim();
};

const securityApi = axios.create({ baseURL: process.env.SECURITY_URL, timeout: 20000 });
const businessApi = axios.create({ baseURL: process.env.BUSSINES_URL, timeout: 30000, validateStatus: (status) => status !== 429 }); // el 429 se reintenta
retryOn429(securityApi);
retryOn429(businessApi);

const sufijo = Date.now() % 99999;
const phone = `549379${String(4000000 + sufijo)}`;
const rpMadre = 870000 + sufijo;
const rpTernero = 880000 + sufijo;
const state = { token: null, userId: null, telefonoOriginal: null };

const bot = (body, key = leerClaveBot()) => businessApi.post('/bot/registrar', { phone, ...body }, {
  headers: key ? { 'x-api-key': key } : {},
});

describe('🤖 BOT — registrar por teléfono', () => {
  beforeAll(async () => {
    const login = await securityApi.post('/auth/login', {
      email: process.env.TEST_EMAIL, password: process.env.TEST_PASSWORD,
    });
    state.token = login.data.token;
    state.userId = login.data.user.id;
    state.telefonoOriginal = login.data.user.telefono;
    const headers = { Authorization: `Bearer ${state.token}` };
    await securityApi.put(`/users/${state.userId}`, { telefono: phone }, { headers });
  }, 240000);

  afterAll(async () => {
    const headers = { Authorization: `Bearer ${state.token}` };
    await bot({ accion: 'eliminar_ternero', rp_ternero: rpTernero });
    await bot({ accion: 'eliminar_madre', rp_madre: rpMadre });
    await securityApi.put(`/users/${state.userId}`, { telefono: state.telefonoOriginal || '' }, { headers, validateStatus: (status) => status !== 429 }); // el 429 se reintenta
  });

  test('sin clave o con clave incorrecta se rechaza', async () => {
    expect([401, 403]).toContain((await bot({ accion: 'consultar_resumen' }, null)).status);
    expect([401, 403]).toContain((await bot({ accion: 'consultar_resumen' }, 'clave-incorrecta')).status);
  });

  // Solo se puede inspeccionar el resultado con WEBHOOK_MODE=shadow (el modo live responde 200 y procesa aparte).
  const webhook = (remoteJid, texto) => businessApi.post('/bot/webhook', {
    data: {
      key: { remoteJid: `${remoteJid}@s.whatsapp.net`, fromMe: false, id: `T${Date.now()}${Math.random()}` },
      pushName: 'Prueba', messageType: 'conversation', message: { conversation: texto },
    },
  }, { headers: { 'x-api-key': leerClaveBot() } });

  test('el webhook avisa a un número sin cuenta y no llama a Claude', async () => {
    const res = await webhook('5491100000002', 'nació ternero RP 1 macho');
    expect([200, 201]).toContain(res.status);
    if (res.data.modo !== 'shadow') return;
    expect(res.data.usuario_no_encontrado).toBe(true);
    expect(res.data.mensaje).toMatch(/vinculad/i);
    expect(res.data.error).toBeUndefined();
  });

  test('un teléfono desconocido no puede registrar', async () => {
    const res = await businessApi.post('/bot/registrar', { phone: '5491100000001', accion: 'crear_madre', rp_madre: 1 }, {
      headers: { 'x-api-key': leerClaveBot() },
    });
    expect(res.data.success).toBe(false);
  });

  test('elige establecimiento si hay varios y registra madre, ternero y peso', async () => {
    let madre = await bot({ accion: 'crear_madre', rp_madre: rpMadre, nombre: 'TEST BOT Madre', estado: 'Seca' });
    if (madre.data.requiere_seleccion) {
      const eleccion = await bot({ accion: 'seleccionar_establecimiento', seleccion: 1 });
      expect(eleccion.data.success).toBe(true);
      madre = await bot({ accion: 'crear_madre', rp_madre: rpMadre, nombre: 'TEST BOT Madre', estado: 'Seca' });
    }
    expect(madre.data).toMatchObject({ success: true, accion: 'crear_madre' });

    const ternero = await bot({
      accion: 'crear_ternero', rp_ternero: rpTernero, id_madre: rpMadre, peso_nacer: 36, sexo: 'Macho',
    });
    expect(ternero.data).toMatchObject({ success: true, accion: 'crear_ternero' });

    const peso = await bot({ accion: 'registrar_peso', rp_ternero: rpTernero, peso: 44 });
    expect(peso.data.success).toBe(true);

    const consulta = await bot({ accion: 'consultar_ternero', rp_ternero: rpTernero });
    expect(consulta.data.success).toBe(true);
    expect(consulta.data.mensaje).toContain(String(rpTernero));
  });

  test('datos inválidos se rechazan con mensaje', async () => {
    const sinRp = await bot({ accion: 'crear_ternero', peso_nacer: 30, sexo: 'Macho' });
    expect(sinRp.data.success).toBe(false);
    const duplicado = await bot({ accion: 'crear_ternero', rp_ternero: rpTernero, id_madre: rpMadre, peso_nacer: 36, sexo: 'Macho' });
    expect(duplicado.data.success).toBe(false);
    const accionMala = await bot({ accion: 'accion_inexistente' });
    expect(accionMala.data.success).toBe(false);
  });

  test('eliminar ternero y madre por RP', async () => {
    expect((await bot({ accion: 'eliminar_ternero', rp_ternero: rpTernero })).data.success).toBe(true);
    expect((await bot({ accion: 'eliminar_madre', rp_madre: rpMadre })).data.success).toBe(true);
  });
});

// Dueño de una forrajería: el bot le contesta con lo que sabe hacer en una forrajería, no con terneros.
describe('🤖 BOT — forrajería', () => {
  const { Client } = require('pg');
  const sql = async (consulta, params) => {
    const client = new Client({ connectionString: process.env.TEST_DB_URL });
    await client.connect();
    try { return await client.query(consulta, params); } finally { await client.end(); }
  };
  const telefono = `549343${String(7000000 + sufijo)}`;

  beforeAll(async () => {
    if (!process.env.TEST_DB_URL) return;
    const email = `bot_forrajeria_${sufijo}@ternedata.test`;
    const password = 'Test1234bot';
    await securityApi.post('/auth/register', { name: 'TEST bot forrajería', email, password });
    await sql('UPDATE users SET email_verificado = true, telefono = $2 WHERE email = $1', [email, telefono]);
    const login = await securityApi.post('/auth/login', { email, password });
    const alta = await businessApi.post('/establecimientos', {
      nombre: `TEST Forrajería bot ${sufijo}`, ubicacion: 'TEST', responsable: 'TEST', tipo_organizacion: 'forrajeria',
    }, { headers: { Authorization: `Bearer ${login.data.token}` } });
    expect([200, 201]).toContain(alta.status);
  }, 240000);

  test('el saludo de un dueño de forrajería ofrece pedidos y stock, sin llamar a Claude', async () => {
    if (!process.env.TEST_DB_URL) return;
    const res = await businessApi.post('/bot/webhook', {
      data: {
        key: { remoteJid: `${telefono}@s.whatsapp.net`, fromMe: false, id: `F${Date.now()}` },
        pushName: 'Prueba', messageType: 'conversation', message: { conversation: 'hola' },
      },
    }, { headers: { 'x-api-key': leerClaveBot() } });
    expect([200, 201]).toContain(res.status);
    if (res.data.modo !== 'shadow') return;
    expect(res.data.forrajeria).toBe(true);
    expect(res.data.mensaje).toMatch(/pedidos/);
    expect(res.data.mensaje).not.toMatch(/ternero/);
  });
});
