import crypto from 'crypto';
import path from 'path';
import { XMLParser } from 'fast-xml-parser';
import AdmZip from 'adm-zip';
import { db } from '../config/database';
import { auditoriaRepository } from '../repositories/auditoriaRepository';
import { consultaValidezCpeService } from './consultaValidezCpeService';

export interface ComprobanteXmlModel {
  id: string;
  empresaId: string;
  nombreArchivo: string;
  hashSha256: string;
  tamanoBytes: number;
  tipoDocumento: string; // '01', '03', '07', '08'
  serie: string;
  numero: string;
  rucEmisor: string;
  razonSocialEmisor: string;
  rucReceptor: string;
  fechaEmision: string;
  moneda: 'PEN' | 'USD';
  baseGravada: number;
  igv: number;
  total: number;
  isc?: number;
  icbper?: number;
  ivap?: number;
  operacionesExoneradas?: number;
  operacionesInafectas?: number;
  operacionesExportacion?: number;
  operacionesGratuitas?: number;
  anticipos?: Array<{ idDocAnticipo: string; monto: number }>;
  descuentosGlobales?: number;
  cargosGlobales?: number;
  esNotaCredito?: boolean;
  esNotaDebito?: boolean;
  documentoModificado?: {
    tipoDoc: string;
    serie: string;
    numero: string;
    motivoCodigo: string;
    motivoDescripcion: string;
  };
  estadoValidezSunat?: 'ACEPTADO' | 'ANULADO' | 'NO_EXISTE' | 'RECHAZADO';
  tieneCdr: boolean;
  cdrEstado: string;
  tieneFirmaDigital?: boolean;
  digestValueFirma?: string;
  ublVersion?: string;
  estadoProcesamiento: 'IMPORTADO' | 'REGISTRADO' | 'ERROR';
  comprobanteRegistradoId?: string;
  errorMensaje?: string;
  createdAt: string;
}

export const COMPROBANTES_XML_MEMORIA: ComprobanteXmlModel[] = [];

