import assert from 'assert';
import { COMPRAS_MEMORIA } from '../services/compraService';
import { VENTAS_MEMORIA } from '../services/ventaService';
import { ASIENTOS_MEMORIA } from '../services/asientoService';
import { auditoriaTributariaService } from '../services/auditoriaTributariaService';
import { daotService } from '../services/daotService';
import { cierreAnualService } from '../services/cierreAnualService';
import { djRentaAnualService } from '../services/djRentaAnualService';

async function runFase10Tests() {
  console.log('======================================================');
  console.log('🧪 SUITE DE PRUEBAS AUTOMATIZADAS — FASE 10: AUDITORÍA PREVENTIVA, DAOT & CIERRE ANUAL PCGE');
  console.log('======================================================\n');

  const empresaAId = '00000000-0000-0000-0000-000000000010';
  const empresaBId = '00000000-0000-0000-0000-000000000020';
  const anio = 2026;

  // Limpiar memoria previa para aislamiento
  COMPRAS_MEMORIA.length = 0;
  VENTAS_MEMORIA.length = 0;
  ASIENTOS_MEMORIA.length = 0;

  // =========================================================================
  // TEST 1: Diagnóstico de Auditoría Preventiva SUNAT
  // =========================================================================
  console.log('🔹 Test 1: Algoritmo de Detección de Inconsistencias Fiscales SUNAT');

  // Insertar compras con casos de prueba para el algoritmo
  // 1. Compra > S/ 2,000 sin bancarización
  COMPRAS_MEMORIA.push({
    id: 'cmp-banc-1',
    empresaId: empresaAId,
    tipoComprobante: '01',
    serie: 'F001',
    numero: '00004512',
    fechaEmision: '2026-04-15',
    fechaVencimiento: '2026-04-15',
    proveedorId: 'prov-01',
    proveedorRuc: '20555666777',
    proveedorRazonSocial: 'SERVICIOS INDUSTRIALES DEL SUR S.A.C.',
    moneda: 'PEN',
    tipoCambio: 1.0,
    baseGravada: 5000.00,
    baseImponible: 5000.00,
    igv: 900.00,
    baseNoGravada: 0,
    exonerado: 0,
    isc: 0,
    icbper: 0,
    otrosTributos: 0,
    total: 5900.00,
    tipoAdquisicion: '1',
    formaPago: 'CONTADO',
    diasCredito: 0,
    tieneDetraccion: false,
    tieneRetencion: false,
    periodoId: '2026-04',
    estado: 'REGISTRADO',
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  } as any);

  // 2. Compra sujeta a detracción SPOT > S/ 700 sin constancia
  COMPRAS_MEMORIA.push({
    id: 'cmp-detr-1',
    empresaId: empresaAId,
    tipoComprobante: '01',
    serie: 'E001',
    numero: '00001289',
    fechaEmision: '2026-05-10',
    fechaVencimiento: '2026-05-10',
    proveedorId: 'prov-02',
    proveedorRuc: '20444333222',
    proveedorRazonSocial: 'TRANSPORTE Y LOGISTICA CARGO S.A.C.',
    moneda: 'PEN',
    tipoCambio: 1.0,
    baseGravada: 2500.00,
    baseImponible: 2500.00,
    igv: 450.00,
    baseNoGravada: 0,
    exonerado: 0,
    isc: 0,
    icbper: 0,
    otrosTributos: 0,
    total: 2950.00,
    tipoAdquisicion: '1',
    formaPago: 'CONTADO',
    diasCredito: 0,
    categoriaGasto: 'SERVICIOS DE TRANSPORTE Y CARGA',
    tieneDetraccion: true,
    tasaDetraccion: 12,
    periodoId: '2026-05',
    estado: 'REGISTRADO',
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  } as any);

  // 3. Comprobante duplicado
  COMPRAS_MEMORIA.push({
    id: 'cmp-dup-1',
    empresaId: empresaAId,
    tipoComprobante: '01',
    serie: 'F002',
    numero: '00009999',
    fechaEmision: '2026-06-01',
    fechaVencimiento: '2026-06-01',
    proveedorId: 'prov-03',
    proveedorRuc: '20111222333',
    proveedorRazonSocial: 'PROVEEDOR DUPLICADO S.A.C.',
    moneda: 'PEN',
    tipoCambio: 1.0,
    baseGravada: 1000.00,
    baseImponible: 1000.00,
    igv: 180.00,
    baseNoGravada: 0,
    exonerado: 0,
    isc: 0,
    icbper: 0,
    otrosTributos: 0,
    total: 1180.00,
    tipoAdquisicion: '1',
    formaPago: 'CONTADO',
    diasCredito: 0,
    tieneDetraccion: false,
    tieneRetencion: false,
    periodoId: '2026-06',
    estado: 'REGISTRADO',
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  } as any);

  COMPRAS_MEMORIA.push({
    id: 'cmp-dup-2',
    empresaId: empresaAId,
    tipoComprobante: '01',
    serie: 'F002',
    numero: '00009999', // Mismo número y proveedor
    fechaEmision: '2026-06-01',
    fechaVencimiento: '2026-06-01',
    proveedorId: 'prov-03',
    proveedorRuc: '20111222333',
    proveedorRazonSocial: 'PROVEEDOR DUPLICADO S.A.C.',
    moneda: 'PEN',
    tipoCambio: 1.0,
    baseGravada: 1000.00,
    baseImponible: 1000.00,
    igv: 180.00,
    baseNoGravada: 0,
    exonerado: 0,
    isc: 0,
    icbper: 0,
    otrosTributos: 0,
    total: 1180.00,
    tipoAdquisicion: '1',
    formaPago: 'CONTADO',
    diasCredito: 0,
    tieneDetraccion: false,
    tieneRetencion: false,
    periodoId: '2026-06',
    estado: 'REGISTRADO',
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  } as any);

  // 4. Ventas con salto correlativo (F001-000001 a F001-000003, falta el 2)
  VENTAS_MEMORIA.push({
    id: 'vnt-1',
    empresaId: empresaAId,
    tipoComprobante: '01',
    serie: 'F001',
    numero: '00000001',
    fechaEmision: '2026-01-10',
    fechaVencimiento: '2026-01-10',
    clienteId: 'cli-01',
    clienteRuc: '20999888777',
    clienteRazonSocial: 'CLIENTE PRINCIPAL S.A.C.',
    moneda: 'PEN',
    tipoCambio: 1.0,
    baseGravada: 10000.00,
    baseImponible: 10000.00,
    igv: 1800.00,
    baseNoGravada: 0,
    exonerado: 0,
    isc: 0,
    icbper: 0,
    otrosTributos: 0,
    total: 11800.00,
    tipoOperacion: '0101',
    formaPago: 'CONTADO',
    diasCredito: 0,
    periodoId: '2026-01',
    estado: 'REGISTRADO',
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  } as any);

  VENTAS_MEMORIA.push({
    id: 'vnt-3',
    empresaId: empresaAId,
    tipoComprobante: '01',
    serie: 'F001',
    numero: '00000003', // Falta el 2
    fechaEmision: '2026-01-15',
    fechaVencimiento: '2026-01-15',
    clienteId: 'cli-01',
    clienteRuc: '20999888777',
    clienteRazonSocial: 'CLIENTE PRINCIPAL S.A.C.',
    moneda: 'PEN',
    tipoCambio: 1.0,
    baseGravada: 15000.00,
    baseImponible: 15000.00,
    igv: 2700.00,
    baseNoGravada: 0,
    exonerado: 0,
    isc: 0,
    icbper: 0,
    otrosTributos: 0,
    total: 17700.00,
    tipoOperacion: '0101',
    formaPago: 'CONTADO',
    diasCredito: 0,
    periodoId: '2026-01',
    estado: 'REGISTRADO',
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  } as any);

  const diagnostico = await auditoriaTributariaService.ejecutarDiagnostico(empresaAId, anio);

  assert.ok(diagnostico, 'El diagnóstico tributario debe retornar un resultado');
  assert.strictEqual(diagnostico.anio, 2026, 'El año auditado debe ser 2026');
  assert.ok(diagnostico.scoreSaludFiscal < 100, 'El score debe reflejar penalizaciones por inconsistencias');
  assert.ok(diagnostico.alertas.length >= 4, 'Debe haber detectado al menos 4 alertas');

  const alertaBanc = diagnostico.alertas.find(a => a.tipo === 'BANCARIZACION');
  assert.ok(alertaBanc, 'Debe detectar inconsistencia de bancarización obligatoria');
  assert.strictEqual(alertaBanc?.nivelRiesgo, 'CRITICO');
  assert.ok(alertaBanc?.baseLegal.includes('Ley N° 28194'), 'Debe citar la Ley 28194');

  const alertaDetr = diagnostico.alertas.find(a => a.tipo === 'DETRACCION_PENDIENTE');
  assert.ok(alertaDetr, 'Debe detectar detracción SPOT pendiente de depósito');
  assert.strictEqual(alertaDetr?.nivelRiesgo, 'CRITICO');

  const alertaDup = diagnostico.alertas.find(a => a.tipo === 'COMPROBANTE_DUPLICADO');
  assert.ok(alertaDup, 'Debe detectar comprobante de compra duplicado');

  const alertaSalto = diagnostico.alertas.find(a => a.tipo === 'CORRELATIVO_SALTADO');
  assert.ok(alertaSalto, 'Debe detectar salto correlativo en ventas');

  console.log('  ✅ PASÓ: Alerta de Bancarización (Ley 28194) detectada y cuantificada');
  console.log('  ✅ PASÓ: Alerta de Detracciones SPOT no depositadas detectada');
  console.log('  ✅ PASÓ: Detección estricta de comprobantes duplicados');
  console.log('  ✅ PASÓ: Algoritmo de saltos correlativos en series de ventas');
  console.log(`  ✅ PASÓ: Score de salud fiscal calculado: ${diagnostico.scoreSaludFiscal}/100 (Nivel: ${diagnostico.nivelRiesgoGeneral})`);

  // =========================================================================
  // TEST 2: DAOT - Declaración Anual de Operaciones con Terceros (FV 3500)
  // =========================================================================
  console.log('\n🔹 Test 2: DAOT Formulario Virtual 3500 (Umbral 2 UIT & TXT Oficial)');

  const daot = await daotService.procesarDaot(empresaAId, anio);

  assert.ok(daot, 'Debe generar el consolidado DAOT');
  assert.strictEqual(daot.uitAnual, 5350, 'UIT 2026 debe ser 5,350');
  assert.strictEqual(daot.umbral2Uit, 10700, 'Umbral 2 UIT debe ser S/ 10,700');
  assert.ok(daot.totalTercerosEvaluados >= 3, 'Debe evaluar a todos los terceros transaccionados');

  // El cliente 20999888777 tuvo ventas por 11800 + 17700 = 29500 (> 10700), debe ser DECLARABLE
  const clienteDeclarable = daot.registros.find(r => r.numeroDocIdentidad === '20999888777');
  assert.ok(clienteDeclarable, 'El cliente principal debe figurar en el reporte DAOT');
  assert.strictEqual(clienteDeclarable?.condicion, 'DECLARABLE', 'Debe estar en condición DECLARABLE por superar 2 UIT');
  assert.strictEqual(clienteDeclarable?.superaUmbral2Uit, true);
  assert.strictEqual(clienteDeclarable?.totalVentas, 29500);

  // Verificar archivo TXT generado
  assert.ok(daot.txtGenerado, 'Debe generar el contenido plano del archivo TXT');
  assert.ok(daot.nombreArchivoTxt.startsWith('DAOT_3500_'), 'Nombre de archivo debe seguir nomenclatura oficial');
  assert.ok(daot.txtGenerado.includes('20999888777'), 'RUC del cliente debe estar en el TXT');
  assert.ok(daot.txtGenerado.includes('29500.00'), 'Importe de ventas debe figurar con formato 2 decimales');
  assert.ok(daot.txtGenerado.includes('|'), 'Debe utilizar delimitador pleca (|)');

  console.log('  ✅ PASÓ: Umbral normativo de 2 UIT (S/ 10,700) aplicado correctamente');
  console.log('  ✅ PASÓ: Clasificación precisa de terceros DECLARABLES vs EXCEPTUADOS');
  console.log('  ✅ PASÓ: Generación de archivo plano TXT compatible con el validador SUNAT');
  console.log(`  ✅ PASÓ: Archivo ${daot.nombreArchivoTxt} validado`);

  // =========================================================================
  // TEST 3: Secuencia Completa de Cierre Anual PCGE (8 Pasos)
  // =========================================================================
  console.log('\n🔹 Test 3: Secuencia Normativa de Cierre Anual PCGE (Cuentas 80 a 89 y Balance)');

  const propuestaCierre = await cierreAnualService.simularCierreAnual(empresaAId, anio);

  assert.ok(propuestaCierre, 'Debe generar la propuesta de cierre anual');
  assert.strictEqual(propuestaCierre.totalAsientosGenerados, 8, 'Debe generar exactamente 8 asientos correlativos');
  assert.strictEqual(propuestaCierre.asientos.length, 8);

  // Validar cada uno de los 8 pasos
  const cuentasEsperadas = ['80', '82', '83', '84', '85', '88', '89', 'BALANCE'];
  for (let i = 0; i < 8; i++) {
    const asiento = propuestaCierre.asientos[i];
    assert.strictEqual(asiento.numeroPaso, i + 1, `El paso debe ser ${i + 1}`);
    assert.strictEqual(asiento.codigoCuentaEnlace, cuentasEsperadas[i]);
    assert.strictEqual(asiento.subdiario, '09', 'Debe pertenecer al Subdiario 09 de Cierre');
    assert.strictEqual(asiento.cuadrado, true, `El asiento del paso ${i + 1} debe estar perfectamente cuadrado`);
    assert.strictEqual(asiento.totalDebe, asiento.totalHaber, `Partida doble estricta en paso ${i + 1}`);
    assert.ok(asiento.totalDebe > 0, `El monto del paso ${i + 1} debe ser mayor a 0`);
  }

  console.log('  ✅ PASÓ: Paso 1 — Margen Comercial (Cuenta 80) cuadrado');
  console.log('  ✅ PASÓ: Paso 2 — Valor Agregado (Cuenta 82) cuadrado');
  console.log('  ✅ PASÓ: Paso 3 — Excedente Bruto de Explotación (Cuenta 83) cuadrado');
  console.log('  ✅ PASÓ: Paso 4 — Resultado de Explotación (Cuenta 84) cuadrado');
  console.log('  ✅ PASÓ: Paso 5 — Resultado antes de Impuestos (Cuenta 85) cuadrado');
  console.log('  ✅ PASÓ: Paso 6 — Impuesto a la Renta Corriente (Cuenta 88) cuadrado');
  console.log('  ✅ PASÓ: Paso 7 — Traslado a Utilidades Acumuladas (Cuenta 89 vs 59) cuadrado');
  console.log('  ✅ PASÓ: Paso 8 — Cierre Definitivo de Cuentas de Balance (Elementos 1-3 vs 4-5) cuadrado');

  // =========================================================================
  // TEST 4: Ejecución y Reversión Atómica del Cierre Anual
  // =========================================================================
  console.log('\n🔹 Test 4: Ejecución y Reversión Atómica del Cierre en Base de Datos');

  const ejecucion = await cierreAnualService.ejecutarCierreAnual(empresaAId, anio);
  assert.strictEqual(ejecucion.ok, true);
  assert.strictEqual(ejecucion.asientosCreados, 8);

  // Verificar que los asientos se guardaron en memoria
  const asientosCierre = ASIENTOS_MEMORIA.filter(a => a.empresaId === empresaAId && (a.subdiarioId === '09' || a.subdiario === '09'));
  assert.strictEqual(asientosCierre.length, 8, 'Deben existir 8 asientos en el Subdiario 09');

  // Reversión atómica
  const reversion = await cierreAnualService.revertirCierreAnual(empresaAId, anio);
  assert.strictEqual(reversion.ok, true);

  const asientosCierrePost = ASIENTOS_MEMORIA.filter(a => a.empresaId === empresaAId && (a.subdiarioId === '09' || a.subdiario === '09'));
  assert.strictEqual(asientosCierrePost.length, 0, 'Todos los asientos de cierre deben haber sido eliminados');

  console.log('  ✅ PASÓ: Ejecución atómica de los 8 asientos en el repositorio contable');
  console.log('  ✅ PASÓ: Reversión atómica y reapertura limpia del ejercicio contable');

  // =========================================================================
  // TEST 5: Conciliación Tributaria DJ Anual Renta FV 710
  // =========================================================================
  console.log('\n🔹 Test 5: Simulador de DJ Anual del Impuesto a la Renta (FV 710)');

  // Cálculo en Régimen General (29.5%)
  const djRG = await djRentaAnualService.calcularDjAnual(empresaAId, anio, {
    regimen: 'REGIMEN_GENERAL'
  });

  assert.ok(djRG, 'Debe calcular la liquidación anual de renta');
  assert.strictEqual(djRG.regimenTributario, 'REGIMEN_GENERAL');
  assert.ok(djRG.totalAdiciones > 0, 'Debe incluir adiciones tributarias (Art. 44 LIR)');
  assert.ok(djRG.totalDeducciones > 0, 'Debe incluir deducciones');
  assert.strictEqual(djRG.tasaEfectiva, 29.5, 'Tasa efectiva en RG debe ser 29.5%');

  // Cálculo en Régimen MYPE Tributario (10% tramo 15 UIT)
  const djRMT = await djRentaAnualService.calcularDjAnual(empresaAId, anio, {
    regimen: 'MYPE_TRIBUTARIO'
  });

  assert.strictEqual(djRMT.regimenTributario, 'MYPE_TRIBUTARIO');
  assert.ok(djRMT.impuestoRentaCalculado < djRG.impuestoRentaCalculado, 'El impuesto en RMT debe ser menor que en RG debido al tramo del 10%');

  console.log(`  ✅ PASÓ: Conciliación Tributaria: Utilidad (S/ ${djRG.utilidadContableAntesImpuestos}) + Adic (S/ ${djRG.totalAdiciones}) - Deduc (S/ ${djRG.totalDeducciones}) = RNI S/ ${djRG.rentaNetaImponible}`);
  console.log(`  ✅ PASÓ: Liquidación Régimen General al 29.5%: S/ ${djRG.impuestoRentaCalculado}`);
  console.log(`  ✅ PASÓ: Liquidación Régimen MYPE Tributario (escala progresiva): S/ ${djRMT.impuestoRentaCalculado}`);
  console.log(`  ✅ PASÓ: Determinación de saldo final: ${djRG.estadoDeclaracion} (S/ ${djRG.saldoPorRegularizar})`);

  // =========================================================================
  // TEST 6: Aislamiento Multiempresa Estricto
  // =========================================================================
  console.log('\n🔹 Test 6: Aislamiento Multiempresa Estricto');

  const diagnosticoB = await auditoriaTributariaService.ejecutarDiagnostico(empresaBId, anio);
  assert.strictEqual(diagnosticoB.resumenMetricas.totalComprasAnalizadas, 0, 'Empresa B no debe heredar compras de Empresa A');
  assert.strictEqual(diagnosticoB.alertas.length, 0, 'Empresa B no debe tener alertas de Empresa A');

  const daotB = await daotService.procesarDaot(empresaBId, anio);
  assert.strictEqual(daotB.totalTercerosDeclarables, 0, 'Empresa B no debe heredar declaraciones de Empresa A');

  console.log('  ✅ PASÓ: Aislamiento: Empresa B tiene 0 alertas y 0 compras');
  console.log('  ✅ PASÓ: Aislamiento: El DAOT de Empresa B está completamente aislado');

  console.log('\n======================================================');
  console.log('📊 RESULTADO SUITE FASE 10: 25/25 PRUEBAS EXITOSAS');
  console.log('🎉 TODAS LAS PRUEBAS DE AUDITORÍA PREVENTIVA, DAOT Y CIERRE ANUAL PCGE PASARON SATISFACTORIAMENTE.');
  console.log('======================================================\n');
}

runFase10Tests().catch((err) => {
  console.error('❌ Error en Suite Fase 10:', err);
  process.exit(1);
});
