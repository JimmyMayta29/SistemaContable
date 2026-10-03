import { execSync } from 'child_process';

const suites = [
  { name: 'Fases 1 y 2: Motor Contable & Partida Doble', path: 'server/tests/run_tests.ts' },
  { name: 'Fase 3: Compras, Ventas, CXC/CXP & Tributos', path: 'server/tests/run_tests_fase3.ts' },
  { name: 'Fase 4: Tesorería, Conciliación Bancaria, 4ta & Planilla', path: 'server/tests/run_tests_fase4.ts' },
  { name: 'Fase 5: Libros Oficiales, Balance Comprobación & EEFF', path: 'server/tests/run_tests_fase5.ts' },
  { name: 'Fase 6: Integración SUNAT/SIRE, XML UBL/CDR & PLE', path: 'server/tests/run_tests_fase6.ts' },
  { name: 'Fase 7: Seguridad, RBAC, RLS, Envelope Encryption & Auditoría', path: 'server/tests/run_tests_fase7.ts' },
  { name: 'Fase 7B: Navegación por Empresa, Entorno Aislado & Selector Multi-Nivel', path: 'server/tests/run_tests_fase7b.ts' },
  { name: 'Fase 8: Calidad, PostgreSQL, Concurrencia & Property Testing', path: 'server/tests/run_tests_fase8.ts' },
  { name: 'Fase 9: Automatización Tributaria Avanzada, PLAME & SIRE Cierre', path: 'server/tests/run_tests_fase9.ts' },
  { name: 'Fase 10: Auditoría Preventiva, DAOT 3500 & Cierre Anual PCGE', path: 'server/tests/run_tests_fase10.ts' },
  { name: 'Fase 11: Activos Fijos (Libro 7.1), Kardex (Libro 13.1) & Prorrata IGV', path: 'server/tests/run_tests_fase11.ts' }
];

console.log('========================================================================');
console.log('🚀 EJECUTANDO BATERÍA COMPLETA DE PRUEBAS DE CALIDAD (FASES 1 - 11)');
console.log('========================================================================\n');

let totalPassed = 0;
let totalSuites = suites.length;
const startTotal = Date.now();

for (const suite of suites) {
  const start = Date.now();
  console.log(`▶ Ejecutando ${suite.name} (${suite.path})...`);
  try {
    execSync(`npx tsx ${suite.path}`, { stdio: 'inherit' });
    const elapsed = ((Date.now() - start) / 1000).toFixed(2);
    console.log(`✅ [${suite.name}] completado en ${elapsed}s\n`);
    totalPassed++;
  } catch (err) {
    console.error(`❌ [${suite.name}] falló.`);
    process.exit(1);
  }
}

const totalTime = ((Date.now() - startTotal) / 1000).toFixed(2);
console.log('========================================================================');
console.log(`🏆 RESUMEN FINAL: ${totalPassed}/${totalSuites} SUITES APROBADAS SATISFACTORIAMENTE EN ${totalTime}s`);
console.log('🎯 SISTEMA CONTABLE Y TRIBUTARIO HOMOLOGADO Y LISTO PARA PRODUCCIÓN');
console.log('========================================================================\n');
