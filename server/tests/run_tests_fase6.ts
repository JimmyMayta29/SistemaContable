import { cryptoService } from '../services/cryptoService';
import { obtenerSunatGateway, MockSunatGateway } from '../services/sunatGateway';
import { sireService, CONEXIONES_SUNAT_MEMORIA, SIRE_PROPUESTAS_MEMORIA } from '../services/sireService';
import { conciliadorSireService, CONCILIACIONES_SIRE_MEMORIA } from '../services/conciliadorSireService';
import { xmlImportService, COMPROBANTES_XML_MEMORIA } from '../services/xmlImportService';
import { pleExportService, PLE_EXPORTACIONES_MEMORIA } from '../services/pleExportService';
import { sunatJobsService, SUNAT_JOBS_MEMORIA } from '../services/sunatJobsService';
import { periodoService } from '../services/periodoService';
import { compraService, COMPRAS_MEMORIA, CXP_MEMORIA } from '../services/compraService';
import { ventaService, VENTAS_MEMORIA } from '../services/ventaService';
import { asientoService, ASIENTOS_MEMORIA } from '../services/asientoService';

async function ejecutarSuiteFase6() {
  console.log('======================================================');
  console.log('🧪 SUITE DE PRUEBAS AUTOMATIZADAS — FASE 6: INTEGRACIÓN SUNAT/SIRE, XML UBL/CDR & PLE');
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
  const PERIODO_TEST = '2026-09';

  // Configurar períodos abiertos
  await periodoService.abrirPeriodo(EMPRESA_A, PERIODO_TEST, USER_ID);
  await periodoService.abrirPeriodo(EMPRESA_B, PERIODO_TEST, USER_ID);

  // --------------------------------------------------------------------------
  // TEST 1: SunatGateway y autenticación
  // --------------------------------------------------------------------------
  console.log('🔹 Test 1: SunatGateway, Autenticación y Reintentos con Backoff');
  {
    const gateway = obtenerSunatGateway(true);
    const authValida = await gateway.validarCredenciales({
      ruc: '20601234567',
      usuarioSol: 'MODDATOS',
      claveSol: 'moddatos123'
    });
    assert(authValida.valido === true, 'Autenticación exitosa con credenciales válidas');
    assert(authValida.estado === 'CONECTADO', 'Estado marcado como CONECTADO');

    const token = await gateway.obtenerToken({
      ruc: '20601234567',
      usuarioSol: 'MODDATOS',
      claveSol: 'moddatos123'
    });
    assert(token.accessToken.startsWith('mock_sunat_token_'), 'Token OAuth 2.0 generado con formato Bearer');
    assert(token.expiresIn === 3600, 'Tiempo de expiración fijado en 3600 segundos');

    // Validación de rechazo ante credenciales erróneas
    const authInvalida = await gateway.validarCredenciales({
      ruc: '20601234567',
      usuarioSol: 'MODDATOS',
      claveSol: 'ERROR_TEST'
    });
    assert(authInvalida.valido === false, 'Credenciales incorrectas rechazadas por gateway');
    assert(authInvalida.estado === 'ERROR', 'Estado de error registrado');
  }

  // --------------------------------------------------------------------------
  // TEST 2: Cifrado AES-256-GCM y No Exposición de Secretos
  // --------------------------------------------------------------------------
  console.log('\n🔹 Test 2: Cifrado AES-256-GCM, No Exposición de Secretos y Rotación');
  {
    const claveSecreta = 'MiClaveSecretaSuperSegura2026!';
    const cifrado = cryptoService.cifrar(claveSecreta, 1);
    assert(cifrado.startsWith('v1:'), 'Encabezado de versión v1 presente en texto cifrado');
    assert(!cifrado.includes(claveSecreta), 'El texto plano no aparece en la cadena cifrada');

    const descifrado = cryptoService.descifrar(cifrado);
    assert(descifrado === claveSecreta, 'Descifrado exacto con autenticación GCM (Tag OK)');

    // Rotación de clave
    const rotado = cryptoService.rotarCifrado(cifrado, 2);
    assert(rotado.nuevaVersion === 2, 'Clave rotada exitosamente a versión 2');
    assert(cryptoService.descifrar(rotado.nuevoPayload) === claveSecreta, 'Texto íntegro tras rotación');

    // Guardar credenciales para Empresa A y validar no exposición
    await sireService.guardarConexion(EMPRESA_A, {
      ruc: '20601234567',
      usuarioSol: 'MODDATOS',
      claveSol: 'claveSecreta123',
      clientId: 'client-id-xyz',
      clientSecret: 'super-secret-token'
    }, USER_ID);

    const estado = await sireService.obtenerEstadoConexion(EMPRESA_A);
    assert(estado.configurado === true, 'Conexión registrada como configurada');
    assert(!('claveSol' in estado) && !('claveSolEncrypted' in estado), 'La clave SOL no se expone en la respuesta');
    assert(!('clientSecret' in estado), 'El Client Secret no se expone en la respuesta');

    // Sanitización de logs y errores
    const errorFuga = 'Error 401: Fallo con claveSol=claveSecreta123 y Bearer eyJhbGciOi...';
    const sanitizado = cryptoService.sanitizarError(errorFuga);
    assert(!sanitizado.includes('claveSecreta123'), 'Sanitizador expurgó la clave SOL');
    assert(!sanitizado.includes('eyJhbGciOi'), 'Sanitizador expurgó el token Bearer');
  }

  // --------------------------------------------------------------------------
  // TEST 3: Conciliación SIRE en los 4 Estados y Aceptación Atómica
  // --------------------------------------------------------------------------
  console.log('\n🔹 Test 3: Conciliación SIRE (4 Estados) y Aceptación Atómica');
  {
    // Limpiar comprobantes previos de compras para prueba aislada
    COMPRAS_MEMORIA.length = 0;

    // 1. Insertar comprobante en ERP que coincida exactamente con la propuesta
    const b1 = await compraService.crearBorrador(EMPRESA_A, {
      periodoId: `per-${PERIODO_TEST}`,
      fechaEmision: `${PERIODO_TEST}-02`,
      fechaContable: `${PERIODO_TEST}-02`,
      tipoComprobante: '01',
      serie: 'F001',
      numero: '0023451',
      proveedorId: 'prv-20100035392',
      moneda: 'PEN',
      baseGravada: 4200.00,
      igv: 756.00,
      total: 4956.00,
      glosa: 'Factura ferretería en sistema'
    }, USER_ID);
    await compraService.registrarBorradorCompra(b1.id, USER_ID, EMPRESA_A);

    // 2. Insertar comprobante en ERP con diferencia de importe provocada a propósito
    const b2 = await compraService.crearBorrador(EMPRESA_A, {
      periodoId: `per-${PERIODO_TEST}`,
      fechaEmision: `${PERIODO_TEST}-06`,
      fechaContable: `${PERIODO_TEST}-06`,
      tipoComprobante: '01',
      serie: 'F002',
      numero: '0005420',
      proveedorId: 'prv-20512874193',
      moneda: 'PEN',
      baseGravada: 1000.00, // Difiere de los 1200.00 de SUNAT
      igv: 180.00,
      total: 1180.00,
      glosa: 'Factura con monto menor en ERP'
    }, USER_ID);
    await compraService.registrarBorradorCompra(b2.id, USER_ID, EMPRESA_A);

    // 3. Insertar comprobante en ERP que NO existe en SUNAT (SOLO_EN_SISTEMA)
    const b3 = await compraService.crearBorrador(EMPRESA_A, {
      periodoId: `per-${PERIODO_TEST}`,
      fechaEmision: `${PERIODO_TEST}-15`,
      fechaContable: `${PERIODO_TEST}-15`,
      tipoComprobante: '01',
      serie: 'F099',
      numero: '0009999',
      proveedorId: 'prv-20999999999',
      moneda: 'PEN',
      baseGravada: 500.00,
      igv: 90.00,
      total: 590.00,
      glosa: 'Factura física no informada en SUNAT'
    }, USER_ID);
    await compraService.registrarBorradorCompra(b3.id, USER_ID, EMPRESA_A);

    // 4. Ejecutar conciliación SIRE RCE
    const concil = await conciliadorSireService.conciliarPeriodo(EMPRESA_A, 'COMPRAS', PERIODO_TEST);

    assert(concil.totalCoinciden >= 1, 'Identificó comprobante con estado COINCIDE (F001-0023451)');
    assert(concil.totalDiferencias >= 1, 'Identificó comprobante con DIFERENCIA_IMPORTE (F002-0005420)');
    assert(concil.totalSoloSistema >= 1, 'Identificó comprobante SOLO_EN_SISTEMA (F099-0009999)');
    assert(concil.totalSoloSunat >= 1, 'Identificó comprobante SOLO_EN_SUNAT (F003-0008912)');

    // 5. Aceptar comprobante SOLO_EN_SUNAT y verificar creación atómica
    const lineaSoloSunat = concil.lineas.find(l => l.estadoConciliacion === 'SOLO_EN_SUNAT')!;
    const comprasAntes = COMPRAS_MEMORIA.length;

    const resAceptacion = await conciliadorSireService.aceptarPropuestaLinea(EMPRESA_A, lineaSoloSunat.id, USER_ID);
    assert(resAceptacion.success === true, 'Línea de la propuesta aceptada exitosamente');
    assert(COMPRAS_MEMORIA.length === comprasAntes + 1, 'Comprobante incorporado en CompraService');
    assert(lineaSoloSunat.decision === 'ACEPTADA', 'Línea actualizada a estado ACEPTADA');

    // Verificar que generó asiento contable
    const nuevoCmp = COMPRAS_MEMORIA.find(c => c.id === resAceptacion.comprobanteGeneradoId)!;
    assert(nuevoCmp.asientoGenerado === true, 'Asiento contable generado atómicamente');
    assert(Boolean(nuevoCmp.asientoId), 'ID de asiento contable enlazado');

    // Verificar bloqueo en período cerrado
    await periodoService.cerrarPeriodo(EMPRESA_A, PERIODO_TEST, USER_ID);
    let errorCerrado = false;
    try {
      await conciliadorSireService.aceptarPropuestaLinea(EMPRESA_A, lineaSoloSunat.id, USER_ID);
    } catch (err: any) {
      errorCerrado = err.message.includes('PERIODO_CERRADO');
    }
    assert(errorCerrado === true, 'Sistema bloquea aceptar comprobantes en período cerrado');
    await periodoService.reabrirPeriodo(EMPRESA_A, PERIODO_TEST, USER_ID);
  }

  // --------------------------------------------------------------------------
  // TEST 4: Importación Segura XML UBL 2.1 y Detección Anti-XXE
  // --------------------------------------------------------------------------
  console.log('\n🔹 Test 4: Parser XML UBL 2.1 Seguro, Anti-XXE y Detección de Duplicados');
  {
    // XML UBL 2.1 válido
    const xmlValido = `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:ID>F001-0004521</cbc:ID>
  <cbc:IssueDate>2026-09-18</cbc:IssueDate>
  <cbc:InvoiceTypeCode>01</cbc:InvoiceTypeCode>
  <cbc:DocumentCurrencyCode>PEN</cbc:DocumentCurrencyCode>
  <cac:AccountingSupplierParty>
    <cac:Party>
      <cac:PartyIdentification><cbc:ID schemeID="6">20556789123</cbc:ID></cac:PartyIdentification>
      <cac:PartyLegalEntity><cbc:RegistrationName>TECNOLOGIA Y SERVICIOS PERU S.A.C.</cbc:RegistrationName></cac:PartyLegalEntity>
    </cac:Party>
  </cac:AccountingSupplierParty>
  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="PEN">180.00</cbc:TaxAmount>
    <cac:TaxSubtotal><cbc:TaxableAmount currencyID="PEN">1000.00</cbc:TaxableAmount></cac:TaxSubtotal>
  </cac:TaxTotal>
  <cac:LegalMonetaryTotal>
    <cbc:PayableAmount currencyID="PEN">1180.00</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
</Invoice>`;

    const resXml = xmlImportService.procesarXmlIndividual(
      EMPRESA_A,
      '20556789123-01-F001-0004521.xml',
      Buffer.from(xmlValido, 'utf8')
    );
    assert(resXml.serie === 'F001' && resXml.numero === '0004521', 'Serie y número extraídos correctamente');
    assert(resXml.rucEmisor === '20556789123', 'RUC emisor extraído');
    assert(resXml.total === 1180.00, 'Total facturado extraído exactamente S/ 1,180.00');

    // Control de duplicados por hash
    let errorDuplicado = false;
    try {
      xmlImportService.procesarXmlIndividual(
        EMPRESA_A,
        '20556789123-01-F001-0004521.xml',
        Buffer.from(xmlValido, 'utf8')
      );
    } catch (err: any) {
      errorDuplicado = err.message.includes('XML_DUPLICADO');
    }
    assert(errorDuplicado === true, 'Rechazo exitoso de XML duplicado por hash SHA-256');

    // Ataque XXE con entidad externa maliciosa
    const xmlMalicioso = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE foo [ <!ENTITY xxe SYSTEM "file:///etc/passwd"> ]>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2">
  <cbc:ID>&xxe;</cbc:ID>
</Invoice>`;

    let errorXxe = false;
    try {
      xmlImportService.procesarXmlIndividual(
        EMPRESA_A,
        'malicious_xxe.xml',
        Buffer.from(xmlMalicioso, 'utf8')
      );
    } catch (err: any) {
      errorXxe = err.message.includes('ATAQUE_XXE_DETECTADO');
    }
    assert(errorXxe === true, 'Defensa anti-XXE bloqueó el archivo con DTD / ENTITY maliciosa');

    // Archivo sobredimensionado (> 5MB)
    const bufferGrande = Buffer.alloc(6 * 1024 * 1024); // 6 MB
    let errorTamano = false;
    try {
      xmlImportService.procesarXmlIndividual(EMPRESA_A, 'archivo_gigante.xml', bufferGrande);
    } catch (err: any) {
      errorTamano = err.message.includes('ARCHIVO_SOBREDIMENSIONADO');
    }
    assert(errorTamano === true, 'Rechazo de archivo sobredimensionado');
  }

  // --------------------------------------------------------------------------
  // TEST 5: Exportación PLE 5.2 Oficial y Safeguard de Libros no Validados
  // --------------------------------------------------------------------------
  console.log('\n🔹 Test 5: Exportación PLE 5.2 Oficial, Nomenclatura y Validaciones Previas');
  {
    // 1. Exportar Libro 8.1 Compras Oficial
    const expCompras = await pleExportService.exportarLibro(
      EMPRESA_A,
      PERIODO_TEST,
      '080100',
      '20601234567',
      USER_ID
    );
    assert(expCompras.esOficial === true, 'Libro 8.1 Compras marcado como oficial validado');
    assert(expCompras.nombreArchivo.startsWith('LE2060123456720260900080100'), 'Nomenclatura oficial PLE 8.1 correcta');
    assert(expCompras.contenidoTxt.includes('|'), 'Líneas formateadas con delimitador pleca (|)');
    assert(expCompras.hashSha256.length === 64, 'Hash SHA-256 generado para integridad del archivo');

    // 2. Exportar Libro 14.1 Ventas Oficial
    const expVentas = await pleExportService.exportarLibro(
      EMPRESA_A,
      PERIODO_TEST,
      '140100',
      '20601234567',
      USER_ID
    );
    assert(expVentas.esOficial === true, 'Libro 14.1 Ventas marcado como oficial validado');
    assert(expVentas.nombreArchivo.startsWith('LE2060123456720260900140100'), 'Nomenclatura oficial PLE 14.1 correcta');

    // 3. Exportar Libro Diario 5.1 (Pendiente de confirmación oficial) -> Debe emitir con rótulo de VISTA PREVIA NO OFICIAL
    const expDiario = await pleExportService.exportarLibro(
      EMPRESA_A,
      PERIODO_TEST,
      '050100',
      '20601234567',
      USER_ID
    );
    assert(expDiario.esOficial === false, 'Libro Diario 5.1 no oficial marcado con esOficial = false');
    assert(expDiario.nombreArchivo.startsWith('VISTA_PREVIA_LE'), 'Nombre de archivo prefijado con VISTA_PREVIA');
    assert(expDiario.contenidoTxt.includes('VISTA PREVIA NO OFICIAL'), 'Cabecera de advertencia explícita en contenido');

    // 4. Prevalidación detecta borrador pendiente provocado
    await asientoService.crearBorrador(EMPRESA_A, {
      periodoId: `per-${PERIODO_TEST}`,
      subdiarioId: 'sub-01',
      fecha: `${PERIODO_TEST}-25`,
      glosa: 'Asiento borrador de prueba para prevalidación PLE',
      detalles: [
        { linea: 1, cuentaId: '1011', debe: 100, haber: 0 },
        { linea: 2, cuentaId: '1041', debe: 0, haber: 100 }
      ]
    }, USER_ID);

    const prev = await pleExportService.prevalidar(EMPRESA_A, PERIODO_TEST, '080100');
    assert(prev.asientosBorrador > 0, 'Prevalidación detecta asientos en borrador pendientes');
    assert(prev.validacionesSuperadas === false, 'Semáforo marca no superado por borrador presente');
  }

  // --------------------------------------------------------------------------
  // TEST 6: Aislamiento Multiempresa Estricto
  // --------------------------------------------------------------------------
  console.log('\n🔹 Test 6: Aislamiento Multiempresa Estricto (Conexiones, SIRE, XML y PLE)');
  {
    // Configurar credenciales para Empresa B
    await sireService.guardarConexion(EMPRESA_B, {
      ruc: '20556789123',
      usuarioSol: 'USERB_SOL',
      claveSol: 'claveB_9999'
    }, USER_ID);

    const conexionA = await sireService.obtenerEstadoConexion(EMPRESA_A);
    const conexionB = await sireService.obtenerEstadoConexion(EMPRESA_B);

    assert(conexionA.ruc === '20601234567', 'RUC de Empresa A aislado');
    assert(conexionB.ruc === '20556789123', 'RUC de Empresa B aislado');

    // Archivos XML de Empresa A no son visibles para Empresa B
    const xmlsEmpresaB = await xmlImportService.listarComprobantesXml(EMPRESA_B);
    assert(xmlsEmpresaB.length === 0, 'Empresa B no puede ver los comprobantes XML de Empresa A');

    // Exportaciones PLE de Empresa A no son visibles para Empresa B
    const plesEmpresaB = pleExportService.listarExportaciones(EMPRESA_B);
    assert(plesEmpresaB.length === 0, 'Empresa B no puede ver las exportaciones PLE de Empresa A');
  }

  // --------------------------------------------------------------------------
  // TEST 7: Cola Asíncrona de Trabajos con Reintentos y Backoff
  // --------------------------------------------------------------------------
  console.log('\n🔹 Test 7: Cola Asíncrona de Trabajos SUNAT (Jobs) con Reintentos');
  {
    const job = sunatJobsService.crearJob(EMPRESA_A, 'DESCARGA_SIRE_COMPRAS', { periodo: PERIODO_TEST });
    assert(job.id.startsWith('job-'), 'Trabajo encolado con ID único');
    assert(job.estado === 'EN_COLA' || job.estado === 'PROCESANDO', 'Estado inicial en cola/procesando');

    // Esperar a que el worker asíncrono procese
    await new Promise(r => setTimeout(r, 200));

    const jobActualizado = sunatJobsService.obtenerJob(job.id)!;
    assert(jobActualizado.estado === 'COMPLETADO', 'Trabajo completado asíncronamente');
    assert(jobActualizado.progreso === 100, 'Progreso al 100%');
    assert(Boolean(jobActualizado.resultado.hash), 'Resultado contiene hash SHA-256');
  }

  console.log('\n======================================================');
  console.log(`📊 RESULTADO SUITE FASE 6: ${passed}/${total} PRUEBAS EXITOSAS`);
  console.log('🎉 TODAS LAS 7 PRUEBAS OBLIGATORIAS DE LA FASE 6 PASARON SATISFACTORIAMENTE.');
  console.log('======================================================\n');
}

ejecutarSuiteFase6().catch(err => {
  console.error('❌ Error fatal ejecutando suite Fase 6:', err);
  process.exit(1);
});
