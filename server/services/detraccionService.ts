import { db } from '../config/database';
import { auditoriaRepository } from '../repositories/auditoriaRepository';
import { Money } from '../utils/decimal';

export interface DetraccionRegistroModel {
  id: string;
  empresaId: string;
  comprobanteCompraId?: string;
  comprobanteVentaId?: string;
  codigoBien: string;
  descripcionBien?: string;
  porcentaje: number;
  monto: number;
  cuentaBancoNacion?: string;
  numeroConstancia?: string;
  fechaDeposito?: string;
  estado: 'PENDIENTE' | 'DEPOSITADA' | 'NO_APLICA';
  permiteCreditoFiscal: boolean;
  periodoAcreditado?: string;
  createdAt?: string;
  updatedAt?: string;
}

export const DETRACCIONES_MEMORIA: DetraccionRegistroModel[] = [];

// Catálogo SPOT R.S. 183-2004/SUNAT
export const CATALOGO_SPOT = [
  { codigo: '001', descripcion: 'Azúcar y melaza de caña', porcentaje: 10, umbral: 0 },
  { codigo: '003', descripcion: 'Alcohol etílico', porcentaje: 10, umbral: 0 },
  { codigo: '004', descripcion: 'Recursos hidrobiológicos', porcentaje: 4, umbral: 700 },
  { codigo: '005', descripcion: 'Maíz amarillo duro', porcentaje: 4, umbral: 700 },
  { codigo: '019', descripcion: 'Arrendamiento de bienes muebles', porcentaje: 10, umbral: 700 },
  { codigo: '020', descripcion: 'Mantenimiento y reparación de bienes muebles', porcentaje: 12, umbral: 700 },
  { codigo: '021', descripcion: 'Movimiento de carga', porcentaje: 10, umbral: 700 },
  { codigo: '022', descripcion: 'Otros servicios empresariales', porcentaje: 12, umbral: 700 },
  { codigo: '024', descripcion: 'Comisión mercantil', porcentaje: 10, umbral: 700 },
  { codigo: '025', descripcion: 'Fabricación de bienes por encargo', porcentaje: 10, umbral: 700 },
  { codigo: '026', descripcion: 'Servicio de transporte de personas', porcentaje: 10, umbral: 700 },
  { codigo: '027', descripcion: 'Servicio de transporte de bienes por vía terrestre', porcentaje: 4, umbral: 400 },
  { codigo: '030', descripcion: 'Contratos de construcción', porcentaje: 4, umbral: 700 },
  { codigo: '037', descripcion: 'Demás servicios gravados con el IGV', porcentaje: 12, umbral: 700 }
];

