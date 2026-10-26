import assert from 'assert';
import { asientoService, ASIENTOS_MEMORIA } from '../services/asientoService';
import { ventaService, VENTAS_MEMORIA, CXC_MEMORIA } from '../services/ventaService';
import { saldosService } from '../services/saldosService';
import { CXP_MEMORIA } from '../services/compraService';
import { anexoService } from '../services/anexoService';
import { periodoService } from '../services/periodoService';
import { detraccionService, DETRACCIONES_MEMORIA } from '../services/detraccionService';
import { Money } from '../utils/decimal';

async function ejecutarSuiteCoberturaFase13() {
  console.log('========================================================================');
  console.log('🧪 SUITE DE PRUEBAS DE COMPORTAMIENTO Y COBERTURA FASE 13');
  console.log('   (asientoService, ventaService, saldosService, periodoService, detraccionService)');
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

  const EMPRESA_COB = '00000000-0000-0000-0000-000000000099';
  const PERIODO_COB = '2026-09';
  const USER_COB = 'usr-admin-cob';
  const USER_AUX = 'usr-asistente-cob';

  // Configurar períodos base
  await periodoService.abrirPeriodo(EMPRESA_COB, PERIODO_COB, USER_COB);
  await periodoService.abrirPeriodo(EMPRESA_COB, '2026-10', USER_COB);

  // ==========================================================================
  // BLOQUE 1: ASIENTO SERVICE (Comportamiento completo de ciclo contable)
  // ==========================================================================
  console.log('🔹 Bloque 1: Pruebas de Comportamiento de asientoService');
  {
    // 1.1 Crear borrador cuadrado
    const b1 = await asientoService.crearBorrador(EMPRESA_COB, {
      periodoId: `per-${PERIODO_COB}`,
      subdiarioId: '01',
      fecha: '2026-09-05',
      glosa: 'Asiento inicial de prueba borrador',
      moneda: 'PEN',
      tipoCambio: 1.0,
      detalles: [
        { linea: 1, cuentaId: '1011', debe: 1200, haber: 0 },
        { linea: 2, cuentaId: '7011', debe: 0, haber: 1200 }
      ]
    }, USER_COB);
    testAssert(b1.id !== undefined, 'crearBorrador genera ID único');
    testAssert(b1.estado === 'BORRADOR', 'Asiento nace en estado BORRADOR');
    testAssert(b1.numero === null, 'Borrador no consume correlativo contable oficial');

    // 1.2 Actualizar borrador con control de versión concurrente (optimistic locking)
    const b1Actualizado = await asientoService.actualizarBorrador(b1.id, {
      periodoId: `per-${PERIODO_COB}`,
      subdiarioId: '01',
      fecha: '2026-09-06',
      glosa: 'Asiento modificado con nueva glosa',
      moneda: 'PEN',
      detalles: [
        { linea: 1, cuentaId: '1011', debe: 1500, haber: 0 },
        { linea: 2, cuentaId: '7011', debe: 0, haber: 1500 }
      ]
    }, USER_COB, 1);
    testAssert(b1Actualizado.version === 2, 'actualizarBorrador incrementa versión a 2');
    testAssert(b1Actualizado.totalDebe === 1500, 'Monto actualizado correctamente a 1500');

    // 1.3 Intento de actualización con versión obsoleta falla
    let conflictoVersion = false;
    try {
      await asientoService.actualizarBorrador(b1.id, {
        periodoId: `per-${PERIODO_COB}`,
        subdiarioId: '01',
        fecha: '2026-09-06',
        glosa: 'Conflicto',
        detalles: [
          { linea: 1, cuentaId: '1011', debe: 1500, haber: 0 },
          { linea: 2, cuentaId: '7011', debe: 0, haber: 1500 }
        ]
      }, USER_COB, 1); // se envía versión 1 esperada pero la actual es 2
    } catch (err: any) {
      conflictoVersion = err.message.includes('VERSION_DESACTUALIZADA') || err.message.includes('CONFLICTO_VERSION');
    }
    testAssert(conflictoVersion, 'actualizarBorrador rechaza conflicto concurrente con VERSION_DESACTUALIZADA');

    // 1.4 Rechazo de asiento descuadrado al contabilizar
    const bDescuadrado = await asientoService.crearBorrador(EMPRESA_COB, {
      periodoId: `per-${PERIODO_COB}`,
      subdiarioId: '01',
      fecha: '2026-09-07',
      glosa: 'Asiento descuadrado intencional',
      detalles: [
        { linea: 1, cuentaId: '1011', debe: 1000, haber: 0 },
        { linea: 2, cuentaId: '7011', debe: 0, haber: 950 }
      ]
    }, USER_COB);
    let rechazoDescuadre = false;
    try {
      await asientoService.contabilizar(bDescuadrado.id, EMPRESA_COB, USER_COB);
    } catch (err: any) {
      rechazoDescuadre = err.message.includes('ASIENTO_DESCUADRADO') || err.message.includes('PARTIDA_DOBLE');
    }
    testAssert(rechazoDescuadre, 'contabilizar rechaza asiento que viola partida doble estricta con ASIENTO_DESCUADRADO');

    // 1.5 Segregación de funciones: Creador no puede auto-aprobarse si enforceSegregacion está activo
    let falloSegregacion = false;
    try {
      await asientoService.contabilizar(b1.id, EMPRESA_COB, USER_COB, { enforceSegregacion: true });
    } catch (err: any) {
      falloSegregacion = err.message.includes('SEGREGACION_FUNCIONES');
    }
    testAssert(falloSegregacion, 'contabilizar valida segregación de funciones (creador !== aprobador)');

    // 1.6 Contabilización válida por segundo usuario
    const contabilizado = await asientoService.contabilizar(b1.id, EMPRESA_COB, USER_AUX);
    testAssert(contabilizado.estado === 'CONTABILIZADO', 'Asiento cambia a CONTABILIZADO');
    testAssert(contabilizado.numero.length > 0, 'Asiento recibe número correlativo oficial');

    // 1.7 Modificación física prohibida en asiento contabilizado
    let bloqueoUpdate = false;
    try {
      await asientoService.actualizarBorrador(b1.id, {
        periodoId: `per-${PERIODO_COB}`,
        subdiarioId: '01',
        fecha: '2026-09-06',
        glosa: 'Intento de modificar asiento cerrado',
        detalles: [{ linea: 1, cuentaId: '1011', debe: 1500, haber: 1500 }]
      }, USER_COB, 2);
    } catch (err: any) {
      bloqueoUpdate = err.message.includes('ASIENTO_NO_EDITABLE') || err.message.includes('NO_MODIFICABLE');
    }
    testAssert(bloqueoUpdate, 'actualizarBorrador bloquea asientos ya contabilizados con ASIENTO_NO_EDITABLE');

    // 1.8 Anulación con generación de asiento de extorno espejo
    const resAnulacion = await asientoService.anular(b1.id, 'Error en comprobante sustentatorio', USER_COB, EMPRESA_COB);
    testAssert(resAnulacion.estado === 'ANULADO', 'Resultado de anular reporta estado ANULADO');
    const originalAnulado = await asientoService.obtenerPorId(b1.id);
    testAssert(originalAnulado?.estado === 'ANULADO', 'Asiento original marcado como ANULADO');
    const extorno = await asientoService.obtenerPorId(resAnulacion.extornoId);
    testAssert(extorno !== null, 'Asiento de extorno generado y persistido');
    testAssert(extorno!.glosa.includes('EXTORNO'), 'Asiento de extorno generado con glosa oficial');
    testAssert(extorno!.totalDebe === contabilizado.totalHaber, 'Extorno invierte montos Debe y Haber exactamente');

    // 1.9 Duplicar asiento como nuevo borrador
    const duplicado = await asientoService.duplicar(b1.id, USER_COB, EMPRESA_COB);
    testAssert(duplicado.id !== b1.id, 'duplicar genera nuevo identificador');
    testAssert(duplicado.estado === 'BORRADOR', 'Asiento duplicado inicia en BORRADOR');
    testAssert(duplicado.detalles.length === 2, 'Líneas de detalle clonadas');

    // 1.10 Listar con filtros diversos
    const listaAsientos = await asientoService.listar(EMPRESA_COB, {
      subdiarioId: '01',
      estado: 'BORRADOR',
      limit: 10
    });
    testAssert(listaAsientos.data.length >= 1, 'listar retorna asientos filtrados por subdiario y estado');

    // 1.11 Búsqueda por ID
    const encontrado = await asientoService.obtenerPorId(duplicado.id);
    testAssert(encontrado?.id === duplicado.id, 'obtenerPorId encuentra asiento existente');
  }

  // ==========================================================================
  // BLOQUE 2: VENTA SERVICE (Ciclo comercial, comprobantes y validaciones)
  // ==========================================================================
  console.log('\n🔹 Bloque 2: Pruebas de Comportamiento de ventaService');
  {
    // 2.1 Verificación de duplicados
    let noDuplicado = true;
    try {
      await ventaService.verificarDuplicado(EMPRESA_COB, '01', 'F001', '00000001');
    } catch {
      noDuplicado = false;
    }
    testAssert(noDuplicado, 'Comprobante inexistente no es reportado como duplicado');

    // 2.2 Crear borrador de venta
    const vBorrador = await ventaService.crearBorrador(EMPRESA_COB, {
      tipoComprobante: '01',
      serie: 'F001',
      numero: '00000001',
      fechaEmision: '2026-09-12',
      fechaContable: '2026-09-12',
      clienteId: 'cli-001',
      moneda: 'PEN',
      tipoCambio: 1.0,
      baseGravada: 2000,
      igv: 360,
      total: 2360,
      tipoOperacion: 'VENTA_GRAVADA',
      periodoId: `per-${PERIODO_COB}`
    }, USER_COB);
    testAssert(vBorrador.id !== undefined, 'crearBorrador de venta exitoso');
    testAssert(vBorrador.estado === 'BORRADOR', 'Venta nace en estado BORRADOR');
    testAssert(vBorrador.total === 2360, 'Monto total con IGV 18%: S/ 2,000 + S/ 360 = S/ 2,360');

    // 2.3 Detección de duplicado ahora sí activo
    let siDuplicado = false;
    try {
      await ventaService.verificarDuplicado(EMPRESA_COB, '01', 'F001', '00000001');
    } catch (err: any) {
      siDuplicado = err.message.includes('COMPROBANTE_DUPLICADO');
    }
    testAssert(siDuplicado, 'verificarDuplicado detecta serie y número ya existentes arrojando COMPROBANTE_DUPLICADO');

    // 2.4 Actualizar borrador de venta
    const vActualizado = await ventaService.actualizarBorrador(EMPRESA_COB, vBorrador.id, {
      tipoComprobante: '01',
      serie: 'F001',
      numero: '00000001',
      fechaEmision: '2026-09-12',
      fechaContable: '2026-09-12',
      clienteId: 'cli-001',
      moneda: 'PEN',
      tipoCambio: 1.0,
      baseGravada: 3000,
      igv: 540,
      total: 3540,
      tipoOperacion: 'VENTA_GRAVADA',
      periodoId: `per-${PERIODO_COB}`
    }, USER_COB, 1);
    testAssert(vActualizado.total === 3540, 'Actualización registra total: S/ 3,000 + S/ 540 = S/ 3,540');

    // 2.5 Registrar y contabilizar venta
    const vRegistrada = await ventaService.registrar(EMPRESA_COB, vBorrador.id, USER_COB);
    testAssert(vRegistrada.estado === 'REGISTRADO', 'Venta pasa a estado REGISTRADO');
    testAssert(vRegistrada.asientoId !== undefined, 'Venta genera asiento contable automático vinculado');

    // 2.6 Duplicar venta
    const vCopia = await ventaService.duplicar(EMPRESA_COB, vBorrador.id, USER_COB);
    testAssert(vCopia.id !== vBorrador.id, 'duplicar venta genera nuevo identificador');
    testAssert(vCopia.estado === 'BORRADOR', 'Venta clonada inicia en BORRADOR');

    // 2.7 Eliminar borrador
    const eliminada = await ventaService.eliminarBorrador(EMPRESA_COB, vCopia.id, USER_COB);
    testAssert(eliminada, 'eliminarBorrador de venta exitoso');

    // 2.8 Anular venta con extorno
    const vAnulada = await ventaService.anular(EMPRESA_COB, vBorrador.id, 'Anulación solicitada por cliente', USER_COB);
    testAssert(vAnulada.estado === 'ANULADO', 'Venta cambia a ANULADO');

    // 2.9 Obtener por ID y listar ventas
    const vFind = await ventaService.obtenerPorId(EMPRESA_COB, vBorrador.id);
    testAssert(vFind?.id === vBorrador.id, 'obtenerPorId encuentra venta');

    const vLista = await ventaService.listar(EMPRESA_COB, { tipoComprobante: '01' });
    testAssert(vLista.items.length >= 1, 'listar ventas con filtros devuelve resultados');

    // 2.10 Estructura oficial del Registro de Ventas (PLE 14.1)
    const regVentas = await ventaService.obtenerRegistroVentas(EMPRESA_COB, `per-${PERIODO_COB}`);
    testAssert(regVentas.comprobantes !== undefined, 'obtenerRegistroVentas genera estructura normativa');
  }

  // ==========================================================================
  // BLOQUE 3: SALDOS SERVICE (Cuentas por Cobrar, Cuentas por Pagar y Tesorería)
  // ==========================================================================
  console.log('\n🔹 Bloque 3: Pruebas de Comportamiento de saldosService');
  {
    // Crear proveedor y saldos vivos de prueba
    const provAnx = await anexoService.crear(EMPRESA_COB, {
      tipoDocumento: '6',
      numeroDocumento: '20112233445',
      razonSocial: 'DISTRIBUIDORA LIMA S.A.',
      tipoEntidad: 'PROVEEDOR',
      condicionSunat: 'HABIDO',
      estadoSunat: 'ACTIVO'
    });

    const idCxp = `cxp-test-${Date.now()}`;
    const idCxc = `cxc-test-${Date.now()}`;

    CXP_MEMORIA.push({
      id: idCxp,
      empresaId: EMPRESA_COB,
      tipoComprobante: '01',
      serie: 'F001',
      numero: '00000088',
      proveedorId: provAnx.id,
      proveedorNombre: provAnx.razonSocial,
      proveedorRuc: provAnx.numeroDocumento,
      fechaEmision: '2026-08-01',
      fechaVencimiento: '2026-08-30',
      moneda: 'PEN',
      importeOriginal: 5000,
      saldo: 4000,
      estado: 'PENDIENTE',
      comprobanteId: 'compra-dummy-88'
    });

    CXC_MEMORIA.push({
      id: idCxc,
      empresaId: EMPRESA_COB,
      tipoComprobante: '01',
      serie: 'F001',
      numero: '00000099',
      clienteId: 'cli-001',
      clienteNombre: 'COMERCIAL DEL SUR S.A.C.',
      clienteRuc: '20555666777',
      fechaEmision: '2026-08-15',
      fechaVencimiento: '2026-09-15',
      moneda: 'PEN',
      importeOriginal: 3000,
      saldo: 3000,
      estado: 'PENDIENTE',
      comprobanteId: 'venta-dummy-99'
    });

    // 3.1 Listar CxP y CxC
    const listaCxp = await saldosService.listarCxP(EMPRESA_COB);
    testAssert(listaCxp.length >= 1, 'listarCxP retorna documentos de cuentas por pagar');

    const listaCxc = await saldosService.listarCxC(EMPRESA_COB);
    testAssert(listaCxc.length >= 1, 'listarCxC retorna documentos de cuentas por cobrar');

    // 3.2 Reporte de antigüedad de saldos
    const antiguedadCxp = await saldosService.reporteAntiguedad(EMPRESA_COB, 'CXP', '2026-09-30');
    testAssert(antiguedadCxp.resumen.totalSaldo > 0, 'reporteAntiguedad calcula total de deuda viva');
    testAssert(antiguedadCxp.resumen.de31a60 >= 0, 'reporteAntiguedad categoriza tramos de vencimiento');

    // 3.3 Estado de cuenta por proveedor
    const estadoCta = await saldosService.obtenerEstadoCuenta(EMPRESA_COB, provAnx.id, 'PROVEEDOR');
    testAssert(estadoCta.documentos.length >= 1, 'obtenerEstadoCuenta compila documentos del anexo');
    testAssert(estadoCta.totalSaldoPendiente === 4000, 'Saldo pendiente exacto calculado: S/ 4,000');

    // 3.4 Aplicar pago a CxP
    const resPago = await saldosService.aplicarPago(EMPRESA_COB, {
      fechaPago: '2026-09-15',
      referenciaBanco: 'OP-778899',
      aplicaciones: [{ cuentaPorPagarId: idCxp, importe: 2000 }]
    }, USER_COB);
    testAssert(resPago.success, 'aplicarPago reporta éxito');
    testAssert(resPago.resultados[0].nuevoSaldo === 2000, 'aplicarPago reduce saldo pendiente de S/ 4,000 a S/ 2,000');

    // 3.5 Rechazo de pago en exceso al saldo
    let rechazoSobrepago = false;
    try {
      await saldosService.aplicarPago(EMPRESA_COB, {
        fechaPago: '2026-09-15',
        referenciaBanco: 'OP-SOBREPAGO',
        aplicaciones: [{ cuentaPorPagarId: idCxp, importe: 5000 }]
      }, USER_COB);
    } catch (err: any) {
      rechazoSobrepago = err.message.includes('IMPORTE_EXCEDE_SALDO');
    }
    testAssert(rechazoSobrepago, 'aplicarPago rechaza pagos que exceden el saldo vivo');

    // 3.6 Aplicar cobranza a CxC
    const resCobranza = await saldosService.aplicarCobranza(EMPRESA_COB, {
      fechaCobranza: '2026-09-20',
      referenciaBanco: 'OP-DEP-112233',
      aplicaciones: [{ cuentaPorCobrarId: idCxc, importe: 3000 }]
    }, USER_COB);
    testAssert(resCobranza.success, 'aplicarCobranza reporta éxito');
    testAssert(resCobranza.resultados[0].nuevoSaldo === 0, 'aplicarCobranza cancela el documento en su totalidad');
  }

  // ==========================================================================
  // BLOQUE 4: PERIODO SERVICE (Gestión de períodos contables, cierre y reapertura)
  // ==========================================================================
  console.log('\n🔹 Bloque 4: Pruebas de Comportamiento de periodoService');
  {
    // 4.1 Listar períodos del ejercicio
    const periodos = await periodoService.listar(EMPRESA_COB, 2026);
    testAssert(periodos.length >= 1, 'listar retorna períodos del ejercicio');

    // 4.2 Obtener período por código
    const pSep = await periodoService.obtenerPorCodigo(EMPRESA_COB, '2026-09');
    testAssert(pSep?.codigoPeriodo === '2026-09', 'obtenerPorCodigo encuentra período 2026-09');

    // 4.3 Consulta de estado de período
    const estaCerradoInicial = await periodoService.estaCerrado(EMPRESA_COB, '2026-09');
    testAssert(!estaCerradoInicial, 'Período 2026-09 está ABIERTO inicialmente');

    // 4.4 Cerrar período contable
    const pCerrado = await periodoService.cerrar(pSep!.id, USER_COB, EMPRESA_COB);
    testAssert(pCerrado.estado === 'CERRADO', 'cerrar transiciona el período a CERRADO');

    const estaCerradoFinal = await periodoService.estaCerrado(EMPRESA_COB, '2026-09');
    testAssert(estaCerradoFinal, 'estaCerrado confirma bloqueo del período');

    // 4.5 Rechazo de reapertura por rol no autorizado
    let falloReaperturaRol = false;
    try {
      await periodoService.reabrir(pSep!.id, 'Motivo cualquiera', USER_AUX, 'ASISTENTE_CONTABLE', EMPRESA_COB);
    } catch (err: any) {
      falloReaperturaRol = err.message.includes('PERMISO_DENEGADO') || err.message.includes('ROL_NO_AUTORIZADO');
    }
    testAssert(falloReaperturaRol, 'reabrir deniega reapertura a usuarios sin rol ADMINISTRADOR');

    // 4.6 Reapertura autorizada por ADMINISTRADOR
    const pReabierto = await periodoService.reabrir(pSep!.id, 'Ajuste de fin de mes por auditoría externa', USER_COB, 'ADMINISTRADOR', EMPRESA_COB);
    testAssert(pReabierto.estado === 'ABIERTO', 'reabrir reactiva el período exitosamente para ADMINISTRADOR');
  }

  // ==========================================================================
  // BLOQUE 5: DETRACCION SERVICE (SPOT SUNAT, Umbrales, Cálculo y Crédito Fiscal)
  // ==========================================================================
  console.log('\n🔹 Bloque 5: Pruebas de Comportamiento de detraccionService');
  {
    // 5.1 Cálculo de detracción servicio general (código 022 - 12%, umbral S/ 700)
    const detServicioMayor = detraccionService.calcularDetraccion(1000, '022');
    testAssert(detServicioMayor.aplica, 'Operación de S/ 1,000 en código 022 aplica detracción');
    testAssert(detServicioMayor.porcentaje === 12, 'Tasa SPOT es 12%');
    testAssert(detServicioMayor.montoDetraccion === 120, 'Monto de detracción es S/ 120.00');

    // 5.2 Operación menor al umbral legal no aplica SPOT
    const detServicioMenor = detraccionService.calcularDetraccion(650, '022');
    testAssert(!detServicioMenor.aplica, 'Operación de S/ 650 en código 022 NO aplica detracción (umbral S/ 700)');
    testAssert(detServicioMenor.montoDetraccion === 0, 'Monto detracción es 0 para operación bajo el umbral');

    // 5.3 Transporte de carga (código 027 - 4%, umbral S/ 400)
    const detTransporte = detraccionService.calcularDetraccion(500, '027');
    testAssert(detTransporte.aplica, 'Operación de S/ 500 en transporte aplica (umbral S/ 400)');
    testAssert(detTransporte.porcentaje === 4, 'Tasa transporte es 4%');
    testAssert(detTransporte.montoDetraccion === 20, 'Monto detracción es S/ 20.00');

    // 5.4 Registrar detracción
    const idCompraDet = `compra-det-${Date.now()}`;
    const detReg = await detraccionService.registrarDetraccion(EMPRESA_COB, {
      comprobanteCompraId: idCompraDet,
      codigoBien: '022',
      montoTotalOperacion: 2500,
      cuentaBancoNacion: '00-011-998877'
    }, USER_COB);
    testAssert(detReg.id !== undefined, 'registrarDetraccion crea registro con ID');
    testAssert(detReg.estado === 'PENDIENTE', 'Detracción nace en estado PENDIENTE');
    testAssert(detReg.monto === 300, 'Detracción calculada: 12% de S/ 2,500 = S/ 300');
    testAssert(!detReg.permiteCreditoFiscal, 'Crédito fiscal no liberado mientras detracción esté PENDIENTE');

    // 5.5 Listar pendientes
    const pendientes = await detraccionService.listarPendientes(EMPRESA_COB);
    testAssert(pendientes.length >= 1, 'listarPendientes incluye la detracción recién registrada');

    // 5.6 Consulta de derecho al crédito fiscal con detracción PENDIENTE
    const valPendiente = await detraccionService.validarDerechoCreditoFiscal(EMPRESA_COB, idCompraDet, '2026-09');
    testAssert(!valPendiente.deducible, 'validarDerechoCreditoFiscal suspende crédito fiscal con detracción pendiente');

    // 5.7 Registrar depósito con constancia inválida (corta) falla
    let rechazoConstancia = false;
    try {
      await detraccionService.registrarDeposito(detReg.id, '12', '2026-09-18', USER_COB, EMPRESA_COB);
    } catch (err: any) {
      rechazoConstancia = err.message.includes('CONSTANCIA_INVALIDA');
    }
    testAssert(rechazoConstancia, 'registrarDeposito rechaza constancia inválida');

    // 5.8 Registrar depósito válido
    const detDepositada = await detraccionService.registrarDeposito(
      detReg.id,
      'CONST-BN-998811',
      '2026-09-18',
      USER_COB,
      EMPRESA_COB
    );
    testAssert(detDepositada.estado === 'DEPOSITADA', 'Detracción transiciona a DEPOSITADA');
    testAssert(detDepositada.permiteCreditoFiscal, 'Depósito libera el derecho al crédito fiscal');

    // 5.9 Validación de crédito fiscal acreditado en el mismo período
    const valDepositada = await detraccionService.validarDerechoCreditoFiscal(EMPRESA_COB, idCompraDet, '2026-09');
    testAssert(valDepositada.deducible, 'validarDerechoCreditoFiscal autoriza crédito fiscal tras pago');

    // 5.10 Depósito tardío difiere el crédito fiscal
    const idCompraTardio = `compra-tardia-${Date.now()}`;
    const detTardia = await detraccionService.registrarDetraccion(EMPRESA_COB, {
      comprobanteCompraId: idCompraTardio,
      codigoBien: '022',
      montoTotalOperacion: 1000
    }, USER_COB);
    await detraccionService.registrarDeposito(detTardia.id, 'CONST-BN-TARDIA', '2026-10-10', USER_COB, EMPRESA_COB);

    const valTardia = await detraccionService.validarDerechoCreditoFiscal(EMPRESA_COB, idCompraTardio, '2026-09');
    testAssert(!valTardia.deducible, 'Crédito fiscal diferido si el depósito se efectuó en el mes siguiente');
    testAssert(valTardia.motivo.includes('CREDITO_DIFERIDO'), 'Motivo indica CREDITO_DIFERIDO explícitamente');
  }

  console.log('========================================================================');
  console.log(`📊 RESULTADO SUITE FASE 13: ${passed}/${total} PRUEBAS EXITOSAS`);
  console.log('========================================================================\n');
}

ejecutarSuiteCoberturaFase13().catch(err => {
  console.error('❌ Error fatal en suite Fase 13:', err);
  process.exit(1);
});
