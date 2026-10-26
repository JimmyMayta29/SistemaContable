import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { Pool, PoolClient } from 'pg';
import { REGISTRO_ARCHIVOS_EMPRESA, REGISTRO_DATOS_EMPRESA, RegistroTablaEmpresa } from '../storage/registroDatosEmpresa';

interface TablaCatalogo {
  tabla: string;
  columnas: string[];
}

interface RestriccionCatalogo {
  tabla: string;
  tipo: 'p' | 'f';
  columnas: string[];
  destino: string;
  esquema_destino: string | null;
  columnas_destino: string[];
}

export async function verificarRegistroDatosEmpresa(client: PoolClient, registro: readonly RegistroTablaEmpresa[] = REGISTRO_DATOS_EMPRESA) {
  const tablas = await client.query<TablaCatalogo>(`
    SELECT c.relname AS tabla, array_agg(a.attname::text ORDER BY a.attnum) AS columnas
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum > 0 AND NOT a.attisdropped
    WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')
    GROUP BY c.relname ORDER BY c.relname
  `);
  const restricciones = await client.query<RestriccionCatalogo>(`
    SELECT t.relname AS tabla, c.contype AS tipo,
      ARRAY(SELECT a.attname::text FROM unnest(c.conkey) WITH ORDINALITY k(num, orden)
        JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = k.num ORDER BY orden) AS columnas,
      d.relname AS destino, dn.nspname AS esquema_destino,
      ARRAY(SELECT a.attname::text FROM unnest(c.confkey) WITH ORDINALITY k(num, orden)
        JOIN pg_attribute a ON a.attrelid = c.confrelid AND a.attnum = k.num ORDER BY orden) AS columnas_destino
    FROM pg_constraint c JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    LEFT JOIN pg_class d ON d.oid = c.confrelid
    LEFT JOIN pg_namespace dn ON dn.oid = d.relnamespace
    WHERE n.nspname = 'public' AND c.contype IN ('p', 'f')
  `);
  const porNombre = new Map(registro.map((entrada, orden) => [entrada.tabla, { entrada, orden }]));
  assert.equal(porNombre.size, registro.length, 'TABLA_DUPLICADA: El registro contiene tablas repetidas.');
  for (const tabla of tablas.rows) {
    assert(porNombre.has(tabla.tabla), `TABLA_NO_REGISTRADA: ${tabla.tabla}, ${tabla.columnas.includes('empresa_id') ? 'con empresa_id' : 'sin empresa_id; también se registran tablas hijas y de control'}.`);
  }
  for (const entrada of registro) {
    const tabla = tablas.rows.find(fila => fila.tabla === entrada.tabla);
    assert(tabla, `TABLA_INEXISTENTE: ${entrada.tabla}.`);
    const claves = restricciones.rows.find(fila => fila.tabla === entrada.tabla && fila.tipo === 'p');
    assert.deepEqual(entrada.clavePrimaria, claves?.columnas, `CLAVE_PRIMARIA_DISTINTA: ${entrada.tabla}.`);
    if (tabla.columnas.includes('empresa_id')) assert.equal(entrada.columnaEmpresa, 'empresa_id', `EMPRESA_NO_DECLARADA: ${entrada.tabla}.`);
    if (entrada.columnaEmpresa) assert(tabla.columnas.includes(entrada.columnaEmpresa), `COLUMNA_EMPRESA_INEXISTENTE: ${entrada.tabla}.`);
    if (entrada.empresaDesde) {
      assert.equal(entrada.ambito, 'empresa', `HIJA_FUERA_DE_EMPRESA: ${entrada.tabla}.`);
      assert(entrada.referencias.some(ref => ref.columna === entrada.empresaDesde!.columna && ref.tabla === entrada.empresaDesde!.tabla), `PADRE_NO_DECLARADO: ${entrada.tabla}.`);
    }
    const fks = restricciones.rows.filter(fila => fila.tabla === entrada.tabla && fila.tipo === 'f');
    assert.equal(entrada.referencias.length, fks.length, `REFERENCIAS_INCOMPLETAS: ${entrada.tabla}.`);
    for (const fk of fks) {
      assert.equal(fk.esquema_destino, 'public', `DEPENDENCIA_EXTERNA: ${entrada.tabla}.`);
      const ref = entrada.referencias.find(item => item.columna === fk.columnas[0] && item.tabla === fk.destino && item.columnaDestino === fk.columnas_destino[0]);
      assert(fk.columnas.length === 1 && ref, `REFERENCIA_NO_DECLARADA: ${entrada.tabla}.${fk.columnas.join(',')}.`);
      const destino = porNombre.get(ref.tabla);
      assert(destino, `DEPENDENCIA_NO_REGISTRADA: ${ref.tabla}.`);
      assert(tablas.rows.find(item => item.tabla === ref.tabla)?.columnas.includes(ref.columnaDestino), `COLUMNA_DESTINO_INEXISTENTE: ${ref.tabla}.${ref.columnaDestino}.`);
      if (ref.tabla !== entrada.tabla) assert(destino.orden < porNombre.get(entrada.tabla)!.orden, `ORDEN_DEPENDENCIAS_INVALIDO: ${entrada.tabla} depende de ${ref.tabla}.`);
      if (ref.tabla === 'usuarios_estudio' || ref.tabla === 'usuarios') assert.equal(ref.remapeo, 'evidencia_origen', `ACTOR_NO_PRESERVADO: ${entrada.tabla}.${ref.columna}.`);
      if (ref.tabla === 'empresas') assert.equal(ref.remapeo, 'empresa_destino', `EMPRESA_NO_REMAPEADA: ${entrada.tabla}.${ref.columna}.`);
    }
  }
  return { tablas: tablas.rows.length, referencias: restricciones.rows.filter(fila => fila.tipo === 'f').length };
}

