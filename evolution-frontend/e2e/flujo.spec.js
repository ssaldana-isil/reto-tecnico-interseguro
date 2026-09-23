import { expect, test } from '@playwright/test';

/** "Datos de salida" del ejemplo del Ejercicio 1 del PDF. */
const pdfOutput = {
  policyNumber: '08200000049',
  idEnvio: 5984,
  financialPlansEntity: { description: 'Semestral' },
  currency: { description: 'Nuevo Sol' },
  productEntity: { description: 'Rumbo' },
  eventEntity: {
    description: 'SolicitarEndoso',
    dynamicData: [
      { etiqueta: 'ProductosVida', value: 'Rumbo' },
      { etiqueta: 'NombreUsuario', value: 'interface.servicios' },
      { etiqueta: 'NumeroPolizaEndoso', value: '08200000049' },
      { etiqueta: 'TipoEndosoPol', value: 'Endoso Simple' },
      { etiqueta: 'ResponsableAtencion', value: 'SAC' },
      { etiqueta: 'EndosoModifPrima', value: 'Si' },
      { etiqueta: 'InicioVigenciaEndoso', value: 'Default' },
      { etiqueta: 'TipoVigenciaEndoso', value: '' },
      { etiqueta: 'EndososSimplesSACRumbo', value: 'TES008' },
      { etiqueta: 'FechaSolicitud', value: '2025-08-27' },
      { etiqueta: 'FechaCliente', value: '2025-08-27' },
      { etiqueta: 'FechaEfectiva', value: '2025-09-01' },
    ],
  },
  eventAppliedEntities: [
    { description: 'SolicitarEndoso', orderEvent: 1 },
    { description: 'AprobarEndoso', orderEvent: 2 },
  ],
  riskUnitEntities: [
    {
      insuranceObjectEntities: [{ insuranceObjectNumber: '1', coverageEntities: [], participationEntities: [] }],
      plansEntity: { description: 'PlanRumbo' },
      riskUnitNumber: '1',
    },
  ],
  participationEntities: [],
};

const API = /localhost:\d+\/v1\//;

/** Registra cada llamada real a las APIs (método, URL, status y cuerpo) para el reporte. */
function recordApiCalls(page) {
  const calls = [];
  page.on('response', async (res) => {
    if (!API.test(res.url()) || res.request().method() === 'OPTIONS') return;
    const body = await res.text().catch(() => '');
    const shown = res.url().endsWith('/auth/token') ? '{"accessToken":"<jwt>", …}' : body;
    calls.push({ method: res.request().method(), url: res.url(), status: res.status() });
    console.log(`   ${res.request().method()} ${res.url()} → ${res.status()} ${shown.length > 300 ? shown.slice(0, 300) + '…' : shown}`);
  });
  return calls;
}

test.describe('Traductor de Endosos (endorse-service real)', () => {
  test('formulario precargado → 200 con exactamente la salida del PDF', async ({ page }) => {
    const calls = recordApiCalls(page);
    await page.goto('/');

    await page.getByTestId('translate').click();

    const pre = page.getByTestId('endorse-json');
    await expect(pre).toBeVisible();
    expect(await pre.textContent()).toBe(JSON.stringify(pdfOutput, null, 2));
    expect(calls.map((c) => `${c.url.replace(/^http:\/\/localhost:\d+/, '')} ${c.status}`)).toEqual([
      '/v1/auth/token 200',
      '/v1/endorse/translate 200',
    ]);
  });

  test('botón deshabilitado mientras carga', async ({ page }) => {
    await page.route('**/v1/endorse/translate', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 800));
      await route.continue();
    });
    await page.goto('/');

    await page.getByTestId('translate').click();

    await expect(page.getByTestId('translate')).toBeDisabled();
    await expect(page.getByTestId('translate')).toHaveText('Traduciendo…');
    await expect(page.getByTestId('endorse-result')).toBeVisible();
    await expect(page.getByTestId('translate')).toBeEnabled();
  });

  test('campos requeridos vacíos → 422 MISSING_FIELDS con la lista de etiquetas', async ({ page }) => {
    recordApiCalls(page);
    await page.goto('/');
    await page.getByTestId('field-usuario').fill('');
    await page.getByTestId('field-fechaCliente').fill('');

    await page.getByTestId('translate').click();

    await expect(page.getByTestId('error-code')).toHaveText('MISSING_FIELDS');
    await expect(page.getByTestId('error')).toContainText('HTTP 422');
    await expect(page.getByTestId('error-items').locator('li')).toHaveText(['NombreUsuario', 'FechaCliente']);
  });

  test('producto/tipo sin plantilla → 404 TEMPLATE_NOT_FOUND', async ({ page }) => {
    recordApiCalls(page);
    await page.goto('/');
    await page.getByTestId('field-tipoEndoso').fill('CambioDireccion');

    await page.getByTestId('translate').click();

    await expect(page.getByTestId('error-code')).toHaveText('TEMPLATE_NOT_FOUND');
    await expect(page.getByTestId('error-message')).toContainText('CambioDireccion');
  });

  test('sin policyNumber → 400 VALIDATION listando details.fields', async ({ page }) => {
    recordApiCalls(page);
    await page.goto('/');
    await page.getByTestId('field-policyNumber').fill('');

    await page.getByTestId('translate').click();

    await expect(page.getByTestId('error-code')).toHaveText('VALIDATION');
    await expect(page.getByTestId('error-items').locator('li')).toHaveText(['"policyNumber" is required']);
  });

  test('extensibilidad: plantilla VidaFlex con un campo extra, sin código nuevo', async ({ page }) => {
    recordApiCalls(page);
    await page.goto('/');
    await page.getByTestId('field-producto').fill('VidaFlex');
    await page.getByTestId('field-tipoEndoso').fill('CambioBeneficiario');
    await page.getByTestId('add-extra').click();
    await page.getByTestId('extra-key-0').fill('beneficiario');
    await page.getByTestId('extra-value-0').fill('Ana Pérez');

    await page.getByTestId('translate').click();

    const out = JSON.parse(await page.getByTestId('endorse-json').textContent());
    expect(out.eventEntity.dynamicData).toEqual([
      { etiqueta: 'NumeroPolizaEndoso', value: '08200000049' },
      { etiqueta: 'NombreUsuario', value: 'interface.servicios' },
      { etiqueta: 'NombreBeneficiario', value: 'Ana Pérez' },
      { etiqueta: 'ParentescoBeneficiario', value: 'Otro' },
      { etiqueta: 'FechaSolicitud', value: '2025-08-27' },
    ]);
  });

  test('token solo en memoria y reintento único ante 401', async ({ page }) => {
    const calls = recordApiCalls(page);
    await page.goto('/');
    await page.getByTestId('translate').click();
    await expect(page.getByTestId('endorse-result')).toBeVisible();

    // La siguiente respuesta de translate se reemplaza por un 401 (como un token vencido);
    // el reintento posterior llega al servicio real.
    let rejected = false;
    await page.route('**/v1/endorse/translate', async (route) => {
      if (rejected) return route.continue();
      rejected = true;
      await route.fulfill({ status: 401, contentType: 'application/json', body: '{"error":"token expirado","code":"UNAUTHORIZED"}' });
    });
    await page.getByTestId('translate').click();
    await expect(page.getByTestId('endorse-result')).toBeVisible();

    const tokenRequests = calls.filter((c) => c.url.endsWith('/v1/auth/token')).length;
    expect(tokenRequests).toBe(2); // el inicial + la renovación tras el 401
    expect(await page.evaluate(() => [localStorage.length, sessionStorage.length])).toEqual([0, 0]);
  });
});

