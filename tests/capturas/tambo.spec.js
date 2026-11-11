const { test, expect } = require('../e2e/fixtures');
const { foto, nuevoEstablecimiento } = require('./helpers');
const { sembrarTambo } = require('./datos');

// Tambo de ejemplo (ver datos.js) y un mixer cargado desde la pantalla.
test('tambo: rodeo lechero, control, producción y mixer', async ({ page, api }) => {
  page.on('dialog', (dialog) => dialog.accept());
  const campo = await nuevoEstablecimiento(page, api, {
    nombre: 'Tambo La Esperanza', ubicacion: 'Rafaela, Santa Fe', responsable: 'Demo',
  });
  const { rp } = await sembrarTambo(api.crear, campo);

  await test.step('dashboard con el panel del tambo', async () => {
    await page.goto('/admin/dashboard');
    await expect(page.locator('[data-panel="tambo"]')).toBeVisible();
    await foto(page, 'web/tambo/01-dashboard-panel-tambo');
    await page.locator('[data-panel="tambo"]').screenshot({ path: `${process.env.CAPTURAS}/web/tambo/02-panel-tambo-detalle.png` });
  });

  await test.step('rodeo lechero y pendientes', async () => {
    await page.goto('/tambo');
    await expect(page.getByRole('heading', { name: /Rodeo lechero/ })).toBeVisible();
    await expect(page.locator('li').filter({ hasText: String(rp('Aurora')) }).first()).toBeVisible();
    await foto(page, 'web/tambo/03-rodeo-lechero');
    const tarjeta = (texto) => page.getByRole('button', { name: new RegExp(`^\\d+\\s*${texto}$`) });
    for (const [texto, archivo] of [['A tactar', '04-pendiente-a-tactar'], ['OK para inseminar', '05-pendiente-ok-para-inseminar'], ['A reconfirmar preñez', '05b-pendiente-a-reconfirmar']]) {
      if (await tarjeta(texto).count()) {
        await tarjeta(texto).click();
        await foto(page, `web/tambo/${archivo}`);
        await page.getByRole('button', { name: 'Ver todas' }).click();
      }
    }
  });

  await test.step('cargar evento para varias vacas', async () => {
    await page.getByRole('button', { name: '+ Cargar evento' }).click();
    await page.getByPlaceholder('Ej: 325, 328, 331').fill(`${rp('Dulce')}, ${rp('Estrella')}`);
    await page.locator('form select').first().selectOption('tacto');
    await foto(page, 'web/tambo/06-cargar-evento-varias-vacas', { fullPage: false });
    await page.keyboard.press('Escape');
    const cancelar = page.getByRole('button', { name: /Cancelar|Cerrar/ }).first();
    if (await page.getByRole('heading', { name: 'Cargar evento' }).count()) await cancelar.click();
  });

  await test.step('historial de una vaca', async () => {
    await page.getByPlaceholder('Buscar por caravana o nombre').fill(String(rp('Flor')));
    const fila = page.locator('li').filter({ hasText: String(rp('Flor')) }).first();
    await fila.getByRole('button', { name: 'Historial' }).click();
    await expect(fila.locator('[data-historial="eventos"]')).toBeVisible();
    await foto(page, 'web/tambo/07-historial-vaca');
  });

  await test.step('planilla de control lechero', async () => {
    await page.goto('/tambo/control');
    await expect(page.getByRole('heading', { name: /Control lechero/ })).toBeVisible();
    await page.getByLabel(`Mañana ${rp('Aurora')}`).fill('16,5');
    await page.getByLabel(`Tarde ${rp('Aurora')}`).fill('13');
    await foto(page, 'web/tambo/08-control-lechero');
  });

  await test.step('producción diaria', async () => {
    await page.goto('/litros');
    await expect(page.getByRole('heading', { name: /Litros de leche/ })).toBeVisible();
    await expect(page.locator('[data-grafico="total"] svg.recharts-surface')).toBeVisible();
    await foto(page, 'web/tambo/09-produccion-diaria');
    await page.getByRole('button', { name: 'Por mes' }).click();
    await foto(page, 'web/tambo/10-produccion-por-mes');
    await page.getByRole('button', { name: 'Acumulado por año' }).click();
    await foto(page, 'web/tambo/11-produccion-acumulado-anio');
  });

  await test.step('mixer', async () => {
    await page.goto('/tambo/mixer');
    await expect(page.getByRole('heading', { name: /Mixers/ })).toBeVisible();
    await page.getByRole('button', { name: '+ Nuevo mixer' }).click();
    await page.getByPlaceholder('Ej: Ración vacas en ordeñe').fill('Ración vacas en ordeñe');
    await page.locator('form select').nth(0).selectOption({ label: 'Vacas en ordeñe' });
    await page.locator('form input[type="number"]').fill('2');
    const ingredientes = [['Silo de maíz', '280', '🌽'], ['Expeller de soja', '45'], ['Rollo de alfalfa', '60'], ['Núcleo mineral', '3,5']];
    for (const [i, [nombre, kg, icono]] of ingredientes.entries()) {
      if (i > 0) await page.getByRole('button', { name: '+ Agregar ingrediente' }).click();
      await page.getByLabel(`Ingrediente ${i + 1}`, { exact: true }).fill(nombre);
      await page.getByLabel(`Kg ingrediente ${i + 1}`).fill(kg);
      if (icono) await page.getByLabel(`Ícono ingrediente ${i + 1}`).selectOption(icono);
    }
    await foto(page, 'web/tambo/12-mixer-formulario');
    await page.getByRole('button', { name: 'Guardar', exact: true }).click();
    await expect(page.locator('[data-mixer="Ración vacas en ordeñe"]')).toBeVisible();
    await foto(page, 'web/tambo/13-mixer-tabla-de-carga');
  });

  await test.step('calendario', async () => {
    await page.goto('/calendario');
    await foto(page, 'web/tambo/14-calendario');
  });
});
