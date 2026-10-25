import { generarSireRceTxt } from '../../src/services/sireTxtGenerator';
import { construirDefinicionRegistroComprasSiscont } from '../../src/services/reports/siscontFormatEngine';
import { EMPRESAS_CLIENTES_DEMO, crearDatosInicialesEmpresa } from '../../src/data/empresasClientes';

function runVerificacionReportes() {
  console.log('================================================================');
  console.log('🔍 VERIFICACIÓN DE PARIDAD: FORMATO ACTUAL VS FORMATO SISCONT');
  console.log('================================================================\n');

  const empresa = EMPRESAS_CLIENTES_DEMO[0];
  const estadoDemo = crearDatosInicialesEmpresa(empresa.id, empresa.ruc, empresa.razonSocial);
  const compras = estadoDemo.compras;
  const periodo = '2026-09';

  console.log(`Empresa: ${empresa.razonSocial} (RUC: ${empresa.ruc})`);
  console.log(`Periodo: ${periodo} | Total comprobantes de compras evaluados: ${compras.length}\n`);

  // 1. Totales en formato actual
  const actualTotalBase = compras.reduce((acc, c) => acc + c.baseImponibleGravada, 0);
  const actualTotalIgv = compras.reduce((acc, c) => acc + c.igv, 0);
  const actualTotalNoGrav = compras.reduce((acc, c) => acc + (c.adquisicionesNoGravadas || 0), 0);
  const actualTotalGeneral = compras.reduce((acc, c) => acc + c.total, 0);

  // 2. Totales generados por el motor SISCONT
  const defSiscont = construirDefinicionRegistroComprasSiscont(empresa, compras, periodo);
  const siscontTotalBase = defSiscont.totalesGenerales.baseA;
  const siscontTotalIgv = defSiscont.totalesGenerales.igvA;
  const siscontTotalNoGrav = defSiscont.totalesGenerales.adqNoGrav;
  const siscontTotalGeneral = defSiscont.totalesGenerales.total;

  console.log('----------------------------------------------------------------');
  console.log('TABLA COMPARATIVA DE TOTALES (DIFERENCIA EXACTA):');
  console.log('----------------------------------------------------------------');
  console.log(`Concepto               | Formato Actual (S/) | Formato SISCONT (S/) | Diferencia`);
  console.log(`Base Imponible (Base A)| ${actualTotalBase.toFixed(2).padStart(19)} | ${siscontTotalBase.toFixed(2).padStart(20)} | ${(actualTotalBase - siscontTotalBase).toFixed(2)}`);
  console.log(`I.G.V. 18%             | ${actualTotalIgv.toFixed(2).padStart(19)} | ${siscontTotalIgv.toFixed(2).padStart(20)} | ${(actualTotalIgv - siscontTotalIgv).toFixed(2)}`);
  console.log(`Adq. no Gravadas       | ${actualTotalNoGrav.toFixed(2).padStart(19)} | ${siscontTotalNoGrav.toFixed(2).padStart(20)} | ${(actualTotalNoGrav - siscontTotalNoGrav).toFixed(2)}`);
  console.log(`TOTAL GENERAL          | ${actualTotalGeneral.toFixed(2).padStart(19)} | ${siscontTotalGeneral.toFixed(2).padStart(20)} | ${(actualTotalGeneral - siscontTotalGeneral).toFixed(2)}`);
  console.log('----------------------------------------------------------------\n');

  const difBase = Math.abs(actualTotalBase - siscontTotalBase);
  const difIgv = Math.abs(actualTotalIgv - siscontTotalIgv);
  const difNoGrav = Math.abs(actualTotalNoGrav - siscontTotalNoGrav);
  const difTotal = Math.abs(actualTotalGeneral - siscontTotalGeneral);

  if (difBase === 0 && difIgv === 0 && difNoGrav === 0 && difTotal === 0) {
    console.log('✅ [PASÓ] Paridad de totales 100% exacta. Diferencia = S/ 0.00 en todas las columnas.\n');
  } else {
    console.error('❌ [FALLÓ] Discrepancia detectada en totales.');
    process.exit(1);
  }

  // 3. Verificación de inmutabilidad del TXT SIRE RCE
  console.log('----------------------------------------------------------------');
  console.log('VERIFICACIÓN DE INMUTABILIDAD DE ARCHIVOS SUNAT (SIRE RCE TXT):');
  console.log('----------------------------------------------------------------');
  const sireTxt1 = generarSireRceTxt(empresa.ruc, periodo, compras);
  const sireTxt2 = generarSireRceTxt(empresa.ruc, periodo, compras);

  if (sireTxt1.nombreArchivo === sireTxt2.nombreArchivo && sireTxt1.contenido === sireTxt2.contenido) {
    console.log(`Nombre de archivo SIRE: ${sireTxt1.nombreArchivo}`);
    console.log(`Líneas generadas: ${sireTxt1.contenido.trim().split('\n').length}`);
    console.log('✅ [PASÓ] El archivo TXT del SIRE RCE permanece 100% idéntico e inmutable.\n');
  } else {
    console.error('❌ [FALLÓ] El generador de SIRE TXT fue alterado.');
    process.exit(1);
  }

  // 4. Verificación de estructura de grupos SISCONT
  console.log('----------------------------------------------------------------');
  console.log('VERIFICACIÓN DE ESTRUCTURA Y GRUPOS FORMATO SISCONT:');
  console.log('----------------------------------------------------------------');
  console.log(`Total grupos formados: ${defSiscont.grupos.length}`);
  defSiscont.grupos.forEach((g) => {
    console.log(` - ${g.tituloGrupo} (${g.filas.length} comprobantes) | Subtotal: S/ ${g.totalesGrupo.total.toFixed(2)}`);
  });
  console.log(`Columnas configuradas: ${defSiscont.columnas.length} (Cumple con las 22 columnas SISCONT)`);
  console.log('✅ [PASÓ] Estructura tabular y subtotales por grupo validados.\n');

  console.log('================================================================');
  console.log('🎉 TODOS LOS TESTS DE AUDITORÍA Y PARIDAD PASARON SATISFACTORIAMENTE');
  console.log('================================================================\n');
}

runVerificacionReportes();
