// Capturas de pantalla de las funciones principales, con datos de ejemplo (ver capturas/datos.js).
// Solo para el entorno local: crea cuentas, establecimientos y datos que no se borran.
// Uso: npm run capturas (web y app), npm run capturas:web o npm run capturas:app.
// Salida: ../capturas/<fecha>/web y ../capturas/<fecha>/app.
require('dotenv').config({ path: __dirname + '/.env.test' });
const fs = require('fs');
const { defineConfig } = require('@playwright/test');
const base = require('./playwright.config');

const fecha = new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 10);
process.env.CAPTURAS = process.env.CAPTURAS || `${__dirname}/../capturas/${fecha}`;

// La app mobile se sirve desde su export web (ternedata-mobile: npm run build:e2e).
const PWA_URL = process.env.PWA_URL || 'http://localhost:8081';
const servidorPwa = `${__dirname}/../ternedata-mobile/e2e/serve.js`;

module.exports = defineConfig({
  timeout: 600000,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: { ...base.use, screenshot: 'off', trace: 'off' },
  projects: [
    { name: 'setup', testDir: './e2e', testMatch: /auth\.setup\.js/ },
    {
      name: 'web',
      testDir: './capturas',
      testIgnore: /app[\\/]/,
      dependencies: ['setup'],
      use: { storageState: base.STORAGE },
    },
    {
      name: 'app',
      testDir: './capturas/app',
      use: { baseURL: PWA_URL, viewport: { width: 390, height: 844 }, launchOptions: {} },
    },
  ],
  webServer: fs.existsSync(servidorPwa) ? {
    command: `node "${servidorPwa}"`,
    url: PWA_URL,
    reuseExistingServer: true,
    env: { PORT: new URL(PWA_URL).port || '8081' },
  } : undefined,
});