export const detraccionService = {
  /**
   * Calcula el importe y aplicabilidad del SPOT según catálogo y umbral legal
   */
  calcularDetraccion(montoTotal: number, codigoBien: string): {
    aplica: boolean;
    porcentaje: number;
    montoDetraccion: number;
    descripcion: string;
    umbral: number;
  } {
    const item = CATALOGO_SPOT.find(c => c.codigo === codigoBien) || {
      codigo: codigoBien,
      descripcion: 'Otros servicios gravados con IGV',
      porcentaje: 12,
      umbral: 700
    };

    const aplica = montoTotal > item.umbral;
    const porcentaje = aplica ? item.porcentaje : 0;
    const montoDetraccion = aplica ? Money.toNumber(Money.mul(montoTotal, porcentaje / 100)) : 0;

    return {
      aplica,
      porcentaje: item.porcentaje,
      montoDetraccion,
      descripcion: item.descripcion,
      umbral: item.umbral
    };
  },

  /**
   * Registra una obligación de detracción vinculada a un comprobante
   */
  async registrarDetraccion(
    empresaId: string,
    datos: {
      comprobanteCompraId?: string;
      comprobanteVentaId?: string;
      codigoBien: string;
      montoTotalOperacion: number;
      cuentaBancoNacion?: string;
    },
    userId: string
  ): Promise<DetraccionRegistroModel> {
    const calculo = this.calcularDetraccion(datos.montoTotalOperacion, datos.codigoBien);
    const id = `det-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    const nueva: DetraccionRegistroModel = {
      id,
      empresaId,
      comprobanteCompraId: datos.comprobanteCompraId,
      comprobanteVentaId: datos.comprobanteVentaId,
      codigoBien: datos.codigoBien,
      descripcionBien: calculo.descripcion,
      porcentaje: calculo.porcentaje,
      monto: calculo.montoDetraccion,
      cuentaBancoNacion: datos.cuentaBancoNacion || '00-000-000000',
      estado: calculo.aplica ? 'PENDIENTE' : 'NO_APLICA',
      permiteCreditoFiscal: !calculo.aplica, // Si no aplica, el crédito no está condicionado a detracción
      createdAt: now,
      updatedAt: now
    };

    if (db.isPostgresConnected()) {
      await db.query(`
        INSERT INTO detracciones (
          id, empresa_id, comprobante_id, codigo_bien, porcentaje, monto,
          cuenta_banco_nacion, estado, permite_credito_fiscal, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `, [
        nueva.id, nueva.empresaId, nueva.comprobanteCompraId || null,
        nueva.codigoBien, nueva.porcentaje, nueva.monto,
        nueva.cuentaBancoNacion, nueva.estado, nueva.permiteCreditoFiscal,
        nueva.createdAt, nueva.updatedAt
      ]);
    }

    DETRACCIONES_MEMORIA.push(nueva);

    await auditoriaRepository.registrar({
      empresaId,
      usuarioId: userId,
      tablaAfectada: 'detracciones',
      registroId: id,
      accion: 'INSERT',
      datosNuevos: nueva
    });

    return nueva;
  },

  /**
   * Obtiene una detracción por ID
   */
  async obtenerPorId(empresaId: string, id: string): Promise<DetraccionRegistroModel | null> {
    if (db.isPostgresConnected()) {
      const res = await db.query(`
        SELECT id, empresa_id as "empresaId", comprobante_id as "comprobanteCompraId",
               codigo_bien as "codigoBien", porcentaje, monto, cuenta_banco_nacion as "cuentaBancoNacion",
               numero_constancia as "numeroConstancia", fecha_deposito as "fechaDeposito",
               estado, permite_credito_fiscal as "permiteCreditoFiscal"
        FROM detracciones
        WHERE empresa_id = $1 AND id = $2
      `, [empresaId, id]);
      if (res.rows.length > 0) return res.rows[0];
    }
    return DETRACCIONES_MEMORIA.find(d => d.empresaId === empresaId && d.id === id) || null;
  },

  /**
   * Lista detracciones pendientes de pago para la empresa
   */
  async listarPendientes(empresaId: string) {
    if (db.isPostgresConnected()) {
      const res = await db.query(`
        SELECT d.*, c.tipo_comprobante, c.serie, c.numero, c.fecha_emision,
               a.razon_social as "proveedorNombre", a.numero_documento as "proveedorRuc"
        FROM detracciones d
        JOIN comprobantes_compra c ON c.id = d.comprobante_id
        JOIN anexos a ON a.id = c.proveedor_id
        WHERE d.empresa_id = $1 AND d.estado = 'PENDIENTE'
        ORDER BY c.fecha_emision ASC
      `, [empresaId]);
      return res.rows;
    }
    return DETRACCIONES_MEMORIA.filter(d => d.empresaId === empresaId && d.estado === 'PENDIENTE');
  },

  /**
   * Registra el pago / depósito con la constancia oficial del Banco de la Nación
   */
  async registrarDeposito(
    detraccionId: string, 
    numeroConstancia: string, 
    fechaDeposito: string, 
    userId: string,
    empresaId: string
  ) {
    if (!numeroConstancia || numeroConstancia.trim().length < 4) {
      throw new Error('CONSTANCIA_INVALIDA: Debe ingresar el número de constancia emitido por el Banco de la Nación.');
    }

    if (!fechaDeposito || isNaN(Date.parse(fechaDeposito))) {
      throw new Error('FECHA_INVALIDA: Fecha de depósito de detracción inválida.');
    }

    // Calcular período en que se acredita el crédito fiscal (mes del depósito)
    const periodoAcreditado = fechaDeposito.substring(0, 7);

    if (db.isPostgresConnected()) {
      const res = await db.query(`
        UPDATE detracciones SET
          numero_constancia = $1, fecha_deposito = $2, estado = 'DEPOSITADA',
          permite_credito_fiscal = TRUE, updated_at = CURRENT_TIMESTAMP
        WHERE id = $3 AND empresa_id = $4
        RETURNING *
      `, [numeroConstancia, fechaDeposito, detraccionId, empresaId]);

      if (res.rows.length === 0) throw new Error('DETRACCION_NO_ENCONTRADA');

      await auditoriaRepository.registrar({
        empresaId,
        usuarioId: userId,
        tablaAfectada: 'detracciones',
        registroId: detraccionId,
        accion: 'UPDATE',
        datosNuevos: { numeroConstancia, fechaDeposito, estado: 'DEPOSITADA' }
      });

      return res.rows[0];
    }

    const reg = DETRACCIONES_MEMORIA.find(d => d.id === detraccionId && d.empresaId === empresaId);
    if (!reg) {
      throw new Error('DETRACCION_NO_ENCONTRADA: Registro de detracción no encontrado.');
    }

    reg.numeroConstancia = numeroConstancia;
    reg.fechaDeposito = fechaDeposito;
    reg.estado = 'DEPOSITADA';
    reg.permiteCreditoFiscal = true;
    reg.periodoAcreditado = periodoAcreditado;
    reg.updatedAt = new Date().toISOString();

    await auditoriaRepository.registrar({
      empresaId,
      usuarioId: userId,
      tablaAfectada: 'detracciones',
      registroId: detraccionId,
      accion: 'UPDATE',
      datosNuevos: { numeroConstancia, fechaDeposito, estado: 'DEPOSITADA' }
    });

    return reg;
  },

  /**
   * Validación tributaria de deducibilidad de crédito fiscal (SUNAT SPOT)
   * Si no está depositada a la fecha de declaración, el crédito se traslada al mes de pago.
   */
  async validarDerechoCreditoFiscal(
    empresaId: string,
    comprobanteCompraId: string,
    periodoDeclaracion: string
  ): Promise<{
    deducible: boolean;
    motivo: string;
    detraccion?: DetraccionRegistroModel;
  }> {
    const detraccion = DETRACCIONES_MEMORIA.find(
      d => d.empresaId === empresaId && d.comprobanteCompraId === comprobanteCompraId
    );

    if (!detraccion || detraccion.estado === 'NO_APLICA') {
      return { deducible: true, motivo: 'OPERACION_NO_SUJETA_A_SPOT' };
    }

    if (detraccion.estado === 'PENDIENTE') {
      return {
        deducible: false,
        motivo: 'DETRACCION_PENDIENTE_DE_PAGO: El crédito fiscal se suspende hasta el período en que conste el depósito en el Banco de la Nación.',
        detraccion
      };
    }

    if (detraccion.estado === 'DEPOSITADA') {
      const periodoDeposito = detraccion.fechaDeposito?.substring(0, 7);
      if (periodoDeposito && periodoDeposito > periodoDeclaracion) {
        return {
          deducible: false,
          motivo: `CREDITO_DIFERIDO: La detracción fue depositada en ${periodoDeposito}, por lo que el crédito fiscal no puede ejercerse en ${periodoDeclaracion}.`,
          detraccion
        };
      }
      return { deducible: true, motivo: 'DETRACCION_CONFORME', detraccion };
    }

    return { deducible: true, motivo: 'OK', detraccion };
  }
};
