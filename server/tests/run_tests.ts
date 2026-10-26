import { contabilizacionService } from '../services/contabilizacionService';
import { asientoService } from '../services/asientoService';
import { periodoService } from '../services/periodoService';
import { aperturaCierreService } from '../services/aperturaCierreService';
import { Money } from '../utils/decimal';

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

async function ejecutarPruebas() {
  console.log('\n======================================================');
  console.log('🧪 SUITE DE PRUEBAS AUTOMATIZADAS — MOTOR CONTABLE (FASE 2)');
  console.log('======================================================\n');

  const empresaId = 'emp-01';
  const userId = '00000000-0000-0000-0000-000000000001';

  // --------------------------------------------------------------------------
  // TEST 1: Partida Doble en Servicios y Reglas
  // --------------------------------------------------------------------------
  console.log('🔹 Test 1: Validación de Partida Doble estricta');
  try {
    const compra = await contabilizacionService.generar(empresaId, 'COMPRA_MERCADERIA', {
      total: 1180.00,
      glosa: 'Compra de 10 laptops',
      docSerie: 'F001',
      docNumero: '1001'
    });
    assert(compra.cuadrado === true, 'Regla Compra Mercadería genera partida doble cuadrada');
    assert(compra.totalDebe === compra.totalHaber, 'Total Debe igual a Total Haber');
    assert(compra.diferencia === 0, 'Diferencia de cuadre es cero');

    // Descuadre deliberado debe ser rechazado
    let rechazoDescuadre = false;
    try {
      const borradorDescuadrado = await asientoService.crearBorrador(empresaId, {
        periodoId: 'per-2026-09',
        subdiarioId: '01',
        fecha: '2026-09-15',
        glosa: 'Asiento descuadrado intencional',
        detalles: [
          { linea: 1, cuentaId: 'cta-6011', debe: 100, haber: 0 },
          { linea: 2, cuentaId: 'cta-4212', debe: 0, haber: 90 } // Descuadre de 10
        ]
      }, userId);

      await asientoService.contabilizar(borradorDescuadrado.id, empresaId, userId);
    } catch (err: any) {
      rechazoDescuadre = true;
    }
    assert(rechazoDescuadre, 'El sistema rechaza contabilizar un asiento descuadrado (Debe != Haber)');
  } catch (err: any) {
    assert(false, 'Error en Test 1: Partida Doble', err.message);
  }

  // --------------------------------------------------------------------------
  // TEST 2: Correlativos Concurrencia (50 asignaciones sin saltos ni duplicados)
  // --------------------------------------------------------------------------
  console.log('\n🔹 Test 2: Concurrencia de Correlativos (50 operaciones simultáneas)');
  try {
    const promesas = [];
    for (let i = 0; i < 50; i++) {
      promesas.push((async (index) => {
        const borrador = await asientoService.crearBorrador(empresaId, {
          periodoId: 'per-2026-09',
          subdiarioId: '01',
          fecha: '2026-09-15',
          glosa: `Asiento concurrente N° ${index + 1}`,
          detalles: [
            { linea: 1, cuentaId: 'cta-6011', debe: 118, haber: 0 },
            { linea: 2, cuentaId: 'cta-4212', debe: 0, haber: 118 }
          ]
        }, userId);

        return asientoService.contabilizar(borrador.id, empresaId, userId);
      })(i));
    }

    const contabilizados = await Promise.all(promesas);
    const numeros = contabilizados.map(c => c.numero);
    const numerosUnicos = new Set(numeros);

    assert(numeros.length === 50, 'Se contabilizaron 50 asientos');
    assert(numerosUnicos.size === 50, 'Cero duplicados en 50 contabilizaciones concurrentes');
    assert(numeros.every(n => n && n.startsWith('0109')), 'Nomenclatura oficial correcta {subdiario}{mes}{correlativo}');
  } catch (err: any) {
    assert(false, 'Error en Test 2: Correlativos concurrentes', err.message);
  }

  // --------------------------------------------------------------------------
  // TEST 3: Inmutabilidad de Asientos Contabilizados y Anulados
  // --------------------------------------------------------------------------
  console.log('\n🔹 Test 3: Inmutabilidad (No se admite UPDATE ni DELETE en contabilizados)');
  try {
    const borrador = await asientoService.crearBorrador(empresaId, {
      periodoId: 'per-2026-09',
      subdiarioId: '02',
      fecha: '2026-09-20',
      glosa: 'Venta para prueba de inmutabilidad',
      detalles: [
        { linea: 1, cuentaId: 'cta-1212', debe: 590, haber: 0 },
        { linea: 2, cuentaId: 'cta-70111', debe: 0, haber: 590 }
      ]
    }, userId);

    const cont = await asientoService.contabilizar(borrador.id, empresaId, userId);

    let falloModificacion = false;
    try {
      await asientoService.actualizarBorrador(cont.id, {
        ...borrador,
        glosa: 'Intento de modificar asiento contabilizado'
      }, userId, cont.version);
    } catch (e) {
      falloModificacion = true;
    }

    assert(falloModificacion, 'Bloqueo de modificación física sobre asiento contabilizado');
  } catch (err: any) {
    assert(false, 'Error en Test 3: Inmutabilidad', err.message);
  }

  // --------------------------------------------------------------------------
  // TEST 4: Período Cerrado
  // --------------------------------------------------------------------------
  console.log('\n🔹 Test 4: Integridad de Período Cerrado');
  try {
    const periodoCerradoId = 'per-2026-08'; // Período cerrado
    let bloqueoCreacion = false;

    try {
      await asientoService.crearBorrador(empresaId, {
        periodoId: periodoCerradoId,
        subdiarioId: '01',
        fecha: '2026-08-10',
        glosa: 'Intento de registro en periodo cerrado',
        detalles: [
          { linea: 1, cuentaId: 'cta-6011', debe: 100, haber: 0 },
          { linea: 2, cuentaId: 'cta-4212', debe: 0, haber: 100 }
        ]
      }, userId);
    } catch {
      bloqueoCreacion = true;
    }

    // Reabrir sin rol admin debe fallar
    let rechazoReaperturaSinRol = false;
    try {
      await periodoService.reabrir(periodoCerradoId, 'Motivo de prueba', userId, 'ASISTENTE', empresaId);
    } catch {
      rechazoReaperturaSinRol = true;
    }

    assert(rechazoReaperturaSinRol, 'Reapertura denegada a roles no autorizados (requiere ADMINISTRADOR)');
  } catch (err: any) {
    assert(false, 'Error en Test 4: Período Cerrado', err.message);
  }

  // --------------------------------------------------------------------------
  // TEST 5: Anulación y Generación de Asiento de Extorno
  // --------------------------------------------------------------------------
  console.log('\n🔹 Test 5: Anulación con Asiento de Extorno Vinculado');
  try {
    const borrador = await asientoService.crearBorrador(empresaId, {
      periodoId: 'per-2026-09',
      subdiarioId: '01',
      fecha: '2026-09-18',
      glosa: 'Factura errónea para anulación',
      detalles: [
        { linea: 1, cuentaId: 'cta-6011', debe: 2000, haber: 0 },
        { linea: 2, cuentaId: 'cta-4212', debe: 0, haber: 2000 }
      ]
    }, userId);

    const cont = await asientoService.contabilizar(borrador.id, empresaId, userId);
    const resultadoAnulacion = await asientoService.anular(
      cont.id,
      'Error de digitación en RUC del proveedor',
      userId,
      empresaId
    );

    assert(resultadoAnulacion.estado === 'ANULADO', 'Asiento original marcado como ANULADO');
    assert(!!resultadoAnulacion.extornoId, 'Asiento de extorno generado y vinculado');
  } catch (err: any) {
    assert(false, 'Error en Test 5: Anulación / Extorno', err.message);
  }

  // --------------------------------------------------------------------------
  // TEST 6: Reglas de Contabilización (Compra, Venta, Honorarios, Planilla)
  // --------------------------------------------------------------------------
  console.log('\n🔹 Test 6: Reglas de Contabilización Parametrizadas');
  try {
    // 6.1 Compra con Destino Almacén
    const rCompra = await contabilizacionService.generar(empresaId, 'COMPRA_MERCADERIA', {
      total: 2360.00,
      glosa: 'Compra de mercadería con destino almacén'
    });
    assert(rCompra.cuadrado, 'Compra de mercadería cuadra');
    assert(rCompra.lineas.some(l => l.codigoCuenta === '20111' && l.debe === 2000), 'Línea de destino 20111 al Debe');
    assert(rCompra.lineas.some(l => l.codigoCuenta === '6111' && l.haber === 2000), 'Línea de contrapartida 6111 al Haber');

    // 6.2 Compra de Servicios con Destino por Función (60% Admin / 40% Ventas)
    const rServicio = await contabilizacionService.generar(empresaId, 'COMPRA_SERVICIO', {
      total: 1180.00,
      glosa: 'Servicio de consultoría'
    });
    assert(rServicio.cuadrado, 'Compra de servicio cuadra');
    assert(rServicio.lineas.some(l => l.codigoCuenta === '941' && l.debe === 600), 'Destino 941 (60% de S/ 1,000)');
    assert(rServicio.lineas.some(l => l.codigoCuenta === '951' && l.debe === 400), 'Destino 951 (40% de S/ 1,000)');
    assert(rServicio.lineas.some(l => l.codigoCuenta === '791' && l.haber === 1000), 'Cargas imputables 791 al Haber por S/ 1,000');

    // 6.3 Recibo por Honorarios con Retención 8%
    const rRxH = await contabilizacionService.generar(empresaId, 'HONORARIO', {
      total: 2000.00,
      glosa: 'Asesoría legal'
    });
    assert(rRxH.cuadrado, 'Recibo por honorarios cuadra');
    assert(rRxH.lineas.some(l => l.codigoCuenta === '40172' && l.haber === 160), 'Retención 8% de 4ta categoría (S/ 160.00)');
    assert(rRxH.lineas.some(l => l.codigoCuenta === '424' && l.haber === 1840), 'Neto por pagar (S/ 1,840.00)');

    // 6.4 Planilla de Sueldos
    const rPlanilla = await contabilizacionService.generar(empresaId, 'PLANILLA', {
      total: 5000.00,
      glosa: 'Sueldos de Setiembre'
    });
    assert(rPlanilla.cuadrado, 'Planilla de remuneraciones cuadra');
    assert(rPlanilla.lineas.some(l => l.codigoCuenta === '6271' && l.debe === 450), 'EsSalud 9% al Debe (S/ 450.00)');
    assert(rPlanilla.lineas.some(l => l.codigoCuenta === '4031' && l.haber === 450), 'EsSalud por pagar al Haber (S/ 450.00)');
    assert(rPlanilla.lineas.some(l => l.codigoCuenta === '4032' && l.haber === 650), 'ONP 13% al Haber (S/ 650.00)');
  } catch (err: any) {
    assert(false, 'Error en Test 6: Reglas de Contabilización', err.message);
  }

  // --------------------------------------------------------------------------
  // TEST 7: Bloqueo Optimista (Control de versión de registro)
  // --------------------------------------------------------------------------
  console.log('\n🔹 Test 7: Bloqueo Optimista (Detección de colisión de versiones)');
  try {
    const borrador = await asientoService.crearBorrador(empresaId, {
      periodoId: 'per-2026-09',
      subdiarioId: '01',
      fecha: '2026-09-25',
      glosa: 'Prueba de versión optimista',
      detalles: [
        { linea: 1, cuentaId: 'cta-6011', debe: 300, haber: 0 },
        { linea: 2, cuentaId: 'cta-4212', debe: 0, haber: 300 }
      ]
    }, userId);

    // Usuario 1 actualiza con versión 1 -> Asiento pasa a versión 2
    await asientoService.actualizarBorrador(borrador.id, {
      ...borrador,
      glosa: 'Actualización por Usuario A'
    }, userId, 1);

    // Usuario 2 intenta actualizar enviando la versión 1 anterior (desactualizada)
    let falloVersionVieja = false;
    try {
      await asientoService.actualizarBorrador(borrador.id, {
        ...borrador,
        glosa: 'Actualización conflictiva por Usuario B'
      }, userId, 1); // Versión obsoleta
    } catch (e: any) {
      if (e.message.startsWith('VERSION_DESACTUALIZADA')) {
        falloVersionVieja = true;
      }
    }

    assert(falloVersionVieja, 'El sistema detecta colisión y rechaza la edición con VERSION_DESACTUALIZADA');
  } catch (err: any) {
    assert(false, 'Error en Test 7: Bloqueo Optimista', err.message);
  }

  // --------------------------------------------------------------------------
  // TEST 8: Diferencia de Cambio y Apertura/Cierre
  // --------------------------------------------------------------------------
  console.log('\n🔹 Test 8: Ajuste por Diferencia de Cambio');
  try {
    const tcOrigen = 3.75;
    const tcCierre = 3.80; // Subió el dólar
    const difCambio = aperturaCierreService.calcularDiferenciaCambio(1000, tcOrigen, tcCierre, true);

    assert(difCambio.esGanancia === true, 'Subida de TC en cuenta de Activo genera Ganancia (776)');
    assert(difCambio.ajusteSoles === 50.00, 'Monto exacto de ajuste S/ 50.00 (1000 * 0.05)');
  } catch (err: any) {
    assert(false, 'Error en Test 8: Diferencia de Cambio', err.message);
  }

  // --------------------------------------------------------------------------
  // RESUMEN FINAL
  // --------------------------------------------------------------------------
  console.log('\n======================================================');
  const total = resultados.length;
  const pasaron = resultados.filter(r => r.paso).length;
  const fallaron = total - pasaron;

  console.log(`📊 RESULTADO SUITE: ${pasaron}/${total} PRUEBAS EXITOSAS`);
  if (fallaron === 0) {
    console.log('🎉 TODAS LAS PRUEBAS DEL MOTOR CONTABLE PASARON SATISFACTORIAMENTE.');
  } else {
    console.error(`⚠️ SE REGISTRARON ${fallaron} FALLOS EN LA SUITE.`);
  }
  console.log('======================================================\n');
}

ejecutarPruebas().catch(console.error);
