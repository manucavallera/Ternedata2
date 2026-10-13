require('dotenv').config({ path: __dirname + '/.env.test' });
const fs = require('fs');
const crypto = require('crypto');
const axios = require('axios');
const dotenv = require('dotenv');
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
const con = (token) => ({ headers: { Authorization: `Bearer ${token}` } });

// El mail de verificación lleva un JWT firmado por security: se arma igual para no depender de la casilla.
const leerSecreto = () => {
  try {
    return dotenv.parse(fs.readFileSync(__dirname + '/../ms-nestjs-security/.env')).JWT_SECRET;
  } catch {
    return null;
  }
};
const firmarJwt = (payload, secreto) => {
  const b64 = (objeto) => Buffer.from(JSON.stringify(objeto)).toString('base64url');
  const ahora = Math.floor(Date.now() / 1000);
  const cuerpo = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ ...payload, iat: ahora, exp: ahora + 3600 })}`;
  return `${cuerpo}.${crypto.createHmac('sha256', secreto).update(cuerpo).digest('base64url')}`;
};

const sufijo = Date.now() % 99999;
const cuentas = {
  invitado: { email: `e2e_invitado_${sufijo}@ternedata.com`, password: 'ClaveInvitado123' },
  adminB: { email: `e2e_adminb_${sufijo}@ternedata.com`, password: 'ClaveAdminB123' },
};
// Usuarios que solo se administran: no necesitan loguearse.
const emails = {
  ajeno: `e2e_ajeno_${sufijo}@ternedata.com`,
  suelto: `e2e_suelto_${sufijo}@ternedata.com`,
};

(TEST_DB_URL ? describe : describe.skip)('🎟️ ROLES — invitación completa y permisos del admin', () => {
  let db;
  const tokens = {};
  const ids = {};
  const est = {};
  const invitaciones = {};

  const login = async (clave, cuenta) => {
    const res = await securityApi.post('/auth/login', cuenta);
    expect([200, 201]).toContain(res.status);
    tokens[clave] = res.data.token;
    ids[clave] = res.data.user.id;
  };
  const invitar = (token, idEstablecimiento, body) =>
    businessApi.post(`/invitaciones/crear/${idEstablecimiento}`, body, con(token));
  const aceptar = (token, tokenInvitacion) =>
    businessApi.post('/invitaciones/aceptar', { token: tokenInvitacion }, con(token));
  const equipo = async (token, idEstablecimiento) =>
    (await businessApi.get(`/establecimientos/${idEstablecimiento}/equipo`, con(token))).data;
  const usuario = async (id) => (await db.query('SELECT rol, estado, id_establecimiento FROM users WHERE id = $1', [id])).rows[0];

  beforeAll(async () => {
    db = new Client({ connectionString: TEST_DB_URL });
    await db.connect();

    await login('admin', { email: process.env.TEST_EMAIL, password: process.env.TEST_PASSWORD });
    const propios = await businessApi.get('/establecimientos', con(tokens.admin));
    est.a = propios.data[0].id_establecimiento;

    // Admin de otro campo, con un establecimiento y un usuario propios.
    const registro = await securityApi.post('/auth/register', {
      name: 'TEST adminB', email: cuentas.adminB.email, password: cuentas.adminB.password, telefono: `12${sufijo}`,
    });
    expect([200, 201]).toContain(registro.status);
    await db.query('UPDATE users SET email_verificado = true WHERE email = $1', [cuentas.adminB.email]);
    await login('adminB', cuentas.adminB);
    const alta = await businessApi.post('/establecimientos', {
      nombre: `TEST ROLES B ${sufijo}`, ubicacion: 'TEST', responsable: 'TEST',
    }, con(tokens.adminB));
    expect([200, 201]).toContain(alta.status);
    est.b = alta.data.id_establecimiento;
    // El acceso al establecimiento nuevo viaja en el token.
    tokens.adminB = (await securityApi.post('/auth/refresh', {}, con(tokens.adminB))).data.token;

    const crearUsuario = async (clave, token, idEstablecimiento) => {
      const res = await securityApi.post('/users', {
        name: `TEST ${clave}`, email: emails[clave], password: 'ClaveUsuario123', rol: 'operario',
        ...(idEstablecimiento ? { id_establecimiento: idEstablecimiento } : {}),
      }, con(token));
      expect([200, 201]).toContain(res.status);
      ids[clave] = res.data.id;
    };
    await crearUsuario('ajeno', tokens.adminB, est.b);
    await crearUsuario('suelto', tokens.admin, null);
  }, 400000);

  afterAll(async () => {
    const todos = [...Object.values(cuentas).map((c) => c.email), ...Object.values(emails)];
    const idsUsuarios = (await db.query('SELECT id FROM users WHERE email = ANY($1)', [todos])).rows.map((r) => r.id);
    await db.query('DELETE FROM invitaciones WHERE "establecimientoId" = ANY($1) OR email = ANY($2)', [[est.b].filter(Boolean), todos]);
    await db.query('DELETE FROM user_establecimientos WHERE "userId" = ANY($1) OR "establecimientoId" = ANY($2)', [idsUsuarios, [est.b].filter(Boolean)]);
    await db.query('DELETE FROM users WHERE id = ANY($1)', [idsUsuarios]);
    if (est.b) await db.query('DELETE FROM establecimientos WHERE id_establecimiento = $1', [est.b]);
    await db.end();
  });

  describe('invitación de punta a punta', () => {
    test('el admin invita por email y la invitación queda pendiente', async () => {
      const res = await invitar(tokens.admin, est.a, { email: cuentas.invitado.email, rol: 'operario' });
      expect([200, 201]).toContain(res.status);
      invitaciones.operario = res.data.token;
      expect(res.data.link).toContain(invitaciones.operario);

      const pendientes = await businessApi.get(`/invitaciones/pendientes/${est.a}`, con(tokens.admin));
      expect(pendientes.data.map((i) => i.email)).toContain(cuentas.invitado.email);
      expect((await invitar(tokens.admin, est.a, { email: cuentas.invitado.email, rol: 'operario' })).status).toBe(409);
    });

    test('no se puede invitar con un rol que no sea de establecimiento', async () => {
      expect((await invitar(tokens.admin, est.a, { rol: 'admin' })).status).toBe(400);
      expect((await invitar(tokens.admin, est.a, { rol: 'super_admin' })).status).toBe(400);
    });

    test('un admin no invita a un establecimiento ajeno', async () => {
      expect((await invitar(tokens.admin, est.b, { rol: 'operario' })).status).toBe(403);
    });

    test('el invitado se registra como operario y no entra hasta verificar el email', async () => {
      const registro = await securityApi.post('/auth/register', {
        name: 'TEST invitado', email: cuentas.invitado.email, password: cuentas.invitado.password,
        telefono: `13${sufijo}`, invitationToken: invitaciones.operario,
      });
      expect([200, 201]).toContain(registro.status);
      const fila = (await db.query('SELECT id, rol, email_verificado FROM users WHERE email = $1', [cuentas.invitado.email])).rows[0];
      expect(fila).toMatchObject({ rol: 'operario', email_verificado: false });
      ids.invitado = fila.id;

      const sinVerificar = await securityApi.post('/auth/login', cuentas.invitado);
      expect(sinVerificar.status).toBe(403);
      expect(sinVerificar.data.message).toMatch(/verific/i);
    });

    test('verifica el email con el link del mail y recién ahí entra', async () => {
      const secreto = leerSecreto();
      if (!secreto) throw new Error('No se pudo leer JWT_SECRET de ms-nestjs-security/.env');
      const datos = { id: ids.invitado, email: cuentas.invitado.email };

      // Un token de sesión o uno mal firmado no sirven para verificar.
      expect((await securityApi.post('/auth/verify-email', { token: firmarJwt({ ...datos, type: 'reset' }, secreto) })).status).toBe(400);
      expect((await securityApi.post('/auth/verify-email', { token: firmarJwt({ ...datos, type: 'verify' }, 'otro-secreto') })).status).toBe(400);
      expect((await usuario(ids.invitado)).estado).toBe('activo');
      expect((await db.query('SELECT email_verificado FROM users WHERE id = $1', [ids.invitado])).rows[0].email_verificado).toBe(false);

      const verificacion = await securityApi.post('/auth/verify-email', { token: firmarJwt({ ...datos, type: 'verify' }, secreto) });
      expect([200, 201]).toContain(verificacion.status);
      await login('invitado', cuentas.invitado);
    });

    test('acepta la invitación y queda como operario del establecimiento', async () => {
      const res = await aceptar(tokens.invitado, invitaciones.operario);
      expect([200, 201]).toContain(res.status);
      expect(res.data.establecimientoId).toBe(est.a);

      const miembro = (await equipo(tokens.admin, est.a)).find((m) => m.email === cuentas.invitado.email);
      expect(miembro).toBeTruthy();
      expect(JSON.stringify(miembro)).toContain('operario');
      expect((await usuario(ids.invitado)).id_establecimiento).toBe(est.a);

      const pendientes = await businessApi.get(`/invitaciones/pendientes/${est.a}`, con(tokens.admin));
      expect(pendientes.data.map((i) => i.email)).not.toContain(cuentas.invitado.email);
      // El acceso nuevo viaja en el token.
      tokens.invitado = (await securityApi.post('/auth/refresh', {}, con(tokens.invitado))).data.token;
    });

    test('el link no se puede usar dos veces', async () => {
      expect((await aceptar(tokens.invitado, invitaciones.operario)).status).toBe(400);
    });

    test('una invitación dirigida a otro email no la acepta otra persona', async () => {
      const res = await invitar(tokens.adminB, est.b, { email: `e2e_otro_${sufijo}@ternedata.com`, rol: 'dueno' });
      expect([200, 201]).toContain(res.status);
      expect((await aceptar(tokens.invitado, res.data.token)).status).toBe(403);
    });
  });

  describe('el admin administra a su equipo desde business', () => {
    const cambiarRol = (token, id, rol) => businessApi.put(`/users/${id}/change-role`, { rol }, con(token));
    const alternar = (token, id) => businessApi.put(`/users/${id}/toggle-status`, {}, con(token));

    test('cambia el rol de un usuario de su establecimiento', async () => {
      const res = await cambiarRol(tokens.admin, ids.invitado, 'veterinario');
      expect(res.status).toBe(200);
      expect((await usuario(ids.invitado)).rol).toBe('veterinario');
      expect((await cambiarRol(tokens.admin, ids.invitado, 'operario')).status).toBe(200);
      expect((await usuario(ids.invitado)).rol).toBe('operario');
    });

    test('activa y desactiva a un usuario de su establecimiento', async () => {
      expect((await alternar(tokens.admin, ids.invitado)).data.estado).toBe('inactivo');
      expect((await alternar(tokens.admin, ids.invitado)).data.estado).toBe('activo');
    });

    test('no toca a un usuario de otro establecimiento', async () => {
      expect((await cambiarRol(tokens.admin, ids.ajeno, 'admin')).status).toBe(403);
      expect((await alternar(tokens.admin, ids.ajeno)).status).toBe(403);
      expect((await businessApi.delete(`/users/${ids.ajeno}`, con(tokens.admin))).status).toBe(403);
      expect(await usuario(ids.ajeno)).toMatchObject({ rol: 'operario', estado: 'activo' });
    });

    test('no toca a un usuario sin establecimiento', async () => {
      expect((await cambiarRol(tokens.admin, ids.suelto, 'admin')).status).toBe(403);
      expect((await alternar(tokens.admin, ids.suelto)).status).toBe(403);
      expect(await usuario(ids.suelto)).toMatchObject({ rol: 'operario', estado: 'activo' });
    });

    test('un operario no cambia roles ni estados', async () => {
      expect((await cambiarRol(tokens.invitado, ids.invitado, 'admin')).status).toBe(403);
      expect((await alternar(tokens.invitado, ids.admin)).status).toBe(403);
    });

    test('nadie llega a super_admin por el cambio de rol del admin', async () => {
      expect((await cambiarRol(tokens.admin, ids.invitado, 'super_admin')).status).toBe(403);
      expect((await cambiarRol(tokens.admin, ids.admin, 'super_admin')).status).toBe(403);
      expect((await usuario(ids.invitado)).rol).toBe('operario');
      expect((await usuario(ids.admin)).rol).toBe('admin');
    });

    test('rechaza un rol que no existe', async () => {
      expect((await cambiarRol(tokens.admin, ids.invitado, 'rol_inventado')).status).toBe(400);
      expect((await usuario(ids.invitado)).rol).toBe('operario');
    });
  });

  describe('edición de usuarios por security', () => {
    const editar = (token, id, body) => securityApi.put(`/users/${id}`, body, con(token));

    test('un operario no se cambia su propio rol', async () => {
      expect((await editar(tokens.invitado, ids.invitado, { rol: 'admin' })).status).toBe(403);
      expect((await usuario(ids.invitado)).rol).toBe('operario');
    });

    test('un admin no asigna super_admin editando un usuario', async () => {
      expect((await editar(tokens.admin, ids.invitado, { rol: 'super_admin' })).status).toBe(403);
      expect((await editar(tokens.admin, ids.admin, { rol: 'super_admin' })).status).toBe(403);
      expect((await usuario(ids.admin)).rol).toBe('admin');
    });

    test('un admin no edita ni da de baja a un usuario de otro establecimiento', async () => {
      expect((await editar(tokens.admin, ids.ajeno, { rol: 'admin' })).status).toBe(403);
      expect((await editar(tokens.admin, ids.adminB, { password: 'ClaveRobada123' })).status).toBe(403);
      expect((await securityApi.delete(`/users/${ids.ajeno}`, con(tokens.admin))).status).toBe(403);
      expect(await usuario(ids.ajeno)).toMatchObject({ rol: 'operario', estado: 'activo' });
    });

    test('un admin edita a los suyos y cada uno edita sus propios datos', async () => {
      expect((await editar(tokens.admin, ids.invitado, { name: 'TEST invitado editado' })).status).toBe(200);
      expect((await editar(tokens.invitado, ids.invitado, { name: 'TEST invitado' })).status).toBe(200);
    });

    test('nadie se mete ni mete a otros en un establecimiento ajeno', async () => {
      const asignar = (userId, establecimientoId) =>
        securityApi.post('/users/assign-establishment', { userId, establecimientoId }, con(tokens.admin));
      const sincronizar = (userId, idsEst) =>
        securityApi.put(`/users/${userId}/establecimientos`, { ids: idsEst }, con(tokens.admin));

      expect((await asignar(ids.admin, est.b)).status).toBe(403);
      expect((await asignar(ids.ajeno, est.a)).status).toBe(403);
      expect((await sincronizar(ids.admin, [est.a, est.b])).status).toBe(403);
      expect((await sincronizar(ids.adminB, [])).status).toBe(403);
      expect((await editar(tokens.admin, ids.admin, { id_establecimiento: est.b })).status).toBe(403);

      const miembrosB = await db.query('SELECT "userId" FROM user_establecimientos WHERE "establecimientoId" = $1', [est.b]);
      expect(miembrosB.rows).toEqual([{ userId: ids.adminB }]);
      // Lo propio sigue funcionando.
      expect([200, 201]).toContain((await asignar(ids.admin, est.a)).status);
    });
  });

  // Va al final: aceptar la segunda invitación cambia el establecimiento principal del invitado.
  describe('rol dentro de cada establecimiento', () => {
    test('quien crea el establecimiento queda como dueño', async () => {
      const filas = await db.query('SELECT rol FROM user_establecimientos WHERE "userId" = $1 AND "establecimientoId" = $2', [ids.adminB, est.b]);
      expect(filas.rows).toEqual([{ rol: 'dueno' }]);
    });

    test('la misma persona puede ser operario en un campo y veterinario en otro', async () => {
      const res = await invitar(tokens.adminB, est.b, { email: cuentas.invitado.email, rol: 'veterinario' });
      expect([200, 201]).toContain(res.status);
      expect([200, 201]).toContain((await aceptar(tokens.invitado, res.data.token)).status);

      const filas = await db.query('SELECT "establecimientoId" AS est, rol FROM user_establecimientos WHERE "userId" = $1 ORDER BY id', [ids.invitado]);
      expect(filas.rows).toEqual([{ est: est.a, rol: 'operario' }, { est: est.b, rol: 'veterinario' }]);
      // El rol global no cambia por unirse a otro equipo.
      expect((await usuario(ids.invitado)).rol).toBe('operario');
    });

    test('el admin saca a un miembro de su equipo y el otro equipo no se entera', async () => {
      const baja = await businessApi.delete(`/establecimientos/${est.a}/equipo/${ids.invitado}`, con(tokens.admin));
      expect([200, 204]).toContain(baja.status);
      const filas = await db.query('SELECT "establecimientoId" AS est, rol FROM user_establecimientos WHERE "userId" = $1', [ids.invitado]);
      expect(filas.rows).toEqual([{ est: est.b, rol: 'veterinario' }]);
      expect((await businessApi.delete(`/establecimientos/${est.b}/equipo/${ids.invitado}`, con(tokens.admin))).status).toBe(403);
    });
  });
});
