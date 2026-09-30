import { Comprobante, TipoComprobante, CdrSunatInfo, ComprobanteItem } from '../types';

export interface SyncStepStatus {
  step: number;
  label: string;
  detail: string;
  status: 'pending' | 'running' | 'completed' | 'error';
}

const mockCdrAceptado = (serieNumero: string, fecha: string): CdrSunatInfo => ({
  codigoRespuesta: '0',
  descripcionRespuesta: `La Factura número ${serieNumero} ha sido ACEPTADA por la SUNAT`,
  fechaRecepcion: fecha,
  horaRecepcion: '10:45:12',
  hashCpe: 'a8f93c0e12d456789bcf120938475612acde3456',
  firmaDigital: 'SUNAT-PKI-CERT-2026-AUTH-SIGNATURE-OK',
  ticketSunat: '202609001293847',
  estadoCdr: 'ACEPTADO'
});

export const COMPROBANTES_INICIALES_COMPRAS: Comprobante[] = [
  {
    id: 'cmp-001',
    car: '2010003539201F001002345120260901',
    tipoDoc: '01',
    serie: 'F001',
    numero: '0023451',
    fechaEmision: '2026-09-02',
    fechaVencimiento: '2026-09-17',
    rucEmisor: '20100035392',
    razonSocialEmisor: 'DISTRIBUIDORA INDUSTRIAL FERRETERA S.A.C.',
    direccionEmisor: 'AV. ARGENTINA 1840, CERCADO DE LIMA',
    rucReceptor: '20601234567',
    razonSocialReceptor: 'CORPORACION LOGISTICA & SERVICIOS DEL PERU S.A.C.',
    direccionReceptor: 'AV. CANAVAL Y MOREYRA 480 OF. 902, SAN ISIDRO, LIMA',
    items: [
      {
        id: 'it-1',
        cantidad: 50,
        unidadMedida: 'NIU',
        descripcion: 'Cajas de pernos y tuercas de acero grado 8',
        valorUnitario: 44.00,
        precioUnitario: 51.92,
        subtotal: 2200.00,
        igv: 396.00,
        total: 2596.00
      },
      {
        id: 'it-2',
        cantidad: 20,
        unidadMedida: 'NIU',
        descripcion: 'Herramientas de sujeción para almacén pesado',
        valorUnitario: 100.00,
        precioUnitario: 118.00,
        subtotal: 2000.00,
        igv: 360.00,
        total: 2360.00
      }
    ],
    moneda: 'PEN',
    tipoCambio: 1.000,
    baseImponibleGravada: 4200.00,
    igv: 756.00,
    adquisicionesNoGravadas: 0,
    isc: 0,
    icbper: 0,
    otrosTributos: 0,
    total: 4956.00,
    sujetoADetraccion: false,
    clasificacionBienServicio: 'MERCADERIA',
    categoriaGasto: '6011',
    cuentaContableAsignada: '6011',
    asientoGenerado: true,
    asientoId: 'AST-202609-001',
    estadoSunat: 'ACEPTADO',
    origen: 'SUNAT_SIRE_SYNC',
    cdrData: mockCdrAceptado('F001-0023451', '2026-09-02'),
    hashCpe: 'b9e4a38f71290384756182938475610293847561',
    observaciones: 'Compra de existencias para comercialización mayorista'
  },
  {
    id: 'cmp-002',
    car: '2025345678901E001000491220260903',
    tipoDoc: '01',
    serie: 'E001',
    numero: '0004912',
    fechaEmision: '2026-09-04',
    fechaVencimiento: '2026-09-19',
    rucEmisor: '20253456789',
    razonSocialEmisor: 'LUZ DEL SUR S.A.A.',
    direccionEmisor: 'AV. ANGAMOS ESTE 240, SURQUILLO, LIMA',
    rucReceptor: '20601234567',
    razonSocialReceptor: 'CORPORACION LOGISTICA & SERVICIOS DEL PERU S.A.C.',
    direccionReceptor: 'AV. CANAVAL Y MOREYRA 480 OF. 902, SAN ISIDRO, LIMA',
    items: [
      {
        id: 'it-1',
        cantidad: 1,
        unidadMedida: 'ZZ',
        descripcion: 'Consumo de energía eléctrica - Suministro #3918239',
        valorUnitario: 1350.00,
        precioUnitario: 1593.00,
        subtotal: 1350.00,
        igv: 243.00,
        total: 1593.00
      }
    ],
    moneda: 'PEN',
    tipoCambio: 1.000,
    baseImponibleGravada: 1350.00,
    igv: 243.00,
    adquisicionesNoGravadas: 12.50,
    isc: 0,
    icbper: 0,
    otrosTributos: 15.00,
    total: 1620.50,
    sujetoADetraccion: false,
    clasificacionBienServicio: 'SERVICIOS_BASICOS',
    categoriaGasto: '6361',
    cuentaContableAsignada: '6361',
    asientoGenerado: true,
    asientoId: 'AST-202609-002',
    estadoSunat: 'ACEPTADO',
    origen: 'SUNAT_SIRE_SYNC',
    cdrData: mockCdrAceptado('E001-0004912', '2026-09-04'),
    hashCpe: 'f182390a82736128394019283746510293847561',
    observaciones: 'Suministro eléctrico sede central San Isidro'
  },
  {
    id: 'cmp-003',
    car: '2010001749101F102008912320260907',
    tipoDoc: '01',
    serie: 'F102',
    numero: '0089123',
    fechaEmision: '2026-09-07',
    fechaVencimiento: '2026-09-22',
    rucEmisor: '20100017491',
    razonSocialEmisor: 'TELEFONICA DEL PERU S.A.A.',
    direccionEmisor: 'AV. EL DERBY 055, SANTIAGO DE SURCO, LIMA',
    rucReceptor: '20601234567',
    razonSocialReceptor: 'CORPORACION LOGISTICA & SERVICIOS DEL PERU S.A.C.',
    direccionReceptor: 'AV. CANAVAL Y MOREYRA 480 OF. 902, SAN ISIDRO, LIMA',
    items: [
      {
        id: 'it-1',
        cantidad: 1,
        unidadMedida: 'ZZ',
        descripcion: 'Servicio de Internet Fibra Óptica Corporativa Simétrica 500 Mbps',
        valorUnitario: 850.00,
        precioUnitario: 1003.00,
        subtotal: 850.00,
        igv: 153.00,
        total: 1003.00
      }
    ],
    moneda: 'PEN',
    tipoCambio: 1.000,
    baseImponibleGravada: 850.00,
    igv: 153.00,
    adquisicionesNoGravadas: 0,
    isc: 0,
    icbper: 0,
    otrosTributos: 0,
    total: 1003.00,
    sujetoADetraccion: false,
    clasificacionBienServicio: 'SERVICIOS_BASICOS',
    categoriaGasto: '6364',
    cuentaContableAsignada: '6364',
    asientoGenerado: true,
    asientoId: 'AST-202609-003',
    estadoSunat: 'ACEPTADO',
    origen: 'SUNAT_SIRE_SYNC',
    cdrData: mockCdrAceptado('F102-0089123', '2026-09-07'),
    hashCpe: 'c9182390a8172635481920394857610293847561',
    observaciones: 'Servicio de Internet Fibra Óptica Corporativa'
  },
  {
    id: 'cmp-004',
    car: '2055678912301F005000128920260910',
    tipoDoc: '01',
    serie: 'F005',
    numero: '0001289',
    fechaEmision: '2026-09-10',
    fechaVencimiento: '2026-09-25',
    rucEmisor: '20556789123',
    razonSocialEmisor: 'TRANSPORTES & CARGA PESADA DEL SUR S.A.C.',
    direccionEmisor: 'AV. MATERIALES 2350, CALLAO, LIMA',
    rucReceptor: '20601234567',
    razonSocialReceptor: 'CORPORACION LOGISTICA & SERVICIOS DEL PERU S.A.C.',
    direccionReceptor: 'AV. CANAVAL Y MOREYRA 480 OF. 902, SAN ISIDRO, LIMA',
    items: [
      {
        id: 'it-1',
        cantidad: 1,
        unidadMedida: 'ZZ',
        descripcion: 'Servicio de transporte de carga pesada ruta Lima - Arequipa',
        valorUnitario: 3500.00,
        precioUnitario: 4130.00,
        subtotal: 3500.00,
        igv: 630.00,
        total: 4130.00
      }
    ],
    moneda: 'PEN',
    tipoCambio: 1.000,
    baseImponibleGravada: 3500.00,
    igv: 630.00,
    adquisicionesNoGravadas: 0,
    isc: 0,
    icbper: 0,
    otrosTributos: 0,
    total: 4130.00,
    sujetoADetraccion: true,
    codigoDetraccion: '027', // Transporte de bienes por vía terrestre (4%)
    tasaDetraccion: 4,
    montoDetraccion: 165.20,
    constanciaDetraccion: '109823412',
    fechaPagoDetraccion: '2026-09-15',
    clasificacionBienServicio: 'GASTO_SERVICIOS',
    categoriaGasto: '6311',
    cuentaContableAsignada: '6311',
    asientoGenerado: true,
    asientoId: 'AST-202609-004',
    estadoSunat: 'ACEPTADO',
    origen: 'SUNAT_SIRE_SYNC',
    cdrData: mockCdrAceptado('F005-0001289', '2026-09-10'),
    hashCpe: 'd192837465102938475618293847561029384756',
    observaciones: 'Flete terrestre Lima - Arequipa - Sujeto a detracción SPOT 4%'
  },
  {
    id: 'cmp-005',
    car: '2060987412501F001000078220260914',
    tipoDoc: '01',
    serie: 'F001',
    numero: '0000782',
    fechaEmision: '2026-09-14',
    fechaVencimiento: '2026-09-29',
    rucEmisor: '20609874125',
    razonSocialEmisor: 'ASESORES TRIBUTARIOS & AUDITORES ASOCIADOS S.C.R.L.',
    direccionEmisor: 'CALLE DEAN VALDIVIA 148, SAN ISIDRO, LIMA',
    rucReceptor: '20601234567',
    razonSocialReceptor: 'CORPORACION LOGISTICA & SERVICIOS DEL PERU S.A.C.',
    direccionReceptor: 'AV. CANAVAL Y MOREYRA 480 OF. 902, SAN ISIDRO, LIMA',
    items: [
      {
        id: 'it-1',
        cantidad: 1,
        unidadMedida: 'ZZ',
        descripcion: 'Servicio de asesoría tributaria y auditoría preventiva mensual',
        valorUnitario: 2500.00,
        precioUnitario: 2950.00,
        subtotal: 2500.00,
        igv: 450.00,
        total: 2950.00
      }
    ],
    moneda: 'PEN',
    tipoCambio: 1.000,
    baseImponibleGravada: 2500.00,
    igv: 450.00,
    adquisicionesNoGravadas: 0,
    isc: 0,
    icbper: 0,
    otrosTributos: 0,
    total: 2950.00,
    sujetoADetraccion: true,
    codigoDetraccion: '022', // Otros servicios empresariales (12%)
    tasaDetraccion: 12,
    montoDetraccion: 354.00,
    constanciaDetraccion: '109855219',
    fechaPagoDetraccion: '2026-09-18',
    clasificacionBienServicio: 'GASTO_SERVICIOS',
    categoriaGasto: '6321',
    cuentaContableAsignada: '6321',
    asientoGenerado: true,
    asientoId: 'AST-202609-005',
    estadoSunat: 'ACEPTADO',
    origen: 'SUNAT_SIRE_SYNC',
    cdrData: mockCdrAceptado('F001-0000782', '2026-09-14'),
    hashCpe: 'e102938475618293847561029384756182938475',
    observaciones: 'Auditoría tributaria preventiva y asesoría contable'
  },
  {
    id: 'cmp-006',
    car: '2034561289001F002000341120260918',
    tipoDoc: '01',
    serie: 'F002',
    numero: '0003411',
    fechaEmision: '2026-09-18',
    fechaVencimiento: '2026-10-03',
    rucEmisor: '20345612890',
    razonSocialEmisor: 'COMPUTO E INFORMATICA DEL PERU S.A.',
    direccionEmisor: 'AV. GARCILASO DE LA VEGA 1348, LIMA',
    rucReceptor: '20601234567',
    razonSocialReceptor: 'CORPORACION LOGISTICA & SERVICIOS DEL PERU S.A.C.',
    direccionReceptor: 'AV. CANAVAL Y MOREYRA 480 OF. 902, SAN ISIDRO, LIMA',
    items: [
      {
        id: 'it-1',
        cantidad: 1,
        unidadMedida: 'NIU',
        descripcion: 'Servidor ProLiant Xeon 32GB RAM + 2TB SSD NVMe',
        valorUnitario: 3752.00,
        precioUnitario: 4427.36,
        subtotal: 3752.00,
        igv: 675.36,
        total: 4427.36
      },
      {
        id: 'it-2',
        cantidad: 2,
        unidadMedida: 'NIU',
        descripcion: 'Laptops Lenovo ThinkPad T14 AMD Ryzen 7',
        valorUnitario: 938.00,
        precioUnitario: 1106.84,
        subtotal: 1876.00,
        igv: 337.68,
        total: 2213.68
      }
    ],
    moneda: 'USD',
    tipoCambio: 3.752,
    baseImponibleGravada: 5628.00,
    igv: 1013.04,
    adquisicionesNoGravadas: 0,
    isc: 0,
    icbper: 0,
    otrosTributos: 0,
    total: 6641.04,
    sujetoADetraccion: false,
    clasificacionBienServicio: 'ACTIVO_FIJO',
    categoriaGasto: '33611',
    cuentaContableAsignada: '33611',
    asientoGenerado: true,
    asientoId: 'AST-202609-006',
    estadoSunat: 'ACEPTADO',
    origen: 'XML_UBL_UPLOAD',
    cdrData: mockCdrAceptado('F002-0003411', '2026-09-18'),
    hashCpe: 'a192837465019283746518293847561029384756',
    observaciones: 'Adquisición de Servidor de Base de Datos y 2 Laptops ThinkPad (USD 1,500.00 TC: 3.752)'
  }
];

