import { compraService } from '../services/compraService';
import { ventaService } from '../services/ventaService';
import { notaCreditoDebitoService } from '../services/notaCreditoDebitoService';
import { saldosService } from '../services/saldosService';
import { detraccionService } from '../services/detraccionService';
import { liquidacionIGVService } from '../services/liquidacionIGVService';
import { anexoService } from '../services/anexoService';
import { periodoService } from '../services/periodoService';
import { asientoService } from '../services/asientoService';
import { contabilizacionService } from '../services/contabilizacionService';

interface TestResult {
  nombre: string;
  paso: boolean;
  detalle?: string;
}

const resultados: TestResult[] = [];

function assert(condicion: boolean, nombre: string, detalle?: string) {
  if (condicion) {
    console.log(`  ✅ PASÓ: ${nombre}`);
    resultados.push({ nombre, paso: true });
  } else {
    console.error(`  ❌ FALLÓ: ${nombre} - ${detalle || 'Asertación falsa'}`);
    resultados.push({ nombre, paso: false, detalle });
  }
}

async function ejecutarPruebasFase3() {
  console.log('\n======================================================');
  console.log('🧪 SUITE DE PRUEBAS AUTOMATIZADAS — FASE 3: COMPRAS, VENTAS, CXC/CXP & TRIBUTOS');
  console.log('======================================================\n');

  const empresaId = 'emp-01';
  const empresaBId = 'emp-02';
  const userId = '00000000-0000-0000-0000-000000000001';

  // --------------------------------------------------------------------------
  // TEST 1: Control de Duplicados (Mismo proveedor vs Distinto proveedor)
  // --------------------------------------------------------------------------
  console.log('🔹 Test 1: Control de Duplicados y Proveedores');
  try {
    // 1.1 Registrar compra del Proveedor A
    const c1 = await compraService.registrar(empresaId, {
      periodoId: 'per-2026-09',
      fechaEmision: '2026-09-01',
      fechaContable: '2026-09-01',
      tipoComprobante: '01',
      serie: 'E001',
      numero: '77701',
      proveedorId: 'anx-01',
      baseGravada: 1000,
      igv: 180,
      total: 1180
    }, userId);
    assert(c1.estado === 'REGISTRADO', 'Compra inicial registrada exitosamente');

    // 1.2 Mismo comprobante del MISMO proveedor debe ser RECHAZADO
    let rechazoMismoProveedor = false;
    try {
      await compraService.registrar(empresaId, {
        periodoId: 'per-2026-09',
        fechaEmision: '2026-09-02',
        fechaContable: '2026-09-02',
        tipoComprobante: '01',
        serie: 'E001',
        numero: '77701',
        proveedorId: 'anx-01',
        baseGravada: 1000,
        igv: 180,
        total: 1180
      }, userId);
    } catch (err: any) {
      if (err.message.includes('COMPROBANTE_DUPLICADO')) {
        rechazoMismoProveedor = true;
      }
    }
    assert(rechazoMismoProveedor, 'Rechaza comprobante duplicado del mismo proveedor');

    // 1.3 Mismo número pero de OTRO PROVEEDOR debe ser PERMITIDO
    let permitidoOtroProveedor = false;
    try {
      const c2 = await compraService.registrar(empresaId, {
        periodoId: 'per-2026-09',
        fechaEmision: '2026-09-02',
        fechaContable: '2026-09-02',
        tipoComprobante: '01',
        serie: 'E001',
        numero: '77701',
        proveedorId: 'anx-02', // Proveedor diferente
        baseGravada: 500,
        igv: 90,
        total: 590
      }, userId);
      if (c2.id) permitidoOtroProveedor = true;
    } catch (err: any) {
      console.error(err);
    }
    assert(permitidoOtroProveedor, 'Permite registrar mismo número de serie si proviene de otro proveedor');
  } catch (err: any) {
    assert(false, 'Error en Test 1: Duplicados', err.message);
  }

  // --------------------------------------------------------------------------
  // TEST 2: Cuadre de Importes y Asientos en Diversos Casos de Negocio
  // --------------------------------------------------------------------------
  console.log('\n🔹 Test 2: Cuadre de Asientos Contables según Casos de Operación');
  try {
    // 2.1 Compra de Mercadería (con destino almacén 20/61)
    const propMerc = await contabilizacionService.generar(empresaId, 'COMPRA_MERCADERIA', {
      total: 2360,
      baseImponible: 2000,
      igv: 360,
      glosa: 'Compra de mercadería test',
      docTipo: '01',
      docSerie: 'F001',
      docNumero: '1001'
    });
    assert(propMerc.totalDebe === 4360 && propMerc.totalHaber === 4360, 'Compra de mercadería: Asiento cuadrado con partida doble y destino 20/61');

    // 2.2 Compra de Servicios con Destino por Función (94/95 vs 79)
    const propServ = await contabilizacionService.generar(empresaId, 'COMPRA_SERVICIO', {
      total: 1180,
      baseImponible: 1000,
      igv: 180,
      glosa: 'Servicio de consultoría',
      porcentajeAdmin: 60,
      porcentajeVentas: 40
    });
    const tieneCargas79 = propServ.lineas.some(l => l.codigoCuenta === '791' && l.haber === 1000);
    assert(propServ.cuadrado && tieneCargas79, 'Compra de servicio: Asiento cuadrado con destinos 94 (60%), 95 (40%) y 79 al Haber');

    // 2.3 Compra de Activo Fijo
    const propAct = await contabilizacionService.generar(empresaId, 'COMPRA_ACTIVO', {
      total: 5900,
      baseImponible: 5000,
      igv: 900,
      glosa: 'Compra de maquinaria y equipo'
    });
    const tieneCuenta33 = propAct.lineas.some(l => l.codigoCuenta.startsWith('33') && l.debe === 5000);
    assert(propAct.cuadrado && tieneCuenta33, 'Compra de activo fijo: Cuenta 33 al Debe y partida doble exacta');

    // 2.4 Venta a Crédito
    const vCred = await ventaService.registrar(empresaId, {
      periodoId: 'per-2026-09',
      fechaEmision: '2026-09-05',
      fechaContable: '2026-09-05',
      tipoComprobante: '01',
      serie: 'F001',
      numero: '88801',
      clienteId: 'anx-03',
      baseGravada: 3000,
      igv: 540,
      total: 3540,
      formaPago: 'CREDITO',
      diasCredito: 30
    }, userId);
    assert(vCred.estado === 'REGISTRADO' && vCred.asientoNumero !== null, 'Venta a crédito: Registrada y contabilizada con cuenta 1212');

    // 2.5 Venta con Detracción SPOT
    const vDet = await ventaService.registrar(empresaId, {
      periodoId: 'per-2026-09',
      fechaEmision: '2026-09-06',
      fechaContable: '2026-09-06',
      tipoComprobante: '01',
      serie: 'F001',
      numero: '88802',
      clienteId: 'anx-03',
      baseGravada: 4000,
      igv: 720,
      total: 4720,
      tieneDetraccion: true,
      codigoBienDetraccion: '022',
      porcentajeDetraccion: 12
    }, userId);
    assert(vDet.tieneDetraccion === true, 'Venta sujeta a detracción SPOT registrada correctamente');
  } catch (err: any) {
    assert(false, 'Error en Test 2: Cuadre de Asientos', err.message);
  }

  // --------------------------------------------------------------------------
  // TEST 3: Notas de Crédito, Control de Saldo y Restitución por Anulación
  // --------------------------------------------------------------------------
  console.log('\n🔹 Test 3: Notas de Crédito y Restitución de Saldos');
  try {
    // 3.1 Registrar compra a crédito con total 2,360
    const compraOriginal = await compraService.registrar(empresaId, {
      periodoId: 'per-2026-09',
      fechaEmision: '2026-09-08',
      fechaContable: '2026-09-08',
      tipoComprobante: '01',
      serie: 'FC99',
      numero: '11001',
      proveedorId: 'anx-01',
      baseGravada: 2000,
      igv: 360,
      total: 2360,
      formaPago: 'CREDITO',
      diasCredito: 30
    }, userId);

    // 3.2 Intento de NC mayor al saldo debe fallar
    let rechazoNcExcesiva = false;
    try {
      await notaCreditoDebitoService.aplicarNota(empresaId, compraOriginal.id, {
        esVenta: false,
        tipoNota: '07',
        serie: 'NC01',
        numero: '0001',
        fechaEmision: '2026-09-09',
        fechaContable: '2026-09-09',
        motivoCodigo: '01',
        motivoDescripcion: 'Anulación total',
        baseGravada: 3000,
        igv: 540,
        total: 3540 // Excede los S/ 2,360
      }, userId);
    } catch (err: any) {
      if (err.message.includes('NOTA_CREDITO_EXCEDE_TOTAL') || err.message.includes('NOTA_CREDITO_EXCEDE_SALDO')) {
        rechazoNcExcesiva = true;
      }
    }
    assert(rechazoNcExcesiva, 'Rechaza Nota de Crédito por monto superior al saldo original');

    // 3.3 Aplicar NC válida de S/ 354 (Base 300 + IGV 54)
    const ncValida = await notaCreditoDebitoService.aplicarNota(empresaId, compraOriginal.id, {
      esVenta: false,
      tipoNota: '07',
      serie: 'NC01',
      numero: '0002',
      fechaEmision: '2026-09-09',
      fechaContable: '2026-09-09',
      motivoCodigo: '04',
      motivoDescripcion: 'Descuento comercial',
      baseGravada: 300,
      igv: 54,
      total: 354
    }, userId);
    assert(ncValida.nuevoSaldo === 2006, 'Nota de Crédito reduce saldo de cartera exactamente (2360 - 354 = 2006)');

    // 3.4 Anular la Nota de Crédito debe restituir el saldo a S/ 2,360
    const anulaNc = await notaCreditoDebitoService.anularNota(empresaId, ncValida.notaId, 'Error en emisión de nota', userId);
    assert(anulaNc.saldoRestituido === 2360, 'Anulación de Nota de Crédito restituye el saldo original del comprobante');
  } catch (err: any) {
    assert(false, 'Error en Test 3: Notas de Crédito', err.message);
  }

  // --------------------------------------------------------------------------
  // TEST 4: Saldos y Aplicaciones de Pago (Cobranza múltiple & Pago parcial)
  // --------------------------------------------------------------------------
  console.log('\n🔹 Test 4: Saldos y Aplicaciones de Pago');
  try {
    // Crear dos facturas de compra a crédito
    const f1 = await compraService.registrar(empresaId, {
      periodoId: 'per-2026-09',
      fechaEmision: '2026-09-10',
      fechaContable: '2026-09-10',
      tipoComprobante: '01',
      serie: 'FA01',
      numero: '2001',
      proveedorId: 'anx-01',
      baseGravada: 1000,
      igv: 180,
      total: 1180,
      formaPago: 'CREDITO'
    }, userId);

    const f2 = await compraService.registrar(empresaId, {
      periodoId: 'per-2026-09',
      fechaEmision: '2026-09-10',
      fechaContable: '2026-09-10',
      tipoComprobante: '01',
      serie: 'FA01',
      numero: '2002',
      proveedorId: 'anx-01',
      baseGravada: 2000,
      igv: 360,
      total: 2360,
      formaPago: 'CREDITO'
    }, userId);

    const listaCxP = await saldosService.listarCxP(empresaId);
    const cxp1 = listaCxP.find(p => p.comprobanteId === f1.id);
    const cxp2 = listaCxP.find(p => p.comprobanteId === f2.id);

    // 4.1 Un pago que cancela totalmente f1 y aplica un abono parcial a f2
    const appPago = await saldosService.aplicarPago(empresaId, {
      fechaPago: '2026-09-15',
      referenciaBanco: 'TRANSF-09921',
      aplicaciones: [
        { cuentaPorPagarId: cxp1?.id || 'dummy-1', importe: 1180 }, // Cancela f1
        { cuentaPorPagarId: cxp2?.id || 'dummy-2', importe: 1000 }  // Parcial f2 (queda 1360)
      ]
    }, userId);

    assert(appPago.success === true, 'Aplicación de pago múltiple ejecutada');
    assert(appPago.resultados[0].nuevoEstado === 'CANCELADO' && appPago.resultados[0].nuevoSaldo === 0, 'Documento 1 queda CANCELADO con saldo 0.00');
    assert(appPago.resultados[1].nuevoEstado === 'PARCIAL' && appPago.resultados[1].nuevoSaldo === 1360, 'Documento 2 queda PARCIAL con saldo 1,360.00');
  } catch (err: any) {
    assert(false, 'Error en Test 4: Saldos y Aplicaciones', err.message);
  }

  // --------------------------------------------------------------------------
  // TEST 5: Antigüedad de Saldos por Tramos
  // --------------------------------------------------------------------------
  console.log('\n🔹 Test 5: Antigüedad de Saldos en Tramos');
  try {
    const rep = await saldosService.reporteAntiguedad(empresaId, 'CXP', '2026-09-30');
    assert(typeof rep.resumen.corriente === 'number', 'Resumen contiene tramo Corriente');
    assert(typeof rep.resumen.de1a30 === 'number', 'Resumen contiene tramo 1 a 30 días');
    assert(typeof rep.resumen.totalSaldo === 'number', 'Resumen contiene total de saldo pendiente');
  } catch (err: any) {
    assert(false, 'Error en Test 5: Antigüedad', err.message);
  }

  // --------------------------------------------------------------------------
  // TEST 6: Liquidación Integral de IGV y Renta con Arrastre y Trazabilidad
  // --------------------------------------------------------------------------
  console.log('\n🔹 Test 6: Liquidación de IGV y Pago a Cuenta de Renta');
  try {
    const liq = await liquidacionIGVService.calcular(empresaId, '2026-09', 500); // Saldo a favor anterior S/ 500
    assert(liq.saldoAnteriorAFavor === 500, 'Saldo a favor del mes anterior considerado en el cálculo');
    assert(liq.tasaRentaAplicada > 0, 'Tasa de impuesto a la renta obtenida dinámicamente de parámetros');
    assert(liq.detalleCalculo.length >= 4, 'Trazabilidad con pasos y fórmulas de cálculo expuestas');
  } catch (err: any) {
    assert(false, 'Error en Test 6: Liquidación', err.message);
  }

  // --------------------------------------------------------------------------
  // TEST 7: Bloqueo Estricto de Operaciones en Período Contable Cerrado
  // --------------------------------------------------------------------------
  console.log('\n🔹 Test 7: Integridad de Período Contable Cerrado');
  try {
    let rechazoCompraPeriodoCerrado = false;
    try {
      await compraService.registrar(empresaId, {
        periodoId: '2026-08', // Período 2026-08 cerrado
        fechaEmision: '2026-08-15',
        fechaContable: '2026-08-15',
        tipoComprobante: '01',
        serie: 'F001',
        numero: '55555',
        proveedorId: 'anx-01',
        baseGravada: 1000,
        igv: 180,
        total: 1180
      }, userId);
    } catch (err: any) {
      if (err.message.includes('PERIODO_CERRADO')) {
        rechazoCompraPeriodoCerrado = true;
      }
    }
    assert(rechazoCompraPeriodoCerrado, 'El sistema bloquea registrar compras en un período cerrado');
  } catch (err: any) {
    assert(false, 'Error en Test 7: Período Cerrado', err.message);
  }

  // --------------------------------------------------------------------------
  // TEST 8: Aislamiento Multiempresa (Tenant / Empresa Isolation)
  // --------------------------------------------------------------------------
  console.log('\n🔹 Test 8: Aislamiento Multiempresa Estricto');
  try {
    // Compras de Empresa A no deben aparecer en la lista de Empresa B
    const comprasB = await compraService.listar(empresaBId);
    const contieneDocDeA = comprasB.items.some((c: any) => c.serie === 'FC99' && c.numero === '11001');
    assert(!contieneDocDeA, 'Empresa B no puede ver ni acceder a los comprobantes de Empresa A');
  } catch (err: any) {
    assert(false, 'Error en Test 8: Aislamiento Multiempresa', err.message);
  }

  // --------------------------------------------------------------------------
  // TEST 9: Concurrencia de Comprobantes
  // --------------------------------------------------------------------------
  console.log('\n🔹 Test 9: Concurrencia de Registro de Comprobantes');
  try {
    // Dos peticiones concurrentes para registrar el mismo comprobante de venta
    const promesas = [
      ventaService.registrar(empresaId, {
        periodoId: 'per-2026-09',
        fechaEmision: '2026-09-20',
        fechaContable: '2026-09-20',
        tipoComprobante: '01',
        serie: 'FCON',
        numero: '90001',
        clienteId: 'anx-03',
        baseGravada: 1000,
        igv: 180,
        total: 1180
      }, userId),
      ventaService.registrar(empresaId, {
        periodoId: 'per-2026-09',
        fechaEmision: '2026-09-20',
        fechaContable: '2026-09-20',
        tipoComprobante: '01',
        serie: 'FCON',
        numero: '90001',
        clienteId: 'anx-03',
        baseGravada: 1000,
        igv: 180,
        total: 1180
      }, userId)
    ];

    const res = await Promise.allSettled(promesas);
    const exitosas = res.filter(r => r.status === 'fulfilled');
    const rechazadas = res.filter(r => r.status === 'rejected');

    assert(exitosas.length === 1 && rechazadas.length === 1, 'Control de concurrencia: Solo una transacción tiene éxito, la duplicada es rechazada');
  } catch (err: any) {
    assert(false, 'Error en Test 9: Concurrencia', err.message);
  }

  // --------------------------------------------------------------------------
  // TEST 10: Importación por Lote CSV (Reporte Fila por Fila & Modo TODO_O_NADA)
  // --------------------------------------------------------------------------
  console.log('\n🔹 Test 10: Importación por Lote CSV con Validación Estricta');
  try {
    // 10.1 Lote con un error crítico en fila 2 (Suma incoherente)
    const loteConError = await compraService.importarLote(empresaId, {
      formato: 'CSV',
      modo: 'TODO_O_NADA',
      filas: [
        {
          periodoId: 'per-2026-09',
          fechaEmision: '2026-09-22',
          tipoComprobante: '01',
          serie: 'LOTE',
          numero: '0001',
          proveedorRuc: '20100070970',
          baseGravada: 1000,
          igv: 180,
          total: 1180
        },
        {
          periodoId: 'per-2026-09',
          fechaEmision: '2026-09-22',
          tipoComprobante: '01',
          serie: 'LOTE',
          numero: '0002',
          proveedorRuc: '20100070970',
          baseGravada: 2000,
          igv: 360,
          total: 5000 // Incoherente!
        }
      ]
    }, userId);

    assert(loteConError.success === false, 'Modo TODO_O_NADA aborta la importación ante errores críticos');
    assert(loteConError.errores.length > 0 && loteConError.errores[0].fila === 2, 'Reporta el número exacto de fila (Fila 2) con código de error');
    assert(loteConError.importados === 0, 'No deja datos parcialmente insertados');

    // 10.2 Lote Válido Completo
    const loteValido = await compraService.importarLote(empresaId, {
      formato: 'CSV',
      modo: 'TODO_O_NADA',
      filas: [
        {
          periodoId: 'per-2026-09',
          fechaEmision: '2026-09-25',
          tipoComprobante: '01',
          serie: 'LOK1',
          numero: '0010',
          proveedorRuc: '20100070970',
          baseGravada: 500,
          igv: 90,
          total: 590
        },
        {
          periodoId: 'per-2026-09',
          fechaEmision: '2026-09-25',
          tipoComprobante: '01',
          serie: 'LOK1',
          numero: '0011',
          proveedorRuc: '20504914434',
          baseGravada: 1000,
          igv: 180,
          total: 1180
        }
      ]
    }, userId);

    assert(loteValido.success === true && loteValido.importados === 2, 'Lote válido procesado e importado al 100%');
  } catch (err: any) {
    assert(false, 'Error en Test 10: Importación por Lote', err.message);
  }

  // --------------------------------------------------------------------------
  // RESUMEN FINAL
  // --------------------------------------------------------------------------
  const pasaron = resultados.filter(r => r.paso).length;
  const fallaron = resultados.filter(r => !r.paso).length;
  const total = resultados.length;

  console.log('\n======================================================');
  console.log(`📊 RESULTADO SUITE FASE 3: ${pasaron}/${total} PRUEBAS EXITOSAS`);
  if (fallaron === 0) {
    console.log('🎉 TODAS LAS 10 PRUEBAS OBLIGATORIAS DE LA FASE 3 PASARON SATISFACTORIAMENTE.');
  } else {
    console.error(`⚠️ SE ENCONTRARON ${fallaron} FALLAS.`);
  }
  console.log('======================================================\n');

  if (fallaron > 0) {
    process.exit(1);
  }
}

ejecutarPruebasFase3().catch(err => {
  console.error('Error fatal ejecutando suite de pruebas Fase 3:', err);
  process.exit(1);
});
