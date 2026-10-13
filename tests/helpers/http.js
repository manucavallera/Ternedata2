const fs = require('fs');
const path = require('path');

const SESSION_FILE = path.join(__dirname, '..', '.session-cache.json');
const MIN_TOKEN_LIFE_MS = 5 * 60 * 1000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Reintenta ante 429 respetando Retry-After (el rate limit de login corta las suites seguidas).
const retryOn429 = (api, maxRetries = 2) => {
  api.interceptors.response.use(undefined, async (error) => {
    const config = error.config;
    if (error.response?.status !== 429 || !config) throw error;
    config.__retries = (config.__retries || 0) + 1;
    if (config.__retries > maxRetries) throw error;
    const seconds = Number(error.response.headers['retry-after']) || 30;
    await sleep((seconds + 1) * 1000);
    return api.request(config);
  });
};

const tokenExpiresAt = (token) => {
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());
    return payload.exp * 1000;
  } catch {
    return 0;
  }
};

// La sesión vale solo para el backend que la emitió (producción o local).
const ORIGEN = process.env.SECURITY_URL;

const saveSession = (email, token, userId) => {
  fs.writeFileSync(SESSION_FILE, JSON.stringify({ origen: ORIGEN, email, token, userId }));
};

// Devuelve { token, userId } si hay una sesión guardada vigente para ese email.
const readSession = (email) => {
  try {
    const session = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf8'));
    if (session.email !== email || session.origen !== ORIGEN) return null;
    if (tokenExpiresAt(session.token) - Date.now() < MIN_TOKEN_LIFE_MS) return null;
    return session;
  } catch {
    return null;
  }
};

module.exports = { retryOn429, saveSession, readSession };