test.describe('Rutas Óptimas (routes-service real)', () => {
  test('ejemplo precargado → Miraflores → San Isidro, distancia 7', async ({ page }) => {
    const calls = recordApiCalls(page);
    await page.goto('/');
    await page.getByTestId('tab-routes').click();

    await page.getByTestId('calculate').click();

    await expect(page.getByTestId('route-from')).toHaveText('Miraflores');
    await expect(page.getByTestId('route-to')).toHaveText('San Isidro');
    await expect(page.getByTestId('route-path')).toHaveText('Miraflores → San Isidro');
    await expect(page.getByTestId('route-distance')).toHaveText('7');
    expect(calls.map((c) => c.status)).toEqual([200, 200]);
  });

  test('ruta de varios saltos: Ate desde Miraflores', async ({ page }) => {
    recordApiCalls(page);
    await page.goto('/');
    await page.getByTestId('tab-routes').click();
    const input = JSON.parse(await page.getByTestId('routes-input').inputValue());
    await page.getByTestId('routes-input').fill(JSON.stringify({ ...input, accidentLocation: 'Ate', depots: ['Miraflores'] }, null, 2));

    await page.getByTestId('calculate').click();

    await expect(page.getByTestId('route-path')).toHaveText('Miraflores → Barranco → Surco → Ate');
    await expect(page.getByTestId('route-distance')).toHaveText('18');
  });

  test('accidente inalcanzable → 422 UNREACHABLE', async ({ page }) => {
    recordApiCalls(page);
    await page.goto('/');
    await page.getByTestId('tab-routes').click();
    const input = JSON.parse(await page.getByTestId('routes-input').inputValue());
    input.graph.Callao = {};
    await page.getByTestId('routes-input').fill(JSON.stringify({ ...input, accidentLocation: 'Callao' }));

    await page.getByTestId('calculate').click();

    await expect(page.getByTestId('error-code')).toHaveText('UNREACHABLE');
    await expect(page.getByTestId('error')).toContainText('HTTP 422');
  });

  test('base inexistente → 400 VALIDATION', async ({ page }) => {
    recordApiCalls(page);
    await page.goto('/');
    await page.getByTestId('tab-routes').click();
    const input = JSON.parse(await page.getByTestId('routes-input').inputValue());
    await page.getByTestId('routes-input').fill(JSON.stringify({ ...input, depots: ['Miraflores', 'Narnia'] }));

    await page.getByTestId('calculate').click();

    await expect(page.getByTestId('error-code')).toHaveText('VALIDATION');
    await expect(page.getByTestId('error-message')).toContainText('Narnia');
  });

  test('JSON inválido → INVALID_JSON sin llamar al servicio', async ({ page }) => {
    const calls = recordApiCalls(page);
    await page.goto('/');
    await page.getByTestId('tab-routes').click();
    await page.getByTestId('routes-input').fill('{ esto no es json');

    await page.getByTestId('calculate').click();

    await expect(page.getByTestId('error-code')).toHaveText('INVALID_JSON');
    expect(calls).toEqual([]);
  });
});