export const COMPROBANTES_INICIALES_VENTAS: Comprobante[] = [
  {
    id: 'vnt-001',
    car: '2060123456701F001000104520260905',
    tipoDoc: '01',
    serie: 'F001',
    numero: '0001045',
    fechaEmision: '2026-09-05',
    fechaVencimiento: '2026-09-20',
    rucEmisor: '20601234567',
    razonSocialEmisor: 'CORPORACION LOGISTICA & SERVICIOS DEL PERU S.A.C.',
    direccionEmisor: 'AV. CANAVAL Y MOREYRA 480 OF. 902, SAN ISIDRO, LIMA',
    rucReceptor: '20512398741',
    razonSocialReceptor: 'MINERA LOS ANDES DEL CENTRO S.A.A.',
    direccionReceptor: 'AV. JAVIER PRADO ESTE 4200, SANTIAGO DE SURCO, LIMA',
    items: [
      {
        id: 'it-1',
        cantidad: 1,
        unidadMedida: 'ZZ',
        descripcion: 'Servicio integral de transporte y logística minera ruta Lima - Yauli',
        valorUnitario: 12500.00,
        precioUnitario: 14750.00,
        subtotal: 12500.00,
        igv: 2250.00,
        total: 14750.00
      }
    ],
    moneda: 'PEN',
    tipoCambio: 1.000,
    baseImponibleGravada: 12500.00,
    igv: 2250.00,
    adquisicionesNoGravadas: 0,
    isc: 0,
    icbper: 0,
    otrosTributos: 0,
    total: 14750.00,
    sujetoADetraccion: true,
    codigoDetraccion: '027',
    tasaDetraccion: 4,
    montoDetraccion: 590.00,
    clasificacionBienServicio: 'MERCADERIA',
    categoriaGasto: '70111',
    cuentaContableAsignada: '70111',
    asientoGenerado: true,
    asientoId: 'AST-202609-V01',
    estadoSunat: 'ACEPTADO',
    origen: 'SUNAT_SIRE_SYNC',
    cdrData: mockCdrAceptado('F001-0001045', '2026-09-05'),
    hashCpe: '9982348192039485761029384756182938475610',
    observaciones: 'Servicio integral de logística minera'
  },
  {
    id: 'vnt-002',
    car: '2060123456701F001000104620260912',
    tipoDoc: '01',
    serie: 'F001',
    numero: '0001046',
    fechaEmision: '2026-09-12',
    fechaVencimiento: '2026-09-27',
    rucEmisor: '20601234567',
    razonSocialEmisor: 'CORPORACION LOGISTICA & SERVICIOS DEL PERU S.A.C.',
    direccionEmisor: 'AV. CANAVAL Y MOREYRA 480 OF. 902, SAN ISIDRO, LIMA',
    rucReceptor: '20456123789',
    razonSocialReceptor: 'AGROEXPORTADORA DEL VALLE S.A.C.',
    direccionReceptor: 'CARRETERA PANAMERICANA SUR KM 290, ICA',
    items: [
      {
        id: 'it-1',
        cantidad: 1,
        unidadMedida: 'ZZ',
        descripcion: 'Distribución y almacenamiento refrigerado de arándanos y palta Hass',
        valorUnitario: 8900.00,
        precioUnitario: 10502.00,
        subtotal: 8900.00,
        igv: 1602.00,
        total: 10502.00
      }
    ],
    moneda: 'PEN',
    tipoCambio: 1.000,
    baseImponibleGravada: 8900.00,
    igv: 1602.00,
    adquisicionesNoGravadas: 0,
    isc: 0,
    icbper: 0,
    otrosTributos: 0,
    total: 10502.00,
    sujetoADetraccion: false,
    clasificacionBienServicio: 'MERCADERIA',
    categoriaGasto: '70111',
    cuentaContableAsignada: '70111',
    asientoGenerado: true,
    asientoId: 'AST-202609-V02',
    estadoSunat: 'ACEPTADO',
    origen: 'SUNAT_SIRE_SYNC',
    cdrData: mockCdrAceptado('F001-0001046', '2026-09-12'),
    hashCpe: '8872348192039485761029384756182938475611',
    observaciones: 'Distribución refrigerada de arándanos y palta Hass'
  },
  {
    id: 'vnt-003',
    car: '2060123456703B001000412020260916',
    tipoDoc: '03',
    serie: 'B001',
    numero: '0004120',
    fechaEmision: '2026-09-16',
    fechaVencimiento: '2026-09-16',
    rucEmisor: '20601234567',
    razonSocialEmisor: 'CORPORACION LOGISTICA & SERVICIOS DEL PERU S.A.C.',
    direccionEmisor: 'AV. CANAVAL Y MOREYRA 480 OF. 902, SAN ISIDRO, LIMA',
    rucReceptor: '10458923412',
    razonSocialReceptor: 'CARLOS ALBERTO MENDOZA QUISPE',
    direccionReceptor: 'JR. HUANCAVELICA 280, LIMA',
    items: [
      {
        id: 'it-1',
        cantidad: 1,
        unidadMedida: 'NIU',
        descripcion: 'Servicio de entrega y embalaje express',
        valorUnitario: 1200.00,
        precioUnitario: 1416.00,
        subtotal: 1200.00,
        igv: 216.00,
        total: 1416.00
      }
    ],
    moneda: 'PEN',
    tipoCambio: 1.000,
    baseImponibleGravada: 1200.00,
    igv: 216.00,
    adquisicionesNoGravadas: 0,
    isc: 0,
    icbper: 0.50,
    otrosTributos: 0,
    total: 1416.50,
    sujetoADetraccion: false,
    clasificacionBienServicio: 'MERCADERIA',
    categoriaGasto: '70111',
    cuentaContableAsignada: '70111',
    asientoGenerado: true,
    asientoId: 'AST-202609-V03',
    estadoSunat: 'ACEPTADO',
    origen: 'SUNAT_SIRE_SYNC',
    cdrData: mockCdrAceptado('B001-0004120', '2026-09-16'),
    hashCpe: '7762348192039485761029384756182938475612',
    observaciones: 'Boleta de Venta electrónica a cliente final'
  }
];