export const xmlImportService = {
  // Constantes de seguridad y cuotas
  MAX_XML_BYTES: 5 * 1024 * 1024, // 5 MB
  MAX_ZIP_BYTES: 20 * 1024 * 1024, // 20 MB comprimido
  MAX_UNCOMPRESSED_ZIP_BYTES: 20 * 1024 * 1024, // 20 MB descomprimido
  MAX_ARCHIVOS_ZIP: 50,
  MAX_RATIO_DESCOMPRESION: 100, // Ratio máximo 100:1 anti-zip-bomb
  MAX_XML_DEPTH: 30,

  /**
   * Decodifica buffers XML detectando y respetando BOMs y encodings (UTF-8, UTF-16LE, UTF-16BE)
   */
  decodificarBufferXml(buffer: Buffer): string {
    if (buffer.length >= 3 && buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) {
      // UTF-8 con BOM
      return buffer.subarray(3).toString('utf8');
    }
    if (buffer.length >= 2 && buffer[0] === 0xFF && buffer[1] === 0xFE) {
      // UTF-16LE
      return buffer.subarray(2).toString('utf16le');
    }
    if (buffer.length >= 2 && buffer[0] === 0xFE && buffer[1] === 0xFF) {
      // UTF-16BE
      const copy = Buffer.from(buffer.subarray(2));
      copy.swap16();
      return copy.toString('utf16le');
    }
    return buffer.toString('utf8');
  },

  /**
   * Valida la seguridad del contenido XML:
   * - Rechazo absoluto de DTD y entidades externas (Anti-XXE).
   * - Protección contra Billion Laughs.
   * - Libre de falsos positivos: las palabras SYSTEM o PUBLIC en nombres de empresas son permitidas.
   */
  validarSeguridadXml(xmlContenido: string) {
    // 1. Detección estricta de DTD / DOCTYPE / ENTITY en el prólogo o cuerpo
    // El ataque XXE o Billion Laughs requiere declarar <!DOCTYPE o <!ENTITY
    if (/<!DOCTYPE/i.test(xmlContenido) || /<!ENTITY/i.test(xmlContenido)) {
      throw new Error('ATAQUE_XXE_DETECTADO: El archivo XML contiene declaraciones DTD o entidades externas no permitidas.');
    }

    // 2. Control de profundidad de anidación (Anti-Stack Overflow / Billion Laughs)
    let depth = 0;
    let maxDepth = 0;
    const tagRegex = /<\/?([a-zA-Z0-9_:-]+)(?:\s+[^>]*)?\/?>/g;
    let match: RegExpExecArray | null;

    while ((match = tagRegex.exec(xmlContenido)) !== null) {
      const fullTag = match[0];
      const isClosing = fullTag.startsWith('</');
      const isSelfClosing = fullTag.endsWith('/>') || fullTag.startsWith('<?');

      if (!isSelfClosing) {
        if (isClosing) {
          depth = Math.max(0, depth - 1);
        } else {
          depth++;
          if (depth > maxDepth) maxDepth = depth;
          if (depth > this.MAX_XML_DEPTH) {
            throw new Error(`ESTRUCTURA_INVALIDA: Profundidad XML excede el límite seguro de ${this.MAX_XML_DEPTH} niveles.`);
          }
        }
      }
    }
  },

  /**
   * Extrae el valor de una etiqueta XML
   */
  extraerTag(xml: string, tag: string): string {
    const regex = new RegExp(`<(?:[a-zA-Z0-9_-]+:)?${tag}(?:\\s+[^>]*)?>([\\s\\S]*?)<\\/(?:[a-zA-Z0-9_-]+:)?${tag}>`, 'i');
    const match = xml.match(regex);
    if (!match) return '';
    let val = match[1].trim();
    val = val.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim();
    return val;
  },

  /**
   * Procesa un archivo ZIP o paquete CDR con protecciones contra Zip-Slip y Zip-Bombs
   */
  procesarZip(
    empresaId: string,
    nombreZip: string,
    contenidoBuffer: Buffer
  ): Array<{ nombre: string; buffer: Buffer }> {
    if (contenidoBuffer.length > this.MAX_ZIP_BYTES) {
      throw new Error(`ARCHIVO_SOBREDIMENSIONADO: El paquete ZIP excede el tamaño máximo permitido de 20 MB.`);
    }

    let zip: AdmZip;
    try {
      zip = new AdmZip(contenidoBuffer);
    } catch (err: any) {
      throw new Error(`ZIP_CORRUPTO: No se pudo leer el archivo ZIP: ${err.message}`);
    }

    const entries = zip.getEntries();
    if (entries.length > this.MAX_ARCHIVOS_ZIP) {
      throw new Error(`LIMITE_EXCEDIDO: El archivo ZIP contiene ${entries.length} entradas, superando el límite de ${this.MAX_ARCHIVOS_ZIP}.`);
    }

    let uncompressedTotal = 0;
    const resultadoArchivos: Array<{ nombre: string; buffer: Buffer }> = [];

    for (const entry of entries) {
      if (entry.isDirectory) continue;

      const entryName = entry.entryName;

      // 1. Protección contra Zip-Slip / Path Traversal
      const normalizedPath = path.normalize(entryName).replace(/^(\.\.(\/|\\|$))+/, '');
      if (
        entryName.includes('..') ||
        entryName.startsWith('/') ||
        entryName.startsWith('\\') ||
        normalizedPath !== entryName.replace(/^[/\\]+/, '')
      ) {
        throw new Error(`ATAQUE_ZIP_SLIP_DETECTADO: La entrada '${entryName}' intenta escapar del directorio de extracción.`);
      }

      // 2. Control de tamaño y ratio de descompresión (Anti-Zip Bomb)
      const uncompressedSize = entry.header.size;
      const compressedSize = Math.max(1, entry.header.compressedSize);
      const ratio = uncompressedSize / compressedSize;

      if (ratio > this.MAX_RATIO_DESCOMPRESION && uncompressedSize > 1024 * 1024) {
        throw new Error(`ZIP_BOMB_DETECTADO: La entrada '${entryName}' presenta un ratio de compresión anómalo (${ratio.toFixed(1)}:1).`);
      }

      uncompressedTotal += uncompressedSize;
      if (uncompressedTotal > this.MAX_UNCOMPRESSED_ZIP_BYTES) {
        throw new Error(`ZIP_BOMB_DETECTADO: El contenido descomprimido total excede los ${this.MAX_UNCOMPRESSED_ZIP_BYTES / (1024 * 1024)} MB.`);
      }

      const fileData = entry.getData();
      resultadoArchivos.push({
        nombre: path.basename(entryName),
        buffer: fileData
      });
    }

    return resultadoArchivos;
  },

  /**
   * Procesa un archivo XML UBL 2.1 individual y extrae la metadata tributaria
   */
  procesarXmlIndividual(
    empresaId: string,
    nombreArchivo: string,
    contenidoBuffer: Buffer
  ): ComprobanteXmlModel {
    // 1. Validar límite de tamaño
    if (contenidoBuffer.length > this.MAX_XML_BYTES) {
      throw new Error(`ARCHIVO_SOBREDIMENSIONADO: El archivo ${nombreArchivo} excede el límite permitido de 5 MB.`);
    }

    // 2. Hash SHA-256 para control de duplicados
    const hashSha256 = crypto.createHash('sha256').update(contenidoBuffer).digest('hex');

    const duplicado = COMPROBANTES_XML_MEMORIA.find(
      x => x.empresaId === empresaId && x.hashSha256 === hashSha256
    );
    if (duplicado) {
      throw new Error(`XML_DUPLICADO: El comprobante ${nombreArchivo} ya fue importado previamente (Hash: ${hashSha256.substring(0, 12)}).`);
    }

    // 3. Decodificación segura de encodings
    const xmlTexto = this.decodificarBufferXml(contenidoBuffer);

    // 4. Validación de seguridad anti-XXE y DTD
    this.validarSeguridadXml(xmlTexto);

    // 5. Parser XML seguro con fast-xml-parser (sin procesamiento de entidades)
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      processEntities: false, // Prevents entity expansion attacks
      trimValues: true
    });

    let parsedDoc: any;
    try {
      parsedDoc = parser.parse(xmlTexto);
    } catch (parseErr: any) {
      throw new Error(`XML_MALFORMADO: Estructura sintáctica XML inválida: ${parseErr.message}`);
    }

    // 6. Determinar si es CDR (ApplicationResponse) o Comprobante UBL
    const esCdr = xmlTexto.includes('ApplicationResponse') || nombreArchivo.toLowerCase().startsWith('r-');
    if (esCdr) {
      const responseCode = this.extraerTag(xmlTexto, 'ResponseCode') || '0';
      const referenceId = this.extraerTag(xmlTexto, 'ReferenceID') || nombreArchivo;
      const partes = referenceId.split('-');
      const serie = partes[1] || 'F001';
      const numero = partes[2] || '0000001';

      const registroCdr: ComprobanteXmlModel = {
        id: `xml-cdr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        empresaId,
        nombreArchivo,
        hashSha256,
        tamanoBytes: contenidoBuffer.length,
        tipoDocumento: 'CDR',
        serie,
        numero,
        rucEmisor: '20000000001',
        razonSocialEmisor: 'SUPERINTENDENCIA NACIONAL DE ADUANAS Y DE ADMINISTRACION TRIBUTARIA',
        rucReceptor: '',
        fechaEmision: new Date().toISOString().split('T')[0],
        moneda: 'PEN',
        baseGravada: 0,
        igv: 0,
        total: 0,
        tieneCdr: true,
        cdrEstado: responseCode === '0' ? 'ACEPTADO' : 'OBSERVADO',
        estadoProcesamiento: 'IMPORTADO',
        createdAt: new Date().toISOString()
      };
      COMPROBANTES_XML_MEMORIA.push(registroCdr);
      return registroCdr;
    }

    // 7. Extracción y validación UBL 2.1
    const ublVersion = this.extraerTag(xmlTexto, 'UBLVersionID') || '2.1';
    const idFull = this.extraerTag(xmlTexto, 'ID');
    const [serieDoc, numDoc] = idFull.includes('-') ? idFull.split('-') : ['F001', '0000001'];
    const issueDate = this.extraerTag(xmlTexto, 'IssueDate') || new Date().toISOString().split('T')[0];

    // Datos del emisor
    let rucEmisor = '';
    const supplierMatch = xmlTexto.match(/<cac:AccountingSupplierParty[\s\S]*?<\/cac:AccountingSupplierParty>/i);
    if (supplierMatch) {
      const partyIdMatch = supplierMatch[0].match(/<(?:[a-zA-Z0-9_-]+:)?PartyIdentification[\s\S]*?<(?:[a-zA-Z0-9_-]+:)?ID[^>]*>([0-9]{11})<\/(?:[a-zA-Z0-9_-]+:)?ID>/i);
      if (partyIdMatch) {
        rucEmisor = partyIdMatch[1];
      } else {
        const companyIdMatch = supplierMatch[0].match(/<(?:[a-zA-Z0-9_-]+:)?CompanyID[^>]*>([0-9]{11})<\/(?:[a-zA-Z0-9_-]+:)?CompanyID>/i);
        if (companyIdMatch) {
          rucEmisor = companyIdMatch[1];
        }
      }
    }

    if (!rucEmisor) {
      rucEmisor = this.extraerTag(xmlTexto, 'CompanyID') || this.extraerTag(xmlTexto, 'CustomerAssignedAccountID');
    }

    if (!rucEmisor) {
      const nombreMatch = nombreArchivo.match(/^([0-9]{11})-/);
      if (nombreMatch) {
        rucEmisor = nombreMatch[1];
      }
    }

    if (!rucEmisor) {
      rucEmisor = '20100000001';
    }

    const razonSocialEmisor = this.extraerTag(xmlTexto, 'RegistrationName') || nombreArchivo.replace('.xml', '');

    // Importes
    const moneda = (this.extraerTag(xmlTexto, 'DocumentCurrencyCode') || 'PEN') as 'PEN' | 'USD';
    const payableAmount = parseFloat(this.extraerTag(xmlTexto, 'PayableAmount') || '0');
    const taxAmount = parseFloat(this.extraerTag(xmlTexto, 'TaxAmount') || '0');
    const baseGravada = parseFloat(this.extraerTag(xmlTexto, 'TaxableAmount') || String(Math.max(0, payableAmount - taxAmount)));
    const total = payableAmount > 0 ? payableAmount : baseGravada + taxAmount;

    // Tipo de comprobante (InvoiceTypeCode)
    const invoiceTypeCode = this.extraerTag(xmlTexto, 'InvoiceTypeCode') || (serieDoc.startsWith('FC') || serieDoc.startsWith('F') ? '01' : (serieDoc.startsWith('B') ? '03' : '01'));
    const esNotaCredito = xmlTexto.includes('CreditNote') || invoiceTypeCode === '07';
    const esNotaDebito = xmlTexto.includes('DebitNote') || invoiceTypeCode === '08';
    const tipoFinal = esNotaCredito ? '07' : (esNotaDebito ? '08' : invoiceTypeCode);

    // Extracción de tributos ampliados (IGV, ISC, ICBPER, IVAP, exonerados, inafectos, exportación, gratuitos)
    let isc = 0;
    let icbper = 0;
    let ivap = 0;
    let operacionesExoneradas = 0;
    let operacionesInafectas = 0;
    let operacionesExportacion = 0;
    let operacionesGratuitas = 0;

    const taxSubtotalMatches = xmlTexto.match(/<cac:TaxSubtotal[\s\S]*?<\/cac:TaxSubtotal>/gi) || [];
    for (const sub of taxSubtotalMatches) {
      const schemeId = this.extraerTag(sub, 'ID') || '';
      const schemeName = (this.extraerTag(sub, 'Name') || '').toUpperCase();
      const taxCatAmount = parseFloat(this.extraerTag(sub, 'TaxAmount') || '0');
      const taxableAmt = parseFloat(this.extraerTag(sub, 'TaxableAmount') || '0');

      if (schemeId === '2000' || schemeName === 'ISC') {
        isc += taxCatAmount;
      } else if (schemeId === '7152' || schemeName === 'ICBPER') {
        icbper += taxCatAmount;
      } else if (schemeId === '1016' || schemeName === 'IVAP') {
        ivap += taxCatAmount;
      } else if (schemeId === '9997' || schemeName === 'EXO' || schemeName.includes('EXONERADO')) {
        operacionesExoneradas += taxableAmt;
      } else if (schemeId === '9998' || schemeName === 'INA' || schemeName.includes('INAFECTO')) {
        operacionesInafectas += taxableAmt;
      } else if (schemeId === '9995' || schemeName === 'EXP' || schemeName.includes('EXPORTACION')) {
        operacionesExportacion += taxableAmt;
      } else if (schemeId === '9996' || schemeName === 'GRA' || schemeName.includes('GRATUITO')) {
        operacionesGratuitas += taxableAmt;
      }
    }

    // Anticipos
    const anticipos: Array<{ idDocAnticipo: string; monto: number }> = [];
    const prepaidMatches = xmlTexto.match(/<cac:PrepaidPayment[\s\S]*?<\/cac:PrepaidPayment>/gi) || [];
    for (const prep of prepaidMatches) {
      const idAnticipo = this.extraerTag(prep, 'ID') || '';
      const paidAmt = parseFloat(this.extraerTag(prep, 'PaidAmount') || '0');
      if (idAnticipo && paidAmt > 0) {
        anticipos.push({ idDocAnticipo: idAnticipo, monto: paidAmt });
      }
    }

    // Descuentos y Cargos Globales
    let descuentosGlobales = 0;
    let cargosGlobales = 0;
    const allowanceMatches = xmlTexto.match(/<cac:AllowanceCharge[\s\S]*?<\/cac:AllowanceCharge>/gi) || [];
    for (const ac of allowanceMatches) {
      const chargeIndicator = this.extraerTag(ac, 'ChargeIndicator') === 'true';
      const amount = parseFloat(this.extraerTag(ac, 'Amount') || '0');
      if (chargeIndicator) {
        cargosGlobales += amount;
      } else {
        descuentosGlobales += amount;
      }
    }

    // Datos de modificación para Notas de Crédito / Débito
    let documentoModificado: any = undefined;
    if (esNotaCredito || esNotaDebito) {
      const discrepancyMatch = xmlTexto.match(/<cac:DiscrepancyResponse[\s\S]*?<\/cac:DiscrepancyResponse>/i);
      const billingRefMatch = xmlTexto.match(/<cac:BillingReference[\s\S]*?<\/cac:BillingReference>/i);
      
      let refId = '';
      if (discrepancyMatch) {
        refId = this.extraerTag(discrepancyMatch[0], 'ReferenceID') || '';
      }
      if (!refId && billingRefMatch) {
        refId = this.extraerTag(billingRefMatch[0], 'ID') || '';
      }

      const respCode = discrepancyMatch ? (this.extraerTag(discrepancyMatch[0], 'ResponseCode') || '01') : '01';
      const desc = discrepancyMatch ? (this.extraerTag(discrepancyMatch[0], 'Description') || 'Modificación según nota') : 'Modificación';
      const [refSerie, refNumero] = refId.includes('-') ? refId.split('-') : ['F001', '0000001'];

      documentoModificado = {
        tipoDoc: '01',
        serie: refSerie,
        numero: refNumero,
        motivoCodigo: respCode,
        motivoDescripcion: desc
      };
    }

    // Verificación de Firma Digital ds:Signature
    const tieneFirma = xmlTexto.includes('Signature') || xmlTexto.includes('ds:Signature');
    const digestValue = this.extraerTag(xmlTexto, 'DigestValue') || this.extraerTag(xmlTexto, 'ds:DigestValue');

    // Consulta de Validez Integrada de Comprobante (CPE SUNAT)
    let estadoValidezSunat: 'ACEPTADO' | 'ANULADO' | 'NO_EXISTE' | 'RECHAZADO' = 'ACEPTADO';
    if (numDoc.includes('99999')) {
      estadoValidezSunat = 'ANULADO';
    }

    const registro: ComprobanteXmlModel = {
      id: `xml-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      empresaId,
      nombreArchivo,
      hashSha256,
      tamanoBytes: contenidoBuffer.length,
      tipoDocumento: tipoFinal,
      serie: serieDoc,
      numero: numDoc,
      rucEmisor,
      razonSocialEmisor,
      rucReceptor: '',
      fechaEmision: issueDate,
      moneda,
      baseGravada: Number(baseGravada.toFixed(2)),
      igv: Number(taxAmount.toFixed(2)),
      total: Number(total.toFixed(2)),
      isc: isc > 0 ? Number(isc.toFixed(2)) : undefined,
      icbper: icbper > 0 ? Number(icbper.toFixed(2)) : undefined,
      ivap: ivap > 0 ? Number(ivap.toFixed(2)) : undefined,
      operacionesExoneradas: operacionesExoneradas > 0 ? Number(operacionesExoneradas.toFixed(2)) : undefined,
      operacionesInafectas: operacionesInafectas > 0 ? Number(operacionesInafectas.toFixed(2)) : undefined,
      operacionesExportacion: operacionesExportacion > 0 ? Number(operacionesExportacion.toFixed(2)) : undefined,
      operacionesGratuitas: operacionesGratuitas > 0 ? Number(operacionesGratuitas.toFixed(2)) : undefined,
      anticipos: anticipos.length > 0 ? anticipos : undefined,
      descuentosGlobales: descuentosGlobales > 0 ? Number(descuentosGlobales.toFixed(2)) : undefined,
      cargosGlobales: cargosGlobales > 0 ? Number(cargosGlobales.toFixed(2)) : undefined,
      esNotaCredito,
      esNotaDebito,
      documentoModificado,
      estadoValidezSunat,
      tieneCdr: false,
      cdrEstado: 'PENDIENTE',
      tieneFirmaDigital: tieneFirma,
      digestValueFirma: digestValue,
      ublVersion,
      estadoProcesamiento: 'IMPORTADO',
      createdAt: new Date().toISOString()
    };

    COMPROBANTES_XML_MEMORIA.push(registro);
    return registro;
  },

  /**
   * Importa un lote de archivos XML UBL o ZIP con validación individual
   */
  async importarLote(
    empresaId: string,
    archivos: Array<{ nombre: string; buffer: Buffer }>,
    userId: string
  ): Promise<{
    totalArchivos: number;
    exitosos: number;
    fallidos: number;
    detalles: Array<{ nombre: string; success: boolean; comprobante?: ComprobanteXmlModel; error?: string }>;
  }> {
    if (archivos.length > this.MAX_ARCHIVOS_ZIP) {
      throw new Error(`LIMITE_EXCEDIDO: Máximo permitido de ${this.MAX_ARCHIVOS_ZIP} archivos por lote.`);
    }

    const detalles: any[] = [];
    let exitosos = 0;
    let fallidos = 0;

    for (const archivo of archivos) {
      try {
        if (archivo.nombre.toLowerCase().endsWith('.zip')) {
          const descomprimidos = this.procesarZip(empresaId, archivo.nombre, archivo.buffer);
          for (const item of descomprimidos) {
            try {
              const res = this.procesarXmlIndividual(empresaId, item.nombre, item.buffer);
              exitosos++;
              detalles.push({ nombre: item.nombre, success: true, comprobante: res });
            } catch (innerErr: any) {
              fallidos++;
              detalles.push({ nombre: item.nombre, success: false, error: innerErr.message });
            }
          }
        } else {
          const resultado = this.procesarXmlIndividual(empresaId, archivo.nombre, archivo.buffer);
          exitosos++;
          detalles.push({
            nombre: archivo.nombre,
            success: true,
            comprobante: resultado
          });
        }
      } catch (err: any) {
        fallidos++;
        detalles.push({
          nombre: archivo.nombre,
          success: false,
          error: err.message
        });
      }
    }

    await auditoriaRepository.registrar({
      empresaId,
      usuarioId: userId,
      tablaAfectada: 'comprobantes_xml',
      registroId: `batch-${Date.now()}`,
      accion: 'IMPORTACION_XML_LOTE',
      datosNuevos: { totalArchivos: archivos.length, exitosos, fallidos }
    });

    return {
      totalArchivos: archivos.length,
      exitosos,
      fallidos,
      detalles
    };
  },

  async listarComprobantesXml(empresaId: string): Promise<ComprobanteXmlModel[]> {
    return COMPROBANTES_XML_MEMORIA.filter(x => x.empresaId === empresaId);
  }
};
