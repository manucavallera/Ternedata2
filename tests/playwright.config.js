require('dotenv').config({ path: __dirname + '/.env.test' });
const { defineConfig } = require('@playwright/test');

const STORAGE = __dirname + '/e2e/.auth/user.json';

module.exports = defineConfig({
  testDir: './e2e',
  timeout: 240000,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: process.env.WEB_URL,
    // Web local contra backends deployados: producción no habilita CORS para localhost.
    launchOptions: /localhost/.test(process.env.WEB_URL) ? { args: ['--disable-web-security'] } : {},
    viewport: { width: 1440, height: 900 },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'setup', testMatch: /auth\.setup\.js/ },
    { name: 'sin-sesion', testMatch: /publico.*\.spec\.js/ },
    {
      name: 'con-sesion',
      testIgnore: [/auth\.setup\.js/, /publico.*\.spec\.js/],
      dependencies: ['setup'],
      use: { storageState: STORAGE },
    },
  ],
});

module.exports.STORAGE = STORAGE;
