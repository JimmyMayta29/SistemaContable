import assert from 'node:assert/strict';
import express from 'express';
import jwt from 'jsonwebtoken';
import { apiRoutes } from '../routes';
import { authJwtService, sembrarUsuariosPrueba, USUARIOS_EMPRESA_MEMORIA } from '../services/authJwtService';
import { EMPRESAS_STORE, DATOS_EMPRESA_DEMO } from '../repositories/empresaRepository';
import { asientoService } from '../services/asientoService';
import { env } from '../config/env';

async function main() {
  assert.equal(env.NODE_ENV, 'test', 'Esta prueba requiere NODE_ENV=test');
  assert.equal(env.DATABASE_URL, '', 'Esta prueba HTTP usa exclusivamente fixtures aislados');
  sembrarUsuariosPrueba();
  for (const id of ['emp-01', 'empresa-ajena']) {
    EMPRESAS_STORE.push({ ...DATOS_EMPRESA_DEMO, id, esDemo: false, razonSocial: id });
  }
  const contador = await authJwtService.login('contador@sunaconta.pe', 'Sunaconta2026!');
  const auditor = await authJwtService.login('auditor@sunaconta.pe', 'Sunaconta2026!');
  const app = express();
  app.use(express.json());
  app.use('/api', apiRoutes);
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  const port = (server.address() as { port: number }).port;
  const request = (path: string, token?: string, method = 'GET', body?: object) => fetch(`http://127.0.0.1:${port}/api${path}`, {
    method,
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {})
  });
  try {
    assert.equal((await request('/health')).status, 503, 'Sin conexión real no se anuncia disponibilidad.');
    assert.equal((await request('/empresas')).status, 401);
    assert.equal((await request('/empresas/empresa-ajena', contador.accessToken)).status, 403);
    assert.equal((await request('/empresas/empresa-ajena/movimientos-tesoreria', contador.accessToken)).status, 403);
    assert.equal((await request('/empresas/emp-01', contador.accessToken)).status, 200);
    const listado = await (await request('/empresas', contador.accessToken)).json();
    assert(!listado.data.some((e: any) => e.id === 'empresa-ajena'));

    const input = {
      periodoId: 'per-2026-09', subdiarioId: '01', fecha: '2026-09-15', glosa: 'Prueba de autorización HTTP',
      detalles: [{ linea: 1, cuentaId: '1011', debe: 100, haber: 0 }, { linea: 2, cuentaId: '70111', debe: 0, haber: 100 }]
    };
    const propio = await asientoService.crearBorrador('emp-01', input, 'usr-contador-01');
    const ajeno = await asientoService.crearBorrador('empresa-ajena', input, 'otro-usuario');
    assert.equal((await request(`/asientos/${ajeno.id}`, contador.accessToken)).status, 404);
    assert.equal((await request(`/asientos/${ajeno.id}`, contador.accessToken, 'PUT', input)).status, 404);
    assert.equal((await request(`/asientos/${propio.id}/contabilizar`, auditor.accessToken, 'POST', {})).status, 403);
    const aprobacionPropia = await request(`/asientos/${propio.id}/contabilizar`, contador.accessToken, 'POST', {});
    assert.equal(aprobacionPropia.status, 400);
    assert.match((await aprobacionPropia.json()).error, /SEGREGACION_FUNCIONES/);
    const alta = await request('/empresas/emp-01/asientos', contador.accessToken, 'POST', input);
    assert.equal(alta.status, 201, await alta.text());

    const falso = jwt.sign({ sub: 'usr-contador-01' }, env.JWT_SECRET, { algorithm: 'HS256' });
    assert.equal((await request('/empresas', falso)).status, 401);
    assert.equal((await request('/empresas', contador.refreshToken)).status, 401);
    const membresia = USUARIOS_EMPRESA_MEMORIA.find(m => m.usuarioId === 'usr-contador-01' && m.empresaId === 'emp-01')!;
    membresia.estado = 'REVOCADO';
    assert.equal((await request('/empresas/emp-01', contador.accessToken)).status, 403);
    console.log('Acceso HTTP: identidad, rol, empresa, revocación y segregación verificados.');
  } finally {
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
