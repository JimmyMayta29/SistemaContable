import { db } from '../config/database';
import { EmpresaModel, EMPRESAS_STORE } from '../repositories/empresaRepository';
import { ASIENTOS_MEMORIA, AsientoContableModel, AsientoDetalleModel } from './asientoService';
import { COMPRAS_MEMORIA, CXP_MEMORIA, CompraModel, CuentaPorPagarModel } from './compraService';
import { VENTAS_MEMORIA, CXC_MEMORIA, VentaModel, CuentaPorCobrarModel } from './ventaService';
import { ANEXOS_MEMORIA, AnexoModel } from './anexoService';
import { CUENTAS_FINANCIERAS_MEMORIA, MOVIMIENTOS_TESORERIA_MEMORIA, CuentaFinancieraModel, MovimientoTesoreriaModel } from './tesoreriaService';
import { TRABAJADORES_MEMORIA, PLANILLAS_MEMORIA, TrabajadorModel, PlanillaResumenModel } from './planillaService';
import { PERIODOS_MEMORIA, PeriodoModel, periodoService } from './periodoService';
import { CATALOGO_PCGE_BASE } from '../data/catalogos/pcgeCatalogo';
import { Money } from '../utils/decimal';

export const EMPRESA_DEMO_ID = 'emp-demo-sac';
export const EMPRESA_DEMO_RUC = '20000000001'; // Módulo 11 válido: 2*5 + 0 = 10 -> 11-10 = 1

export const DATOS_EMPRESA_DEMO: EmpresaModel = {
  id: EMPRESA_DEMO_ID,
  tenantId: '00000000-0000-0000-0000-000000000001',
  codigoEmpresa: 'DEMO2026',
  ruc: EMPRESA_DEMO_RUC,
  razonSocial: 'EMPRESA DEMO S.A.C.',
  nombreComercial: 'EMPRESA DEMO CONTABLE',
  regimenTributario: 'MYPE_TRIBUTARIO',
  domicilioFiscal: 'AV. DE LA PRUEBA 123, SAN ISIDRO, LIMA',
  contactoNombre: 'CARLOS ALBERTO DEMO PEREZ',
  contactoTelefono: '+51 900 000 000',
  contactoEmail: 'contacto@empresademo.pe',
  monedaPrincipal: 'PEN',
  esDemo: true,
  isActive: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z'
};

