import assert from 'assert';
import AdmZip from 'adm-zip';
import crypto from 'crypto';
import { backupEmpresaService } from '../services/backupEmpresaService';
import { empresaDemoService, EMPRESA_DEMO_ID } from '../services/empresaDemoService';
import { librosEEFFService } from '../services/librosEEFFService';
import { ASIENTOS_MEMORIA } from '../services/asientoService';
import { COMPRAS_MEMORIA } from '../services/compraService';
import { VENTAS_MEMORIA } from '../services/ventaService';
import { empresaRepository, EMPRESAS_STORE } from '../repositories/empresaRepository';

async function ejecutarSuiteFase13Backup() {
  console.log('========================================================================');
  console.log('🧪 SUITE DE PRUEBAS AUTOMATIZADAS — FASE 13: BACKUP POR EMPRESA (SISCONT)');
  console.log('   (Cifrado AES-256-GCM, Aislamiento, Integridad, Rotación & Restauración)');
  console.log('========================================================================\n');

  let passed = 0;
  let total = 0;

  function testAssert(cond: boolean, desc: string, extra?: string) {
    total++;
    if (cond) {
      console.log(`  ✅ PASÓ: ${desc}`);
      passed++;
    } else {
      console.error(`  ❌ FALLÓ: ${desc} ${extra ? `(${extra})` : ''}`);
      throw new Error(`Fallo en prueba: ${desc}`);
    }
  }

  // 1. Preparar la empresa demo con datos
  await empresaDemoService.restablecerDemo('usr-admin-test');

  // Registrar una segunda empresa 'EMPRESA_B' con datos aislados
  const EMPRESA_B_ID = 'emp-test-b';
  const EMPRESA_B_RUC = '20555666777';
  if (!EMPRESAS_STORE.some(e => e.id === EMPRESA_B_ID)) {
    EMPRESAS_STORE.push({
      id: EMPRESA_B_ID,
      tenantId: '00000000-0000-0000-0000-000000000001',
      codigoEmpresa: 'TESTB',
      ruc: EMPRESA_B_RUC,
      razonSocial: 'EMPRESA B DE PRUEBAS S.A.C.',
      regimenTributario: 'REGIMEN_GENERAL',
      domicilioFiscal: 'CALLE B 123',
      monedaPrincipal: 'PEN',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }

  // Agregar 1 compra y 1 venta exclusivas a Empresa B
  COMPRAS_MEMORIA.push({
    id: 'cmp-b-01',
    empresaId: EMPRESA_B_ID,
    periodoId: 'per-2026-09',
    proveedorId: 'prv-demo-01',
    tipoComprobante: '01',
    serie: 'F999',
    numero: '1',
    fechaEmision: '2026-09-10',
    fechaVencimiento: '2026-09-10',
    fechaContable: '2026-09-10',
    moneda: 'PEN',
    tipoCambio: 1.0,
    baseGravada: 1000,
    igv: 180,
    baseNoGravada: 0,
    exonerado: 0,
    isc: 0,
    icbper: 0,
    otrosTributos: 0,
    total: 1180,
    tipoAdquisicion: '1',
    formaPago: 'CONTADO',
    diasCredito: 0,
    tieneDetraccion: false,
    tieneRetencion: false,
    estado: 'REGISTRADO',
    version: 1,
    createdAt: '2026-09-10T10:00:00.000Z',
    updatedAt: '2026-09-10T10:00:00.000Z'
  });

  // --------------------------------------------------------------------------
  // TEST 1: Generación de Respaldo ZIP Cifrado AES-256-GCM con Manifest
  // --------------------------------------------------------------------------
  console.log('🔹 Test 1: Generación de Respaldo ZIP Cifrado y Estructura Manifest');
  const backupGenerado = await backupEmpresaService.generarBackupZip(EMPRESA_DEMO_ID, 'MANUAL', 'usr-admin-01');
  {
    testAssert(backupGenerado.id.startsWith('bkp-'), 'Backup recibe identificador único');
    testAssert(backupGenerado.nombreArchivo.startsWith('20000000001_2026_'), 'Nombre de archivo conforme a nomenclatura SISCONT: {RUC}_{EJERCICIO}_{FECHA}.zip');
    testAssert(backupGenerado.tamanoBytes > 500, 'Tamaño de archivo cifrado válido (> 500 bytes)');
    testAssert(backupGenerado.hashSha256.length === 64, 'Checksum SHA-256 calculado (64 caracteres)');
    testAssert(backupGenerado.archivoZipBuffer !== undefined, 'Buffer binario generado correctamente');
  }

  // --------------------------------------------------------------------------
  // TEST 2: Descifrado y Verificación de Integridad
  // --------------------------------------------------------------------------
  console.log('\n🔹 Test 2: Descifrado y Validación de Integridad (SHA-256 por archivo)');
  {
    const verificacion = backupEmpresaService.verificarIntegridadBackup(backupGenerado.archivoZipBuffer!);
    testAssert(verificacion.valida, 'Integridad del paquete ZIP verificada con éxito');
    testAssert(verificacion.manifest.ruc === '20000000001', 'Manifest contiene el RUC correcto de la empresa');
    testAssert(verificacion.manifest.archivos['asientos.ndjson'] !== undefined, 'Manifest declara asientos.ndjson');
    testAssert(verificacion.manifest.archivos['compras.ndjson'] !== undefined, 'Manifest declara compras.ndjson');
    testAssert(verificacion.manifest.archivos['ventas.ndjson'] !== undefined, 'Manifest declara ventas.ndjson');
  }

  // --------------------------------------------------------------------------
  // TEST 3: Cero Fuga de Credenciales SOL y Aislamiento Multiempresa
  // --------------------------------------------------------------------------
  console.log('\n🔹 Test 3: Cero Fuga de Credenciales SOL y Aislamiento Multiempresa');
  {
    // Descifrar para inspeccionar los archivos contenidos
    const clave = backupEmpresaService.derivarClave();
    const zipPlano = backupEmpresaService.descifrarBufferAesGcm(backupGenerado.archivoZipBuffer!, clave);
    const zip = new AdmZip(zipPlano);

    // 3.1 Cero credenciales SOL
    const entryNames = zip.getEntries().map(e => e.entryName);
    testAssert(!entryNames.includes('credenciales_sunat.json'), 'No existe archivo de credenciales_sunat en el paquete');

    for (const entry of zip.getEntries()) {
      const contenido = entry.getData().toString('utf8');
      testAssert(!contenido.includes('claveSol') && !contenido.includes('usuarioSol'), `Archivo ${entry.entryName} no contiene credenciales SOL ni claves`);
    }

    // 3.2 Aislamiento: Respaldo de Empresa Demo no contiene datos de Empresa B
    const comprasText = zip.getEntry('compras.ndjson')?.getData().toString('utf8') || '';
    testAssert(!comprasText.includes(EMPRESA_B_ID), 'Respaldo de Empresa Demo no contiene ningún registro de Empresa B');
    testAssert(!comprasText.includes('F999'), 'Comprobante de Empresa B no figura en el backup de Empresa Demo');
  }

  // --------------------------------------------------------------------------
  // TEST 4: Rechazo Inmediato de Respaldo Corrupto o Alterado
  // --------------------------------------------------------------------------
  console.log('\n🔹 Test 4: Rechazo de Respaldo Corrupto');
  {
    // Corromper el buffer alterando bytes al azar
    const bufferCorrupto = Buffer.from(backupGenerado.archivoZipBuffer!);
    bufferCorrupto[35] = bufferCorrupto[35] ^ 0xFF; // Invertir bits del ciphertext/authTag

    const verifCorrupto = backupEmpresaService.verificarIntegridadBackup(bufferCorrupto);
    testAssert(!verifCorrupto.valida, 'Backup con bits alterados es rechazado por verificación de integridad GCM');

    let intentoRestoreFalla = false;
    try {
      await backupEmpresaService.restaurarBackup(EMPRESA_DEMO_ID, bufferCorrupto, '20000000001');
    } catch (err: any) {
      intentoRestoreFalla = err.message.includes('BACKUP_RECHAZADO');
    }
    testAssert(intentoRestoreFalla, 'Intento de restaurar backup corrupto es bloqueado antes de tocar la base de datos');
  }

  // --------------------------------------------------------------------------
  // TEST 5: Validación de Confirmación Explícita por RUC
  // --------------------------------------------------------------------------
  console.log('\n🔹 Test 5: Confirmación Obligatoria mediante RUC');
  {
    let falloSinRuc = false;
    try {
      await backupEmpresaService.restaurarBackup(EMPRESA_DEMO_ID, backupGenerado.archivoZipBuffer!, 'RUC_INCORRECTO_123');
    } catch (err: any) {
      falloSinRuc = err.message.includes('CONFIRMACION_RUC_FALLIDA');
    }
    testAssert(falloSinRuc, 'Restauración abortada si el RUC escrito no coincide exactamente con la empresa');
  }

  // --------------------------------------------------------------------------
  // TEST 6: Restauración Atómica y Coincidencia Exacta de Saldos Contables
  // --------------------------------------------------------------------------
  console.log('\n🔹 Test 6: Restauración Atómica y Verificación de Saldos');
  {
    // Obtener saldos antes de la alteración
    const hojaAntes = await librosEEFFService.generarHojaTrabajo10Columnas(EMPRESA_DEMO_ID, '2026-09');
    const totalMayorAntes = hojaAntes.totales.montosDebe;

    // Simular pérdida o alteración de datos (borrar asientos en memoria)
    ASIENTOS_MEMORIA.splice(0, ASIENTOS_MEMORIA.length, ...ASIENTOS_MEMORIA.filter(a => a.empresaId !== EMPRESA_DEMO_ID));
    testAssert(ASIENTOS_MEMORIA.filter(a => a.empresaId === EMPRESA_DEMO_ID).length === 0, 'Asientos de la demo vaciados para simular desastre');

    // Restaurar desde el backup
    const resultadoRestore = await backupEmpresaService.restaurarBackup(
      EMPRESA_DEMO_ID,
      backupGenerado.archivoZipBuffer!,
      '20000000001',
      'usr-admin-01'
    );
    testAssert(resultadoRestore.exito, 'Restauración ejecutada exitosamente');
    testAssert(resultadoRestore.registrosRestaurados > 0, 'Registros contables y operativos restablecidos');

    // Verificar que los saldos contables coinciden exactamente
    const hojaDespues = await librosEEFFService.generarHojaTrabajo10Columnas(EMPRESA_DEMO_ID, '2026-09');
    testAssert(hojaDespues.totales.montosDebe === totalMayorAntes, 'Total Debe del Mayor tras restaurar coincide al céntimo con el original');
    testAssert(hojaDespues.controlesCuadre.montosCuadrados, 'Sumas del Mayor cuadradas tras restauración');
    testAssert(hojaDespues.controlesCuadre.saldosCuadrados, 'Saldos Deudor/Acreedor cuadrados tras restauración');

    // Asegurar que Empresa B permaneció intacta
    const comprasB = COMPRAS_MEMORIA.filter(c => c.empresaId === EMPRESA_B_ID);
    testAssert(comprasB.length === 1, 'Datos de Empresa B permanecen completamente intactos tras restaurar Empresa Demo');
  }

  // --------------------------------------------------------------------------
  // TEST 7: Política de Retención Automática (Rotación a 10 respaldos)
  // --------------------------------------------------------------------------
  console.log('\n🔹 Test 7: Política de Retención y Rotación Automática');
  {
    // Generar 12 backups adicionales para probar rotación
    for (let i = 1; i <= 12; i++) {
      await backupEmpresaService.generarBackupZip(EMPRESA_DEMO_ID, 'MANUAL', 'usr-admin-01');
    }
    const lista = backupEmpresaService.listarBackupsEmpresa(EMPRESA_DEMO_ID);
    testAssert(lista.length <= 10, 'La política de retención conserva como máximo los 10 últimos backups de la empresa rotando los más antiguos');
  }

  console.log('\n========================================================================');
  console.log(`📊 RESULTADO SUITE FASE 13 BACKUP: ${passed}/${total} PRUEBAS EXITOSAS`);
  console.log('========================================================================\n');
}

ejecutarSuiteFase13Backup().catch((err) => {
  console.error('❌ Error fatal en suite Fase 13 Backup:', err);
  process.exit(1);
});
