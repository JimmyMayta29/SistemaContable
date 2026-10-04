import assert from 'assert';
import { empresaDemoService, EMPRESA_DEMO_ID, EMPRESA_DEMO_RUC } from '../services/empresaDemoService';
import { librosEEFFService } from '../services/librosEEFFService';
import { ASIENTOS_MEMORIA } from '../services/asientoService';
import { COMPRAS_MEMORIA } from '../services/compraService';
import { VENTAS_MEMORIA } from '../services/ventaService';
import { TRABAJADORES_MEMORIA } from '../services/planillaService';
import { setupService } from '../services/setupService';

async function ejecutarSuiteFase13Demo() {
  console.log('========================================================================');
  console.log('🧪 SUITE DE PRUEBAS AUTOMATIZADAS — FASE 13: EMPRESA DEMO S.A.C.');
  console.log('   (Idempotencia, Balance Cuadrado, Bloqueo SOL/PLE & Restablecimiento)');
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

  // --------------------------------------------------------------------------
  // TEST 1: Identificación y Algoritmo Módulo 11 de la Empresa Demo
  // --------------------------------------------------------------------------
  console.log('🔹 Test 1: RUC Ficticio Válido bajo Algoritmo Módulo 11');
  {
    testAssert(EMPRESA_DEMO_RUC === '20000000001', 'RUC de la empresa demo es 20000000001');
    testAssert(setupService.validarRucModulo11(EMPRESA_DEMO_RUC), 'RUC cumple con el algoritmo Módulo 11 de SUNAT');
    testAssert(empresaDemoService.esEmpresaDemo(EMPRESA_DEMO_ID), 'empresaDemoService reconoce a emp-demo-sac como demo');
  }

  // --------------------------------------------------------------------------
  // TEST 2: Restablecimiento Idempotente
  // --------------------------------------------------------------------------
  console.log('\n🔹 Test 2: Restablecimiento Idempotente y Carga Coherente');
  {
    // Primer restablecimiento
    const r1 = await empresaDemoService.restablecerDemo('usr-admin-test');
    testAssert(r1.comprasCount === 20, '20 compras generadas en el primer restablecimiento');
    testAssert(r1.ventasCount === 15, '15 ventas generadas');
    testAssert(r1.trabajadoresCount === 3, '3 trabajadores en planilla');

    const totalAsientosR1 = ASIENTOS_MEMORIA.filter(a => a.empresaId === EMPRESA_DEMO_ID).length;

    // Segundo restablecimiento consecutivo (idempotencia estricta: NO duplica datos)
    const r2 = await empresaDemoService.restablecerDemo('usr-admin-test');
    const totalAsientosR2 = ASIENTOS_MEMORIA.filter(a => a.empresaId === EMPRESA_DEMO_ID).length;

    testAssert(totalAsientosR2 === totalAsientosR1, 'Ejecutar restablecerDemo dos veces no duplica asientos en memoria');
    testAssert(COMPRAS_MEMORIA.filter(c => c.empresaId === EMPRESA_DEMO_ID).length === 20, 'Compras permanecen exactamente en 20');
    testAssert(VENTAS_MEMORIA.filter(v => v.empresaId === EMPRESA_DEMO_ID).length === 15, 'Ventas permanecen exactamente en 15');
    testAssert(TRABAJADORES_MEMORIA.filter(t => t.empresaId === EMPRESA_DEMO_ID).length === 3, 'Trabajadores permanecen exactamente en 3');
  }

  // --------------------------------------------------------------------------
  // TEST 3: Cuadre de Partida Doble en Todos los Asientos y Hoja de Trabajo
  // --------------------------------------------------------------------------
  console.log('\n🔹 Test 3: Cuadre Matemático del Ejercicio (Diario y Hoja de Trabajo 10 Columnas)');
  {
    const asientosDemo = ASIENTOS_MEMORIA.filter(a => a.empresaId === EMPRESA_DEMO_ID);
    testAssert(asientosDemo.length > 0, 'Existen asientos contabilizados para la empresa demo');

    let todosCuadrados = true;
    for (const ast of asientosDemo) {
      const sumDebe = ast.items.reduce((s, it) => s + (it.debe || 0), 0);
      const sumHaber = ast.items.reduce((s, it) => s + (it.haber || 0), 0);
      if (Math.abs(sumDebe - sumHaber) > 0.01) {
        todosCuadrados = false;
        break;
      }
    }
    testAssert(todosCuadrados, 'Cada uno de los asientos de la Empresa Demo cumple con partida doble estricta (Debe = Haber)');

    // Hoja de trabajo 10 columnas
    const hojaTrabajo = await librosEEFFService.generarHojaTrabajo10Columnas(EMPRESA_DEMO_ID, '2026-09');
    testAssert(hojaTrabajo.controlesCuadre.montosCuadrados, 'Sumas del Mayor de la Hoja de Trabajo cuadran al céntimo');
    testAssert(hojaTrabajo.controlesCuadre.saldosCuadrados, 'Saldos Deudor y Acreedor cuadran exactamente');
    testAssert(hojaTrabajo.controlesCuadre.balanceCuadrado, 'Columnas de Inventario (Activo vs Pasivo) balanceadas con el resultado');
    testAssert(hojaTrabajo.controlesCuadre.resultadosCoinciden, 'Columnas de Resultados por Naturaleza balanceadas');
  }

  // --------------------------------------------------------------------------
  // TEST 4: Bloqueo de Conexión SOL y Transmisión PLE Oficial
  // --------------------------------------------------------------------------
  console.log('\n🔹 Test 4: Bloqueo Estricto de Conexiones Oficiales SUNAT');
  {
    let bloqueoSol = false;
    try {
      empresaDemoService.validarOperacionOficialPermitida(EMPRESA_DEMO_ID, 'SOL_CONEXION');
    } catch (err: any) {
      bloqueoSol = err.message.includes('EMPRESA_DEMO_BLOQUEO_SUNAT');
    }
    testAssert(bloqueoSol, 'Empresa Demo tiene bloqueada la conexión a credenciales SOL en vivo');

    let bloqueoPle = false;
    try {
      empresaDemoService.validarOperacionOficialPermitida(EMPRESA_DEMO_ID, 'PLE_ENVIO');
    } catch (err: any) {
      bloqueoPle = err.message.includes('EMPRESA_DEMO_BLOQUEO_SUNAT');
    }
    testAssert(bloqueoPle, 'Empresa Demo tiene bloqueado el envío oficial de libros PLE');

    let bloqueoSire = false;
    try {
      empresaDemoService.validarOperacionOficialPermitida(EMPRESA_DEMO_ID, 'SIRE_ENVIO');
    } catch (err: any) {
      bloqueoSire = err.message.includes('EMPRESA_DEMO_BLOQUEO_SUNAT');
    }
    testAssert(bloqueoSire, 'Empresa Demo tiene bloqueado el envío o aceptación oficial ante el SIRE');

    // Una empresa real no demo NO debe ser bloqueada
    let empresaRealBloqueada = false;
    try {
      empresaDemoService.validarOperacionOficialPermitida('00000000-0000-0000-0000-000000000001', 'SOL_CONEXION');
    } catch {
      empresaRealBloqueada = true;
    }
    testAssert(!empresaRealBloqueada, 'Empresa real y no demo pasa la validación sin ser bloqueada');
  }

  console.log('\n========================================================================');
  console.log(`📊 RESULTADO SUITE FASE 13 DEMO: ${passed}/${total} PRUEBAS EXITOSAS`);
  console.log('========================================================================\n');
}

ejecutarSuiteFase13Demo().catch((err) => {
  console.error('❌ Error fatal en suite Fase 13 Demo:', err);
  process.exit(1);
});