export function generarXmlUblMock(c: Comprobante): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:UBLVersionID>2.1</cbc:UBLVersionID>
  <cbc:CustomizationID>2.0</cbc:CustomizationID>
  <cbc:ID>${c.serie}-${c.numero}</cbc:ID>
  <cbc:IssueDate>${c.fechaEmision}</cbc:IssueDate>
  <cbc:DueDate>${c.fechaVencimiento || c.fechaEmision}</cbc:DueDate>
  <cbc:InvoiceTypeCode listID="0101">${c.tipoDoc}</cbc:InvoiceTypeCode>
  <cbc:DocumentCurrencyCode>${c.moneda}</cbc:DocumentCurrencyCode>

  <!-- Datos del Emisor -->
  <cac:AccountingSupplierParty>
    <cac:Party>
      <cac:PartyIdentification>
        <cbc:ID schemeID="6">${c.rucEmisor}</cbc:ID>
      </cac:PartyIdentification>
      <cac:PartyLegalEntity>
        <cbc:RegistrationName><![CDATA[${c.razonSocialEmisor}]]></cbc:RegistrationName>
      </cac:PartyLegalEntity>
    </cac:Party>
  </cac:AccountingSupplierParty>

  <!-- Datos del Receptor -->
  <cac:AccountingCustomerParty>
    <cac:Party>
      <cac:PartyIdentification>
        <cbc:ID schemeID="6">${c.rucReceptor}</cbc:ID>
      </cac:PartyIdentification>
      <cac:PartyLegalEntity>
        <cbc:RegistrationName><![CDATA[${c.razonSocialReceptor}]]></cbc:RegistrationName>
      </cac:PartyLegalEntity>
    </cac:Party>
  </cac:AccountingCustomerParty>

  <!-- Totales e Impuestos -->
  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="${c.moneda}">${c.igv.toFixed(2)}</cbc:TaxAmount>
    <cac:TaxSubtotal>
      <cbc:TaxableAmount currencyID="${c.moneda}">${c.baseImponibleGravada.toFixed(2)}</cbc:TaxableAmount>
      <cbc:TaxAmount currencyID="${c.moneda}">${c.igv.toFixed(2)}</cbc:TaxAmount>
      <cac:TaxCategory>
        <cac:TaxScheme>
          <cbc:ID>1000</cbc:ID>
          <cbc:Name>IGV</cbc:Name>
          <cbc:TaxTypeCode>VAT</cbc:TaxTypeCode>
        </cac:TaxScheme>
      </cac:TaxCategory>
    </cac:TaxSubtotal>
  </cac:TaxTotal>

  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="${c.moneda}">${c.baseImponibleGravada.toFixed(2)}</cbc:LineExtensionAmount>
    <cbc:TaxInclusiveAmount currencyID="${c.moneda}">${c.total.toFixed(2)}</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="${c.moneda}">${c.total.toFixed(2)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
</Invoice>`;
}

export function parseXmlUblInvoice(xmlString: string, fileName: string): Comprobante {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlString, 'text/xml');

  const getTagValue = (tagName: string, context: Element | Document = xmlDoc): string => {
    const el = context.getElementsByTagName(tagName)[0] || 
               context.getElementsByTagNameNS('*', tagName)[0];
    return el ? (el.textContent || '').trim() : '';
  };

  const id = getTagValue('ID');
  const [serie, numero] = id.includes('-') ? id.split('-') : ['F001', '0000001'];
  
  const issueDate = getTagValue('IssueDate') || new Date().toISOString().split('T')[0];
  const dueDate = getTagValue('DueDate') || issueDate;
  
  const supplierRuc = getTagValue('CompanyID') || '20100000001';
  const supplierName = getTagValue('RegistrationName') || fileName.replace('.xml', '');

  const documentCurrencyCode = getTagValue('DocumentCurrencyCode') || 'PEN';
  const payableAmount = parseFloat(getTagValue('PayableAmount') || '0');
  
  const taxAmount = parseFloat(getTagValue('TaxAmount') || '0');
  const taxableAmount = Math.max(0, payableAmount - taxAmount);
  const invoiceTypeCode = (getTagValue('InvoiceTypeCode') || '01') as TipoComprobante;

  const car = `${supplierRuc}${invoiceTypeCode}${serie}${numero.padStart(8, '0')}${issueDate.replace(/-/g, '')}`;

  return {
    id: `xml-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    car,
    tipoDoc: invoiceTypeCode,
    serie,
    numero,
    fechaEmision: issueDate,
    fechaVencimiento: dueDate,
    rucEmisor: supplierRuc,
    razonSocialEmisor: supplierName,
    rucReceptor: '20601234567',
    razonSocialReceptor: 'CORPORACION LOGISTICA & SERVICIOS DEL PERU S.A.C.',
    moneda: documentCurrencyCode as 'PEN' | 'USD',
    tipoCambio: documentCurrencyCode === 'USD' ? 3.750 : 1.000,
    baseImponibleGravada: taxableAmount > 0 ? taxableAmount : payableAmount / 1.18,
    igv: taxAmount > 0 ? taxAmount : payableAmount - (payableAmount / 1.18),
    adquisicionesNoGravadas: 0,
    isc: 0,
    icbper: 0,
    otrosTributos: 0,
    total: payableAmount,
    sujetoADetraccion: payableAmount > 700,
    clasificacionBienServicio: 'GASTO_SERVICIOS',
    categoriaGasto: '6391',
    cuentaContableAsignada: '6391',
    asientoGenerado: false,
    estadoSunat: 'ACEPTADO',
    origen: 'XML_UBL_UPLOAD',
    xmlData: xmlString,
    cdrData: mockCdrAceptado(`${serie}-${numero}`, issueDate),
    hashCpe: '71a829b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9',
    observaciones: `Importado desde archivo XML UBL 2.1: ${fileName}`
  };
}
