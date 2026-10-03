import { asientoService, ASIENTOS_MEMORIA } from '../services/asientoService';
import { librosEEFFService, SALDOS_MENSUALES_MEMORIA } from '../services/librosEEFFService';
import { periodoService } from '../services/periodoService';

async function ejecutarSuiteFase5() {
  console.log('======================================================');
  console.log('🧪 SUITE DE PRUEBAS AUTOMATIZADAS — FASE 5: LIBROS, BALANCE DE COMPROBACIÓN & ESTADOS FINANCIEROS (EEFF)');
  console.log('======================================================\n');

  let passed = 0;
  let total = 0;

  function assert(cond: boolean, desc: string, extra?: string) {
    total++;
    if (cond) {
      console.log(`  ✅ PASÓ: ${desc}`);
      passed++;
    } else {
      console.error(`  ❌ FALLÓ: ${desc} ${extra ? `(${extra})` : ''}`);
      throw new Error(`Fallo en prueba Fase 5: ${desc}`);
    }
  }

  const EMPRESA_F5 = '00000000-0000-0000-0000-000000000055';
  const PERIODO_TEST = '2026-09';
  const USER_ID = 'usr-contador-01';

  // Abrir período
  await periodoService.abrirPeriodo(EMPRESA_F5, PERIODO_TEST, USER_ID);

  // --------------------------------------------------------------------------
  // CARGA DE CICLO CONTABLE COMPLETO Y REALISTA
  // --------------------------------------------------------------------------

  // 1. Asiento de Apertura (Subdiario 00)
  const astApertura = await asientoService.crearBorrador(EMPRESA_F5, {
    periodoId: `per-${PERIODO_TEST}`,
    subdiarioId: '00',
    fecha: '2026-09-01',
    glosa: 'Asiento de apertura del ejercicio comercial 2026',
    moneda: 'PEN',
    tipoCambio: 1.0,
    detalles: [
      { linea: 1, cuentaId: '1011', debe: 10000, haber: 0, glosaLinea: 'Caja moneda nacional' },
      { linea: 2, cuentaId: '1041', debe: 50000, haber: 0, glosaLinea: 'Banco BCP cta cte' },
      { linea: 3, cuentaId: '1212', debe: 20000, haber: 0, glosaLinea: 'Facturas por cobrar comerciales' },
      { linea: 4, cuentaId: '20111', debe: 30000, haber: 0, glosaLinea: 'Mercaderías en almacén' },
      { linea: 5, cuentaId: '33511', debe: 15000, haber: 0, glosaLinea: 'Muebles y enseres de oficina' },
      { linea: 6, cuentaId: '39525', debe: 0, haber: 3000, glosaLinea: 'Depreciación acumulada de muebles' },
      { linea: 7, cuentaId: '4212', debe: 0, haber: 12000, glosaLinea: 'Facturas por pagar a proveedores' },
      { linea: 8, cuentaId: '5011', debe: 0, haber: 100000, glosaLinea: 'Capital social suscrito y pagado' },
      { linea: 9, cuentaId: '5911', debe: 0, haber: 10000, glosaLinea: 'Utilidades no distribuidas acumuladas' }
    ]
  }, USER_ID);
  await asientoService.contabilizar(astApertura.id, EMPRESA_F5, 'usr-senior-02');

  // 2. Asiento de Compra de Mercadería con IGV y Destino (Subdiario 01)
  const astCompra = await asientoService.crearBorrador(EMPRESA_F5, {
    periodoId: `per-${PERIODO_TEST}`,
    subdiarioId: '01',
    fecha: '2026-09-05',
    glosa: 'Compra de mercadería según Factura F001-00892',
    moneda: 'PEN',
    tipoCambio: 1.0,
    detalles: [
      { linea: 1, cuentaId: '6011', debe: 20000, haber: 0, glosaLinea: 'Compra de mercadería local' },
      { linea: 2, cuentaId: '40111', debe: 3600, haber: 0, glosaLinea: 'IGV crédito fiscal (18%)' },
      { linea: 3, cuentaId: '4212', debe: 0, haber: 23600, glosaLinea: 'Factura por pagar proveedor' },
      // Destino 20/61
      { linea: 4, cuentaId: '20111', debe: 20000, haber: 0, glosaLinea: 'Ingreso al almacén' },
      { linea: 5, cuentaId: '6111', debe: 0, haber: 20000, glosaLinea: 'Variación de inventarios mercaderías' }
    ]
  }, USER_ID);
  await asientoService.contabilizar(astCompra.id, EMPRESA_F5, 'usr-senior-02');

  // 3. Asiento de Venta de Mercaderías con IGV (Subdiario 05)
  const astVenta = await asientoService.crearBorrador(EMPRESA_F5, {
    periodoId: `per-${PERIODO_TEST}`,
    subdiarioId: '05',
    fecha: '2026-09-12',
    glosa: 'Venta de mercaderías Factura F001-000450',
    moneda: 'PEN',
    tipoCambio: 1.0,
    detalles: [
      { linea: 1, cuentaId: '1212', debe: 59000, haber: 0, glosaLinea: 'Facturas por cobrar cliente' },
      { linea: 2, cuentaId: '40111', debe: 0, haber: 9000, glosaLinea: 'IGV débito fiscal por pagar' },
      { linea: 3, cuentaId: '70111', debe: 0, haber: 50000, glosaLinea: 'Venta de mercaderías mercado local' }
    ]
  }, USER_ID);
  await asientoService.contabilizar(astVenta.id, EMPRESA_F5, 'usr-senior-02');

  // 4. Asiento de Costo de Ventas (Subdiario 05)
  const astCostoVentas = await asientoService.crearBorrador(EMPRESA_F5, {
    periodoId: `per-${PERIODO_TEST}`,
    subdiarioId: '05',
    fecha: '2026-09-12',
    glosa: 'Costo de ventas por mercadería despachada',
    moneda: 'PEN',
    tipoCambio: 1.0,
    detalles: [
      { linea: 1, cuentaId: '69111', debe: 15000, haber: 0, glosaLinea: 'Costo de ventas mercaderías' },
      { linea: 2, cuentaId: '20111', debe: 0, haber: 15000, glosaLinea: 'Salida de existencias al costo' }
    ]
  }, USER_ID);
  await asientoService.contabilizar(astCostoVentas.id, EMPRESA_F5, 'usr-senior-02');

  // 5. Asiento de Gastos de Servicios con Destino 94/95/79 (Subdiario 01)
  const astServicios = await asientoService.crearBorrador(EMPRESA_F5, {
    periodoId: `per-${PERIODO_TEST}`,
    subdiarioId: '01',
    fecha: '2026-09-18',
    glosa: 'Servicios de consultoría contable y auditoría',
    moneda: 'PEN',
    tipoCambio: 1.0,
    detalles: [
      { linea: 1, cuentaId: '6321', debe: 2000, haber: 0, glosaLinea: 'Asesoría contable y tributaria' },
      { linea: 2, cuentaId: '40111', debe: 360, haber: 0, glosaLinea: 'IGV crédito fiscal' },
      { linea: 3, cuentaId: '4212', debe: 0, haber: 2360, glosaLinea: 'Factura por pagar consultor' },
      // Destino 60/40
      { linea: 4, cuentaId: '941', debe: 1200, haber: 0, glosaLinea: 'Gastos de administración (60%)' },
      { linea: 5, cuentaId: '951', debe: 800, haber: 0, glosaLinea: 'Gastos de ventas (40%)' },
      { linea: 6, cuentaId: '791', debe: 0, haber: 2000, glosaLinea: 'Cargas imputables a cuentas de costos' }
    ]
  }, USER_ID);
  await asientoService.contabilizar(astServicios.id, EMPRESA_F5, 'usr-senior-02');

  // 6. Asiento de Planilla de Sueldos y Aportes (Subdiario 07)
  const astPlanilla = await asientoService.crearBorrador(EMPRESA_F5, {
    periodoId: `per-${PERIODO_TEST}`,
    subdiarioId: '07',
    fecha: '2026-09-28',
    glosa: 'Planilla de remuneraciones de setiembre 2026',
    moneda: 'PEN',
    tipoCambio: 1.0,
    detalles: [
      { linea: 1, cuentaId: '6211', debe: 6000, haber: 0, glosaLinea: 'Sueldos y salarios' },
      { linea: 2, cuentaId: '6271', debe: 540, haber: 0, glosaLinea: 'Aporte EsSalud (9%)' },
      { linea: 3, cuentaId: '4031', debe: 0, haber: 540, glosaLinea: 'EsSalud por pagar' },
      { linea: 4, cuentaId: '4032', debe: 0, haber: 780, glosaLinea: 'ONP retenida (13%)' },
      { linea: 5, cuentaId: '4111', debe: 0, haber: 5220, glosaLinea: 'Remuneraciones netas por pagar' },
      // Destino planilla 60/40
      { linea: 6, cuentaId: '941', debe: 3924, haber: 0, glosaLinea: 'Destino administrativo planilla' },
      { linea: 7, cuentaId: '951', debe: 2616, haber: 0, glosaLinea: 'Destino comercial planilla' },
      { linea: 8, cuentaId: '791', debe: 0, haber: 6540, glosaLinea: 'Cargas imputables de personal' }
    ]
  }, USER_ID);
  await asientoService.contabilizar(astPlanilla.id, EMPRESA_F5, 'usr-senior-02');

  // 7. Asiento de Cobranza a Clientes (Subdiario 03)
  const astCobro = await asientoService.crearBorrador(EMPRESA_F5, {
    periodoId: `per-${PERIODO_TEST}`,
    subdiarioId: '03',
    fecha: '2026-09-25',
    glosa: 'Cobranza de factura de venta por transferencia BCP',
    moneda: 'PEN',
    tipoCambio: 1.0,
    detalles: [
      { linea: 1, cuentaId: '1041', debe: 40000, haber: 0, glosaLinea: 'Ingreso a banco BCP' },
      { linea: 2, cuentaId: '1212', debe: 0, haber: 40000, glosaLinea: 'Cancelación parcial cuenta por cobrar' }
    ]
  }, USER_ID);
  await asientoService.contabilizar(astCobro.id, EMPRESA_F5, 'usr-senior-02');

  // 8. Asiento de Pago a Proveedores (Subdiario 04)
  const astPago = await asientoService.crearBorrador(EMPRESA_F5, {
    periodoId: `per-${PERIODO_TEST}`,
    subdiarioId: '04',
    fecha: '2026-09-29',
    glosa: 'Pago a proveedores mediante transferencia bancaria',
    moneda: 'PEN',
    tipoCambio: 1.0,
    detalles: [
      { linea: 1, cuentaId: '4212', debe: 15000, haber: 0, glosaLinea: 'Amortización de deuda proveedor' },
      { linea: 2, cuentaId: '1041', debe: 0, haber: 15000, glosaLinea: 'Salida de fondos banco BCP' }
    ]
  }, USER_ID);
  await asientoService.contabilizar(astPago.id, EMPRESA_F5, 'usr-senior-02');

  // ==========================================================================
  // EJECUCIÓN DE PRUEBAS DE LA FASE 5
  // ==========================================================================

  // --------------------------------------------------------------------------
  // TEST 1: Libro Diario Oficial y Partida Doble
  // --------------------------------------------------------------------------
  console.log('🔹 Test 1: Libro Diario Oficial y Partida Doble');
  const diario = await librosEEFFService.generarLibroDiario(EMPRESA_F5, PERIODO_TEST);
  assert(diario.totalAsientos === 8, 'Se contabilizaron exactamente los 8 asientos del ciclo');
  assert(diario.estaBalanceado, 'Libro Diario estrictamente balanceado (Total Debe === Total Haber)');
  assert(diario.totalDebe > 0, `Total Debe del Diario calculado: S/ ${diario.totalDebe.toFixed(2)}`);
  assert(diario.totalDebe === diario.totalHaber, 'Diferencia de cuadre del Diario es cero');

  // --------------------------------------------------------------------------
  // TEST 2: Libro Mayor Oficial y Consistencia con Diario
  // --------------------------------------------------------------------------
  console.log('\n🔹 Test 2: Libro Mayor Oficial y Consistencia con Diario');
  const mayor = await librosEEFFService.generarLibroMayor(EMPRESA_F5, PERIODO_TEST);
  assert(mayor.cuentas.length >= 10, 'Mayor contiene las cuentas contables del plan PCGE');
  assert(mayor.totalSumasDebe === diario.totalDebe, 'Sumas Debe del Mayor coinciden exactamente con Total Debe del Diario');
  assert(mayor.totalSumasHaber === diario.totalHaber, 'Sumas Haber del Mayor coinciden exactamente con Total Haber del Diario');
  assert(mayor.totalSaldoDeudor === mayor.totalSaldoAcreedor, 'Total de Saldos Deudores igual a Total de Saldos Acreedores');
  assert(mayor.estaCuadrado, 'Libro Mayor 100% cuadrado sin descuadre');

  // --------------------------------------------------------------------------
  // TEST 3: Balance de Comprobación (Hoja de Trabajo 10 Columnas)
  // --------------------------------------------------------------------------
  console.log('\n🔹 Test 3: Balance de Comprobación (10 Columnas) y Cuadre de Utilidades');
  const balance = await librosEEFFService.generarBalanceComprobacion(EMPRESA_F5, PERIODO_TEST);
  assert(balance.cuadre.sumasCuadradas, 'Columnas 1 y 2 (Sumas del Mayor) cuadradas');
  assert(balance.cuadre.saldosCuadrados, 'Columnas 3 y 4 (Saldos Deudor/Acreedor) cuadradas');
  assert(balance.totales.sumasDebe === diario.totalDebe, 'Sumas del Balance de Comprobación coinciden con el Diario');
  
  // Verificación del Triple Cuadre: Balance === Naturaleza === Función
  const resBal = balance.cuadre.resultadoEjercicioBalance;
  const resNat = balance.cuadre.resultadoEjercicioNaturaleza;
  const resFun = balance.cuadre.resultadoEjercicioFuncion;
  assert(Math.abs(resBal - resNat) < 0.05, `Resultado Balance (S/ ${resBal}) cuadra con Resultado Naturaleza (S/ ${resNat})`);
  assert(Math.abs(resBal - resFun) < 0.05, `Resultado Balance (S/ ${resBal}) cuadra con Resultado Función (S/ ${resFun})`);
  assert(balance.cuadre.todoCuadrado, 'Hoja de Trabajo del Balance de Comprobación 100% cuadrada');

  // --------------------------------------------------------------------------
  // TEST 4: Estado de Situación Financiera (Balance General)
  // --------------------------------------------------------------------------
  console.log('\n🔹 Test 4: Estado de Situación Financiera (Ecuación Contable Fundamental)');
  const eeff = await librosEEFFService.generarEstadoSituacionFinanciera(EMPRESA_F5, PERIODO_TEST);
  assert(eeff.totalActivoCorriente > 0, `Activo Corriente: S/ ${eeff.totalActivoCorriente.toFixed(2)}`);
  assert(eeff.totalActivoNoCorriente > 0, `Activo No Corriente neto: S/ ${eeff.totalActivoNoCorriente.toFixed(2)}`);
  assert(eeff.totalPasivoCorriente > 0, `Pasivo Corriente: S/ ${eeff.totalPasivoCorriente.toFixed(2)}`);
  assert(eeff.totalPatrimonio > 0, `Patrimonio Neto: S/ ${eeff.totalPatrimonio.toFixed(2)}`);
  assert(eeff.resultadoDelEjercicio === resBal, 'Resultado del ejercicio en Patrimonio coincide con el Balance de Comprobación');
  assert(eeff.estaCuadrado, `Ecuación fundamental cumplida: Activo (S/ ${eeff.totalActivo}) === Pasivo + Patrimonio (S/ ${eeff.totalPasivoYPatrimonio})`);
  assert(eeff.diferenciaCuadre === 0, 'Diferencia de cuadre en Situación Financiera es 0.00');

  // --------------------------------------------------------------------------
  // TEST 5: Estado de Resultados (Por Naturaleza y Por Función)
  // --------------------------------------------------------------------------
  console.log('\n🔹 Test 5: Estado de Resultados Integrales (Naturaleza vs Función)');
  const er = await librosEEFFService.generarEstadoResultados(EMPRESA_F5, PERIODO_TEST);
  assert(er.porNaturaleza.ventasNetas === 50000, 'Ventas netas registradas exactamente S/ 50,000.00');
  assert(er.porNaturaleza.comprasNetas === 20000, 'Compras netas registradas S/ 20,000.00');
  assert(er.coincidenciaExacta, `Utilidad Neta por Naturaleza (S/ ${er.porNaturaleza.utilidadNeta}) coincide con Por Función (S/ ${er.porFuncion.utilidadNeta})`);
  assert(Math.abs(er.porNaturaleza.utilidadNeta - resBal) < 0.05, 'Utilidad Neta del Estado de Resultados coincide con el Balance de Comprobación');

  // --------------------------------------------------------------------------
  // TEST 6: Estado de Flujos de Efectivo y Conciliación con Cuenta 10
  // --------------------------------------------------------------------------
  console.log('\n🔹 Test 6: Estado de Flujos de Efectivo (Conciliación con Cuenta 10)');
  const fe = await librosEEFFService.generarEstadoFlujoEfectivo(EMPRESA_F5, PERIODO_TEST);
  assert(fe.actividadesOperacion.cobranzasClientes === 40000, 'Cobranzas operativas a clientes S/ 40,000.00');
  assert(fe.actividadesOperacion.pagosProveedores === 15000, 'Pagos operativos a proveedores S/ 15,000.00');
  assert(fe.saldoCuenta10Mayor > 0, `Saldo cuenta 10 en Mayor: S/ ${fe.saldoCuenta10Mayor.toFixed(2)}`);
  assert(fe.estaConciliado, `Saldo final de efectivo (S/ ${fe.saldoFinalEfectivo}) coincide exactamente con la cuenta 10 en Mayor`);

  // --------------------------------------------------------------------------
  // TEST 7: Ratios Financieros de Gestión, Solvencia y Rentabilidad
  // --------------------------------------------------------------------------
  console.log('\n🔹 Test 7: Ratios Financieros (Liquidez, Solvencia, ROS y ROE)');
  const ratios = await librosEEFFService.calcularRatiosFinancieros(EMPRESA_F5, PERIODO_TEST);
  assert(ratios.liquidezGeneral > 1.0, `Liquidez General solvente (> 1.0): ${ratios.liquidezGeneral}`);
  assert(ratios.pruebaAcida > 0, `Prueba Ácida calculada: ${ratios.pruebaAcida}`);
  assert(ratios.capitalDeTrabajo > 0, `Capital de Trabajo positivo: S/ ${ratios.capitalDeTrabajo.toFixed(2)}`);
  assert(ratios.endeudamientoPatrimonial < 1.0, `Ratio de endeudamiento controlado (< 1.0): ${ratios.endeudamientoPatrimonial}`);
  assert(ratios.margenNeto > 0, `Margen Neto (ROS) positivo: ${ratios.margenNeto}%`);
  assert(ratios.rentabilidadPatrimonioROE > 0, `Rentabilidad sobre Patrimonio (ROE) positiva: ${ratios.rentabilidadPatrimonioROE}%`);

  // --------------------------------------------------------------------------
  // TEST 8: Reconstrucción y Verificación de Saldos Mensuales (Auditoría)
  // --------------------------------------------------------------------------
  console.log('\n🔹 Test 8: Reconstrucción y Verificación de Saldos Mensuales contra el Diario');
  const rec = await librosEEFFService.reconstruirSaldosMensuales(EMPRESA_F5, PERIODO_TEST);
  assert(rec.success, 'Job de reconstrucción ejecutado exitosamente');
  assert(rec.cuentasProcesadas >= 10, 'Saldos mensuales almacenados por cada cuenta del PCGE');

  const verif = await librosEEFFService.verificarIntegridadSaldosContraDiario(EMPRESA_F5, PERIODO_TEST);
  assert(verif.integro, 'Auditoría confirma integridad: Sumas de Saldos Mensuales coinciden 100% con el Libro Diario');
  assert(verif.diferenciaDebe === 0 && verif.diferenciaHaber === 0, 'Diferencia entre saldos mensuales y diario es cero');

  // Simulación de alteración / fraude en saldos mensuales
  if (SALDOS_MENSUALES_MEMORIA.length > 0) {
    const backup = SALDOS_MENSUALES_MEMORIA[0].movimientoDebe;
    SALDOS_MENSUALES_MEMORIA[0].movimientoDebe += 500; // Alteración intencional
    const verifAlterado = await librosEEFFService.verificarIntegridadSaldosContraDiario(EMPRESA_F5, PERIODO_TEST);
    assert(!verifAlterado.integro, 'El sistema detecta inmediatamente cualquier discrepancia o manipulación de saldos');
    assert(verifAlterado.inconsistencias.length > 0, 'Reporta la alerta con el importe exacto desfasado');
    SALDOS_MENSUALES_MEMORIA[0].movimientoDebe = backup; // Restaurar
  }

  console.log('\n======================================================');
  console.log(`📊 RESULTADO SUITE FASE 5: ${passed}/${total} PRUEBAS EXITOSAS`);
  console.log('🎉 TODAS LAS PRUEBAS DE LIBROS, BALANCES Y ESTADOS FINANCIEROS PASARON SATISFACTORIAMENTE.');
  console.log('======================================================\n');
}

ejecutarSuiteFase5().catch(err => {
  console.error('❌ Error fatal en suite Fase 5:', err);
  process.exit(1);
});
