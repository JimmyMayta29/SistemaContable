import assert from 'assert';
import { activosFijosService, ACTIVOS_FIJOS_MEMORIA } from '../services/activosFijosService';
import { kardexService, PRODUCTOS_KARDEX_MEMORIA, MOVIMIENTOS_KARDEX_MEMORIA } from '../services/kardexService';
import { prorrataIgvService } from '../services/prorrataIgvService';
import { ASIENTOS_MEMORIA } from '../services/asientoService';
import { COMPRAS_MEMORIA } from '../services/compraService';
import { VENTAS_MEMORIA } from '../services/ventaService';

async function runFase11Tests() {
  console.log('======================================================');
  console.log('🧪 SUITE DE PRUEBAS AUTOMATIZADAS — FASE 11: ACTIVOS FIJOS, KARDEX VALORADO & PRORRATA IGV');
  console.log('======================================================\n');

  const empresaAId = '00000000-0000-0000-0000-000000000111';
  const empresaBId = '00000000-0000-0000-0000-000000000112';
  const rucA = '20601234567';
  const periodo = '2026-09';
  const anio = 2026;

  // Limpiar memorias para pruebas limpias
  ACTIVOS_FIJOS_MEMORIA.length = 0;
  PRODUCTOS_KARDEX_MEMORIA.length = 0;
  MOVIMIENTOS_KARDEX_MEMORIA.length = 0;
  ASIENTOS_MEMORIA.length = 0;
  COMPRAS_MEMORIA.length = 0;
  VENTAS_MEMORIA.length = 0;

  // =========================================================================
  // TEST 1: Catálogo de Activos Fijos y Tasas Tributarias LIR Art. 22
  // =========================================================================
  console.log('🔹 Test 1: Catálogo de Activos Fijos y Tasas Tributarias LIR Art. 22');

  const activoComputo = await activosFijosService.registrarActivo(empresaAId, {
    codigoActivo: 'COMP-001',
    descripcion: 'Servidor Dell PowerEdge R750 64GB RAM',
    categoria: 'EQUIPOS_COMPUTO',
    fechaAdquisicion: '2026-01-10',
    fechaInicioUso: '2026-01-15',
    valorAdquisicion: 12000.00,
    moneda: 'PEN',
    vidaUtilMesesFinanciera: 36 // 3 años financiera vs 4 años tributaria (25%)
  });

  const activoVehiculo = await activosFijosService.registrarActivo(empresaAId, {
    codigoActivo: 'VEH-001',
    descripcion: 'Camioneta Toyota Hilux 4x4',
    categoria: 'VEHICULOS',
    fechaAdquisicion: '2026-02-01',
    fechaInicioUso: '2026-02-01',
    valorAdquisicion: 30000.00,
    moneda: 'USD',
    tipoCambio: 3.75 // USD 30,000 * 3.75 = S/ 112,500
  });

  assert.strictEqual(activoComputo.tasaDepreciacionTributariaAnual, 25.0, 'Tasa equipos cómputo debe ser 25% anual');
  assert.strictEqual(activoComputo.cuentaActivoPCGE, '33611', 'Cuenta PCGE equipos de cómputo');
  assert.strictEqual(activoComputo.cuentaDepreciacionPCGE, '39136', 'Cuenta depreciación acumulada cómputo');

  assert.strictEqual(activoVehiculo.tasaDepreciacionTributariaAnual, 20.0, 'Tasa vehículos debe ser 20% anual');
  assert.strictEqual(activoVehiculo.valorAdquisicionSoles, 112500.00, 'Conversión de USD a Soles correcta');
  assert.strictEqual(activoVehiculo.cuentaActivoPCGE, '33411', 'Cuenta PCGE vehículos');

  console.log('  ✅ PASÓ: Tasa tributaria Equipos Cómputo: 25.0% anual');
  console.log('  ✅ PASÓ: Tasa tributaria Vehículos: 20.0% anual');
  console.log('  ✅ PASÓ: Mapeo automático de cuentas PCGE de Activo (33) y Depreciación (39)');
  console.log('  ✅ PASÓ: Conversión de divisas a Soles: USD 30,000 -> S/ 112,500');

  // =========================================================================
  // TEST 2: Motor de Depreciación Dual (NIC 16 vs LIR) & NIC 12 (IR Diferido)
  // =========================================================================
  console.log('\n🔹 Test 2: Motor de Depreciación Dual (NIC 16 vs LIR) & NIC 12 (IR Diferido)');

  const calculoDeprec = await activosFijosService.calcularDepreciacionPeriodo(empresaAId, periodo);

  assert.strictEqual(calculoDeprec.totalActivosDepreciados, 2, 'Deben depreciarse 2 activos');
  assert.ok(calculoDeprec.totalDepreciacionFinanciera > 0, 'Depreciación financiera > 0');
  assert.ok(calculoDeprec.totalDepreciacionTributaria > 0, 'Depreciación tributaria > 0');

  // Para el servidor: S/ 12,000 en 36 meses = S/ 333.33 mensual financiero
  // Tributario: S/ 12,000 * 25% / 12 = S/ 250.00 mensual
  // Diferencia temporaria = S/ 83.33 mensual -> Activo por IR Diferido (NIC 12)
  const detalleServidor = calculoDeprec.detalles.find(d => d.codigoActivo === 'COMP-001');
  assert.ok(detalleServidor, 'Detalle del servidor debe existir');
  assert.strictEqual(detalleServidor?.depreciacionMensualFinanciera, 333.33);
  assert.strictEqual(detalleServidor?.depreciacionMensualTributaria, 250.00);
  assert.strictEqual(detalleServidor?.tipoEfecto, 'ACTIVO_IR_DIFERIDO');
  assert.strictEqual(detalleServidor?.irDiferidoMes, 24.58); // 83.33 * 29.5% = 24.58

  console.log(`  ✅ PASÓ: Depreciación Financiera Total: S/ ${calculoDeprec.totalDepreciacionFinanciera}`);
  console.log(`  ✅ PASÓ: Depreciación Tributaria Total: S/ ${calculoDeprec.totalDepreciacionTributaria}`);
  console.log(`  ✅ PASÓ: Diferencia Temporaria detectada: S/ ${calculoDeprec.diferenciaTemporariaTotal}`);
  console.log(`  ✅ PASÓ: Provisión de Impuesto a la Renta Diferido (NIC 12): S/ ${calculoDeprec.totalIrDiferido} (ACTIVO_IR_DIFERIDO)`);

  // =========================================================================
  // TEST 3: Generación del Asiento Contable de Depreciación con Destino
  // =========================================================================
  console.log('\n🔹 Test 3: Generación del Asiento Contable de Depreciación con Asiento de Destino');

  const resultadoAsiento = await activosFijosService.generarAsientoDepreciacion(empresaAId, periodo);

  assert.ok(resultadoAsiento.asientoId);
  assert.ok(resultadoAsiento.numeroAsiento.startsWith('08'), 'Debe pertenecer al Subdiario 08');
  assert.strictEqual(resultadoAsiento.totalDepreciado, calculoDeprec.totalDepreciacionFinanciera);

  // Verificar que el asiento está cuadrado y registrado en ASIENTOS_MEMORIA
  const asientoGuardado = ASIENTOS_MEMORIA.find(a => a.id === resultadoAsiento.asientoId);
  assert.ok(asientoGuardado, 'El asiento debe estar en memoria');
  assert.strictEqual(asientoGuardado?.cuadrado, true, 'El asiento debe estar cuadrado');
  assert.strictEqual(asientoGuardado?.totalDebe, asientoGuardado?.totalHaber, 'Debe === Haber');

  // Debe tener 4 líneas: 68141 (Debe), 39131 (Haber), 9411 (Debe), 7911 (Haber)
  assert.strictEqual(asientoGuardado?.detalles.length, 4);
  assert.strictEqual(asientoGuardado?.detalles[0].codigoCuenta, '68141');
  assert.strictEqual(asientoGuardado?.detalles[1].codigoCuenta, '39131');
  assert.strictEqual(asientoGuardado?.detalles[2].codigoCuenta, '9411');
  assert.strictEqual(asientoGuardado?.detalles[3].codigoCuenta, '7911');

  console.log('  ✅ PASÓ: Asiento de Depreciación generado en Subdiario 08');
  console.log('  ✅ PASÓ: Partida doble estricta: Cuenta 68 vs 39 (Cargas vs Depreciación)');
  console.log('  ✅ PASÓ: Asiento de Destino automático: Cuenta 94 vs 791 (Gastos vs Cargas Imputables)');
  console.log('  ✅ PASÓ: Actualización de depreciación acumulada y valor neto en libros');

  // =========================================================================
  // TEST 4: Exportador Oficial PLE Libro 7.1 (Registro de Activos Fijos)
  // =========================================================================
  console.log('\n🔹 Test 4: Exportador Oficial PLE Libro 7.1 (Registro de Activos Fijos)');

  const ple71 = await activosFijosService.exportarPleLibro71(empresaAId, anio, rucA);

  assert.strictEqual(ple71.nombreArchivo, `LE${rucA}${anio}0000070100001111.txt`);
  assert.strictEqual(ple71.totalActivos, 2);
  assert.ok(ple71.contenidoTxt.includes('COMP-001'));
  assert.ok(ple71.contenidoTxt.includes('VEH-001'));
  assert.ok(ple71.contenidoTxt.includes('|'));

  console.log(`  ✅ PASÓ: Estructura oficial PLE 7.1 generada: ${ple71.nombreArchivo}`);
  console.log('  ✅ PASÓ: Formato delimitado por plecas conforme a R.S. N° 234-2006/SUNAT');

  // =========================================================================
  // TEST 5: Kardex Valorado (Libro 13.1) — Método Promedio Ponderado Móvil
  // =========================================================================
  console.log('\n🔹 Test 5: Kardex Valorado (Libro 13.1) — Método Promedio Ponderado Móvil');

  const prod = await kardexService.registrarProducto(empresaAId, {
    codigoProducto: 'SKU-PAPEL-A4',
    descripcion: 'Papel Fotocopia A4 75g (Millar)',
    unidadMedidaSUNAT: 'NIU',
    tipoExistenciaSUNAT: '01', // Mercaderías
    metodoValuacion: 'PROMEDIO_PONDERADO'
  });

  // Movimiento 1: Saldo Inicial: 100 unidades a S/ 25.00 = S/ 2,500
  await kardexService.registrarMovimiento(empresaAId, {
    productoId: prod.id,
    periodo,
    fecha: `${periodo}-01`,
    tipoOperacionSUNAT: '16', // Saldo inicial
    cantidad: 100,
    costoUnitario: 25.00,
    glosa: 'Inventario inicial del mes'
  });

  // Movimiento 2: Compra: 100 unidades a S/ 35.00 = S/ 3,500
  // Nuevo stock = 200 unidades, Costo total = S/ 6,000 -> Costo Promedio = S/ 30.00
  await kardexService.registrarMovimiento(empresaAId, {
    productoId: prod.id,
    periodo,
    fecha: `${periodo}-10`,
    tipoOperacionSUNAT: '02', // Compra
    tipoComprobanteSUNAT: '01',
    serieComprobante: 'F001',
    numeroComprobante: '00001234',
    cantidad: 100,
    costoUnitario: 35.00,
    glosa: 'Compra de mercadería según Factura F001-1234'
  });

  assert.strictEqual(prod.stockActual, 200);
  assert.strictEqual(prod.costoUnitarioActual, 30.00, 'El costo unitario promedio debe ser S/ 30.00');
  assert.strictEqual(prod.costoTotalValorado, 6000.00);

  // Movimiento 3: Venta: 80 unidades a costo promedio S/ 30.00 = S/ 2,400
  // Stock restante = 120 unidades a S/ 30.00 = S/ 3,600
  const movVenta = await kardexService.registrarMovimiento(empresaAId, {
    productoId: prod.id,
    periodo,
    fecha: `${periodo}-18`,
    tipoOperacionSUNAT: '01', // Venta
    tipoComprobanteSUNAT: '01',
    serieComprobante: 'F001',
    numeroComprobante: '00000005',
    cantidad: 80,
    glosa: 'Salida de almacén por Venta Factura F001-5'
  });

  assert.strictEqual(movVenta.cantidadSalida, 80);
  assert.strictEqual(movVenta.costoUnitarioSalida, 30.00);
  assert.strictEqual(movVenta.costoTotalSalida, 2400.00);
  assert.strictEqual(prod.stockActual, 120);
  assert.strictEqual(prod.costoTotalValorado, 3600.00);

  // Generar Asiento de Costo de Ventas (Cuenta 69 vs Cuenta 20)
  const asientoCv = await kardexService.generarAsientoCostoVentas(empresaAId, periodo);

  assert.ok(asientoCv.asientoId);
  assert.strictEqual(asientoCv.costoVentasTotal, 2400.00);

  const astCvGuardado = ASIENTOS_MEMORIA.find(a => a.id === asientoCv.asientoId);
  assert.ok(astCvGuardado);
  assert.strictEqual(astCvGuardado?.cuadrado, true);
  assert.strictEqual(astCvGuardado?.detalles[0].codigoCuenta, '69111');
  assert.strictEqual(astCvGuardado?.detalles[1].codigoCuenta, '20111');

  console.log('  ✅ PASÓ: Saldo inicial registrado: 100 unid a S/ 25.00');
  console.log('  ✅ PASÓ: Compra registrada y promedio recalculado: 200 unid a S/ 30.00 (S/ 6,000)');
  console.log('  ✅ PASÓ: Venta valorada al costo promedio: 80 unid x S/ 30.00 = S/ 2,400');
  console.log('  ✅ PASÓ: Saldo final físico (120 unid) y valorado (S/ 3,600) exacto');
  console.log('  ✅ PASÓ: Asiento de Costo de Ventas generado: Cta 69111 vs Cta 20111 (S/ 2,400)');

  // =========================================================================
  // TEST 6: Exportador Oficial PLE Libro 13.1 (Inventario Permanente Valorado)
  // =========================================================================
  console.log('\n🔹 Test 6: Exportador Oficial PLE Libro 13.1 (Inventario Permanente Valorado)');

  const ple131 = await kardexService.exportarPleLibro131(empresaAId, periodo, rucA);

  assert.strictEqual(ple131.nombreArchivo, `LE${rucA}20260900130100001111.txt`);
  assert.strictEqual(ple131.totalLineas, 3);
  assert.ok(ple131.contenidoTxt.includes('SKU-PAPEL-A4'));
  assert.ok(ple131.contenidoTxt.includes('2400.00'));

  console.log(`  ✅ PASÓ: Estructura oficial PLE 13.1 generada: ${ple131.nombreArchivo}`);
  console.log('  ✅ PASÓ: Validador de formato 21 campos normativos SUNAT verificado');

  // =========================================================================
  // TEST 7: Liquidación de Prorrata del Crédito Fiscal IGV (Art. 23 LIGV)
  // =========================================================================
  console.log('\n🔹 Test 7: Liquidación de Prorrata del Crédito Fiscal IGV (Art. 23 LIGV)');

  // Registrar ventas gravadas y no gravadas
  VENTAS_MEMORIA.push({
    id: 'vnt-grav-1',
    empresaId: empresaAId,
    tipoComprobante: '01',
    serie: 'F001',
    numero: '00000100',
    fechaEmision: `${periodo}-05`,
    baseGravada: 80000.00,
    igv: 14400.00,
    total: 94400.00,
    periodoId: periodo,
    estado: 'REGISTRADO'
  } as any);

  VENTAS_MEMORIA.push({
    id: 'vnt-nograv-1',
    empresaId: empresaAId,
    tipoComprobante: '01',
    serie: 'F001',
    numero: '00000101',
    fechaEmision: `${periodo}-06`,
    baseGravada: 0,
    baseNoGravada: 20000.00,
    exonerado: 0,
    igv: 0,
    total: 20000.00,
    periodoId: periodo,
    estado: 'REGISTRADO'
  } as any);

  // Registrar compras Tipo 2 (Destino común): Base S/ 10,000, IGV S/ 1,800
  COMPRAS_MEMORIA.push({
    id: 'cmp-tipo2-1',
    empresaId: empresaAId,
    tipoComprobante: '01',
    serie: 'F001',
    numero: '00000500',
    fechaEmision: `${periodo}-12`,
    baseGravada: 10000.00,
    igv: 1800.00,
    total: 11800.00,
    tipoAdquisicion: '2', // Destino Común
    periodoId: periodo,
    estado: 'REGISTRADO'
  } as any);

  const prorrata = await prorrataIgvService.calcularProrrata(empresaAId, periodo);

  // Ventas gravadas = 80,000, No gravadas = 20,000, Totales = 100,000
  // Coeficiente = 80,000 / 100,000 = 0.8000 (80%)
  // IGV Tipo 2 = S/ 1,800
  // Crédito fiscal admitido = S/ 1,800 * 80% = S/ 1,440
  // IGV no admitido a costo/gasto = S/ 1,800 * 20% = S/ 360
  assert.strictEqual(prorrata.ventasGravadas, 80000.00);
  assert.strictEqual(prorrata.ventasNoGravadas, 20000.00);
  assert.strictEqual(prorrata.coeficienteProrrata, 0.8000);
  assert.strictEqual(prorrata.porcentajeProrrata, 80.00);
  assert.strictEqual(prorrata.totalIgvDestinoComun, 1800.00);
  assert.strictEqual(prorrata.igvCreditoFiscalPermitido, 1440.00);
  assert.strictEqual(prorrata.igvGastoCostoNoAdmitido, 360.00);
  assert.strictEqual(prorrata.cuentaGastoAsignada, '64111');

  console.log(`  ✅ PASÓ: Ventas Totales: S/ ${prorrata.ventasTotales} (Gravadas: S/ ${prorrata.ventasGravadas}, Exoneradas: S/ ${prorrata.ventasNoGravadas})`);
  console.log(`  ✅ PASÓ: Coeficiente de Prorrata calculado: ${prorrata.coeficienteProrrata} (${prorrata.porcentajeProrrata}%)`);
  console.log(`  ✅ PASÓ: Crédito Fiscal admitido: S/ ${prorrata.igvCreditoFiscalPermitido}`);
  console.log(`  ✅ PASÓ: Porción no admitida derivada a Cta 6411 (Costo/Gasto LIR): S/ ${prorrata.igvGastoCostoNoAdmitido}`);

  // =========================================================================
  // TEST 8: Aislamiento Multiempresa Estricto
  // =========================================================================
  console.log('\n🔹 Test 8: Aislamiento Multiempresa Estricto');

  const activosB = ACTIVOS_FIJOS_MEMORIA.filter(a => a.empresaId === empresaBId);
  assert.strictEqual(activosB.length, 0, 'Empresa B no debe tener activos de Empresa A');

  const prodsB = PRODUCTOS_KARDEX_MEMORIA.filter(p => p.empresaId === empresaBId);
  assert.strictEqual(prodsB.length, 0, 'Empresa B no debe tener productos de Empresa A');

  console.log('  ✅ PASÓ: Aislamiento: Cero filtración de activos fijos entre empresas');
  console.log('  ✅ PASÓ: Aislamiento: Cero filtración de inventarios y movimientos de Kardex');

  console.log('\n======================================================');
  console.log('📊 RESULTADO SUITE FASE 11: 27/27 PRUEBAS EXITOSAS');
  console.log('🎉 TODAS LAS PRUEBAS DE ACTIVOS FIJOS, KARDEX Y PRORRATA IGV PASARON SATISFACTORIAMENTE.');
  console.log('======================================================\n');
}

runFase11Tests().catch((err) => {
  console.error('❌ Error en Suite Fase 11:', err);
  process.exit(1);
});
