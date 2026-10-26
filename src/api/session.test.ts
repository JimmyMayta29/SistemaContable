import assert from 'node:assert/strict';
import axios, { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { guardarSesion, limpiarSesion, obtenerAccessToken, obtenerRefreshToken } from './session';
import { apiClient } from './client';

const almacen = new Map<string, string>();
globalThis.localStorage = {
  getItem: key => almacen.get(key) ?? null,
  setItem: (key, value) => { almacen.set(key, String(value)); },
  removeItem: key => { almacen.delete(key); },
  clear: () => almacen.clear(),
  key: index => [...almacen.keys()][index] ?? null,
  get length() { return almacen.size; }
};
globalThis.window = new EventTarget() as unknown as Window & typeof globalThis;

function respuesta(config: InternalAxiosRequestConfig, data: unknown): AxiosResponse {
  return { status: 200, statusText: 'OK', headers: {}, config, data };
}

function noAutorizado(config: InternalAxiosRequestConfig): never {
  throw new AxiosError('Sesión expirada', 'ERR_BAD_REQUEST', config, undefined, {
    status: 401, statusText: 'Unauthorized', headers: {}, config, data: { error: 'Sesión expirada' }
  });
}

async function verificarSesion() {
  assert.throws(() => guardarSesion({ accessToken: '' }), /inválida/);
  guardarSesion({ accessToken: 'anterior', refreshToken: 'renovar', empresaActivaId: 'empresa-1' });
  assert.equal(obtenerAccessToken(), 'anterior');
  assert.equal(obtenerRefreshToken(), 'renovar');
  assert.equal(localStorage.getItem('sunaconta_empresa_activa_id'), 'empresa-1');

  let renovaciones = 0;
  axios.defaults.adapter = async config => {
    renovaciones++;
    assert.equal(config.url, '/api/auth/refresh');
    return respuesta(config, { success: true, data: { accessToken: 'renovado' } });
  };
  apiClient.defaults.adapter = async config => {
    if (config.headers.Authorization !== 'Bearer renovado') noAutorizado(config);
    return respuesta(config, { success: true, data: 'recurso autorizado' });
  };
  await Promise.all([apiClient.get('/recurso'), apiClient.get('/otro-recurso')]);
  assert.equal(renovaciones, 1, 'Las respuestas 401 concurrentes deben compartir una renovación.');

  guardarSesion({ accessToken: 'rechazado', refreshToken: 'renovar' });
  renovaciones = 0;
  apiClient.defaults.adapter = async config => noAutorizado(config);
  await assert.rejects(apiClient.get('/rechazado'));
  assert.equal(renovaciones, 1, 'Un segundo 401 no debe causar un bucle de renovación.');
  assert.equal(obtenerAccessToken(), null);

  let liberarRenovacion: () => void = () => {};
  const respuestaPendiente = new Promise<void>(resolve => { liberarRenovacion = resolve; });
  let avisarInicio: () => void = () => {};
  const renovacionIniciada = new Promise<void>(resolve => { avisarInicio = resolve; });
  guardarSesion({ accessToken: 'anterior', refreshToken: 'sesion-antigua' });
  axios.defaults.adapter = async config => {
    avisarInicio();
    await respuestaPendiente;
    return respuesta(config, { success: true, data: { accessToken: 'respuesta-tardia' } });
  };
  const solicitudAntigua = apiClient.get('/recurso-antiguo');
  await renovacionIniciada;
  limpiarSesion();
  guardarSesion({ accessToken: 'nueva-sesion', refreshToken: 'nueva-renovacion', empresaActivaId: '' });
  liberarRenovacion();
  await assert.rejects(solicitudAntigua, /sesión cambió/);
  assert.equal(obtenerAccessToken(), 'nueva-sesion', 'Una renovación tardía no debe borrar ni reemplazar otra sesión.');
  assert.equal(localStorage.getItem('sunaconta_empresa_activa_id'), null);
  limpiarSesion();
  assert.equal(obtenerRefreshToken(), null);
  console.log('Sesión: almacenamiento, renovación única y respuesta tardía verificados.');
}

void verificarSesion().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
