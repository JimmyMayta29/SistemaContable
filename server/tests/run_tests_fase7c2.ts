import { librosEEFFService } from '../services/librosEEFFService';
import { ASIENTOS_MEMORIA } from '../services/asientoService';
import { periodoService } from '../services/periodoService';

async function ejecutarSuiteFase7C2() {
  console.log('========================================================================');
  console.log('🧪 SUITE DE PRUEBAS AUTOMATIZADAS — FASE 7C-2: REPORTES TIPO SISCONT');
  console.log('   (HOJA DE TRABAJO 10 COLUMNAS & LIBRO DIARIO ESTRUCTURADO)');
  console.log('========================================================================\n');

  let passed = 0;
  let total = 0;

  function assert(cond: boolean, desc: string, extra?: string) {
    total++;
    if (cond) {
      console.log(`  ✅ PASÓ: ${desc}`);
      passed++;
    } else {
      console.error(`  ❌ FALLÓ: ${desc} ${extra ? `(${extra})` : ''}`);
      throw new Error(`Fallo en prueba Fase 7C-2: ${desc}`);
    }
  }

  const EMPRESA_TEST = '00000000-0000-0000-0000-00000000007c';
  const PERIODO_TEST = '2026-09';
  const USER_TEST = 'usr-contador-7c2';

  await periodoService.abrirPeriodo(EMPRESA_TEST, PERIODO_TEST, USER_TEST);

  for (let i = ASIENTOS_MEMORIA.length - 1; i >= 0; i--) {
    if (ASIENTOS_MEMORIA[i].empresaId === EMPRESA_TEST) {
      ASIENTOS_MEMORIA.splice(i, 1);
    }
  }

  // Asiento 1: Apertura (Subdiario 00)
  ASIENTOS_MEMORIA.push({
    id: `ast-7c2-01`,
    empresaId: EMPRESA_TEST,
    periodo: PERIODO_TEST,
    periodoId: `per-${PERIODO_TEST}`,
    subdiario: '00',
    subdiarioId: '00',
    numero: '00090001',
    numeroAsiento: '00090001',
    fecha: '2026-09-01',
    glosa: 'Por el asiento de apertura del ejercicio',
    glosaGeneral: 'Por el asiento de apertura del ejercicio',
    moneda: 'PEN',
    estado: 'CONTABILIZADO',
    cuo: '000001',
    detalles: [
      { linea: 1, codigoCuenta: '1041', denominacionCuenta: 'Cuentas corrientes operativas', debe: 50000, haber: 0 },
      { linea: 2, codigoCuenta: '1212', denominacionCuenta: 'Facturas por cobrar en cartera', debe: 30000, haber: 0 },
      { linea: 3, codigoCuenta: '20111', denominacionCuenta: 'Mercaderías manufacturadas', debe: 20000, haber: 0 },
      { linea: 4, codigoCuenta: '33311', denominacionCuenta: 'Maquinarias y equipos', debe: 15000, haber: 0 },
      { linea: 5, codigoCuenta: '3913', denominacionCuenta: 'Depreciación acumulada de PPE', debe: 0, haber: 5000 },
      { linea: 6, codigoCuenta: '4212', denominacionCuenta: 'Facturas por pagar comerciales', debe: 0, haber: 25000 },
      { linea: 7, codigoCuenta: '5011', denominacionCuenta: 'Capital social suscrito y pagado', debe: 0, haber: 85000 }
    ],
    items: [
      { linea: 1, codigoCuenta: '1041', denominacionCuenta: 'Cuentas corrientes operativas', debe: 50000, haber: 0 },
      { linea: 2, codigoCuenta: '1212', denominacionCuenta: 'Facturas por cobrar en cartera', debe: 30000, haber: 0 },
      { linea: 3, codigoCuenta: '20111', denominacionCuenta: 'Mercaderías manufacturadas', debe: 20000, haber: 0 },
      { linea: 4, codigoCuenta: '33311', denominacionCuenta: 'Maquinarias y equipos', debe: 15000, haber: 0 },
      { linea: 5, codigoCuenta: '3913', denominacionCuenta: 'Depreciación acumulada de PPE', debe: 0, haber: 5000 },
      { linea: 6, codigoCuenta: '4212', denominacionCuenta: 'Facturas por pagar comerciales', debe: 0, haber: 25000 },
      { linea: 7, codigoCuenta: '5011', denominacionCuenta: 'Capital social suscrito y pagado', debe: 0, haber: 85000 }
    ],
    totalDebe: 115000,
    totalHaber: 115000
  });

  // Asiento 2: Compra de Mercaderías con Destino (Subdiario 01)
  ASIENTOS_MEMORIA.push({
    id: `ast-7c2-02`,
    empresaId: EMPRESA_TEST,
    periodo: PERIODO_TEST,
    periodoId: `per-${PERIODO_TEST}`,
    subdiario: '01',
    subdiarioId: '01',
    numero: '01090001',
    numeroAsiento: '01090001',
    fecha: '2026-09-05',
    glosa: 'Por la compra de mercaderías F001-1234',
    glosaGeneral: 'Por la compra de mercaderías F001-1234',
    moneda: 'PEN',
    estado: 'CONTABILIZADO',
    cuo: '010001',
    detalles: [
      { linea: 1, codigoCuenta: '6011', denominacionCuenta: 'Mercaderías manufacturadas', debe: 10000, haber: 0 },
      { linea: 2, codigoCuenta: '40111', denominacionCuenta: 'IGV Cuenta propia', debe: 1800, haber: 0 },
      { linea: 3, codigoCuenta: '4212', denominacionCuenta: 'Facturas por pagar comerciales', debe: 0, haber: 11800 },
      { linea: 4, codigoCuenta: '20111', denominacionCuenta: 'Mercaderías manufacturadas - Costo', debe: 10000, haber: 0 },
      { linea: 5, codigoCuenta: '6111', denominacionCuenta: 'Variación de inventarios - Mercaderías', debe: 0, haber: 10000 }
    ],
    items: [
      { linea: 1, codigoCuenta: '6011', denominacionCuenta: 'Mercaderías manufacturadas', debe: 10000, haber: 0 },
      { linea: 2, codigoCuenta: '40111', denominacionCuenta: 'IGV Cuenta propia', debe: 1800, haber: 0 },
      { linea: 3, codigoCuenta: '4212', denominacionCuenta: 'Facturas por pagar comerciales', debe: 0, haber: 11800 },
      { linea: 4, codigoCuenta: '20111', denominacionCuenta: 'Mercaderías manufacturadas - Costo', debe: 10000, haber: 0 },
      { linea: 5, codigoCuenta: '6111', denominacionCuenta: 'Variación de inventarios - Mercaderías', debe: 0, haber: 10000 }
    ],
    totalDebe: 21800,
    totalHaber: 21800
  });

  // Asiento 3: Venta de Mercaderías con Costo de Ventas (Subdiario 02)
  ASIENTOS_MEMORIA.push({
    id: `ast-7c2-03`,
    empresaId: EMPRESA_TEST,
    periodo: PERIODO_TEST,
    periodoId: `per-${PERIODO_TEST}`,
    subdiario: '02',
    subdiarioId: '02',
    numero: '02090001',
    numeroAsiento: '02090001',
    fecha: '2026-09-10',
    glosa: 'Por la venta de mercaderías F001-5678',
    glosaGeneral: 'Por la venta de mercaderías F001-5678',
    moneda: 'PEN',
    estado: 'CONTABILIZADO',
    cuo: '020001',
    detalles: [
      { linea: 1, codigoCuenta: '1212', denominacionCuenta: 'Facturas por cobrar en cartera', debe: 23600, haber: 0 },
      { linea: 2, codigoCuenta: '40111', denominacionCuenta: 'IGV Cuenta propia', debe: 0, haber: 3600 },
      { linea: 3, codigoCuenta: '7011', denominacionCuenta: 'Mercaderías manufacturadas - Venta', debe: 0, haber: 20000 },
      { linea: 4, codigoCuenta: '6911', denominacionCuenta: 'Costo de ventas - Mercaderías', debe: 8000, haber: 0 },
      { linea: 5, codigoCuenta: '20111', denominacionCuenta: 'Mercaderías manufacturadas - Salida', debe: 0, haber: 8000 }
    ],
    items: [
      { linea: 1, codigoCuenta: '1212', denominacionCuenta: 'Facturas por cobrar en cartera', debe: 23600, haber: 0 },
      { linea: 2, codigoCuenta: '40111', denominacionCuenta: 'IGV Cuenta propia', debe: 0, haber: 3600 },
      { linea: 3, codigoCuenta: '7011', denominacionCuenta: 'Mercaderías manufacturadas - Venta', debe: 0, haber: 20000 },
      { linea: 4, codigoCuenta: '6911', denominacionCuenta: 'Costo de ventas - Mercaderías', debe: 8000, haber: 0 },
      { linea: 5, codigoCuenta: '20111', denominacionCuenta: 'Mercaderías manufacturadas - Salida', debe: 0, haber: 8000 }
    ],
    totalDebe: 31600,
    totalHaber: 31600
  });

  // Asiento 4: Gastos de Servicios con Destino Función (Subdiario 01 y 08)
  ASIENTOS_MEMORIA.push({
    id: `ast-7c2-04`,
    empresaId: EMPRESA_TEST,
    periodo: PERIODO_TEST,
    periodoId: `per-${PERIODO_TEST}`,
    subdiario: '01',
    subdiarioId: '01',
    numero: '01090002',
    numeroAsiento: '01090002',
    fecha: '2026-09-15',
    glosa: 'Por servicios prestados por terceros F002-999',
    glosaGeneral: 'Por servicios prestados por terceros F002-999',
    moneda: 'PEN',
    estado: 'CONTABILIZADO',
    cuo: '010002',
    detalles: [
      { linea: 1, codigoCuenta: '6321', denominacionCuenta: 'Asesoría contable y jurídica', debe: 4000, haber: 0 },
      { linea: 2, codigoCuenta: '40111', denominacionCuenta: 'IGV Cuenta propia', debe: 720, haber: 0 },
      { linea: 3, codigoCuenta: '4212', denominacionCuenta: 'Facturas por pagar comerciales', debe: 0, haber: 4720 },
      { linea: 4, codigoCuenta: '941', denominacionCuenta: 'Gastos de Administración (60%)', debe: 2400, haber: 0 },
      { linea: 5, codigoCuenta: '951', denominacionCuenta: 'Gastos de Ventas (40%)', debe: 1600, haber: 0 },
      { linea: 6, codigoCuenta: '791', denominacionCuenta: 'Cargas imputables a cuenta de costos', debe: 0, haber: 4000 }
    ],
    items: [
      { linea: 1, codigoCuenta: '6321', denominacionCuenta: 'Asesoría contable y jurídica', debe: 4000, haber: 0 },
      { linea: 2, codigoCuenta: '40111', denominacionCuenta: 'IGV Cuenta propia', debe: 720, haber: 0 },
      { linea: 3, codigoCuenta: '4212', denominacionCuenta: 'Facturas por pagar comerciales', debe: 0, haber: 4720 },
      { linea: 4, codigoCuenta: '941', denominacionCuenta: 'Gastos de Administración (60%)', debe: 2400, haber: 0 },
      { linea: 5, codigoCuenta: '951', denominacionCuenta: 'Gastos de Ventas (40%)', debe: 1600, haber: 0 },
      { linea: 6, codigoCuenta: '791', denominacionCuenta: 'Cargas imputables a cuenta de costos', debe: 0, haber: 4000 }
    ],
    totalDebe: 8720,
    totalHaber: 8720
  });

  // --------------------------------------------------------------------------
  // TEST 1: Hoja de Trabajo 10 Columnas — 5 Verificaciones de Cuadre
  // --------------------------------------------------------------------------
  console.log('🔹 Test 1: Hoja de Trabajo 10 Columnas — 5 Verificaciones de Cuadre');
  {
    const hoja = await librosEEFFService.generarHojaTrabajo10Columnas(EMPRESA_TEST, PERIODO_TEST, {
      acumuladoAlMes: false,
      correctorasActivoEnNegativo: false
    });

    assert(hoja.filas.length > 0, 'La Hoja de Trabajo generó filas con movimiento');
    assert(hoja.controlesCuadre.montosCuadrados, 'Control 1: Montos Débito = Montos Crédito (D = C)');
    assert(hoja.controlesCuadre.saldosCuadrados, 'Control 2: Saldo Deudor = Saldo Acreedor');
    assert(hoja.controlesCuadre.balanceCuadrado, 'Control 3: Balance Cuadrado (Activo eq Pasivo con equilibrador)');
    assert(hoja.controlesCuadre.resultadosCoinciden, 'Control 4: Resultado por Naturaleza = Resultado por Función');
    assert(hoja.controlesCuadre.todoCuadrado, 'Control 5: Todo Cuadrado Globalmente');

    assert(hoja.sumasIguales.inventarioActivo === hoja.sumasIguales.inventarioPasivo, 'Sumas Iguales de Inventario cuadran perfectamente');
    assert(hoja.sumasIguales.naturalezaPerdida === hoja.sumasIguales.naturalezaGanancia, 'Sumas Iguales de Naturaleza cuadran perfectamente');
    assert(hoja.sumasIguales.funcionPerdida === hoja.sumasIguales.funcionGanancia, 'Sumas Iguales de Función cuadran perfectamente');
    assert(hoja.resultadoEjercicio.monto > 0, `Resultado del ejercicio calculado: S/ ${hoja.resultadoEjercicio.monto}`);
  }

  // --------------------------------------------------------------------------
  // TEST 2: Detección Automática de Discrepancia Naturaleza vs Función
  // --------------------------------------------------------------------------
  console.log('🔹 Test 2: Detección Automática de Discrepancia Naturaleza vs Función');
  {
    const asientoAlterado = {
      id: `ast-7c2-alterado`,
      empresaId: EMPRESA_TEST,
      periodo: PERIODO_TEST,
      periodoId: `per-${PERIODO_TEST}`,
      subdiario: '01',
      numero: '01099999',
      numeroAsiento: '01099999',
      fecha: '2026-09-20',
      glosa: 'Asiento alterado para probar descuadre de función',
      moneda: 'PEN',
      estado: 'CONTABILIZADO',
      cuo: '019999',
      items: [
        { linea: 1, codigoCuenta: '6511', denominacionCuenta: 'Otros gastos de gestión', debe: 1500, haber: 0 },
        { linea: 2, codigoCuenta: '4212', denominacionCuenta: 'Facturas por pagar', debe: 0, haber: 1500 }
      ],
      totalDebe: 1500,
      totalHaber: 1500
    };

    ASIENTOS_MEMORIA.push(asientoAlterado);

    const hojaAlterada = await librosEEFFService.generarHojaTrabajo10Columnas(EMPRESA_TEST, PERIODO_TEST, {
      acumuladoAlMes: false
    });

    assert(!hojaAlterada.controlesCuadre.resultadosCoinciden, 'Discrepancia detectada: Naturaleza != Función');
    assert(hojaAlterada.controlesCuadre.diferenciaNaturalezaFuncion === 1500, 'Diferencia exacta calculada: S/ 1,500.00');
    assert(hojaAlterada.controlesCuadre.alertas.some(a => a.includes('DISCREPANCIA NATURALEZA VS FUNCIÓN')), 'Alerta roja descriptiva generada');

    const idx = ASIENTOS_MEMORIA.findIndex(a => a.id === 'ast-7c2-alterado');
    if (idx >= 0) ASIENTOS_MEMORIA.splice(idx, 1);
  }

  // --------------------------------------------------------------------------
  // TEST 3: Cuentas Correctoras de Activo (39 Depreciación) en Negativo vs Pasivo
  // --------------------------------------------------------------------------
  console.log('🔹 Test 3: Regla para Cuentas Correctoras de Activo (39 Depreciación)');
  {
    const hojaPasivo = await librosEEFFService.generarHojaTrabajo10Columnas(EMPRESA_TEST, PERIODO_TEST, {
      acumuladoAlMes: false,
      correctorasActivoEnNegativo: false
    });
    const fila39Pasivo = hojaPasivo.filas.find(f => f.codigoCuenta === '3913');
    assert(fila39Pasivo !== undefined, 'Cuenta 3913 encontrada en la Hoja de Trabajo');
    assert(fila39Pasivo!.inventarioPasivo === 5000, 'Cuenta 3913 mostrada en Pasivo con valor positivo');

    const hojaActivoNeg = await librosEEFFService.generarHojaTrabajo10Columnas(EMPRESA_TEST, PERIODO_TEST, {
      acumuladoAlMes: false,
      correctorasActivoEnNegativo: true
    });
    const fila39Activo = hojaActivoNeg.filas.find(f => f.codigoCuenta === '3913');
    assert(fila39Activo!.inventarioActivo === -5000, 'Cuenta 3913 mostrada en Activo con signo negativo (-5000)');
    assert(fila39Activo!.inventarioPasivo === 0, 'Cuenta 3913 en Pasivo es 0 cuando se presenta en Activo negativo');

    assert(
      hojaPasivo.resultadoEjercicio.monto === hojaActivoNeg.resultadoEjercicio.monto,
      `Resultado del ejercicio idéntico en ambas modalidades: S/ ${hojaPasivo.resultadoEjercicio.monto}`
    );
    assert(hojaActivoNeg.controlesCuadre.balanceCuadrado, 'Balance se mantiene cuadrado con correctoras en negativo');
  }

  // --------------------------------------------------------------------------
  // TEST 4: Libro Diario SISCONT — Estructura Jerárquica & Subdiarios
  // --------------------------------------------------------------------------
  console.log('🔹 Test 4: Libro Diario SISCONT — Estructura Jerárquica & Subdiarios');
  {
    const diario = await librosEEFFService.generarLibroDiarioSISCONT(EMPRESA_TEST, PERIODO_TEST, {
      incluirAjustesYCierre: true,
      formatoFecha: 'DD/MM/AAAA'
    });

    assert(diario.subdiarios.length >= 3, `Subdiarios generados en el Diario: ${diario.subdiarios.length}`);
    assert(diario.estaCuadrado, 'Total General del Diario cuadrado (Total Débito = Total Crédito)');

    for (const sub of diario.subdiarios) {
      assert(sub.cuadrado, `Subdiario ${sub.codigo} cuadrado`);
      for (const v of sub.vouchers) {
        assert(v.cuadrado, `Voucher ${v.numeroVoucher} cuadrado`);
        assert(v.cuo.length > 0, `Voucher ${v.numeroVoucher} cuenta con CUO oficial: ${v.cuo}`);
      }
    }
  }

  // --------------------------------------------------------------------------
  // TEST 5: Consistencia: Total del Diario == Total de la Hoja (Montos)
  // --------------------------------------------------------------------------
  console.log('🔹 Test 5: Consistencia Absoluta: Total Diario == Total Hoja de Trabajo');
  {
    const diario = await librosEEFFService.generarLibroDiarioSISCONT(EMPRESA_TEST, PERIODO_TEST, {
      incluirAjustesYCierre: true
    });
    const hoja = await librosEEFFService.generarHojaTrabajo10Columnas(EMPRESA_TEST, PERIODO_TEST, {
      acumuladoAlMes: false,
      incluirCierreYAjustes: true
    });

    assert(
      Math.abs(diario.totalGeneralDebito - hoja.totales.montosDebe) < 0.01,
      `Total Débito del Diario (S/ ${diario.totalGeneralDebito}) coincide con Débito de la Hoja (S/ ${hoja.totales.montosDebe})`
    );
    assert(
      Math.abs(diario.totalGeneralCredito - hoja.totales.montosHaber) < 0.01,
      `Total Crédito del Diario (S/ ${diario.totalGeneralCredito}) coincide con Crédito de la Hoja (S/ ${hoja.totales.montosHaber})`
    );
  }

  // --------------------------------------------------------------------------
  // TEST 6: Consistencia del Libro Diario con el Archivo Oficial PLE 5.1
  // --------------------------------------------------------------------------
  console.log('🔹 Test 6: Consistencia del Libro Diario con el Archivo Oficial PLE 5.1');
  {
    const diario = await librosEEFFService.generarLibroDiarioSISCONT(EMPRESA_TEST, PERIODO_TEST);
    const ple = await librosEEFFService.generarPle51DiarioTxt(EMPRESA_TEST, PERIODO_TEST);

    assert(ple.contenidoTxt.length > 0, 'Archivo PLE 5.1 generado con contenido válido');
    assert(ple.nombreArchivo.includes('050100'), `Nombre de archivo oficial PLE 5.1: ${ple.nombreArchivo}`);

    const lineasEnVouchers = diario.subdiarios.reduce((acc, s) => acc + s.vouchers.reduce((vAcc, v) => vAcc + v.lineas.length, 0), 0);
    assert(ple.totalLineas === lineasEnVouchers, `Total de líneas en PLE (${ple.totalLineas}) coincide con líneas del Diario (${lineasEnVouchers})`);

    const primerVoucher = diario.subdiarios[0].vouchers[0];
    assert(ple.contenidoTxt.includes(primerVoucher.cuo), `CUO ${primerVoucher.cuo} presente en el archivo PLE 5.1`);
  }

  // --------------------------------------------------------------------------
  // TEST 7: Opciones y Filtros del Libro Diario
  // --------------------------------------------------------------------------
  console.log('🔹 Test 7: Opciones y Filtros del Libro Diario');
  {
    const diarioSinCierre = await librosEEFFService.generarLibroDiarioSISCONT(EMPRESA_TEST, PERIODO_TEST, {
      incluirAjustesYCierre: false
    });
    const tieneSub00 = diarioSinCierre.subdiarios.some(s => s.codigo === '00' || s.codigo === '09');
    assert(!tieneSub00, 'Subdiarios 00 y 09 excluidos exitosamente con el interruptor');

    const diarioFechaDma = await librosEEFFService.generarLibroDiarioSISCONT(EMPRESA_TEST, PERIODO_TEST, {
      formatoFecha: 'DD/MM/AAAA'
    });
    const fechaEjemplo = diarioFechaDma.subdiarios[0].vouchers[0].fecha;
    assert(fechaEjemplo.includes('/'), `Fecha formateada correctamente en formato DD/MM/AAAA: ${fechaEjemplo}`);
  }

  // Limpiar asientos de prueba
  for (let i = ASIENTOS_MEMORIA.length - 1; i >= 0; i--) {
    if (ASIENTOS_MEMORIA[i].empresaId === EMPRESA_TEST) {
      ASIENTOS_MEMORIA.splice(i, 1);
    }
  }

  console.log('\n========================================================================');
  console.log(`🏆 SUITE FASE 7C-2 COMPLETADA: ${passed}/${total} PRUEBAS EXITOSAS`);
  console.log('========================================================================\n');
}

ejecutarSuiteFase7C2().catch(err => {
  console.error('Error fatal en Suite Fase 7C-2:', err);
  process.exit(1);
});
