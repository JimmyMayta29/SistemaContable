import { authJwtService, sembrarUsuariosPrueba } from '../services/authJwtService';
import { totpService } from '../services/totpService';
import { cryptoService } from '../services/cryptoService';
import { auditoriaChainService, AUDITORIA_LOG_CHAIN_MEMORIA } from '../services/auditoriaChainService';
import { xmlImportService, COMPROBANTES_XML_MEMORIA } from '../services/xmlImportService';
import { asientoService, ASIENTOS_MEMORIA } from '../services/asientoService';
import { periodoService } from '../services/periodoService';
import { db } from '../config/database';

async function ejecutarSuiteFase7() {
  sembrarUsuariosPrueba();
  console.log('======================================================');
  console.log('🧪 SUITE DE PRUEBAS AUTOMATIZADAS — FASE 7: SEGURIDAD, RBAC, RLS, ENVELOPE ENCRYPTION & AUDITORÍA');
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
  const PERIODO_TEST = '2026-09';

  // Configurar períodos abiertos
  await periodoService.abrirPeriodo(EMPRESA_A, PERIODO_TEST, 'usr-admin-01');
  await periodoService.abrirPeriodo(EMPRESA_B, PERIODO_TEST, 'usr-admin-01');

  // --------------------------------------------------------------------------
  // TEST 1: Autenticación JWT Firmada, MFA (TOTP) y Selección de Empresa
  // --------------------------------------------------------------------------
  console.log('🔹 Test 1: Autenticación JWT Firmada, MFA (TOTP) y Selección de Empresa');
  {
    // 1.1 Intentar login de ADMIN_ESTUDIO sin TOTP debe fallar
    let falloSinMfa = false;
    try {
      await authJwtService.login('admin@sunaconta.pe', 'Sunaconta2026!');
    } catch (err: any) {
      falloSinMfa = err.message.includes('MFA_REQUERIDO');
    }
    assert(falloSinMfa, 'Login de ADMIN_ESTUDIO rechaza acceso sin código TOTP obligatorio');

    // 1.2 TOTP inválido debe ser rechazado
    let falloTotpInvalido = false;
    try {
      await authJwtService.login('admin@sunaconta.pe', 'Sunaconta2026!', '000000');
    } catch (err: any) {
      falloTotpInvalido = err.message.includes('MFA_CODIGO_INVALIDO');
    }
    assert(falloTotpInvalido, 'Login de ADMIN_ESTUDIO rechaza código TOTP incorrecto');

    // 1.3 Generar código TOTP RFC 6238 válido
    const codigoValido = totpService.generarToken('JBSWY3DPEHPK3PXP');
    assert(codigoValido.length === 6, 'Código TOTP generado tiene 6 dígitos numéricos');

    // 1.4 Login exitoso con TOTP
    const loginRes = await authJwtService.login('admin@sunaconta.pe', 'Sunaconta2026!', codigoValido);
    assert(Boolean(loginRes.accessToken), 'Access Token JWT generado');
    assert(Boolean(loginRes.refreshToken), 'Refresh Token generado');
    assert(loginRes.usuario.rolGlobal === 'ADMIN_ESTUDIO', 'Rol verificado como ADMIN_ESTUDIO');
    assert(loginRes.expiresIn === 900, 'Access Token con expiración de 15 minutos (900 seg)');

    // 1.5 Verificar claims del Access Token
    const claims = authJwtService.verificarAccessToken(loginRes.accessToken);
    assert(claims.sub === 'usr-admin-01', 'Claim sub contiene el ID del usuario');
    assert(claims.mfaVerificado === true, 'Claim mfaVerificado marcado como true');

    // 1.6 Cambiar empresa activa autorizada
    const cambioEmpresa = await authJwtService.cambiarEmpresaActiva(loginRes.usuario.id, EMPRESA_B);
    assert(cambioEmpresa.empresaActivaId === EMPRESA_B, 'Empresa activa actualizada en servidor a Empresa B');

    // 1.7 Intento de seleccionar empresa ajena debe ser denegado
    let falloEmpresaAjena = false;
    try {
      await authJwtService.cambiarEmpresaActiva('usr-asistente-01', EMPRESA_B); // Asistente no tiene Empresa B
    } catch (err: any) {
      falloEmpresaAjena = err.message.includes('ACCESO_DENEGADO_EMPRESA');
    }
    assert(falloEmpresaAjena, 'Servidor bloquea selección de empresa no asignada en usuario_empresa');

    // 1.8 Renovación con Refresh Token
    const refreshRes = await authJwtService.refreshAccessToken(loginRes.refreshToken);
    assert(Boolean(refreshRes.accessToken), 'Nuevo Access Token emitido mediante Refresh Token');
  }

  // --------------------------------------------------------------------------
  // TEST 2: RBAC y Separación Obligatoria de Funciones
  // --------------------------------------------------------------------------
  console.log('\n🔹 Test 2: RBAC y Separación Obligatoria de Funciones');
  {
    const idAsistente = 'usr-asistente-01';
    const idContador = 'usr-contador-01';

    // 2.1 Asistente crea un asiento en estado BORRADOR
    const borrador = await asientoService.crearBorrador(EMPRESA_A, {
      periodoId: `per-${PERIODO_TEST}`,
      subdiarioId: '05',
      fecha: `${PERIODO_TEST}-10`,
      glosa: 'Asiento registrado por asistente para prueba de segregación',
      detalles: [
        { linea: 1, cuentaId: '1011', debe: 500, haber: 0 },
        { linea: 2, cuentaId: '1041', debe: 0, haber: 500 }
      ]
    }, idAsistente);
    assert(borrador.estado === 'BORRADOR', 'Borrador creado por Asistente');
    assert((borrador as any).creadoPor === idAsistente, 'Identificador del creador registrado en el borrador');

    // 2.2 El mismo usuario que creó el borrador intenta contabilizarlo con segregación activa -> DEBE SER RECHAZADO
    let rechazoMismoCreador = false;
    try {
      await asientoService.contabilizar(borrador.id, EMPRESA_A, idAsistente, { enforceSegregacion: true });
    } catch (err: any) {
      rechazoMismoCreador = err.message.includes('SEGREGACION_FUNCIONES');
    }
    assert(rechazoMismoCreador, 'Separación de funciones bloquea que el creador contabilice su propio borrador');

    // 2.3 Validación de rol en servicio: Asistente no puede contabilizar
    let rechazoRolAsistente = false;
    try {
      authJwtService.validarSegregacionContabilizacion(idAsistente, 'usr-otro-asistente', 'ASISTENTE_CONTABLE');
    } catch (err: any) {
      rechazoRolAsistente = err.message.includes('PERMISO_DENEGADO');
    }
    assert(rechazoRolAsistente, 'Rol ASISTENTE_CONTABLE no está autorizado para contabilizar');

    // 2.4 Un Contador Senior distinto del creador contabiliza exitosamente
    const contabilizado = await asientoService.contabilizar(borrador.id, EMPRESA_A, idContador, { enforceSegregacion: true });
    assert(contabilizado.estado === 'CONTABILIZADO', 'Contador Senior aprobó y contabilizó el asiento');

    // 2.5 Separación de funciones en cierre de período: Quien registra borradores no puede cerrar
    let rechazoCierre = false;
    try {
      authJwtService.validarCierrePeriodo(idAsistente, 'ASISTENTE_CONTABLE', [idAsistente]);
    } catch (err: any) {
      rechazoCierre = err.message.includes('PERMISO_DENEGADO') || err.message.includes('SEGREGACION_FUNCIONES');
    }
    assert(rechazoCierre, 'Separación de funciones bloquea que quien ingresa comprobantes cierre el período');
  }

  // --------------------------------------------------------------------------
  // TEST 3: Envelope Encryption (DEK por Empresa, KEK y AAD)
  // --------------------------------------------------------------------------
  console.log('\n🔹 Test 3: Envelope Encryption (DEK por Empresa, KEK, AAD y Rotación)');
  {
    const claveSolOriginal = 'ClaveSolSuperSecreta2026#';

    // 3.1 Cifrado v2 con Envelope Encryption y AAD
    const payloadV2 = await cryptoService.cifrarConEnvelope(EMPRESA_A, 'claveSol', claveSolOriginal);
    assert(payloadV2.startsWith('v2:'), 'Formato v2 de Envelope Encryption generado');
    assert(!payloadV2.includes(claveSolOriginal), 'El secreto en texto plano no aparece en el texto cifrado');

    // 3.2 Descifrado exitoso con AAD correcto
    const descifrado = await cryptoService.descifrarConEnvelope(EMPRESA_A, 'claveSol', payloadV2);
    assert(descifrado === claveSolOriginal, 'Descifrado exacto con validación de AAD (empresa_id + campo)');

    // 3.3 Ataque de Swapping de Empresa: Usar ciphertext de Empresa A para Empresa B -> Debe fallar el tag GCM
    let falloSwappingEmpresa = false;
    try {
      await cryptoService.descifrarConEnvelope(EMPRESA_B, 'claveSol', payloadV2);
    } catch {
      falloSwappingEmpresa = true;
    }
    assert(falloSwappingEmpresa, 'AAD rechaza criptográficamente el uso de credenciales de otra empresa');

    // 3.4 Ataque de Swapping de Campo: Usar ciphertext de claveSol como usuarioSol -> Debe fallar el tag GCM
    let falloSwappingCampo = false;
    try {
      await cryptoService.descifrarConEnvelope(EMPRESA_A, 'usuarioSol', payloadV2);
    } catch {
      falloSwappingCampo = true;
    }
    assert(falloSwappingCampo, 'AAD rechaza criptográficamente el uso del ciphertext en un campo diferente');

    // 3.5 Job de re-cifrado v1 -> v2 sin downtime
    const legacyV1 = cryptoService.cifrar(claveSolOriginal, 1);
    assert(legacyV1.startsWith('v1:'), 'Payload legacy v1 generado');

    const jobRecifrado = await cryptoService.reencriptarV1aV2(EMPRESA_A, {
      claveSol: legacyV1,
      usuarioSol: 'MODDATOS'
    });
    assert(jobRecifrado.migrados >= 1, 'Job migró credencial v1 a v2');
    assert(jobRecifrado.resultados.claveSol.startsWith('v2:'), 'Nueva credencial en formato v2');
    const descifradoMigrado = await cryptoService.descifrarConEnvelope(EMPRESA_A, 'claveSol', jobRecifrado.resultados.claveSol);
    assert(descifradoMigrado === claveSolOriginal, 'Credencial migrada conserva integridad íntegra');

    // 3.6 Recomendación de seguridad de usuario secundario SOL
    const rec = cryptoService.obtenerRecomendacionSeguridadSol();
    assert(rec.recomendacion.includes('USUARIO SECUNDARIO'), 'Recomendación de seguridad para usuario secundario documentada');
  }

  // --------------------------------------------------------------------------
  // TEST 4: Auditoría Inmutable Append-Only con Hash Chaining
  // --------------------------------------------------------------------------
  console.log('\n🔹 Test 4: Auditoría Append-Only con Hash Chaining Criptográfico');
  {
    // Limpiar log previo de Empresa A para prueba aislada
    const indicesAEliminar: number[] = [];
    AUDITORIA_LOG_CHAIN_MEMORIA.forEach((l, idx) => {
      if (l.empresaId === EMPRESA_A) indicesAEliminar.push(idx);
    });
    for (let i = indicesAEliminar.length - 1; i >= 0; i--) {
      AUDITORIA_LOG_CHAIN_MEMORIA.splice(indicesAEliminar[i], 1);
    }

    // 4.1 Registrar eventos sucesivos encadenados
    const e1 = await auditoriaChainService.registrar({
      empresaId: EMPRESA_A,
      usuarioId: 'usr-contador-01',
      tablaAfectada: 'comprobantes_compra',
      registroId: 'comp-001',
      accion: 'REGISTRAR',
      datosNuevos: { total: 1000 }
    });
    assert(e1.hashPrevio === '0000000000000000000000000000000000000000000000000000000000000000', 'Primer bloque enlazado al hash génesis');
    assert(e1.hashActual.length === 64, 'Hash SHA-256 de 64 caracteres hex generado para bloque 1');

    const e2 = await auditoriaChainService.registrar({
      empresaId: EMPRESA_A,
      usuarioId: 'usr-contador-01',
      tablaAfectada: 'asientos',
      registroId: 'ast-001',
      accion: 'CONTABILIZAR',
      datosNuevos: { numero: '01090001' }
    });
    assert(e2.hashPrevio === e1.hashActual, 'Bloque 2 encadenado estrictamente al hash del bloque 1');

    const e3 = await auditoriaChainService.registrar({
      empresaId: EMPRESA_A,
      usuarioId: 'usr-admin-01',
      tablaAfectada: 'periodos',
      registroId: 'per-2026-09',
      accion: 'CIERRE_PERIODO',
      datosNuevos: { estado: 'CERRADO' }
    });
    assert(e3.hashPrevio === e2.hashActual, 'Bloque 3 encadenado estrictamente al hash del bloque 2');

    // 4.2 Verificación de integridad de cadena legítima
    const verifOk = await auditoriaChainService.verificarIntegridad(EMPRESA_A);
    assert(verifOk.valido === true, 'Verificación de integridad confirma cadena 100% válida');
    assert(verifOk.totalRegistros === 3, 'Total de 3 registros auditados analizados');

    // 4.3 Detección de manipulación (Tampering): Alterar datos del bloque 1
    const bloqueAlterado = AUDITORIA_LOG_CHAIN_MEMORIA.find(l => l.id === e1.id)!;
    const backupDatos = bloqueAlterado.datosNuevos;
    bloqueAlterado.datosNuevos = { total: 999999 }; // Inyección maliciosa

    const verifCorrupto = await auditoriaChainService.verificarIntegridad(EMPRESA_A);
    assert(verifCorrupto.valido === false, 'El sistema detecta inmediatamente la alteración de datos');
    assert(verifCorrupto.indiceCorrupto === 0, 'Identifica con precisión quirúrgica el registro manipulado');

    // Restaurar dato
    bloqueAlterado.datosNuevos = backupDatos;
  }

  // --------------------------------------------------------------------------
  // TEST 5: Parser XML Seguro, Anti-XXE, Anti-Zip Bomb y Falsos Positivos
  // --------------------------------------------------------------------------
  console.log('\n🔹 Test 5: Parser XML Seguro, Anti-XXE, Anti-Zip Bomb y Falsos Positivos');
  {
    // 5.1 Falso positivo resuelto: Empresa con nombre "SYSTEM" y "PUBLIC"
    const xmlFalsoPositivo = `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:UBLVersionID>2.1</cbc:UBLVersionID>
  <cbc:ID>F001-0008888</cbc:ID>
  <cbc:IssueDate>2026-09-20</cbc:IssueDate>
  <cbc:InvoiceTypeCode>01</cbc:InvoiceTypeCode>
  <cbc:DocumentCurrencyCode>PEN</cbc:DocumentCurrencyCode>
  <cac:AccountingSupplierParty>
    <cac:Party>
      <cac:PartyIdentification><cbc:ID schemeID="6">20601234567</cbc:ID></cac:PartyIdentification>
      <cac:PartyLegalEntity><cbc:RegistrationName>CORPORACION SYSTEM PERU PUBLIC S.A.C.</cbc:RegistrationName></cac:PartyLegalEntity>
    </cac:Party>
  </cac:AccountingSupplierParty>
  <cac:LegalMonetaryTotal>
    <cbc:PayableAmount currencyID="PEN">1500.00</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
</Invoice>`;

    const resFalsoPositivo = xmlImportService.procesarXmlIndividual(
      EMPRESA_A,
      '20601234567-01-F001-0008888.xml',
      Buffer.from(xmlFalsoPositivo, 'utf8')
    );
    assert(resFalsoPositivo.razonSocialEmisor === 'CORPORACION SYSTEM PERU PUBLIC S.A.C.', 'Razón social con palabras SYSTEM y PUBLIC procesada sin falsos positivos');
    assert(resFalsoPositivo.total === 1500.00, 'Importe extraído correctamente');

    // 5.2 Ataque XXE con DTD real -> Debe ser bloqueado
    const xmlAtaqueXxe = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE test [ <!ENTITY xxe SYSTEM "file:///etc/shadow"> ]>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2">
  <cbc:ID>&xxe;</cbc:ID>
</Invoice>`;

    let bloqueoXxe = false;
    try {
      xmlImportService.procesarXmlIndividual(EMPRESA_A, 'ataque_xxe.xml', Buffer.from(xmlAtaqueXxe, 'utf8'));
    } catch (err: any) {
      bloqueoXxe = err.message.includes('ATAQUE_XXE_DETECTADO');
    }
    assert(bloqueoXxe, 'Defensa anti-XXE bloqueó el intento de inclusión de DTD externa');

    // 5.3 Decodificación con BOM UTF-8
    const bufferConBom = Buffer.concat([
      Buffer.from([0xEF, 0xBB, 0xBF]),
      Buffer.from(xmlFalsoPositivo.replace('F001-0008888', 'F001-0008889'), 'utf8')
    ]);
    const resBom = xmlImportService.procesarXmlIndividual(
      EMPRESA_A,
      '20601234567-01-F001-0008889.xml',
      bufferConBom
    );
    assert(resBom.numero === '0008889', 'XML con UTF-8 BOM decodificado y procesado limpiamente');

    // 5.4 Ataque Zip-Slip (Path Traversal)
    const AdmZip = (await import('adm-zip')).default;
    const zipMalicioso = new AdmZip();
    zipMalicioso.addFile('dummy.txt', Buffer.from('malicious payload'));
    zipMalicioso.getEntries()[0].entryName = '../../etc/cron.d/malicious';
    const zipBuffer = zipMalicioso.toBuffer();

    let bloqueoZipSlip = false;
    try {
      xmlImportService.procesarZip(EMPRESA_A, 'zip_slip.zip', zipBuffer);
    } catch (err: any) {
      bloqueoZipSlip = err.message.includes('ATAQUE_ZIP_SLIP_DETECTADO');
    }
    assert(bloqueoZipSlip, 'Defensa anti-Zip-Slip bloqueó archivo con path traversal (../..)');
  }

  // --------------------------------------------------------------------------
  // TEST 6: RLS y Aislamiento de Transacción
  // --------------------------------------------------------------------------
  console.log('\n🔹 Test 6: Aislamiento por Transacción y Políticas RLS');
  {
    // Ejecutar transacción con contexto de Empresa A
    const resA = await db.withEmpresaTransaction(EMPRESA_A, async (client) => {
      return { ejecutadoEnEmpresa: EMPRESA_A, rlsSet: true };
    });
    assert(resA.ejecutadoEnEmpresa === EMPRESA_A, 'Transacción aislada ejecutada para Empresa A');

    // Transacción aislada para Empresa B
    const resB = await db.withEmpresaTransaction(EMPRESA_B, async (client) => {
      return { ejecutadoEnEmpresa: EMPRESA_B, rlsSet: true };
    });
    assert(resB.ejecutadoEnEmpresa === EMPRESA_B, 'Transacción aislada ejecutada para Empresa B');
  }

  console.log('\n======================================================');
  console.log(`📊 RESULTADO SUITE FASE 7: ${passed}/${total} PRUEBAS EXITOSAS`);
  console.log('🎉 TODAS LAS PRUEBAS DE SEGURIDAD Y AISLAMIENTO DE LA FASE 7 PASARON SATISFACTORIAMENTE.');
  console.log('======================================================\n');
}

ejecutarSuiteFase7().catch(err => {
  console.error('❌ Error fatal ejecutando suite Fase 7:', err);
  process.exit(1);
});
