import { planillaService, TRABAJADORES_MEMORIA, PLANILLAS_MEMORIA } from '../services/planillaService';
import { honorariosService, HONORARIOS_MEMORIA } from '../services/honorariosService';
import { conciliadorSireService, CONCILIACIONES_SIRE_MEMORIA, REGLAS_PROVEEDOR_SIRE_MEMORIA } from '../services/conciliadorSireService';
import { sireService, SIRE_PROPUESTAS_MEMORIA } from '../services/sireService';
import { compraService, COMPRAS_MEMORIA } from '../services/compraService';
import { periodoService } from '../services/periodoService';
import { auditoriaChainService } from '../services/auditoriaChainService';
import AdmZip from 'adm-zip';

async function ejecutarSuiteFase9() {
  console.log('======================================================');
  console.log('🧪 SUITE DE PRUEBAS AUTOMATIZADAS — FASE 9: AUTOMATIZACIÓN TRIBUTARIA AVANZADA, PLAME & SIRE CIERRE');
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
      throw new Error(`Fallo en prueba Fase 9: ${desc}`);
    }
  }

  const EMPRESA_A = '00000000-0000-0000-0000-000000000091';
  const EMPRESA_B = '00000000-0000-0000-0000-000000000092';
  const PERIODO_TEST = '2026-09';
  const USER_ID = 'usr-auditor-f9';

  await periodoService.abrirPeriodo(EMPRESA_A, PERIODO_TEST, USER_ID);
  await periodoService.abrirPeriodo(EMPRESA_B, PERIODO_TEST, USER_ID);

  // --------------------------------------------------------------------------
  // TEST 1: Generación y Empaquetado Oficial PLAME PDT 0601 y T-Registro (9.1)
  // --------------------------------------------------------------------------
  console.log('🔹 Test 1: Exportador Oficial PLAME (PDT 0601 / T-Registro - .rem, .jor, .snl, .des)');
  {
    // 1.1 Registrar trabajadores para Empresa A
    const trab1Id = `trab-f9-01-${Date.now()}`;
    const trab2Id = `trab-f9-02-${Date.now()}`;

    TRABAJADORES_MEMORIA.push(
      {
        id: trab1Id,
        empresaId: EMPRESA_A,
        tipoDocumento: '01',
        numeroDocumento: '71889901',
        nombres: 'Roberto Carlos',
        apellidos: 'García Pérez',
        cargo: 'Jefe de Logística',
        regimenLaboral: 'GENERAL',
        sueldoBase: 4200.00,
        tieneAsignacionFamiliar: true,
        sistemaPensiones: 'ONP',
        centroCosto: 'CC-LOGISTICA',
        fechaIngreso: '2024-01-10',
        activo: true,
        version: 1
      },
      {
        id: trab2Id,
        empresaId: EMPRESA_A,
        tipoDocumento: '01',
        numeroDocumento: '72990012',
        nombres: 'María Elena',
        apellidos: 'Ríos Saldaña',
        cargo: 'Analista de Sistemas',
        regimenLaboral: 'GENERAL',
        sueldoBase: 3800.00,
        tieneAsignacionFamiliar: false,
        sistemaPensiones: 'AFP',
        afpAdministradora: 'INTEGRA',
        afpTipoComision: 'FLUJO',
        centroCosto: 'CC-SISTEMAS',
        fechaIngreso: '2024-03-01',
        activo: true,
        version: 1
      }
    );

    // 1.2 Registrar Recibo por Honorarios para 4ta Categoría
    await honorariosService.registrarRecibo(EMPRESA_A, {
      periodoId: `per-${PERIODO_TEST}`,
      proveedorId: 'prv-10445566771',
      proveedorRuc: '10445566771',
      proveedorNombre: 'ING. JORGE RAMIREZ ALVARADO',
      serie: 'E001',
      numero: '0000452',
      fechaEmision: '2026-09-15',
      fechaPago: '2026-09-20',
      moneda: 'PEN',
      importeBruto: 2500.00,
      cuentaGasto: '6321',
      glosa: 'Servicio de consultoría en infraestructura TI'
    }, USER_ID);

    // 1.3 Calcular Planilla
    const planillaCalculada = await planillaService.calcularPlanilla(EMPRESA_A, `per-${PERIODO_TEST}`, PERIODO_TEST, USER_ID);
    assert(planillaCalculada.lineas.length >= 2, 'Planilla calculó correctamente los colaboradores registrados');

    // 1.4 Exportar archivo PLAME PDT 0601
    const exportacion = await planillaService.exportarPlame(EMPRESA_A, planillaCalculada.id);

    assert(exportacion.estado === 'GENERADO_OFICIAL', 'Estado de exportación marcado como GENERADO_OFICIAL');
    assert(Boolean(exportacion.nombreArchivoZip), 'Nombre de archivo ZIP generado');
    assert(exportacion.nombreArchivoZip!.startsWith('0601202609'), `Nomenclatura ZIP oficial cumple formato 0601{AAAA}{MM}{RUC}.zip (${exportacion.nombreArchivoZip})`);
    assert(Boolean(exportacion.zipBase64), 'Contenido ZIP en Base64 disponible para descarga');

    // 1.5 Validar contenido interno de las 4 estructuras
    const zip = new AdmZip(Buffer.from(exportacion.zipBase64!, 'base64'));
    const zipEntries = zip.getEntries().map(e => e.entryName);

    assert(zipEntries.some(e => e.endsWith('.rem')), 'Estructura .rem (Remuneraciones) incluida en el archivo ZIP');
    assert(zipEntries.some(e => e.endsWith('.jor')), 'Estructura .jor (Jornada Laboral) incluida en el archivo ZIP');
    assert(zipEntries.some(e => e.endsWith('.snl')), 'Estructura .snl (Conceptos Detallados SUNAT) incluida en el archivo ZIP');
    assert(zipEntries.some(e => e.endsWith('.des')), 'Estructura .des (Prestadores de 4ta Categoría) incluida en el archivo ZIP');

    // Validar líneas y delimitadores pleca
    const remTxt = exportacion.archivos!.rem.contenido;
    assert(remTxt.includes('|'), 'Estructura .rem utiliza delimitador oficial pleca (|)');
    assert(remTxt.includes('71889901'), 'DNI del trabajador presente en .rem');

    const jorTxt = exportacion.archivos!.jor.contenido;
    assert(jorTxt.includes('|30|0|240|0|'), 'Jornada laboral estándar (30 días, 240 horas) presente en .jor');

    const snlTxt = exportacion.archivos!.snl.contenido;
    assert(snlTxt.includes('0121'), 'Concepto SUNAT 0121 (Remuneración básica) presente en .snl');
    assert(snlTxt.includes('0201'), 'Concepto SUNAT 0201 (Asignación familiar) presente en .snl');
    assert(snlTxt.includes('0804'), 'Concepto SUNAT 0804 (EsSalud 9%) presente en .snl');

    const desTxt = exportacion.archivos!.des.contenido;
    assert(desTxt.includes('10445566771'), 'RUC de prestador de 4ta categoría presente en .des');
    assert(desTxt.includes('E001|0000452'), 'Serie y número del recibo por honorarios presentes en .des');
  }

  // --------------------------------------------------------------------------
  // TEST 2: Clasificación de los 8 Estados Normativos del SIRE (9.1)
  // --------------------------------------------------------------------------
  console.log('\n🔹 Test 2: Clasificación de los 8 Estados Normativos del SIRE (RCE)');
  {
    const periodoSire = '2026-09';

    // Crear comprobantes en ERP para generar los diferentes estados
    await compraService.registrar(EMPRESA_A, {
      periodoId: `per-${periodoSire}`,
      fechaEmision: '2026-09-05',
      fechaContable: '2026-09-05',
      tipoComprobante: '01',
      serie: 'F001',
      numero: '0000101',
      proveedorId: 'prv-20100000001',
      baseGravada: 1000,
      igv: 180,
      total: 1180
    }, USER_ID);

    // Comprobante con diferencia de importe en ERP
    await compraService.registrar(EMPRESA_A, {
      periodoId: `per-${periodoSire}`,
      fechaEmision: '2026-09-06',
      fechaContable: '2026-09-06',
      tipoComprobante: '01',
      serie: 'F001',
      numero: '0000102',
      proveedorId: 'prv-20200000002',
      baseGravada: 2000,
      igv: 360,
      total: 2360
    }, USER_ID);

    // Comprobante SOLO_EN_SISTEMA
    await compraService.registrar(EMPRESA_A, {
      periodoId: `per-${periodoSire}`,
      fechaEmision: '2026-09-07',
      fechaContable: '2026-09-07',
      tipoComprobante: '01',
      serie: 'F001',
      numero: '0000103',
      proveedorId: 'prv-20300000003',
      baseGravada: 500,
      igv: 90,
      total: 590
    }, USER_ID);

    // Propuesta SUNAT con los estados correspondientes
    SIRE_PROPUESTAS_MEMORIA.push({
      id: `prop-${EMPRESA_A}-COMPRAS-${periodoSire}`,
      empresaId: EMPRESA_A,
      tipo: 'COMPRAS',
      periodo: periodoSire,
      fechaDescarga: new Date().toISOString(),
      totalRegistros: 6,
      totalBaseGravada: 8000,
      totalIgv: 1440,
      totalImporte: 9440,
      hashArchivo: 'hash-f9-test-sire',
      lineas: [
        // 1. COINCIDE
        {
          car: '2010000000101F0010000101',
          tipoComprobante: '01',
          serie: 'F001',
          numero: '0000101',
          fechaEmision: '2026-09-05',
          rucEmisor: '20100000001',
          razonSocialEmisor: 'PROVEEDOR COINCIDENTE S.A.C.',
          moneda: 'PEN',
          baseGravada: 1000,
          igv: 180,
          total: 1180
        },
        // 2. DIFERENCIA_IMPORTE (SUNAT tiene 2,500 vs ERP 2,360)
        {
          car: '2020000000201F0010000102',
          tipoComprobante: '01',
          serie: 'F001',
          numero: '0000102',
          fechaEmision: '2026-09-06',
          rucEmisor: '20200000002',
          razonSocialEmisor: 'PROVEEDOR DIFERENCIA S.A.C.',
          moneda: 'PEN',
          baseGravada: 2118.64,
          igv: 381.36,
          total: 2500
        },
        // 3. SOLO_EN_SUNAT
        {
          car: '2040000000401F0010000104',
          tipoComprobante: '01',
          serie: 'F001',
          numero: '0000104',
          fechaEmision: '2026-09-12',
          rucEmisor: '20400000004',
          razonSocialEmisor: 'PROVEEDOR SOLO SUNAT S.A.C.',
          moneda: 'PEN',
          baseGravada: 800,
          igv: 144,
          total: 944
        },
        // 4. ANULADO_EN_SUNAT
        {
          car: '2050000000501F0010000105',
          tipoComprobante: '01',
          serie: 'F001',
          numero: '0000105',
          fechaEmision: '2026-09-14',
          rucEmisor: '20500000005',
          razonSocialEmisor: 'PROVEEDOR ANULADO S.A.C.',
          moneda: 'PEN',
          baseGravada: 600,
          igv: 108,
          total: 708,
          estadoComprobante: 'ANULADO'
        } as any
      ]
    });

    const concil = await conciliadorSireService.conciliarPeriodo(EMPRESA_A, 'COMPRAS', periodoSire);

    assert(concil.totalCoinciden >= 1, 'Estado COINCIDE detectado y cuantificado');
    assert(concil.totalDiferencias >= 1, 'Estado DIFERENCIA_IMPORTE detectado y cuantificado');
    assert(concil.totalSoloSistema >= 1, 'Estado SOLO_EN_SISTEMA detectado y cuantificado');
    assert(concil.totalSoloSunat >= 1, 'Estado SOLO_EN_SUNAT detectado y cuantificado');
    assert(concil.totalAnuladosSunat >= 1, 'Estado ANULADO_EN_SUNAT detectado y cuantificado');
  }

  // --------------------------------------------------------------------------
  // TEST 3: Motor de Reglas por Proveedor y Contabilización Automática (9.2)
  // --------------------------------------------------------------------------
  console.log('\n🔹 Test 3: Motor de Reglas por Proveedor (Destinos 1-4, Cuentas PCGE, Centros de Costo)');
  {
    const RUC_REG_1 = '20777888991';
    const RUC_REG_3 = '20777888993';

    // Regla 1: Compra mercadería con crédito fiscal (Destino 1 -> 6011)
    await conciliadorSireService.guardarReglaProveedor(EMPRESA_A, {
      empresaId: EMPRESA_A,
      proveedorRuc: RUC_REG_1,
      proveedorRazonSocial: 'PROVEEDOR MERCADERIAS NORTE S.A.C.',
      destinoCompra: 'DESTINO_1',
      cuentaGasto: '6011',
      centroCostoId: 'CC-ALMACEN',
      formaPagoDefault: 'CREDITO',
      aprobacionAutomatica: true
    });

    // Regla 2: Gasto de representación sin crédito fiscal (Destino 3 -> 6511)
    await conciliadorSireService.guardarReglaProveedor(EMPRESA_A, {
      empresaId: EMPRESA_A,
      proveedorRuc: RUC_REG_3,
      proveedorRazonSocial: 'RESTAURANT Y EVENTOS EJECUTIVOS S.A.C.',
      destinoCompra: 'DESTINO_3',
      cuentaGasto: '6511',
      centroCostoId: 'CC-GERENCIA',
      formaPagoDefault: 'CONTADO',
      aprobacionAutomatica: true
    });

    const reglas = conciliadorSireService.listarReglasProveedor(EMPRESA_A);
    assert(reglas.some(r => r.proveedorRuc === RUC_REG_1 && r.destinoCompra === 'DESTINO_1'), 'Regla Destino 1 (Crédito Fiscal) registrada');
    assert(reglas.some(r => r.proveedorRuc === RUC_REG_3 && r.destinoCompra === 'DESTINO_3'), 'Regla Destino 3 (Sin Crédito Fiscal) registrada');

    // Probar aceptación con regla Destino 3: debe enviar IGV a costo/gasto sin crédito fiscal
    const idConcil = `concil-regla-${Date.now()}`;
    const idLineaD3 = `linea-d3-${Date.now()}`;

    CONCILIACIONES_SIRE_MEMORIA.push({
      id: idConcil,
      empresaId: EMPRESA_A,
      tipo: 'COMPRAS',
      periodo: PERIODO_TEST,
      fechaConciliacion: new Date().toISOString(),
      totalCoinciden: 0,
      totalSoloSistema: 0,
      totalSoloSunat: 1,
      totalDiferencias: 0,
      totalAnuladosSunat: 0,
      totalPeriodoDistinto: 0,
      totalDiferenciaOtrosCampos: 0,
      totalPosibleDuplicado: 0,
      lineas: [
        {
          id: idLineaD3,
          conciliacionId: idConcil,
          empresaId: EMPRESA_A,
          claveComprobante: `01-F001-0003001-${RUC_REG_3}`,
          tipo: 'COMPRAS',
          tipoComprobante: '01',
          serie: 'F001',
          numero: '0003001',
          fechaEmision: '2026-09-18',
          rucEmisor: RUC_REG_3,
          razonSocialEmisor: 'RESTAURANT Y EVENTOS EJECUTIVOS S.A.C.',
          moneda: 'PEN',
          baseSunat: 1000,
          igvSunat: 180,
          totalSunat: 1180,
          estadoConciliacion: 'SOLO_EN_SUNAT',
          car: '2077788899301F0010003001'
        } as any
      ]
    });

    const resAceptacionD3 = await conciliadorSireService.aceptarPropuestaLinea(EMPRESA_A, idLineaD3, USER_ID);
    assert(resAceptacionD3.success, 'Propuesta aceptada aplicando motor de reglas');

    const compraGen = COMPRAS_MEMORIA.find(c => c.id === resAceptacionD3.comprobanteGeneradoId)!;
    assert(compraGen.tipoAdquisicion === '3', 'Destino 3: Clasificado oficialmente como tipo 3 (sin crédito fiscal según R.S. N° 112-2021)');
    assert(compraGen.total === 1180, 'Total facturado íntegro registrado');
  }

  // --------------------------------------------------------------------------
  // TEST 4: Reversión Atómica de Aceptación SIRE con Extorno Contable (9.2)
  // --------------------------------------------------------------------------
  console.log('\n🔹 Test 4: Reversión Atómica de Aceptación SIRE con Extorno Contable');
  {
    const idConcilRev = `concil-rev-${Date.now()}`;
    const idLineaRev = `linea-rev-${Date.now()}`;
    const RUC_REV = '20999111222';

    CONCILIACIONES_SIRE_MEMORIA.push({
      id: idConcilRev,
      empresaId: EMPRESA_A,
      tipo: 'COMPRAS',
      periodo: PERIODO_TEST,
      fechaConciliacion: new Date().toISOString(),
      totalCoinciden: 0,
      totalSoloSistema: 0,
      totalSoloSunat: 1,
      totalDiferencias: 0,
      totalAnuladosSunat: 0,
      totalPeriodoDistinto: 0,
      totalDiferenciaOtrosCampos: 0,
      totalPosibleDuplicado: 0,
      lineas: [
        {
          id: idLineaRev,
          conciliacionId: idConcilRev,
          empresaId: EMPRESA_A,
          claveComprobante: `01-F001-0004001-${RUC_REV}`,
          tipo: 'COMPRAS',
          tipoComprobante: '01',
          serie: 'F001',
          numero: '0004001',
          fechaEmision: '2026-09-19',
          rucEmisor: RUC_REV,
          razonSocialEmisor: 'PROVEEDOR REVERSION S.A.C.',
          moneda: 'PEN',
          baseSunat: 500,
          igvSunat: 90,
          totalSunat: 590,
          estadoConciliacion: 'SOLO_EN_SUNAT',
          car: '2099911122201F0010004001'
        } as any
      ]
    });

    // 1. Aceptar
    const resAceptado = await conciliadorSireService.aceptarPropuestaLinea(EMPRESA_A, idLineaRev, USER_ID);
    assert(resAceptado.success, 'Comprobante aceptado previamente');

    // 2. Revertir
    const resReversion = await conciliadorSireService.revertirAceptacionPropuesta(
      EMPRESA_A,
      idLineaRev,
      'Error de asignación por auditor tributario',
      USER_ID
    );

    assert(resReversion.success, 'Reversión de propuesta SIRE procesada con éxito');
    assert(Boolean(resReversion.extornoId), 'Asiento contable de extorno generado atómicamente');

    const lineaActual = CONCILIACIONES_SIRE_MEMORIA.flatMap(c => c.lineas).find(l => l.id === idLineaRev)!;
    assert(lineaActual.decision === 'PENDIENTE', 'Estado de la línea SIRE restituido a PENDIENTE');
  }

  // --------------------------------------------------------------------------
  // TEST 5: Cierre del Ciclo SIRE: Aceptación Oficial de Propuesta (9.3)
  // --------------------------------------------------------------------------
  console.log('\n🔹 Test 5: Cierre Oficial del Ciclo SIRE: Aceptación de Propuesta');
  {
    const resCierre = await conciliadorSireService.aceptarPropuestaSireOficial(
      EMPRESA_A,
      'COMPRAS',
      PERIODO_TEST,
      USER_ID
    );

    assert(resCierre.success, 'Aceptación oficial de propuesta procesada');
    assert(Boolean(resCierre.ticket), `Ticket SUNAT emitido: ${resCierre.ticket}`);
    assert(resCierre.especificacionNormativa.includes('R.S. N° 000112-2021'), 'Certificación con R.S. N° 000112-2021/SUNAT');
  }

  // --------------------------------------------------------------------------
  // TEST 6: Cierre del Ciclo SIRE: Reemplazo de Propuesta con Archivo Plano (9.3)
  // --------------------------------------------------------------------------
  console.log('\n🔹 Test 6: Cierre Oficial del Ciclo SIRE: Reemplazo de Propuesta');
  {
    const comprobantesReemplazo = [
      {
        tipoComprobante: '01',
        serie: 'F001',
        numero: '0000001',
        fechaEmision: '2026-09-01',
        rucEmisor: '20100000001',
        razonSocialEmisor: 'PROVEEDOR REEMPLAZO 1 S.A.C.',
        baseGravada: 1000,
        igv: 180,
        total: 1180
      }
    ];

    const resReemplazo = await conciliadorSireService.reemplazarPropuestaSireOficial(
      EMPRESA_A,
      'COMPRAS',
      PERIODO_TEST,
      comprobantesReemplazo,
      USER_ID
    );

    assert(resReemplazo.success, 'Reemplazo de propuesta oficial procesado');
    assert(resReemplazo.ticket.startsWith('TCK-REEMP-'), 'Ticket de reemplazo emitido');
    assert(resReemplazo.estadoApiSunat === 'PENDIENTE_VERIFICAR_SUNAT', 'Estado de cola fijado en PENDIENTE_VERIFICAR_SUNAT');
  }

  // --------------------------------------------------------------------------
  // TEST 7: Ajustes Posteriores SIRE (Anexos 11, 12, 13) (9.3)
  // --------------------------------------------------------------------------
  console.log('\n🔹 Test 7: Ajustes Posteriores SIRE (Anexos 11, 12, 13 - RCE/RVIE)');
  {
    const periodoAjuste = '2026-09';
    const periodoAfectado = '2026-05';

    const ajusteData = {
      anexo: 'ANEXO_11_RCE',
      tipoOperacion: 'AJUSTE_POSTERIOR',
      indicadorEstado: '8', // Estado 8: Ajuste posterior RCE
      carModificado: '2010000000101F0010000050',
      motivoAjuste: 'Rectificación de crédito fiscal período Mayo 2026',
      diferenciaBase: -200,
      diferenciaIgv: -36
    };

    const resAjuste = await conciliadorSireService.registrarAjustePosterior(
      EMPRESA_A,
      periodoAjuste,
      periodoAfectado,
      ajusteData,
      USER_ID
    );

    assert(resAjuste.success, 'Ajuste posterior registrado');
    assert(resAjuste.periodoAjuste === periodoAjuste, 'Período de ajuste 2026-09 registrado');
    assert(resAjuste.periodoAfectado === periodoAfectado, 'Período afectado 2026-05 vinculado');
    assert(resAjuste.estadoApiSunat === 'PENDIENTE_VERIFICAR_SUNAT', 'Estado de seguimiento encolado');
  }

  // --------------------------------------------------------------------------
  // TEST 8: Aislamiento Multiempresa Estricto (Reglas, Propuestas y Paquetes PLAME)
  // --------------------------------------------------------------------------
  console.log('\n🔹 Test 8: Aislamiento Multiempresa Estricto');
  {
    // Reglas de Empresa A no son visibles para Empresa B
    const reglasEmpresaB = conciliadorSireService.listarReglasProveedor(EMPRESA_B);
    assert(!reglasEmpresaB.some(r => r.empresaId === EMPRESA_A), 'Aislamiento: Empresa B no puede acceder a las reglas de Empresa A');

    // Intentar exportar PLAME de una planilla que no pertenece a Empresa B
    const planillasA = PLANILLAS_MEMORIA.filter(p => p.empresaId === EMPRESA_A);
    if (planillasA.length > 0) {
      let bloqueoTenant = false;
      try {
        await planillaService.exportarPlame(EMPRESA_B, planillasA[0].id);
      } catch (err: any) {
        bloqueoTenant = err.message.includes('PLANILLA_NO_ENCONTRADA');
      }
      assert(bloqueoTenant, 'Aislamiento: Empresa B no puede exportar paquetes PLAME de Empresa A');
    }
  }

  console.log('\n======================================================');
  console.log(`📊 RESULTADO SUITE FASE 9: ${passed}/${total} PRUEBAS EXITOSAS`);
  console.log('🎉 TODAS LAS PRUEBAS DE AUTOMATIZACIÓN TRIBUTARIA AVANZADA, PLAME Y SIRE PASARON SATISFACTORIAMENTE.');
  console.log('======================================================\n');
}

ejecutarSuiteFase9().catch(err => {
  console.error('❌ Error fatal en suite Fase 9:', err);
  process.exit(1);
});
