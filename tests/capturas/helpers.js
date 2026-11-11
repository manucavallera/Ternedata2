const fs = require('fs');
const path = require('path');

const haceDias = (n) => new Date(Date.now() - 3 * 3600e3 - n * 86400e3).toISOString().slice(0, 10);

// Guarda una captura en la carpeta de la corrida, después de que cargan los datos y los gráficos.
const foto = async (page, nombre, { fullPage = true } = {}) => {
  const archivo = path.join(process.env.CAPTURAS, `${nombre}.png`);
  fs.mkdirSync(path.dirname(archivo), { recursive: true });
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(1200);
  await page.screenshot({ path: archivo, fullPage });
};

// Crea un establecimiento, renueva el token para que lo incluya y lo deja elegido en la web.
const nuevoEstablecimiento = async (page, api, datos) => {
  await page.goto('/admin/dashboard');
  const est = await api.crear('/establecimientos', datos);
  await page.evaluate(async ({ securityUrl, id }) => {
    const respuesta = await fetch(`${securityUrl}/auth/refresh`, {
      method: 'POST', headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    });
    localStorage.setItem('token', (await respuesta.json()).token);
    localStorage.setItem('establecimientoActual', String(id));
  }, { securityUrl: process.env.SECURITY_URL, id: est.id_establecimiento });
  return est.id_establecimiento;
};

module.exports = { foto, nuevoEstablecimiento, haceDias };
