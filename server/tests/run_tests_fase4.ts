import { tesoreriaService, CUENTAS_FINANCIERAS_MEMORIA } from '../services/tesoreriaService';
import { conciliacionService } from '../services/conciliacionService';
import { honorariosService } from '../services/honorariosService';
import { planillaService, TRABAJADORES_MEMORIA, PLANILLAS_MEMORIA } from '../services/planillaService';
import { asientoService, ASIENTOS_MEMORIA } from '../services/asientoService';
import { periodoService } from '../services/periodoService';
import { parametroRepository } from '../repositories/parametroRepository';
import { CXC_MEMORIA } from '../services/ventaService';
import { CXP_MEMORIA } from '../services/compraService';
import { Money } from '../utils/decimal';

async function ejecutarSuiteFase4() {
  console.log('======================================================');
  console.log('🧪 SUITE DE PRUEBAS AUTOMATIZADAS — FASE 4: TESORERÍA, CONCILIACIÓN, HONORARIOS & PLANILLA');
  console.log('======================================================\n');

  let passed = 0;
  let total = 0;

  function assert(cond: boolean, desc: string) {
    total++;
    if (cond) {
      console.log(`  ✅ PASÓ: ${desc}`);
      passed++;
    } else {
      console.error(`  ❌ FALLÓ: ${desc}`);
      throw new Error(`Fallo en prueba: ${desc}`);
    }
  }

  const EMPRESA_A = '00000000-0000-0000-0000-000000000001';
  const EMPRESA_B = '00000000-0000-0000-0000-000000000002';
  const USER_ID = '00000000-0000-0000-0000-000000000001';

  // Configurar períodos abiertos
  await periodoService.abrirPeriodo(EMPRESA_A, '2026-09', USER_ID);
  await periodoService.abrirPeriodo(EMPRESA_B, '2026-09', USER_ID);

  // --------------------------------------------------------------------------
  // TEST 1: Cobro múltiple, pago parcial y anticipos
  // --------------------------------------------------------------------------
  console.log('🔹 Test 1: Cobro Múltiple de Facturas, Pago Parcial y Anticipo');
  {
    // Crear 2 facturas en cartera de cobros (CxC)
    const doc1 = {
      id: `cxc-t1-1`,
      empresaId: EMPRESA_A,
      comprobanteId: 'v-01',
      clienteId: 'cli-01',
      clienteNombre: 'Cliente Corp',
      clienteRuc: '20100100101',
      serieNumero: 'F001-100',
      importeOriginal: 1000.00,
      saldo: 1000.00,
      moneda: 'PEN' as const,
      fechaEmision: '2026-09-02',
      fechaVencimiento: '2026-09-30',
      diasCredito: 30,
      estado: 'PENDIENTE' as 'PENDIENTE' | 'PARCIAL' | 'CANCELADO'
    };
    const doc2 = {
      id: `cxc-t1-2`,
      empresaId: EMPRESA_A,
      comprobanteId: 'v-02',
      clienteId: 'cli-01',
      clienteNombre: 'Cliente Corp',
      clienteRuc: '20100100101',
      serieNumero: 'F001-101',
      importeOriginal: 1500.00,
      saldo: 1500.00,
      moneda: 'PEN' as const,
      fechaEmision: '2026-09-05',
      fechaVencimiento: '2026-09-30',
      diasCredito: 30,
      estado: 'PENDIENTE' as 'PENDIENTE' | 'PARCIAL' | 'CANCELADO'
    };
    CXC_MEMORIA.push(doc1, doc2);

    const cuentaBcp = CUENTAS_FINANCIERAS_MEMORIA.find(c => c.id === 'cta-bcp-soles-01')!;
    const saldoInicialCta = cuentaBcp.saldoActual;

    // Ingreso por S/ 3,000 que cancela doc1 (1,000), paga parcial doc2 (1,000) y deja S/ 1,000 de anticipo
    const ingreso = await tesoreriaService.registrarMovimiento(EMPRESA_A, {
      periodoId: 'per-2026-09',
      cuentaFinancieraId: cuentaBcp.id,
      fecha: '2026-09-10',
      tipo: 'INGRESO',
      medioPago: '003',
      numeroOperacion: 'OP-123456',
      anexoId: 'cli-01',
      importe: 3000.00,
      glosa: 'Cobranza factura F001-100 y F001-101 con saldo anticipo',
      aplicaciones: [
        { documentoId: doc1.id, importeAplicado: 1000.00 },
        { documentoId: doc2.id, importeAplicado: 1000.00 }
      ]
    }, USER_ID);

    assert(doc1.estado === 'CANCELADO' && doc1.saldo === 0.00, 'Factura 1 cancelada con saldo 0.00');
    assert(doc2.estado === 'PARCIAL' && doc2.saldo === 500.00, 'Factura 2 amortizada parcialmente (saldo S/ 500.00)');
    assert(ingreso.saldoSinAplicar === 1000.00, 'Saldo remanente registrado como anticipo sin aplicar (S/ 1,000.00)');
    assert(cuentaBcp.saldoActual === saldoInicialCta + 3000.00, 'Saldo de la cuenta financiera actualizado exactamente (+ S/ 3,000.00)');
  }

  // --------------------------------------------------------------------------
  // TEST 2: Transferencia entre cuentas con diferencia de cambio
  // --------------------------------------------------------------------------
  console.log('\n🔹 Test 2: Transferencia Entre Cuentas Multimoneda y Partida Doble');
  {
    const ctaUsd = CUENTAS_FINANCIERAS_MEMORIA.find(c => c.moneda === 'USD')!;
    const ctaPen = CUENTAS_FINANCIERAS_MEMORIA.find(c => c.moneda === 'PEN')!;

    const saldoUsdAntes = ctaUsd.saldoActual;
    const saldoPenAntes = ctaPen.saldoActual;

    // Transferir $1,000 USD a Soles con TC 3.75 -> S/ 3,750 acreditados S/ 3,760 (Ganancia DC S/ 10)
    const transf = await tesoreriaService.registrarTransferencia(EMPRESA_A, {
      periodoId: 'per-2026-09',
      cuentaOrigenId: ctaUsd.id,
      cuentaDestinoId: ctaPen.id,
      fecha: '2026-09-12',
      importeOrigen: 1000.00,
      importeDestino: 3760.00,
      tipoCambio: 3.75,
      glosa: 'Venta de dólares a cuenta en Soles'
    }, USER_ID);

    assert(transf.tipoDiferencia === 'GANANCIA', 'Detecta correctamente ganancia por diferencia de cambio');
    assert(transf.diferenciaCambio === 10.00, 'Monto de diferencia de cambio exacto S/ 10.00');

    // Verificar asiento contable generado
    const asiento = ASIENTOS_MEMORIA.find(a => a.id === transf.asientoId)!;
    assert(asiento !== undefined, 'Asiento contable de transferencia generado');
    assert(asiento.totalDebe === asiento.totalHaber, 'Partida doble estrictamente balanceada (Debe = Haber)');
    assert(asiento.detalles.some((l: any) => l.cuentaId?.includes('776') || l.codigoCuenta?.includes('776')), 'Línea de ganancia por diferencia de cambio en cuenta 776');
  }

  // --------------------------------------------------------------------------
  // TEST 3: Anulación de movimiento, reversión y extorno vinculado
  // --------------------------------------------------------------------------
  console.log('\n🔹 Test 3: Anulación con Reversión de Aplicaciones y Extorno Contable');
  {
    const docPagar = {
      id: `cxp-t3-1`,
      empresaId: EMPRESA_A,
      comprobanteId: 'c-01',
      proveedorId: 'prv-01',
      proveedorNombre: 'Proveedor Global',
      proveedorRuc: '20556677889',
      serieNumero: 'F002-500',
      importeOriginal: 800.00,
      saldo: 800.00,
      moneda: 'PEN' as const,
      fechaEmision: '2026-09-08',
      fechaVencimiento: '2026-09-28',
      diasCredito: 20,
      estado: 'PENDIENTE' as 'PENDIENTE' | 'PARCIAL' | 'CANCELADO'
    };
    CXP_MEMORIA.push(docPagar);

    const cta = CUENTAS_FINANCIERAS_MEMORIA[0];
    const saldoAntes = cta.saldoActual;

    // Registrar pago
    const egreso = await tesoreriaService.registrarMovimiento(EMPRESA_A, {
      periodoId: 'per-2026-09',
      cuentaFinancieraId: cta.id,
      fecha: '2026-09-14',
      tipo: 'EGRESO',
      medioPago: '003',
      numeroOperacion: 'PAGO-888',
      anexoId: 'prv-01',
      importe: 800.00,
      glosa: 'Pago factura F002-500',
      aplicaciones: [{ documentoId: docPagar.id, importeAplicado: 800.00 }]
    }, USER_ID);

    assert(docPagar.estado === 'CANCELADO' && docPagar.saldo === 0.00, 'Documento queda CANCELADO tras el pago');

    // Anular el pago
    await tesoreriaService.anularMovimiento(EMPRESA_A, egreso.id, 'Error de digitación en cuenta', USER_ID);

    assert(docPagar.estado === 'PENDIENTE' && docPagar.saldo === 800.00, 'Reversión exitosa: saldo del documento restituido a S/ 800.00');
    assert(cta.saldoActual === saldoAntes, 'Saldo de la cuenta bancaria restituido íntegramente');

    const asientoOriginal = ASIENTOS_MEMORIA.find(a => a.id === egreso.asientoId)!;
    assert(asientoOriginal.estado === 'ANULADO', 'Asiento original marcado como ANULADO');
    assert(asientoOriginal.asientoExtornoId !== undefined, 'Asiento de extorno vinculado correctamente');
  }

  // --------------------------------------------------------------------------
  // TEST 4: Conciliación bancaria, extracto y detección de duplicados
  // --------------------------------------------------------------------------
  console.log('\n🔹 Test 4: Conciliación Bancaria y Coincidencias Automáticas');
  {
    const cta = CUENTAS_FINANCIERAS_MEMORIA[0];

    // Registrar un movimiento conocido en libros
    const movLibro = await tesoreriaService.registrarMovimiento(EMPRESA_A, {
      periodoId: 'per-2026-09',
      cuentaFinancieraId: cta.id,
      fecha: '2026-09-18',
      tipo: 'INGRESO',
      medioPago: '003',
      numeroOperacion: 'DEP-9988',
      importe: 4500.00,
      glosa: 'Cobranza cliente mayorista'
    }, USER_ID);

    // Importar extracto con la misma operación
    const extracto = await conciliacionService.importarExtracto(EMPRESA_A, cta.id, {
      nombreArchivo: 'extracto_bcp_setiembre_2026.csv',
      lineas: [
        { fecha: '2026-09-18', descripcion: 'ABONO TRANSF', referencia: 'DEP-9988', monto: 4500.00, saldo: 54500.00 }
      ],
      saldoFinal: 54500.00
    }, USER_ID);

    assert(extracto.lineas.length === 1, 'Extracto bancario importado con 1 línea');

    // Intentar importar exactamente el mismo extracto -> debe rechazar por duplicado
    let rechazoDuplicado = false;
    try {
      await conciliacionService.importarExtracto(EMPRESA_A, cta.id, {
        nombreArchivo: 'extracto_bcp_setiembre_2026.csv',
        lineas: [
          { fecha: '2026-09-18', descripcion: 'ABONO TRANSF', referencia: 'DEP-9988', monto: 4500.00, saldo: 54500.00 }
        ]
      }, USER_ID);
    } catch (e: any) {
      if (e.message.includes('EXTRACTO_DUPLICADO')) rechazoDuplicado = true;
    }
    assert(rechazoDuplicado, 'Extracto bancario duplicado rechazado correctamente');

    // Obtener estado de conciliación
    const estado = await conciliacionService.obtenerEstadoConciliacion(EMPRESA_A, cta.id, 'per-2026-09', '2026-09-30');
    assert(estado.coincidenciasSugeridas.length > 0, 'Sugerencia automática de coincidencia identificada');
    assert(estado.coincidenciasSugeridas[0].score === 100, 'Score 100% por coincidencia de monto, fecha y referencia');

    // Conciliar partida
    await conciliacionService.conciliar(EMPRESA_A, extracto.lineas[0].id, movLibro.id, USER_ID);
    assert(movLibro.conciliado === true, 'Movimiento en libros marcado como conciliado');
  }

  // --------------------------------------------------------------------------
  // TEST 5: Recibos por honorarios con umbral, suspensión y parámetros
  // --------------------------------------------------------------------------
  console.log('\n🔹 Test 5: Honorarios de 4ta Categoría, Umbral y Suspensión');
  {
    // Caso A: Honorario de S/ 1,200 (Menor a S/ 1,500) -> Retención 0
    const rhMenor = await honorariosService.registrarRecibo(EMPRESA_A, {
      periodoId: 'per-2026-09',
      proveedorId: 'prv-abogado-01',
      serie: 'E001',
      numero: '12',
      fechaEmision: '2026-09-15',
      importeBruto: 1200.00,
      glosa: 'Asesoría legal básica'
    }, USER_ID);

    assert(rhMenor.retencion === 0.00, 'Honorario menor a S/ 1,500 no sufre retención (S/ 0.00)');
    assert(rhMenor.netoPagar === 1200.00, 'Neto a pagar coincide con el total bruto (S/ 1,200.00)');

    // Caso B: Honorario de S/ 2,500 -> Retención 8% = S/ 200.00
    const rhMayor = await honorariosService.registrarRecibo(EMPRESA_A, {
      periodoId: 'per-2026-09',
      proveedorId: 'prv-auditor-01',
      serie: 'E001',
      numero: '13',
      fechaEmision: '2026-09-16',
      importeBruto: 2500.00,
      glosa: 'Auditoría tributaria externa'
    }, USER_ID);

    assert(rhMayor.retencion === 200.00, 'Honorario mayor a S/ 1,500 retiene el 8% exacto (S/ 200.00)');
    assert(rhMayor.netoPagar === 2300.00, 'Neto a pagar calculado correctamente (S/ 2,300.00)');

    // Caso C: Honorario de S/ 3,000 con Suspensión de Retenciones Acreditada -> Retención 0
    const rhSuspendido = await honorariosService.registrarRecibo(EMPRESA_A, {
      periodoId: 'per-2026-09',
      proveedorId: 'prv-ingeniero-01',
      serie: 'E001',
      numero: '14',
      fechaEmision: '2026-09-17',
      importeBruto: 3000.00,
      suspensionCuarta: true,
      numeroResolucionSuspension: 'RES-SUNAT-00918273',
      vigenciaSuspensionDesde: '2026-01-01',
      vigenciaSuspensionHasta: '2026-12-31',
      glosa: 'Consultoría en infraestructura'
    }, USER_ID);

    assert(rhSuspendido.retencion === 0.00, 'Con suspensión acreditada vigente no aplica retención (S/ 0.00)');
    assert(rhSuspendido.netoPagar === 3000.00, 'Neto a pagar íntegro al proveedor suspendido (S/ 3,000.00)');

    // Verificar asiento contable de Honorario
    const asientoRh = ASIENTOS_MEMORIA.find(a => a.id === rhMayor.asientoId)!;
    assert(asientoRh.totalDebe === asientoRh.totalHaber, 'Asiento de honorario estrictamente cuadrado');
    assert(asientoRh.detalles.some((l: any) => l.cuentaId?.includes('40172') || l.codigoCuenta?.includes('40172')), 'Cuenta 40172 Renta de 4ta registrada en pasivo');
  }

  // --------------------------------------------------------------------------
  // TEST 6: Cálculo de planilla con ONP, AFP y Asignación Familiar
  // --------------------------------------------------------------------------
  console.log('\n🔹 Test 6: Planilla de Remuneraciones, Aportes y Contabilización');
  {
    // Trabajador 1: Carlos Mendoza (S/ 3,500 + Asig Fam S/ 102.50 = S/ 3,602.50) con ONP (13%)
    // ONP 13% = S/ 468.33, EsSalud 9% = S/ 324.23, Neto = S/ 3,134.17
    // Trabajador 2: Mariana Vargas (S/ 2,800.00) con AFP Integra (Fondo 10% = 280, Com Flujo 1.55% = 43.40, Seguro 1.84% = 51.52)
    // Total Desc AFP = 374.92, EsSalud 9% = 252.00, Neto = S/ 2,425.08

    const planilla = await planillaService.calcularPlanilla(EMPRESA_A, 'per-2026-09', '2026-09', USER_ID);
    assert(planilla.lineas.length === 2, 'Planilla procesó a los 2 colaboradores de prueba');

    const l1 = planilla.lineas.find(l => l.trabajadorId === 'trab-01')!;
    assert(l1.asignacionFamiliar === 102.50, 'Asignación familiar calculada correctamente (10% de RMV = S/ 102.50)');
    assert(l1.totalRemuneracion === 3602.50, 'Remuneración bruta con asignación familiar exacta (S/ 3,602.50)');
    assert(l1.aporteObligatorioPension === 468.33, 'Aporte ONP 13% exacto (S/ 468.33)');
    assert(l1.aporteEssalud === 324.23, 'Aporte patronal EsSalud 9% exacto (S/ 324.23)');

    const l2 = planilla.lineas.find(l => l.trabajadorId === 'trab-02')!;
    assert(l2.asignacionFamiliar === 0.00, 'Trabajador sin asignación familiar registra S/ 0.00');
    assert(l2.aporteObligatorioPension === 280.00, 'Fondo AFP 10% exacto (S/ 280.00)');
    assert(l2.comisionAfp === 43.40, 'Comisión AFP Integra sobre flujo exacta (1.55% = S/ 43.40)');
    assert(l2.primaSeguroAfp === 51.52, 'Prima de seguro AFP exacta (1.84% = S/ 51.52)');

    // Contabilizar planilla
    const contRes = await planillaService.contabilizarPlanilla(EMPRESA_A, planilla.id, USER_ID);
    assert(contRes.success === true, 'Planilla contabilizada exitosamente');

    const asientoPlanilla = ASIENTOS_MEMORIA.find(a => a.id === contRes.asientoId)!;
    assert(asientoPlanilla.totalDebe === asientoPlanilla.totalHaber, 'Asiento de planilla balanceado sin descuadre (Debe = Haber)');

    // Bloqueo de recalcular mientras esté contabilizada
    let bloqueoRecalculo = false;
    try {
      await planillaService.calcularPlanilla(EMPRESA_A, 'per-2026-09', '2026-09', USER_ID);
    } catch (e: any) {
      if (e.message.includes('PLANILLA_CONTABILIZADA')) bloqueoRecalculo = true;
    }
    assert(bloqueoRecalculo, 'Sistema bloquea recalcular planilla una vez contabilizada');
  }

  // --------------------------------------------------------------------------
  // TEST 7: Integridad de período cerrado
  // --------------------------------------------------------------------------
  console.log('\n🔹 Test 7: Bloqueo de Operaciones en Período Cerrado');
  {
    await periodoService.cerrarPeriodo(EMPRESA_A, '2026-09', USER_ID);

    let bloqueaTesoreria = false;
    try {
      await tesoreriaService.registrarMovimiento(EMPRESA_A, {
        periodoId: 'per-2026-09',
        cuentaFinancieraId: CUENTAS_FINANCIERAS_MEMORIA[0].id,
        fecha: '2026-09-25',
        tipo: 'INGRESO',
        medioPago: '003',
        importe: 500.00,
        glosa: 'Cobro extemporáneo'
      }, USER_ID);
    } catch (e: any) {
      if (e.message.includes('PERIODO_CERRADO')) bloqueaTesoreria = true;
    }
    assert(bloqueaTesoreria, 'Período cerrado bloquea registros de tesorería');

    let bloqueaHonorarios = false;
    try {
      await honorariosService.registrarRecibo(EMPRESA_A, {
        periodoId: 'per-2026-09',
        proveedorId: 'prv-01',
        serie: 'E001',
        numero: '99',
        fechaEmision: '2026-09-26',
        importeBruto: 1800.00,
        glosa: 'Honorario en mes cerrado'
      }, USER_ID);
    } catch (e: any) {
      if (e.message.includes('PERIODO_CERRADO')) bloqueaHonorarios = true;
    }
    assert(bloqueaHonorarios, 'Período cerrado bloquea recibos por honorarios');

    // Reabrir para permitir pruebas de aislamiento
    await periodoService.reabrirPeriodo(EMPRESA_A, '2026-09', 'ADMINISTRADOR', USER_ID);
  }

  // --------------------------------------------------------------------------
  // TEST 8: Aislamiento Multiempresa y Permisos de Datos Sensibles
  // --------------------------------------------------------------------------
  console.log('\n🔹 Test 8: Aislamiento Multiempresa y Protección de Datos Sensibles');
  {
    // Aislamiento: Empresa B no ve cuentas ni trabajadores de Empresa A
    const cuentasEmpresaB = await tesoreriaService.listarCuentas(EMPRESA_B);
    const tieneCuentasDeA = cuentasEmpresaB.some(c => c.empresaId === EMPRESA_A);
    assert(!tieneCuentasDeA, 'Empresa B no puede ver ni acceder a las cuentas financieras de Empresa A');

    const trabsEmpresaB = await planillaService.listarTrabajadores(EMPRESA_B, true);
    const tieneTrabsDeA = trabsEmpresaB.some(t => t.empresaId === EMPRESA_A);
    assert(!tieneTrabsDeA, 'Empresa B no puede ver a los colaboradores de Empresa A');

    // Protección de datos sensibles sin permiso
    const trabsSinPermiso = await planillaService.listarTrabajadores(EMPRESA_A, false);
    const trabajadorEnmascarado = trabsSinPermiso[0];

    assert(trabajadorEnmascarado.direccion === '*** INFORMACIÓN CONFIDENCIAL ***', 'Dirección física enmascarada para usuario sin permiso');
    assert(trabajadorEnmascarado.telefono === '*** PRIVADO ***', 'Teléfono protegido contra fuga de información');
    assert(trabajadorEnmascarado.cuentaBancoSueldo === '*** PROTEGIDO ***', 'Número de cuenta bancaria confidencial oculto');
  }

  console.log('\n======================================================');
  console.log(`📊 RESULTADO SUITE FASE 4: ${passed}/${total} PRUEBAS EXITOSAS`);
  if (passed === total) {
    console.log('🎉 TODAS LAS 8 PRUEBAS OBLIGATORIAS DE LA FASE 4 PASARON SATISFACTORIAMENTE.');
  }
  console.log('======================================================\n');
}

ejecutarSuiteFase4().catch(err => {
  console.error('❌ Error fatal en suite de pruebas:', err);
  process.exit(1);
});
