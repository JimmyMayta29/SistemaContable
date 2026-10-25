import assert from 'assert';
import { importacionService, LOTES_HISTORIAL_MEMORIA } from '../services/importacionService';
import { ANEXOS_MEMORIA } from '../services/anexoService';
import { ASIENTOS_MEMORIA } from '../services/asientoService';
import { empresaRepository, EMPRESAS_STORE } from '../repositories/empresaRepository';

async function ejecutarSuiteFase13Importacion() {
  console.log('========================================================================');
  console.log('🧪 SUITE DE PRUEBAS AUTOMATIZADAS — FASE 13: MOTOR DE IMPORTACIÓN CSV/HOJA DE CÁLCULO');
  console.log('   (Plantillas, Neutralización CSV, Validación Módulo 11, Cuadre & Rollback)');
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

  const EMPRESA_TEST_ID = 'emp-test-import-01';
  if (!EMPRESAS_STORE.some(e => e.id === EMPRESA_TEST_ID)) {
    EMPRESAS_STORE.push({
      id: EMPRESA_TEST_ID,
      tenantId: '00000000-0000-0000-0000-000000000001',
      codigoEmpresa: 'IMP01',
      ruc: '20601122334',
      razonSocial: 'EMPRESA IMPORTACION TEST S.A.C.',
      regimenTributario: 'MYPE_TRIBUTARIO',
      domicilioFiscal: 'AV. COMERCIO 100',
      monedaPrincipal: 'PEN',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }

  // --------------------------------------------------------------------------
  // TEST 1: Generación de Plantillas Normativas Oficiales
  // --------------------------------------------------------------------------
  console.log('🔹 Test 1: Generación de Plantillas CSV Normativas Oficiales');
  {
    const tipos = ['PROVEEDORES', 'CLIENTES', 'PLAN_CUENTAS', 'SALDOS_INICIALES', 'TRABAJADORES', 'ARTICULOS'] as const;
    for (const t of tipos) {
      const plantilla = importacionService.obtenerPlantillaCsv(t);
      testAssert(plantilla.nombreArchivo.endsWith('.csv'), `Plantilla para ${t} tiene extensión .csv`);
      testAssert(plantilla.contenidoCsv.length > 50, `Plantilla para ${t} contiene datos y cabeceras normativas`);
      testAssert(plantilla.contenidoCsv.includes('\n'), `Plantilla para ${t} contiene salto de línea`);
    }
  }

  // --------------------------------------------------------------------------
  // TEST 2: Neutralización de Inyección de Fórmulas CSV (CSV Injection Defense)
  // --------------------------------------------------------------------------
  console.log('\n🔹 Test 2: Neutralización de Fórmulas Maliciosas en CSV');
  {
    const valFormula1 = '=SUM(A1:A10)';
    const neut1 = importacionService.neutralizarInyeccionCsv(valFormula1);
    testAssert(neut1 === "'=SUM(A1:A10)", 'Fórmulas con = son escapadas con comilla simple');

    const valFormula2 = '+cmd|"/c calc"!A1';
    const neut2 = importacionService.neutralizarInyeccionCsv(valFormula2);
    testAssert(neut2 === "'+cmd|\"/c calc\"!A1", 'Comandos con + son escapados con comilla simple');

    const valFormula3 = '@SUM(1,2)';
    const neut3 = importacionService.neutralizarInyeccionCsv(valFormula3);
    testAssert(neut3 === "'@SUM(1,2)", 'Comandos con @ son escapados con comilla simple');

    const textoNormal = 'DISTRIBUIDORA NORTE S.A.C.';
    testAssert(importacionService.neutralizarInyeccionCsv(textoNormal) === textoNormal, 'Texto normal no es alterado');
  }

  // --------------------------------------------------------------------------
  // TEST 3: Parser Inteligente con Detección de Delimitador (; y ,) y Comillas
  // --------------------------------------------------------------------------
  console.log('\n🔹 Test 3: Parser de CSV Multiformato con Detección Automática');
  {
    const csvComa = 'tipo_doc,numero_doc,razon_social\n6,20100000019,"DISTRIBUIDORA, S.A.C."';
    const parsedComa = importacionService.parsearCsv(csvComa);
    testAssert(parsedComa.length === 2, 'Detecta correctamente 2 filas en CSV delimitado por comas');
    testAssert(parsedComa[1][2] === 'DISTRIBUIDORA, S.A.C.', 'Preserva comas internas entre comillas');

    const csvPuntoYComa = 'tipo_doc;numero_doc;razon_social\n6;20100000019;DISTRIBUIDORA SUR';
    const parsedPyC = importacionService.parsearCsv(csvPuntoYComa);
    testAssert(parsedPyC.length === 2, 'Detecta correctamente 2 filas en CSV delimitado por punto y coma');
    testAssert(parsedPyC[1][1] === '20100000019', 'Extrae valores correctamente en formato punto y coma');
  }

  // --------------------------------------------------------------------------
  // TEST 4: Análisis y Validación de Clientes y Proveedores con Módulo 11
  // --------------------------------------------------------------------------
  console.log('\n🔹 Test 4: Validación de RUC (Módulo 11) y DNI en Importación de Anexos');
  {
    // Archivo con 1 RUC válido, 1 RUC inválido (falla módulo 11), y 1 DNI válido
    const csvAnexos = 
      'tipo_doc,numero_doc,razon_social,direccion,telefono,email\n' +
      '6,20100000017,"PROVEEDOR VALIDO S.A.C.","AV. 1",999000111,prov@val.pe\n' +
      '6,20100000011,"PROVEEDOR RUC INVALIDO","AV. 2",999000222,prov@inv.pe\n' +
      '1,45678912,"JUAN PEREZ DNI VALIDO","CALLE 3",999000333,juan@val.pe\n';

    const analisis = await importacionService.analizarArchivo(EMPRESA_TEST_ID, 'PROVEEDORES', csvAnexos);
    testAssert(analisis.totalFilas === 3, 'Total de filas detectadas es 3');
    testAssert(analisis.filasValidas === 2, '2 filas son válidas');
    testAssert(analisis.filasInvalidas === 1, '1 fila es inválida por RUC');
    testAssert(analisis.errores.some(e => e.campo === 'numero_doc' && e.mensaje.includes('Módulo 11')), 'Error descriptivo de algoritmo Módulo 11 en RUC');

    // Confirmar importación de las válidas
    const resultado = await importacionService.confirmarImportacion(
      EMPRESA_TEST_ID,
      analisis.loteId,
      { modo: 'OMITIR_ERRORES', duplicados: 'OMITIR' },
      'usr-test-01'
    );
    testAssert(resultado.insertados === 2, '2 registros válidos fueron importados al catálogo');

    const anexoCreado = ANEXOS_MEMORIA.find(a => a.empresaId === EMPRESA_TEST_ID && a.numeroDocumento === '20100000017');
    testAssert(!!anexoCreado, 'Anexo válido fue persistido con su empresaId asociado');
  }

  // --------------------------------------------------------------------------
  // TEST 5: Control Estricto de Cuadre en Saldos Iniciales (Partida Doble)
  // --------------------------------------------------------------------------
  console.log('\n🔹 Test 5: Cuadre de Partida Doble en Saldos Iniciales de Apertura');
  {
    // Caso 1: Archivo Descuadrado (Debe != Haber)
    const csvDescuadrado = 
      'cuenta_codigo,cuenta_nombre,debe,haber,referencia\n' +
      '1041,"Cuentas corrientes operativas",50000.00,0.00,"Saldo BCP"\n' +
      '5011,"Capital Social",0.00,45000.00,"Capital"\n';

    const analisisDescuadre = await importacionService.analizarArchivo(EMPRESA_TEST_ID, 'SALDOS_INICIALES', csvDescuadrado);
    testAssert(analisisDescuadre.cuadraBalance === false, 'Detecta inmediatamente que el balance de apertura está descuadrado');
    testAssert(analisisDescuadre.diferencia === 5000, 'Calcula la diferencia exacta de S/ 5,000.00');

    // Intentar confirmar sin cuadre debe ser rechazado
    let rechazoPorDescuadre = false;
    try {
      await importacionService.confirmarImportacion(
        EMPRESA_TEST_ID,
        analisisDescuadre.loteId,
        { modo: 'TODO_O_NADA', duplicados: 'OMITIR' },
        'usr-test-01'
      );
    } catch (err: any) {
      rechazoPorDescuadre = err.message.includes('BALANCE_DESCUADRADO');
    }
    testAssert(rechazoPorDescuadre, 'Rechazo automático al intentar importar un asiento de apertura descuadrado');

    // Caso 2: Archivo Cuadrado (Debe = Haber = 60,000)
    const csvCuadrado = 
      'cuenta_codigo,cuenta_nombre,debe,haber,referencia\n' +
      '1041,"Cuentas corrientes operativas",50000.00,0.00,"Saldo BCP"\n' +
      '1011,"Caja central",10000.00,0.00,"Caja chica"\n' +
      '5011,"Capital Social",0.00,50000.00,"Capital social"\n' +
      '5911,"Utilidades no distribuidas",0.00,10000.00,"Resultados"\n';

    const analisisCuadrado = await importacionService.analizarArchivo(EMPRESA_TEST_ID, 'SALDOS_INICIALES', csvCuadrado);
    testAssert(analisisCuadrado.cuadraBalance === true, 'Asiento de apertura perfectamente cuadrado (Debe S/ 60,000 = Haber S/ 60,000)');
    testAssert(analisisCuadrado.diferencia === 0, 'Diferencia de cuadre es cero');

    const resApertura = await importacionService.confirmarImportacion(
      EMPRESA_TEST_ID,
      analisisCuadrado.loteId,
      { modo: 'TODO_O_NADA', duplicados: 'OMITIR' },
      'usr-test-01'
    );
    testAssert(resApertura.insertados === 4, '4 cuentas de apertura importadas');

    const asientoApertura = ASIENTOS_MEMORIA.find(a => a.empresaId === EMPRESA_TEST_ID && a.tipoAsiento === 'APERTURA');
    testAssert(!!asientoApertura, 'Asiento contable de apertura generado automáticamente en el Libro Diario');
    testAssert(asientoApertura?.totalDebe === 60000 && asientoApertura?.totalHaber === 60000, 'Asiento generado en el Libro Diario con Debe = Haber = 60,000');
  }

  // --------------------------------------------------------------------------
  // TEST 6: Capacidad de Deshacer (Rollback Atómico de Lote Importado)
  // --------------------------------------------------------------------------
  console.log('\n🔹 Test 6: Rollback Atómico y Deshacer de Lote Importado');
  {
    // Importar un lote de trabajadores
    const csvTrabajadores = 
      'tipo_doc,numero_doc,nombres,apellido_paterno,apellido_materno,cargo,regimen_pensionario,sueldo_basico,asignacion_familiar\n' +
      '1,71234567,"ALBERTO","CASTILLO","VEGA","PROGRAMADOR",AFP_INTEGRA,4000.00,NO\n' +
      '1,72345678,"BEATRIZ","GOMEZ","PEREZ","DISENADORA",ONP,3500.00,SI\n';

    const analisisTrab = await importacionService.analizarArchivo(EMPRESA_TEST_ID, 'TRABAJADORES', csvTrabajadores);
    const resTrab = await importacionService.confirmarImportacion(
      EMPRESA_TEST_ID,
      analisisTrab.loteId,
      { modo: 'TODO_O_NADA', duplicados: 'OMITIR' },
      'usr-test-01'
    );
    testAssert(resTrab.insertados === 2, '2 trabajadores importados');

    // Deshacer el lote
    const deshacerRes = await importacionService.deshacerLote(EMPRESA_TEST_ID, analisisTrab.loteId, 'usr-test-01');
    testAssert(deshacerRes.exito, 'Rollback del lote ejecutado exitosamente');

    // Re-verificar que el lote quedó inactivo en el historial
    const loteHistorial = LOTES_HISTORIAL_MEMORIA.find(l => l.loteId === analisisTrab.loteId);
    testAssert(loteHistorial?.activo === false, 'El lote queda marcado como inactivo tras deshacer');
  }

  console.log('\n========================================================================');
  console.log(`📊 RESULTADO SUITE FASE 13 IMPORTACIÓN: ${passed}/${total} PRUEBAS EXITOSAS`);
  console.log('========================================================================\n');
}

ejecutarSuiteFase13Importacion().catch((err) => {
  console.error('❌ Error fatal en suite Fase 13 Importación:', err);
  process.exit(1);
});
