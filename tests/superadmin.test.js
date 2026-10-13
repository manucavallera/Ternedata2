require('dotenv').config({ path: __dirname + '/.env.test' });
const axios = require('axios');
const { Client } = require('pg');
const { retryOn429 } = require('./helpers/http');

// Promover a super_admin solo se puede por base de datos: este test corre contra el entorno local.
const TEST_DB_URL = process.env.TEST_DB_URL;
const securityApi = axios.create({ baseURL: process.env.SECURITY_URL, timeout: 20000, validateStatus: (status) => status !== 429 }); // el 429 se reintenta
// Varias cuentas se loguean seguido y el login admite pocos intentos por minuto.
retryOn429(securityApi, 5);

const sufijo = Date.now() % 99999;
const cuentas = {
  superAdmin: { email: `e2e_super_${sufijo}@ternedata.com`, password: 'ClaveSuper123' },
  operario: { email: `e2e_oper_${sufijo}@ternedata.com`, password: 'ClaveOper123' },
};
const con = (token) => ({ headers: { Authorization: `Bearer ${token}` } });

(TEST_DB_URL ? describe : describe.skip)('👑 SUPERADMIN — panel global de usuarios', () => {
  let db;
  const tokens = {};
  const ids = {};

  beforeAll(async () => {
    db = new Client({ connectionString: TEST_DB_URL });
    await db.connect();
    for (const [clave, cuenta] of Object.entries(cuentas)) {
      const registro = await securityApi.post('/auth/register', {
        name: `TEST ${clave}`, email: cuenta.email, password: cuenta.password, telefono: `11${sufijo}${clave.length}`,
      });
      expect([200, 201]).toContain(registro.status);
    }
    await db.query('UPDATE users SET email_verificado = true WHERE email = ANY($1)', [Object.values(cuentas).map((c) => c.email)]);
    await db.query("UPDATE users SET rol = 'super_admin' WHERE email = $1", [cuentas.superAdmin.email]);
    await db.query("UPDATE users SET rol = 'operario' WHERE email = $1", [cuentas.operario.email]);
    const admin = await securityApi.post('/auth/login', { email: process.env.TEST_EMAIL, password: process.env.TEST_PASSWORD });
    tokens.admin = admin.data.token;
    for (const [clave, cuenta] of Object.entries(cuentas)) {
      const login = await securityApi.post('/auth/login', cuenta);
      expect([200, 201]).toContain(login.status);
      tokens[clave] = login.data.token;
      ids[clave] = login.data.user.id;
    }
  }, 240000);

  afterAll(async () => {
    await db.query('DELETE FROM users WHERE email = ANY($1)', [Object.values(cuentas).map((c) => c.email)]);
    await db.end();
  });

  test('solo super_admin ve el listado global', async () => {
    expect((await securityApi.get('/users/admin/global', con(tokens.superAdmin))).status).toBe(200);
    expect((await securityApi.get('/users/admin/global', con(tokens.admin))).status).toBe(403);
    expect((await securityApi.get('/users/admin/global', con(tokens.operario))).status).toBe(403);
    expect((await securityApi.get('/users/admin/global')).status).toBe(401);
  });

  test('el listado global incluye a los usuarios con su rol y sin contraseña', async () => {
    const { data } = await securityApi.get('/users/admin/global', con(tokens.superAdmin));
    const operario = data.find((u) => u.email === cuentas.operario.email);
    expect(operario).toMatchObject({ rol: 'operario', estado: 'activo' });
    expect(operario.password).toBeUndefined();
  });

  test('super_admin cambia roles; admin y operario no pueden', async () => {
    const cambiar = (token, rol) => securityApi.put(`/users/${ids.operario}/change-role`, { rol }, con(token));
    expect((await cambiar(tokens.admin, 'veterinario')).status).toBe(403);
    expect((await cambiar(tokens.operario, 'admin')).status).toBe(403);
    const ok = await cambiar(tokens.superAdmin, 'veterinario');
    expect(ok.status).toBe(200);
    expect(ok.data.rol).toBe('veterinario');
    expect((await cambiar(tokens.superAdmin, 'rol_inventado')).status).toBe(400);
  });

  test('super_admin activa y desactiva usuarios; admin no', async () => {
    const alternar = (token) => securityApi.put(`/users/${ids.operario}/toggle-status`, {}, con(token));
    expect((await alternar(tokens.admin)).status).toBe(403);
    expect((await alternar(tokens.superAdmin)).data.estado).toBe('inactivo');
    const loginInactivo = await securityApi.post('/auth/login', cuentas.operario);
    expect([401, 403]).toContain(loginInactivo.status);
    expect((await alternar(tokens.superAdmin)).data.estado).toBe('activo');
  }, 400000);

  test('no se puede degradar ni desactivar al último super_admin', async () => {
    const otros = await db.query("SELECT count(*)::int AS n FROM users WHERE rol = 'super_admin' AND estado = 'activo' AND id <> $1", [ids.superAdmin]);
    if (otros.rows[0].n > 0) return; // hay más super_admin en esta base: la regla no aplica
    expect((await securityApi.put(`/users/${ids.superAdmin}/change-role`, { rol: 'admin' }, con(tokens.superAdmin))).status).toBe(409);
    expect((await securityApi.put(`/users/${ids.superAdmin}/toggle-status`, {}, con(tokens.superAdmin))).status).toBe(409);
  });

  test('nadie se asigna super_admin por el alta común de usuarios', async () => {
    const res = await securityApi.post('/users', {
      name: 'TEST intruso', email: `e2e_intruso_${sufijo}@ternedata.com`, password: 'ClaveIntruso123', rol: 'super_admin',
    }, con(tokens.admin));
    expect(res.status).toBe(403);
  });
});