export const empresaDemoService = {
  /**
   * Verifica si una empresa es demo
   */
  esEmpresaDemo(empresaId: string): boolean {
    return empresaId === EMPRESA_DEMO_ID;
  },

  /**
   * Bloqueo estricto para impedir conexiones a SUNAT o envíos oficiales desde la empresa demo
   */
  validarOperacionOficialPermitida(empresaId: string, tipoOperacion: 'SOL_CONEXION' | 'PLE_ENVIO' | 'SIRE_ENVIO') {
    if (this.esEmpresaDemo(empresaId)) {
      throw new Error(`EMPRESA_DEMO_BLOQUEO_SUNAT: La Empresa Demo no puede conectarse a SUNAT en vivo ni transmitir archivos oficiales (${tipoOperacion}). Use una empresa real configurada.`);
    }
  },

  /**
   * Restablecimiento idempotente de la Empresa Demo
   * Limpia registros previos de la demo y los recrea con cuadre contable exacto.
   */
  async restablecerDemo(usuarioEjecutorId: string = 'usr-admin-demo'): Promise<{
    empresa: EmpresaModel;
    comprasCount: number;
    ventasCount: number;
    asientosCount: number;
    trabajadoresCount: number;
  }> {
    // 1. Limpieza idempotente previa de la empresa demo
    this.limpiarDatosDemo();

    // 2. Registrar empresa en el almacén
    let emp = EMPRESAS_STORE.find(e => e.id === EMPRESA_DEMO_ID);
    if (!emp) {
      EMPRESAS_STORE.push(DATOS_EMPRESA_DEMO);
      emp = DATOS_EMPRESA_DEMO;
    }

    // 3. Crear Períodos del Trimestre (Julio, Agosto, Septiembre 2026)
    const periodos = ['2026-07', '2026-08', '2026-09'];
    for (const p of periodos) {
      await periodoService.abrirPeriodo(EMPRESA_DEMO_ID, p, usuarioEjecutorId);
    }

    // 4. Crear Cuentas Financieras (Caja y Banco BCP)
    const ctaBancos: CuentaFinancieraModel = {
      id: `cta-bcp-${EMPRESA_DEMO_ID}`,
      empresaId: EMPRESA_DEMO_ID,
      tipo: 'BANCO',
      banco: 'BANCO DE CREDITO DEL PERU - BCP',
      numero: '191-99887766-0-01',
      moneda: 'PEN',
      cuentaContableCodigo: '1041',
      saldoInicial: 50000.00,
      saldoActual: 50000.00,
      activa: true
    };
    const ctaCaja: CuentaFinancieraModel = {
      id: `cta-caja-${EMPRESA_DEMO_ID}`,
      empresaId: EMPRESA_DEMO_ID,
      tipo: 'CAJA',
      banco: 'CAJA CENTRAL',
      numero: 'CAJA-01',
      moneda: 'PEN',
      cuentaContableCodigo: '1011',
      saldoInicial: 10000.00,
      saldoActual: 10000.00,
      activa: true
    };
    CUENTAS_FINANCIERAS_MEMORIA.push(ctaBancos, ctaCaja);

    // 5. Sembrar 10 Proveedores Ficticios
    const proveedores: AnexoModel[] = [
      { id: 'prv-demo-01', empresaId: EMPRESA_DEMO_ID, tipoEntidad: 'PROVEEDOR', tipoDocumento: '6', numeroDocumento: '20100000019', razonSocial: 'DISTRIBUIDORA LIMA DEMO S.A.C.', direccion: 'CALLE 1 100', condicionSunat: 'HABIDO', estadoSunat: 'ACTIVO', isActive: true, createdAt: '2026-01-01T00:00:00.000Z' },
      { id: 'prv-demo-02', empresaId: EMPRESA_DEMO_ID, tipoEntidad: 'PROVEEDOR', tipoDocumento: '6', numeroDocumento: '20100000027', razonSocial: 'TECNOLOGIA Y SISTEMAS DEMO S.A.C.', direccion: 'CALLE 2 200', condicionSunat: 'HABIDO', estadoSunat: 'ACTIVO', isActive: true, createdAt: '2026-01-01T00:00:00.000Z' },
      { id: 'prv-demo-03', empresaId: EMPRESA_DEMO_ID, tipoEntidad: 'PROVEEDOR', tipoDocumento: '6', numeroDocumento: '20100000035', razonSocial: 'SUMINISTROS DE OFICINA DEMO S.R.L.', direccion: 'CALLE 3 300', condicionSunat: 'HABIDO', estadoSunat: 'ACTIVO', isActive: true, createdAt: '2026-01-01T00:00:00.000Z' },
      { id: 'prv-demo-04', empresaId: EMPRESA_DEMO_ID, tipoEntidad: 'PROVEEDOR', tipoDocumento: '6', numeroDocumento: '20100000043', razonSocial: 'SERVICIOS GENERALES DEMO E.I.R.L.', direccion: 'CALLE 4 400', condicionSunat: 'HABIDO', estadoSunat: 'ACTIVO', isActive: true, createdAt: '2026-01-01T00:00:00.000Z' },
      { id: 'prv-demo-05', empresaId: EMPRESA_DEMO_ID, tipoEntidad: 'PROVEEDOR', tipoDocumento: '6', numeroDocumento: '20100000051', razonSocial: 'TRANSPORTES RAPIDOS DEMO S.A.C.', direccion: 'CALLE 5 500', condicionSunat: 'HABIDO', estadoSunat: 'ACTIVO', isActive: true, createdAt: '2026-01-01T00:00:00.000Z' },
      { id: 'prv-demo-06', empresaId: EMPRESA_DEMO_ID, tipoEntidad: 'PROVEEDOR', tipoDocumento: '6', numeroDocumento: '20100000060', razonSocial: 'ENERGIA Y ELECTRICIDAD DEMO S.A.', direccion: 'CALLE 6 600', condicionSunat: 'HABIDO', estadoSunat: 'ACTIVO', isActive: true, createdAt: '2026-01-01T00:00:00.000Z' },
      { id: 'prv-demo-07', empresaId: EMPRESA_DEMO_ID, tipoEntidad: 'PROVEEDOR', tipoDocumento: '6', numeroDocumento: '20100000078', razonSocial: 'TELECOMUNICACIONES DEMO S.A.A.', direccion: 'CALLE 7 700', condicionSunat: 'HABIDO', estadoSunat: 'ACTIVO', isActive: true, createdAt: '2026-01-01T00:00:00.000Z' },
      { id: 'prv-demo-08', empresaId: EMPRESA_DEMO_ID, tipoEntidad: 'PROVEEDOR', tipoDocumento: '6', numeroDocumento: '20100000086', razonSocial: 'AGUA Y SANEAMIENTO DEMO S.A.', direccion: 'CALLE 8 800', condicionSunat: 'HABIDO', estadoSunat: 'ACTIVO', isActive: true, createdAt: '2026-01-01T00:00:00.000Z' },
      { id: 'prv-demo-09', empresaId: EMPRESA_DEMO_ID, tipoEntidad: 'PROVEEDOR', tipoDocumento: '6', numeroDocumento: '20100000094', razonSocial: 'ASESORES LEGALES DEMO S.C.', direccion: 'CALLE 9 900', condicionSunat: 'HABIDO', estadoSunat: 'ACTIVO', isActive: true, createdAt: '2026-01-01T00:00:00.000Z' },
      { id: 'prv-demo-10', empresaId: EMPRESA_DEMO_ID, tipoEntidad: 'PROVEEDOR', tipoDocumento: '6', numeroDocumento: '20100000108', razonSocial: 'ALQUILERES CORPORATIVOS DEMO S.A.C.', direccion: 'CALLE 10 1000', condicionSunat: 'HABIDO', estadoSunat: 'ACTIVO', isActive: true, createdAt: '2026-01-01T00:00:00.000Z' }
    ];
    ANEXOS_MEMORIA.push(...proveedores);

    // 6. Sembrar 10 Clientes Ficticios
    const clientes: AnexoModel[] = [
      { id: 'cli-demo-01', empresaId: EMPRESA_DEMO_ID, tipoEntidad: 'CLIENTE', tipoDocumento: '6', numeroDocumento: '20200000015', razonSocial: 'COMERCIAL DEL PACIFICO DEMO S.A.C.', direccion: 'AV. SUR 101', condicionSunat: 'HABIDO', estadoSunat: 'ACTIVO', isActive: true, createdAt: '2026-01-01T00:00:00.000Z' },
      { id: 'cli-demo-02', empresaId: EMPRESA_DEMO_ID, tipoEntidad: 'CLIENTE', tipoDocumento: '6', numeroDocumento: '20200000023', razonSocial: 'INDUSTRIAL SUR DEMO S.A.', direccion: 'AV. SUR 102', condicionSunat: 'HABIDO', estadoSunat: 'ACTIVO', isActive: true, createdAt: '2026-01-01T00:00:00.000Z' },
      { id: 'cli-demo-03', empresaId: EMPRESA_DEMO_ID, tipoEntidad: 'CLIENTE', tipoDocumento: '6', numeroDocumento: '20200000031', razonSocial: 'INVERSIONES DEL NORTE DEMO S.A.C.', direccion: 'AV. SUR 103', condicionSunat: 'HABIDO', estadoSunat: 'ACTIVO', isActive: true, createdAt: '2026-01-01T00:00:00.000Z' },
      { id: 'cli-demo-04', empresaId: EMPRESA_DEMO_ID, tipoEntidad: 'CLIENTE', tipoDocumento: '6', numeroDocumento: '20200000040', razonSocial: 'RETAIL PERUANO DEMO S.A.', direccion: 'AV. SUR 104', condicionSunat: 'HABIDO', estadoSunat: 'ACTIVO', isActive: true, createdAt: '2026-01-01T00:00:00.000Z' },
      { id: 'cli-demo-05', empresaId: EMPRESA_DEMO_ID, tipoEntidad: 'CLIENTE', tipoDocumento: '6', numeroDocumento: '20200000058', razonSocial: 'LOGISTICA Y DISTRIBUCION DEMO S.A.C.', direccion: 'AV. SUR 105', condicionSunat: 'HABIDO', estadoSunat: 'ACTIVO', isActive: true, createdAt: '2026-01-01T00:00:00.000Z' },
      { id: 'cli-demo-06', empresaId: EMPRESA_DEMO_ID, tipoEntidad: 'CLIENTE', tipoDocumento: '6', numeroDocumento: '20200000066', razonSocial: 'SERVICIOS MINEROS DEMO S.R.L.', direccion: 'AV. SUR 106', condicionSunat: 'HABIDO', estadoSunat: 'ACTIVO', isActive: true, createdAt: '2026-01-01T00:00:00.000Z' },
      { id: 'cli-demo-07', empresaId: EMPRESA_DEMO_ID, tipoEntidad: 'CLIENTE', tipoDocumento: '6', numeroDocumento: '20200000074', razonSocial: 'AGROINDUSTRIAS DEMO S.A.', direccion: 'AV. SUR 107', condicionSunat: 'HABIDO', estadoSunat: 'ACTIVO', isActive: true, createdAt: '2026-01-01T00:00:00.000Z' },
      { id: 'cli-demo-08', empresaId: EMPRESA_DEMO_ID, tipoEntidad: 'CLIENTE', tipoDocumento: '6', numeroDocumento: '20200000082', razonSocial: 'CONSTRUCTORA METROPOLITANA DEMO S.A.C.', direccion: 'AV. SUR 108', condicionSunat: 'HABIDO', estadoSunat: 'ACTIVO', isActive: true, createdAt: '2026-01-01T00:00:00.000Z' },
      { id: 'cli-demo-09', empresaId: EMPRESA_DEMO_ID, tipoEntidad: 'CLIENTE', tipoDocumento: '6', numeroDocumento: '20200000091', razonSocial: 'TEXTILES MODERNOS DEMO S.A.', direccion: 'AV. SUR 109', condicionSunat: 'HABIDO', estadoSunat: 'ACTIVO', isActive: true, createdAt: '2026-01-01T00:00:00.000Z' },
      { id: 'cli-demo-10', empresaId: EMPRESA_DEMO_ID, tipoEntidad: 'CLIENTE', tipoDocumento: '6', numeroDocumento: '20200000104', razonSocial: 'IMPORT & EXPORT LATAM DEMO S.A.C.', direccion: 'AV. SUR 110', condicionSunat: 'HABIDO', estadoSunat: 'ACTIVO', isActive: true, createdAt: '2026-01-01T00:00:00.000Z' }
    ];
    ANEXOS_MEMORIA.push(...clientes);

    // 7. Asiento de Apertura del Ejercicio (Subdiario 00 - 01/01/2026)
    const itemsApertura: AsientoDetalleModel[] = [
      { id: 'det-ape-1', asientoId: 'ast-demo-ape-01', linea: 1, cuentaId: '1041', cuentaCodigo: '1041', cuentaNombre: 'Cuentas corrientes operativas', debe: 50000.00, haber: 0 },
      { id: 'det-ape-2', asientoId: 'ast-demo-ape-01', linea: 2, cuentaId: '1011', cuentaCodigo: '1011', cuentaNombre: 'Caja central', debe: 10000.00, haber: 0 },
      { id: 'det-ape-3', asientoId: 'ast-demo-ape-01', linea: 3, cuentaId: '5011', cuentaCodigo: '5011', cuentaNombre: 'Capital social - Acciones', debe: 0, haber: 50000.00 },
      { id: 'det-ape-4', asientoId: 'ast-demo-ape-01', linea: 4, cuentaId: '5911', cuentaCodigo: '5911', cuentaNombre: 'Utilidades acumuladas', debe: 0, haber: 10000.00 }
    ];
    const asientoApertura: AsientoContableModel = {
      id: `ast-demo-ape-01`,
      empresaId: EMPRESA_DEMO_ID,
      periodoId: 'per-2026-07',
      subdiarioId: '00',
      numero: '00070001',
      fecha: '2026-07-01',
      glosa: 'POR EL ASIENTO DE APERTURA DEL EJERCICIO 2026',
      moneda: 'PEN',
      tipoCambio: 1.0,
      totalDebe: 60000.00,
      totalHaber: 60000.00,
      estado: 'CONTABILIZADO',
      version: 1,
      items: itemsApertura,
      detalles: itemsApertura,
      createdAt: '2026-07-01T08:00:00.000Z'
    };
    ASIENTOS_MEMORIA.push(asientoApertura);

    // 8. Sembrar 20 Compras Coherentes con Partida Doble
    let correlativoCompra = 1;
    for (let i = 1; i <= 20; i++) {
      const prv = proveedores[(i - 1) % proveedores.length];
      const mesIndex = (i % 3); // 0 -> 07, 1 -> 08, 2 -> 09
      const mes = periodos[mesIndex];
      const dia = String((i * 3) % 27 + 1).padStart(2, '0');
      const fecha = `${mes}-${dia}`;
      const base = 500.00 + (i * 100.00); // 600 a 2500
      const igv = Money.toNumber(Money.multiply(base, 0.18));
      const total = Money.toNumber(Money.add(base, igv));
      const esMercaderia = i % 2 === 0;

      const compraId = `cmp-demo-${String(i).padStart(2, '0')}`;
      const asientoId = `ast-demo-cmp-${String(i).padStart(2, '0')}`;
      const numeroCorrelativo = `01${mes.substring(5, 7)}${String(correlativoCompra++).padStart(4, '0')}`;

      // Comprobante de Compra
      const compra: CompraModel = {
        id: compraId,
        empresaId: EMPRESA_DEMO_ID,
        periodoId: `per-${mes}`,
        proveedorId: prv.id,
        tipoComprobante: '01',
        serie: 'F001',
        numero: String(1000 + i),
        fechaEmision: fecha,
        fechaVencimiento: fecha,
        fechaContable: fecha,
        moneda: 'PEN',
        tipoCambio: 1.0,
        baseGravada: base,
        igv,
        baseNoGravada: 0,
        exonerado: 0,
        isc: 0,
        icbper: 0,
        otrosTributos: 0,
        total,
        tipoAdquisicion: '1',
        formaPago: 'CONTADO',
        diasCredito: 0,
        tieneDetraccion: false,
        tieneRetencion: false,
        estado: 'REGISTRADO',
        asientoId,
        version: 1,
        createdAt: `${fecha}T10:00:00.000Z`,
        updatedAt: `${fecha}T10:00:00.000Z`
      };
      COMPRAS_MEMORIA.push(compra);

      // Cartera CXP
      CXP_MEMORIA.push({
        id: `cxp-demo-${i}`,
        empresaId: EMPRESA_DEMO_ID,
        compraId,
        proveedorId: prv.id,
        fechaEmision: fecha,
        fechaVencimiento: fecha,
        tipoComprobante: '01',
        serie: 'F001',
        numero: String(1000 + i),
        moneda: 'PEN',
        importeTotal: total,
        saldoPendiente: i <= 10 ? 0.00 : total, // Primeras 10 están pagadas
        estado: i <= 10 ? 'PAGADO' : 'PENDIENTE'
      });

      // Asiento contable de compra (60/63 + 40111 vs 4212 + Destino 20/61 o 94/79)
      const ctaGasto = esMercaderia ? '6011' : '6321';
      const ctaDestinoDebe = esMercaderia ? '20111' : '941';
      const ctaDestinoHaber = esMercaderia ? '6111' : '791';

      const itemsAsiento: AsientoDetalleModel[] = [
        { id: `det-c-${i}-1`, asientoId, linea: 1, cuentaId: ctaGasto, cuentaCodigo: ctaGasto, cuentaNombre: esMercaderia ? 'Mercaderías manufacturadas' : 'Honorarios profesionales', debe: base, haber: 0 },
        { id: `det-c-${i}-2`, asientoId, linea: 2, cuentaId: '40111', cuentaCodigo: '40111', cuentaNombre: 'IGV - Cuenta propia', debe: igv, haber: 0 },
        { id: `det-c-${i}-3`, asientoId, linea: 3, cuentaId: '4212', cuentaCodigo: '4212', cuentaNombre: 'Emitidas en cartera', debe: 0, haber: total },
        { id: `det-c-${i}-4`, asientoId, linea: 4, cuentaId: ctaDestinoDebe, cuentaCodigo: ctaDestinoDebe, cuentaNombre: 'Destino Debe', debe: base, haber: 0 },
        { id: `det-c-${i}-5`, asientoId, linea: 5, cuentaId: ctaDestinoHaber, cuentaCodigo: ctaDestinoHaber, cuentaNombre: 'Destino Haber', debe: 0, haber: base }
      ];

      ASIENTOS_MEMORIA.push({
        id: asientoId,
        empresaId: EMPRESA_DEMO_ID,
        periodoId: `per-${mes}`,
        subdiarioId: '01',
        numero: numeroCorrelativo,
        fecha,
        glosa: `COMPRA DE ${esMercaderia ? 'MERCADERIA' : 'SERVICIOS'} - ${prv.razonSocial}`,
        moneda: 'PEN',
        tipoCambio: 1.0,
        totalDebe: Money.toNumber(Money.add(total, base)),
        totalHaber: Money.toNumber(Money.add(total, base)),
        estado: 'CONTABILIZADO',
        version: 1,
        items: itemsAsiento,
        createdAt: `${fecha}T10:05:00.000Z`
      });
    }

    // 9. Sembrar 15 Ventas Coherentes con Partida Doble
    let correlativoVenta = 1;
    for (let j = 1; j <= 15; j++) {
      const cli = clientes[(j - 1) % clientes.length];
      const mesIndex = (j % 3);
      const mes = periodos[mesIndex];
      const dia = String((j * 4) % 27 + 1).padStart(2, '0');
      const fecha = `${mes}-${dia}`;
      const base = 800.00 + (j * 150.00); // 950 a 3050
      const igv = Money.toNumber(Money.multiply(base, 0.18));
      const total = Money.toNumber(Money.add(base, igv));

      const ventaId = `vnt-demo-${String(j).padStart(2, '0')}`;
      const asientoId = `ast-demo-vnt-${String(j).padStart(2, '0')}`;
      const numeroCorrelativo = `02${mes.substring(5, 7)}${String(correlativoVenta++).padStart(4, '0')}`;

      // Comprobante de Venta
      const venta: VentaModel = {
        id: ventaId,
        empresaId: EMPRESA_DEMO_ID,
        periodoId: `per-${mes}`,
        clienteId: cli.id,
        tipoComprobante: '01',
        serie: 'F001',
        numero: String(j).padStart(8, '0'),
        fechaEmision: fecha,
        fechaVencimiento: fecha,
        fechaContable: fecha,
        moneda: 'PEN',
        tipoCambio: 1.0,
        baseGravada: base,
        igv,
        baseNoGravada: 0,
        exonerado: 0,
        isc: 0,
        icbper: 0,
        otrosTributos: 0,
        total,
        tipoOperacion: '0101',
        formaPago: 'CONTADO',
        diasCredito: 0,
        tieneDetraccion: false,
        tienePercepcion: false,
        estado: 'REGISTRADO',
        asientoId,
        version: 1,
        createdAt: `${fecha}T11:00:00.000Z`,
        updatedAt: `${fecha}T11:00:00.000Z`
      };
      VENTAS_MEMORIA.push(venta);

      // Cartera CXC
      CXC_MEMORIA.push({
        id: `cxc-demo-${j}`,
        empresaId: EMPRESA_DEMO_ID,
        ventaId,
        clienteId: cli.id,
        fechaEmision: fecha,
        fechaVencimiento: fecha,
        tipoComprobante: '01',
        serie: 'F001',
        numero: String(j).padStart(8, '0'),
        moneda: 'PEN',
        importeTotal: total,
        saldoPendiente: j <= 8 ? 0.00 : total, // Primeras 8 cobradas
        estado: j <= 8 ? 'COBRADO' : 'PENDIENTE'
      });

      // Asiento contable de venta (1212 vs 40111 + 7011)
      const itemsAsiento: AsientoDetalleModel[] = [
        { id: `det-v-${j}-1`, asientoId, linea: 1, cuentaId: '1212', cuentaCodigo: '1212', cuentaNombre: 'Emitidas en cartera', debe: total, haber: 0 },
        { id: `det-v-${j}-2`, asientoId, linea: 2, cuentaId: '40111', cuentaCodigo: '40111', cuentaNombre: 'IGV - Cuenta propia', debe: 0, haber: igv },
        { id: `det-v-${j}-3`, asientoId, linea: 3, cuentaId: '7011', cuentaCodigo: '7011', cuentaNombre: 'Mercaderías manufacturadas', debe: 0, haber: base }
      ];

      ASIENTOS_MEMORIA.push({
        id: asientoId,
        empresaId: EMPRESA_DEMO_ID,
        periodoId: `per-${mes}`,
        subdiarioId: '02',
        numero: numeroCorrelativo,
        fecha,
        glosa: `VENTA DE MERCADERIA FACTURA F001-${String(j).padStart(8, '0')} - ${cli.razonSocial}`,
        moneda: 'PEN',
        tipoCambio: 1.0,
        totalDebe: total,
        totalHaber: total,
        estado: 'CONTABILIZADO',
        version: 1,
        items: itemsAsiento,
        detalles: itemsAsiento,
        createdAt: `${fecha}T11:05:00.000Z`
      });
    }

    // 10. Sembrar 3 Colaboradores y Planillas del Trimestre
    const trabajadores: TrabajadorModel[] = [
      {
        id: 'tra-demo-01',
        empresaId: EMPRESA_DEMO_ID,
        tipoDocumento: '1',
        numeroDocumento: '45678901',
        nombres: 'CARLOS',
        apellidos: 'MENDOZA QUISPE',
        cargo: 'JEFE DE CONTABILIDAD',
        regimenLaboral: 'GENERAL',
        sueldoBase: 3500.00,
        tieneAsignacionFamiliar: true,
        sistemaPensiones: 'AFP',
        afpAdministradora: 'INTEGRA',
        centroCosto: 'CC-ADM',
        activo: true,
        fechaIngreso: '2025-01-15',
        version: 1
      },
      {
        id: 'tra-demo-02',
        empresaId: EMPRESA_DEMO_ID,
        tipoDocumento: '1',
        numeroDocumento: '45678902',
        nombres: 'MARIA ELENA',
        apellidos: 'FLORES ROCA',
        cargo: 'ASISTENTE CONTABLE',
        regimenLaboral: 'GENERAL',
        sueldoBase: 2200.00,
        tieneAsignacionFamiliar: false,
        sistemaPensiones: 'ONP',
        centroCosto: 'CC-ADM',
        activo: true,
        fechaIngreso: '2025-03-01',
        version: 1
      },
      {
        id: 'tra-demo-03',
        empresaId: EMPRESA_DEMO_ID,
        tipoDocumento: '1',
        numeroDocumento: '45678903',
        nombres: 'JORGE LUIS',
        apellidos: 'PAREDES VEGA',
        cargo: 'AUXILIAR DE ARCHIVO',
        regimenLaboral: 'GENERAL',
        sueldoBase: 1800.00,
        tieneAsignacionFamiliar: false,
        sistemaPensiones: 'AFP',
        afpAdministradora: 'PRIMA',
        centroCosto: 'CC-LOG',
        activo: true,
        fechaIngreso: '2025-06-01',
        version: 1
      }
    ];
    TRABAJADORES_MEMORIA.push(...trabajadores);

    // Planillas mensuales (07, 08, 09) con cuadre contable en Subdiario 04
    for (let m = 0; m < periodos.length; m++) {
      const per = periodos[m];
      const asientoId = `ast-demo-pln-${per}`;
      const totalBruto = 3500.00 + 102.50 + 2200.00 + 1800.00; // 7,602.50
      const essalud = Money.toNumber(Money.multiply(totalBruto, 0.09)); // 684.23
      const onp = Money.toNumber(Money.multiply(2200.00, 0.13)); // 286.00
      const afpTotal = 469.73 + 240.48; // Aportes AFP Integra + Prima
      const retenciones = Money.toNumber(Money.add(onp, afpTotal)); // 996.21
      const netoPagar = Money.toNumber(Money.subtract(totalBruto, retenciones)); // 6,606.29

      PLANILLAS_MEMORIA.push({
        id: `pln-demo-${per}`,
        empresaId: EMPRESA_DEMO_ID,
        periodoId: `per-${per}`,
        mes: per,
        fechaCalculo: `${per}-28`,
        totalIngresos: totalBruto,
        totalDescuentos: retenciones,
        totalAportesEmpleador: essalud,
        totalNeto: netoPagar,
        estado: 'CONTABILIZADA',
        asientoId,
        version: 1,
        lineas: []
      } as any);

      // Asiento contable de planilla (62 vs 4031, 4032, 4111 + Destino 941 vs 791)
      const itemsAsiento: AsientoDetalleModel[] = [
        { id: `det-p-${m}-1`, asientoId, linea: 1, cuentaId: '6211', cuentaCodigo: '6211', cuentaNombre: 'Sueldos y salarios', debe: totalBruto, haber: 0 },
        { id: `det-p-${m}-2`, asientoId, linea: 2, cuentaId: '6271', cuentaCodigo: '6271', cuentaNombre: 'EsSalud', debe: essalud, haber: 0 },
        { id: `det-p-${m}-3`, asientoId, linea: 3, cuentaId: '4031', cuentaCodigo: '4031', cuentaNombre: 'EsSalud por pagar', debe: 0, haber: essalud },
        { id: `det-p-${m}-4`, asientoId, linea: 4, cuentaId: '4032', cuentaCodigo: '4032', cuentaNombre: 'ONP por pagar', debe: 0, haber: onp },
        { id: `det-p-${m}-5`, asientoId, linea: 5, cuentaId: '4111', cuentaCodigo: '4111', cuentaNombre: 'Remuneraciones por pagar', debe: 0, haber: Money.toNumber(Money.subtract(totalBruto, onp)) },
        // Destino
        { id: `det-p-${m}-6`, asientoId, linea: 6, cuentaId: '941', cuentaCodigo: '941', cuentaNombre: 'Gastos administrativos', debe: Money.toNumber(Money.add(totalBruto, essalud)), haber: 0 },
        { id: `det-p-${m}-7`, asientoId, linea: 7, cuentaId: '791', cuentaCodigo: '791', cuentaNombre: 'Cargas imputables', debe: 0, haber: Money.toNumber(Money.add(totalBruto, essalud)) }
      ];

      const sumDebe = itemsAsiento.reduce((acc, it) => acc + (it.debe || 0), 0);
      const sumHaber = itemsAsiento.reduce((acc, it) => acc + (it.haber || 0), 0);

      ASIENTOS_MEMORIA.push({
        id: asientoId,
        empresaId: EMPRESA_DEMO_ID,
        periodoId: `per-${per}`,
        subdiarioId: '04',
        numero: `04${per.substring(5, 7)}0001`,
        fecha: `${per}-28`,
        glosa: `PLANILLA DE SUELDOS Y APORTES MES ${per}`,
        moneda: 'PEN',
        tipoCambio: 1.0,
        totalDebe: Money.toNumber(sumDebe),
        totalHaber: Money.toNumber(sumHaber),
        estado: 'CONTABILIZADO',
        version: 1,
        items: itemsAsiento,
        createdAt: `${per}-28T18:00:00.000Z`
      });
    }

    return {
      empresa: emp,
      comprasCount: 20,
      ventasCount: 15,
      asientosCount: ASIENTOS_MEMORIA.filter(a => a.empresaId === EMPRESA_DEMO_ID).length,
      trabajadoresCount: 3
    };
  },

  /**
   * Limpia datos asociados a la empresa demo de forma segura
   */
  limpiarDatosDemo() {
    const filtrarNoDemo = <T extends { empresaId?: string }>(arr: T[]) => {
      return arr.filter(item => item.empresaId !== EMPRESA_DEMO_ID);
    };

    // Mutar arrays en memoria
    ASIENTOS_MEMORIA.splice(0, ASIENTOS_MEMORIA.length, ...filtrarNoDemo(ASIENTOS_MEMORIA));
    COMPRAS_MEMORIA.splice(0, COMPRAS_MEMORIA.length, ...filtrarNoDemo(COMPRAS_MEMORIA));
    CXP_MEMORIA.splice(0, CXP_MEMORIA.length, ...filtrarNoDemo(CXP_MEMORIA));
    VENTAS_MEMORIA.splice(0, VENTAS_MEMORIA.length, ...filtrarNoDemo(VENTAS_MEMORIA));
    CXC_MEMORIA.splice(0, CXC_MEMORIA.length, ...filtrarNoDemo(CXC_MEMORIA));
    ANEXOS_MEMORIA.splice(0, ANEXOS_MEMORIA.length, ...filtrarNoDemo(ANEXOS_MEMORIA));
    CUENTAS_FINANCIERAS_MEMORIA.splice(0, CUENTAS_FINANCIERAS_MEMORIA.length, ...filtrarNoDemo(CUENTAS_FINANCIERAS_MEMORIA));
    MOVIMIENTOS_TESORERIA_MEMORIA.splice(0, MOVIMIENTOS_TESORERIA_MEMORIA.length, ...filtrarNoDemo(MOVIMIENTOS_TESORERIA_MEMORIA));
    TRABAJADORES_MEMORIA.splice(0, TRABAJADORES_MEMORIA.length, ...filtrarNoDemo(TRABAJADORES_MEMORIA));
    PLANILLAS_MEMORIA.splice(0, PLANILLAS_MEMORIA.length, ...filtrarNoDemo(PLANILLAS_MEMORIA));
    PERIODOS_MEMORIA.splice(0, PERIODOS_MEMORIA.length, ...filtrarNoDemo(PERIODOS_MEMORIA));
  }
};
