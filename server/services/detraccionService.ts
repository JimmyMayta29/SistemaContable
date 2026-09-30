import { db } from '../config/database';
import { auditoriaRepository } from '../repositories/auditoriaRepository';

export interface DetraccionRegistroModel {
  id: string;
  empresaId: string;
  comprobanteCompraId?: string;
  comprobanteVentaId?: string;
  codigoBien: string;
  porcentaje: number;
  monto: number;
  cuentaBancoNacion?: string;
  numeroConstancia?: string;
  fechaDeposito?: string;
  estado: 'PENDIENTE' | 'DEPOSITADA' | 'NO_APLICA';
  permiteCreditoFiscal: boolean;
}

export const DETRACCIONES_MEMORIA: DetraccionRegistroModel[] = [];

export const detraccionService = {
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
    return [];
  },

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

    if (db.isPostgresConnected()) {
      const res = await db.query(`
        UPDATE detracciones SET
          numero_constancia = $1, fecha_deposito = $2, estado = 'DEPOSITADA', updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
        RETURNING *
      `, [numeroConstancia, fechaDeposito, detraccionId]);

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

    return { id: detraccionId, estado: 'DEPOSITADA', numeroConstancia, fechaDeposito };
  }
};