async function ejecutar() {
  const connectionString = process.env.REGISTRO_TEST_DATABASE_URL || process.env.TEST_DATABASE_URL;
  assert(connectionString, 'Configure REGISTRO_TEST_DATABASE_URL o TEST_DATABASE_URL con una base PostgreSQL real descartable ya migrada.');
  const pool = new Pool({ connectionString, max: 1, connectionTimeoutMillis: 5000 });
  let client: PoolClient | undefined;
  try {
    client = await pool.connect();
    const version = await client.query<{ version: string }>('SELECT version()');
    assert(version.rows[0]?.version.startsWith('PostgreSQL ') && !/pg-mem/i.test(version.rows[0].version), 'Se requiere PostgreSQL real.');
    await client.query('BEGIN');
    await client.query("SET LOCAL lock_timeout = '2s'");
    const resultado = await verificarRegistroDatosEmpresa(client);

    const tablaConEmpresa = `registro_prueba_empresa_${randomUUID().replaceAll('-', '')}`;
    await client.query(`CREATE TABLE public."${tablaConEmpresa}" (id UUID PRIMARY KEY, empresa_id UUID REFERENCES public.empresas(id))`);
    await assert.rejects(verificarRegistroDatosEmpresa(client), /TABLA_NO_REGISTRADA/);
    await client.query(`DROP TABLE public."${tablaConEmpresa}"`);

    const tablaHija = `registro_prueba_hija_${randomUUID().replaceAll('-', '')}`;
    await client.query(`CREATE TABLE public."${tablaHija}" (id UUID PRIMARY KEY, planilla_id UUID REFERENCES public.planillas(id))`);
    await assert.rejects(verificarRegistroDatosEmpresa(client), /TABLA_NO_REGISTRADA/);
    await client.query(`DROP TABLE public."${tablaHija}"`);

    const sinReferencia = REGISTRO_DATOS_EMPRESA.map(entrada => entrada.tabla === 'planilla_lineas' ? { ...entrada, referencias: entrada.referencias.slice(1) } : entrada);
    await assert.rejects(verificarRegistroDatosEmpresa(client, sinReferencia), /PADRE_NO_DECLARADO|REFERENCIAS_INCOMPLETAS/);
    const ordenInvalido = [...REGISTRO_DATOS_EMPRESA];
    const indiceHija = ordenInvalido.findIndex(entrada => entrada.tabla === 'planilla_lineas');
    ordenInvalido.unshift(...ordenInvalido.splice(indiceHija, 1));
    await assert.rejects(verificarRegistroDatosEmpresa(client, ordenInvalido), /ORDEN_DEPENDENCIAS_INVALIDO/);

    for (const tabla of ['usuarios', 'usuarios_estudio', 'roles', 'permisos', 'rol_permisos', 'membresias', 'usuario_empresa', 'refresh_tokens', 'credenciales_sunat', 'sunat_conexiones', 'sunat_tokens', 'sunat_empresa_keys']) {
      const entrada = REGISTRO_DATOS_EMPRESA.find(item => item.tabla === tabla);
      assert(entrada && !entrada.exportar && entrada.motivoExclusion, `EXCLUSION_NO_DECLARADA: ${tabla}.`);
    }
    assert.equal(REGISTRO_DATOS_EMPRESA.find(entrada => entrada.tabla === 'refresh_tokens')?.ambito, 'control');
    assert.equal(REGISTRO_DATOS_EMPRESA.find(entrada => entrada.tabla === 'usuario_empresa')?.ambito, 'control');
    assert.equal(new Set(REGISTRO_ARCHIVOS_EMPRESA.map(item => item.carpeta)).size, REGISTRO_ARCHIVOS_EMPRESA.length);
    for (const carpeta of REGISTRO_ARCHIVOS_EMPRESA) assert(/^[a-z][a-z_]*$/.test(carpeta.carpeta), 'CARPETA_INVALIDA');
    for (const nombre of ['temporales', 'respaldos']) assert.equal(REGISTRO_ARCHIVOS_EMPRESA.find(item => item.carpeta === nombre)?.exportar, false);
    console.log(`Registro verificado contra PostgreSQL real: ${resultado.tablas} tablas, ${resultado.referencias} FK; omisiones de empresa/hija, dependencias y exclusiones comprobadas.`);
  } finally {
    if (client) {
      await client.query('ROLLBACK');
      client.release();
    }
    await pool.end();
  }
}

void ejecutar().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
