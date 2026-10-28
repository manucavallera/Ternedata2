const { test, expect, esperarEscritura } = require('./fixtures');

test.describe('Forrajería desde la UI', () => {
  test('elegir una forrajería lleva a su inicio, se carga un producto y un movimiento de stock', async ({ page, api }) => {
    // Forrajería no tiene bajas: contra producción dejaría productos y establecimientos de prueba.
    test.skip(!/localhost/.test(process.env.WEB_URL), 'solo en entorno local');
    page.on('dialog', (dialog) => dialog.accept());
    await page.goto('/admin/dashboard');
    const nombre = `TEST E2E Forrajeria ${Date.now() % 99999}`;
    const producto = `TEST E2E Balanceado ${Date.now() % 99999}`;
    const forrajeria = await api.crear('/establecimientos', {
      nombre, ubicacion: 'TEST E2E', responsable: 'TEST E2E', tipo_organizacion: 'forrajeria',
    });
    api.borrarAlFinal(`/establecimientos/${forrajeria.id_establecimiento}`);
    const selector = page.locator('select').first();
    const ganaderia = await selector.inputValue();
    let productosIniciales;

    await test.step('cambiar a la forrajería redirige a /forrajeria', async () => {
      // El acceso a un establecimiento nuevo viaja en el token: se renueva como hace la app al crearlo.
      await page.evaluate(async (securityUrl) => {
        const respuesta = await fetch(`${securityUrl}/auth/refresh`, {
          method: 'POST', headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        });
        localStorage.setItem('token', (await respuesta.json()).token);
      }, process.env.SECURITY_URL);
      await page.reload();
      await expect(selector.locator('option', { hasText: nombre })).toBeAttached();
      await selector.selectOption(String(forrajeria.id_establecimiento));
      await expect(page).toHaveURL(/\/forrajeria$/);
      await expect(page.getByRole('heading', { name: 'Forrajería' })).toBeVisible();
      // Arranca con el catálogo base cargado.
      await expect(page.getByText('Pedidos en curso')).toBeVisible();
      const tarjeta = page.getByRole('link', { name: /^Productos\s*\d+$/ });
      await expect(tarjeta).toBeVisible();
      productosIniciales = Number((await tarjeta.innerText()).match(/\d+/)[0]);
    });

    await test.step('alta de producto', async () => {
      await page.getByRole('link', { name: /producto/i }).first().click();
      await expect(page).toHaveURL(/\/forrajeria\/productos/);
      await expect(page.getByRole('heading', { name: 'Catálogo de productos' })).toBeVisible();
      await page.getByPlaceholder('Nombre del producto').fill(producto);
      await page.getByPlaceholder('Precio').fill('1000');
      await page.getByPlaceholder('Costo').fill('700');
      const alta = esperarEscritura(page, '/forrajeria/productos');
      await page.locator('form button[type="submit"], form button:not([type])').first().click();
      expect((await alta).status()).toBeLessThan(300);
      await expect(page.getByText(producto).first()).toBeVisible();
    });

    await test.step('movimiento de stock', async () => {
      const filaProducto = page.locator('tr, li, article, div.rounded-xl').filter({ hasText: producto }).last();
      await filaProducto.locator('input[type="number"]').first().fill('12');
      const movimiento = esperarEscritura(page, '/movimientos');
      await filaProducto.getByRole('button').first().click();
      expect((await movimiento).status()).toBeLessThan(300);
      await expect(filaProducto).toContainText('12');
    });

    await test.step('el inicio de forrajería muestra el producto', async () => {
      await page.goto('/forrajeria');
      // El inicio lista solo los primeros 8: se verifica que el conteo sumó el nuevo.
      await expect(page.getByRole('link', { name: new RegExp(`^Productos\\s*${productosIniciales + 1}$`) })).toBeVisible();
    });

    await test.step('volver a ganadería redirige al dashboard', async () => {
      await selector.selectOption(ganaderia);
      await expect(page).toHaveURL(/\/admin\/dashboard/);
    });
  });

  test('clientes, pedido a cuenta corriente de punta a punta y pago', async ({ page, api }) => {
    test.skip(!/localhost/.test(process.env.WEB_URL), 'solo en entorno local');
    page.on('dialog', (dialog) => dialog.accept());
    const foto = (nombre) => process.env.CAPTURAS && page.screenshot({ path: `${process.env.CAPTURAS}/${nombre}.png`, fullPage: true });
    const sufijo = Date.now() % 99999;
    const cliente = `TEST E2E Cliente ${sufijo}`;
    await page.goto('/admin/dashboard');
    const forrajeria = await api.crear('/establecimientos', {
      nombre: `TEST E2E Forrajeria Pedidos ${sufijo}`, ubicacion: 'TEST E2E', responsable: 'TEST E2E', tipo_organizacion: 'forrajeria',
    });
    api.borrarAlFinal(`/establecimientos/${forrajeria.id_establecimiento}`);
    await page.evaluate(async (securityUrl) => {
      const respuesta = await fetch(`${securityUrl}/auth/refresh`, {
        method: 'POST', headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      localStorage.setItem('token', (await respuesta.json()).token);
    }, process.env.SECURITY_URL);
    await page.reload();
    const selector = page.locator('select').first();
    await expect(selector.locator('option', { hasText: forrajeria.nombre })).toBeAttached();
    await selector.selectOption(String(forrajeria.id_establecimiento));
    await expect(page).toHaveURL(/\/forrajeria$/);

    const producto = await api.crear('/forrajeria/productos', { nombre: `TEST E2E Fardo ${sufijo}`, unidad_venta: 'fardo', precio: 1000 });
    await api.crear(`/forrajeria/inventario/productos/${producto.id_producto}/movimientos`, { tipo: 'entrada', cantidad: 20 });

    await test.step('alta de cliente', async () => {
      await page.getByRole('link', { name: 'Clientes' }).first().click();
      await expect(page.getByRole('heading', { name: 'Clientes' })).toBeVisible();
      await page.getByRole('button', { name: 'Nuevo cliente' }).click();
      await page.getByLabel('Nombre *').fill(cliente);
      await page.getByLabel('Zona de reparto').fill('Crespo');
      await page.getByRole('button', { name: 'Guardar cliente' }).click();
      await expect(page.getByRole('link', { name: new RegExp(cliente) })).toBeVisible();
      await foto('clientes');
    });

    await test.step('pedido a cuenta corriente desde la ficha', async () => {
      await page.getByRole('link', { name: new RegExp(cliente) }).click();
      await expect(page.getByRole('heading', { name: cliente })).toBeVisible();
      await page.getByRole('link', { name: /Nuevo pedido/ }).click();
      await expect(page.getByRole('heading', { name: 'Nuevo pedido' })).toBeVisible();
      const productos = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Productos' }) });
      await productos.locator('select').first().selectOption(String(producto.id_producto));
      await productos.locator('input[type="number"]').first().fill('3');
      await page.getByLabel('Cuenta corriente').check();
      await expect(page.getByText('$3.000').last()).toBeVisible();
      await foto('nuevo-pedido');
      await page.getByRole('button', { name: 'Crear pedido' }).click();
      await expect(page).toHaveURL(/\/forrajeria\/pedidos$/);
    });

    await test.step('avanzar hasta entregado', async () => {
      const tarjeta = page.locator('article').filter({ hasText: cliente });
      await expect(tarjeta).toContainText('Pendiente');
      await foto('pedidos');
      for (const [boton, estado] of [['Confirmar', 'Confirmado'], ['Preparar', 'Preparando'], ['Marcar listo', 'Listo']]) {
        await tarjeta.getByRole('button', { name: boton }).click();
        await expect(tarjeta).toContainText(estado);
      }
      await tarjeta.getByRole('button', { name: 'Entregar' }).click();
      await expect(tarjeta).toHaveCount(0);
      await page.getByRole('button', { name: 'Entregado', exact: true }).click();
      await expect(page.locator('article').filter({ hasText: cliente })).toContainText('Entregado');
    });

    await test.step('la deuda aparece en la ficha y el pago la baja', async () => {
      await page.locator('article').filter({ hasText: cliente }).getByRole('link', { name: cliente }).click();
      await expect(page.locator('p', { hasText: /^Debe$/ })).toBeVisible();
      await expect(page.getByText('$3.000').first()).toBeVisible();
      await page.getByPlaceholder('Monto').fill('1000');
      await page.getByRole('button', { name: 'Registrar pago' }).click();
      await expect(page.getByText('Pago de $1.000 registrado.')).toBeVisible();
      await expect(page.getByText('$2.000').first()).toBeVisible();
      await foto('ficha-cliente');
    });

    await test.step('remito del pedido', async () => {
      await page.getByRole('link', { name: 'remito' }).first().click();
      await expect(page.getByText(/Remito de pedido #\d+/)).toBeVisible();
      await expect(page.getByText('Total $3.000')).toBeVisible();
      const whatsapp = page.getByRole('link', { name: 'Enviar por WhatsApp' });
      await expect(whatsapp).toHaveAttribute('href', /wa\.me\/.*Total/);
      await foto('remito');
    });

    await test.step('deudores y barra de forrajería', async () => {
      await page.goto('/forrajeria/clientes');
      await page.getByRole('button', { name: 'Deudores' }).click();
      await expect(page.getByRole('link', { name: new RegExp(cliente) })).toContainText('último pago: hoy');
      const barra = page.locator('nav').first();
      await expect(barra.getByRole('button', { name: /Pedidos/ })).toBeVisible();
      await expect(barra.getByRole('button', { name: /Rodeos/ })).toHaveCount(0);
      await foto('deudores');
    });

    await test.step('reporte de ventas del mes', async () => {
      await page.locator('nav').first().getByRole('button', { name: /Reportes/ }).click();
      await expect(page).toHaveURL(/\/forrajeria\/reportes$/, { timeout: 15000 });
      await expect(page.getByRole('heading', { name: 'Reportes de ventas' })).toBeVisible({ timeout: 15000 });
      const vendido = page.locator('p', { hasText: /^Vendido$/ }).locator('..');
      await expect(vendido).toContainText('$3.000');
      await expect(vendido).toContainText('1 pedido');
      await expect(page.locator('tr').filter({ hasText: producto.nombre })).toContainText('sin costo');
      await expect(page.locator('tr').filter({ hasText: cliente })).toContainText('$3.000');
      await page.getByRole('button', { name: 'Mes pasado' }).click();
      await expect(page.getByText('No hay pedidos entregados en este período.')).toBeVisible();
      await page.getByRole('button', { name: 'Este mes' }).click();
      await foto('reportes');
    });

    await test.step('compra a proveedor a cuenta corriente y pago', async () => {
      const proveedor = `TEST E2E Molino ${sufijo}`;
      await page.goto('/forrajeria/compras');
      await expect(page.getByRole('heading', { name: 'Compras' })).toBeVisible({ timeout: 15000 });
      await page.getByRole('link', { name: 'Proveedores' }).click();
      await expect(page.getByRole('heading', { name: 'Proveedores' })).toBeVisible({ timeout: 15000 });
      await page.getByRole('button', { name: 'Nuevo proveedor' }).click();
      await page.getByLabel('Nombre *').fill(proveedor);
      await page.getByRole('button', { name: 'Guardar proveedor' }).click();
      await page.getByRole('link', { name: new RegExp(proveedor) }).click();
      await expect(page.getByRole('heading', { name: proveedor })).toBeVisible({ timeout: 15000 });
      await page.getByRole('link', { name: /Nueva compra/ }).click();
      await expect(page.getByRole('heading', { name: 'Nueva compra' })).toBeVisible({ timeout: 15000 });
      await expect(page.getByLabel('Proveedor')).toHaveValue(/\d+/);
      await page.getByLabel('Producto').first().selectOption(String(producto.id_producto));
      await page.getByLabel('Cantidad').first().fill('5');
      await page.getByLabel('Costo unitario').first().fill('600');
      await page.getByLabel('A pagar (cuenta corriente)').check();
      await page.getByPlaceholder('Ej. A-0001-00001234').fill('R-123');
      await expect(page.getByText('$3.000').last()).toBeVisible();
      await foto('nueva-compra');
      await page.getByRole('button', { name: 'Registrar compra' }).click();
      await expect(page).toHaveURL(/\/forrajeria\/proveedores\/\d+$/, { timeout: 15000 });
      await expect(page.getByText('Le debés')).toBeVisible();
      await expect(page.getByText('$3.000').first()).toBeVisible();
      await expect(page.getByText(/Compra #\d+ \(R-123\)/)).toBeVisible();
      await page.getByPlaceholder('Monto').fill('1000');
      await page.getByRole('button', { name: 'Registrar pago' }).click();
      await expect(page.getByText('Pago de $1.000 registrado.')).toBeVisible();
      await expect(page.getByText('$2.000').first()).toBeVisible();
      await foto('proveedor');

      const stock = (await (await api.pedir('GET', '/forrajeria/productos')).json()).find((p) => p.id_producto === producto.id_producto);
      expect(Number(stock.costo)).toBe(600);
    });

    await test.step('ajuste de stock, historial y stock valorizado', async () => {
      await page.goto('/forrajeria/productos');
      const fila = page.locator('tr').filter({ hasText: producto.nombre });
      await fila.locator('select').selectOption('ajuste');
      await fila.getByPlaceholder('Contado').fill('15');
      await fila.getByPlaceholder('Motivo').fill('Conteo E2E');
      await fila.getByRole('button', { name: 'Aplicar' }).click();
      await expect(page.getByText(`Stock actualizado: ${producto.nombre}.`)).toBeVisible();
      await expect(fila).toContainText('15');

      await page.getByRole('link', { name: 'Historial de stock' }).click();
      await expect(page.getByRole('heading', { name: 'Historial de stock' })).toBeVisible();
      const movimiento = page.locator('tr').filter({ hasText: 'Conteo E2E' });
      await expect(movimiento).toContainText('Ajuste');
      await expect(movimiento).toContainText(/\d+ → 15/);
      await foto('historial');

      await page.goto('/forrajeria/productos');
      await page.getByRole('link', { name: 'Stock y ganancia' }).click();
      await expect(page.getByRole('heading', { name: 'Stock y ganancia' })).toBeVisible();
      // La compra de más arriba dejó el costo en $600 (precio $1.000).
      await expect(page.locator('tr').filter({ hasText: producto.nombre })).toContainText('$400 (40%)');
      await foto('valorizado');
    });
  });
});
