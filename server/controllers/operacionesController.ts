import { Request, Response } from 'express';
import { z } from 'zod';
import { compraService } from '../services/compraService';
import { ventaService } from '../services/ventaService';
import { notaCreditoDebitoService } from '../services/notaCreditoDebitoService';
import { saldosService } from '../services/saldosService';
import { detraccionService } from '../services/detraccionService';
import { liquidacionIGVService } from '../services/liquidacionIGVService';
import { contabilizacionService } from '../services/contabilizacionService';
import { anexoService } from '../services/anexoService';
import { SunatConsultaRucService } from '../services/sunatConsultaRucService';
import { successResponse, errorResponse } from '../utils/response';

// Esquemas de validación Zod
export const compraSchema = z.object({
  periodoId: z.string().min(1),
  fechaEmision: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  fechaVencimiento: z.string().nullable().optional(),
  fechaContable: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  tipoComprobante: z.enum(['01', '03', '07', '08', '14']),
  serie: z.string().min(1).max(10),
  numero: z.string().min(1).max(20),
  proveedorId: z.string().min(1),
  moneda: z.enum(['PEN', 'USD']).default('PEN'),
  tipoCambio: z.number().positive().default(1.0),
  baseGravada: z.number().min(0),
  igv: z.number().min(0),
  baseNoGravada: z.number().min(0).optional().default(0),
  exonerado: z.number().min(0).optional().default(0),
  isc: z.number().min(0).optional().default(0),
  icbper: z.number().min(0).optional().default(0),
  otrosTributos: z.number().min(0).optional().default(0),
  total: z.number().positive('El total debe ser mayor a 0'),
  tipoAdquisicion: z.enum(['1', '2', '3', '4']).default('1'),
  formaPago: z.enum(['CONTADO', 'CREDITO']).default('CONTADO'),
  diasCredito: z.number().int().min(0).optional().default(0),
  tieneDetraccion: z.boolean().optional().default(false),
  codigoBienDetraccion: z.string().optional(),
  porcentajeDetraccion: z.number().optional(),
  tieneRetencion: z.boolean().optional().default(false),
  porcentajeRetencion: z.number().optional(),
  esServicio: z.boolean().optional().default(false),
  esActivo: z.boolean().optional().default(false),
  porcentajeAdmin: z.number().min(0).max(100).optional(),
  porcentajeVentas: z.number().min(0).max(100).optional(),
  glosa: z.string().optional(),
  estado: z.enum(['BORRADOR', 'REGISTRADO']).optional().default('REGISTRADO'),
  version: z.number().optional()
});

export const ventaSchema = z.object({
  periodoId: z.string().min(1),
  fechaEmision: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  fechaVencimiento: z.string().nullable().optional(),
  fechaContable: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  tipoComprobante: z.enum(['01', '03', '07', '08']),
  serie: z.string().min(1).max(10),
  numero: z.string().min(1).max(20),
  clienteId: z.string().min(1),
  moneda: z.enum(['PEN', 'USD']).default('PEN'),
  tipoCambio: z.number().positive().default(1.0),
  baseGravada: z.number().min(0),
  igv: z.number().min(0),
  baseNoGravada: z.number().min(0).optional().default(0),
  exonerado: z.number().min(0).optional().default(0),
  isc: z.number().min(0).optional().default(0),
  icbper: z.number().min(0).optional().default(0),
  otrosTributos: z.number().min(0).optional().default(0),
  total: z.number().positive('El total debe ser mayor a 0'),
  tipoOperacion: z.string().optional().default('VENTA_INTERNA'),
  formaPago: z.enum(['CONTADO', 'CREDITO']).default('CONTADO'),
  diasCredito: z.number().int().min(0).optional().default(0),
  tieneDetraccion: z.boolean().optional().default(false),
  codigoBienDetraccion: z.string().optional(),
  porcentajeDetraccion: z.number().optional(),
  tienePercepcion: z.boolean().optional().default(false),
  porcentajePercepcion: z.number().optional(),
  hashCpe: z.string().optional(),
  glosa: z.string().optional(),
  estado: z.enum(['BORRADOR', 'REGISTRADO']).optional().default('REGISTRADO'),
  version: z.number().optional()
});

export const notaSchema = z.object({
  esVenta: z.boolean(),
  tipoNota: z.enum(['07', '08']),
  serie: z.string().min(1),
  numero: z.string().min(1),
  fechaEmision: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  fechaContable: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  motivoCodigo: z.string().min(2),
  motivoDescripcion: z.string().min(3),
  baseGravada: z.number().min(0),
  igv: z.number().min(0),
  total: z.number().positive(),
  moneda: z.enum(['PEN', 'USD']).optional().default('PEN'),
  tipoCambio: z.number().positive().optional().default(1.0)
});

export const anularSchema = z.object({
  motivo: z.string().min(3, 'Debe especificar el motivo de anulación')
});

export const depositoDetraccionSchema = z.object({
  numeroConstancia: z.string().min(4, 'El número de constancia es obligatorio'),
  fechaDeposito: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha inválido')
});

export const aplicacionPagoSchema = z.object({
  fechaPago: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  referenciaBanco: z.string().optional(),
  moneda: z.enum(['PEN', 'USD']).optional().default('PEN'),
  tipoCambio: z.number().positive().optional().default(1.0),
  aplicaciones: z.array(z.object({
    cuentaPorPagarId: z.string().min(1),
    importe: z.number().positive()
  })).min(1, 'Debe incluir al menos un documento para aplicar el pago')
});

export const aplicacionCobranzaSchema = z.object({
  fechaCobranza: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  referenciaBanco: z.string().optional(),
  moneda: z.enum(['PEN', 'USD']).optional().default('PEN'),
  tipoCambio: z.number().positive().optional().default(1.0),
  aplicaciones: z.array(z.object({
    cuentaPorCobrarId: z.string().min(1),
    importe: z.number().positive()
  })).min(1, 'Debe incluir al menos un documento para aplicar la cobranza')
});

export const previsualizarAsientoSchema = z.object({
  tipoOperacion: z.string().min(1),
  datosOperacion: z.object({
    total: z.number().min(0),
    baseImponible: z.number().min(0).optional(),
    igv: z.number().min(0).optional(),
    glosa: z.string().optional(),
    docTipo: z.string().optional(),
    docSerie: z.string().optional(),
    docNumero: z.string().optional(),
    anexoId: z.string().optional(),
    porcentajeAdmin: z.number().min(0).max(100).optional(),
    porcentajeVentas: z.number().min(0).max(100).optional()
  })
});

export const anexoSchema = z.object({
  tipoDocumento: z.enum(['6', '1', '4', '7', '0']).default('6'),
  numeroDocumento: z.string().min(8).max(20),
  razonSocial: z.string().min(2),
  direccion: z.string().optional(),
  tipoEntidad: z.enum(['CLIENTE', 'PROVEEDOR', 'EMPLEADO', 'AMBOS']).default('PROVEEDOR'),
  condicionSunat: z.enum(['HABIDO', 'NO_HABIDO']).optional().default('HABIDO'),
  estadoSunat: z.enum(['ACTIVO', 'SUSPENDIDO', 'BAJA']).optional().default('ACTIVO')
});

export const importarLoteSchema = z.object({
  formato: z.literal('CSV'),
  modo: z.enum(['TODO_O_NADA', 'PARCIAL']).default('TODO_O_NADA'),
  filas: z.array(z.any()).min(1, 'El lote debe contener al menos una fila')
});

export const operacionesController = {
  // --------------------------------------------------------------------------
  // COMPRAS (RCE)
  // --------------------------------------------------------------------------
  async crearCompra(req: Request, res: Response) {
    try {
      const empresaId = req.params.id || req.empresaId!;
      const userId = req.user?.id || '00000000-0000-0000-0000-000000000001';
      const estado = req.body.estado || 'REGISTRADO';

      if (estado === 'BORRADOR') {
        const borrador = await compraService.crearBorrador(empresaId, req.body, userId);
        return successResponse(res, borrador, 'Borrador de compra guardado', 201);
      }

      const compra = await compraService.registrar(empresaId, req.body, userId);
      return successResponse(res, compra, 'Comprobante de compra registrado y contabilizado', 201);
    } catch (err: any) {
      return errorResponse(res, err.message);
    }
  },

  async obtenerCompra(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const empresaId = req.empresaId!;
      const compra = await compraService.obtenerPorId(empresaId, id);
      if (!compra) return errorResponse(res, 'Comprobante de compra no encontrado', 404);
      return successResponse(res, compra);
    } catch (err: any) {
      return errorResponse(res, err.message);
    }
  },

  async actualizarCompra(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const empresaId = req.empresaId!;
      const userId = req.user?.id || '00000000-0000-0000-0000-000000000001';
      const expectedVersion = req.body.version ?? 1;

      const actualizado = await compraService.actualizarBorrador(empresaId, id, req.body, userId, expectedVersion);
      return successResponse(res, actualizado, 'Borrador de compra actualizado');
    } catch (err: any) {
      return errorResponse(res, err.message);
    }
  },

  async eliminarCompra(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const empresaId = req.empresaId!;
      const userId = req.user?.id || '00000000-0000-0000-0000-000000000001';
      await compraService.eliminarBorrador(empresaId, id, userId);
      return successResponse(res, { id }, 'Borrador de compra eliminado');
    } catch (err: any) {
      return errorResponse(res, err.message);
    }
  },

  async registrarBorradorCompra(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const empresaId = req.empresaId!;
      const userId = req.user?.id || '00000000-0000-0000-0000-000000000001';
      const registrado = await compraService.registrar(empresaId, id, userId);
      return successResponse(res, registrado, 'Borrador registrado y contabilizado');
    } catch (err: any) {
      return errorResponse(res, err.message);
    }
  },

  async anularCompra(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const empresaId = req.empresaId!;
      const userId = req.user?.id || '00000000-0000-0000-0000-000000000001';
      const motivo = req.body.motivo || 'Anulación de comprobante';
      const anulado = await compraService.anular(empresaId, id, motivo, userId);
      return successResponse(res, anulado, 'Comprobante de compra anulado con extorno');
    } catch (err: any) {
      return errorResponse(res, err.message);
    }
  },

  async duplicarCompra(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const empresaId = req.empresaId!;
      const userId = req.user?.id || '00000000-0000-0000-0000-000000000001';
      const duplicado = await compraService.duplicar(empresaId, id, userId);
      return successResponse(res, duplicado, 'Comprobante duplicado como borrador');
    } catch (err: any) {
      return errorResponse(res, err.message);
    }
  },

  async listarCompras(req: Request, res: Response) {
    try {
      const empresaId = req.params.id || req.empresaId!;
      const compras = await compraService.listar(empresaId, {
        page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 50,
        periodoId: req.query.periodoId as string,
        tipoComprobante: req.query.tipoComprobante as string,
        proveedorId: req.query.proveedorId as string,
        estado: req.query.estado as string,
        fechaDesde: req.query.fechaDesde as string,
        fechaHasta: req.query.fechaHasta as string,
        search: req.query.search as string,
        sortBy: req.query.sortBy as string,
        sortOrder: req.query.sortOrder as any
      });
      return successResponse(res, compras);
    } catch (err: any) {
      return errorResponse(res, err.message);
    }
  },

  async obtenerRegistroCompras(req: Request, res: Response) {
    try {
      const empresaId = req.params.id || req.empresaId!;
      const periodoId = (req.query.periodo as string) || (req.query.periodoId as string) || 'per-2026-09';
      const reporte = await compraService.obtenerRegistroCompras(empresaId, periodoId);
      return successResponse(res, reporte);
    } catch (err: any) {
      return errorResponse(res, err.message);
    }
  },

  async importarLoteCompras(req: Request, res: Response) {
    try {
      const empresaId = req.params.id || req.empresaId!;
      const userId = req.user?.id || '00000000-0000-0000-0000-000000000001';
      const resultado = await compraService.importarLote(empresaId, req.body, userId);
      if (!resultado.success) {
        return errorResponse(res, 'Errores en la validación del lote CSV', 400, resultado.errores);
      }
      return successResponse(res, resultado, 'Lote de compras importado');
    } catch (err: any) {
      return errorResponse(res, err.message);
    }
  },

  // --------------------------------------------------------------------------
  // VENTAS (RVIE)
  // --------------------------------------------------------------------------
  async crearVenta(req: Request, res: Response) {
    try {
      const empresaId = req.params.id || req.empresaId!;
      const userId = req.user?.id || '00000000-0000-0000-0000-000000000001';
      const estado = req.body.estado || 'REGISTRADO';

      if (estado === 'BORRADOR') {
        const borrador = await ventaService.crearBorrador(empresaId, req.body, userId);
        return successResponse(res, borrador, 'Borrador de venta guardado', 201);
      }

      const venta = await ventaService.registrar(empresaId, req.body, userId);
      return successResponse(res, venta, 'Comprobante de venta registrado y contabilizado', 201);
    } catch (err: any) {
      return errorResponse(res, err.message);
    }
  },

  async obtenerVenta(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const empresaId = req.empresaId!;
      const venta = await ventaService.obtenerPorId(empresaId, id);
      if (!venta) return errorResponse(res, 'Comprobante de venta no encontrado', 404);
      return successResponse(res, venta);
    } catch (err: any) {
      return errorResponse(res, err.message);
    }
  },

  async actualizarVenta(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const empresaId = req.empresaId!;
      const userId = req.user?.id || '00000000-0000-0000-0000-000000000001';
      const expectedVersion = req.body.version ?? 1;

      const actualizado = await ventaService.actualizarBorrador(empresaId, id, req.body, userId, expectedVersion);
      return successResponse(res, actualizado, 'Borrador de venta actualizado');
    } catch (err: any) {
      return errorResponse(res, err.message);
    }
  },

  async eliminarVenta(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const empresaId = req.empresaId!;
      const userId = req.user?.id || '00000000-0000-0000-0000-000000000001';
      await ventaService.eliminarBorrador(empresaId, id, userId);
      return successResponse(res, { id }, 'Borrador de venta eliminado');
    } catch (err: any) {
      return errorResponse(res, err.message);
    }
  },

  async registrarBorradorVenta(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const empresaId = req.empresaId!;
      const userId = req.user?.id || '00000000-0000-0000-0000-000000000001';
      const registrado = await ventaService.registrar(empresaId, id, userId);
      return successResponse(res, registrado, 'Borrador de venta registrado y contabilizado');
    } catch (err: any) {
      return errorResponse(res, err.message);
    }
  },

  async anularVenta(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const empresaId = req.empresaId!;
      const userId = req.user?.id || '00000000-0000-0000-0000-000000000001';
      const motivo = req.body.motivo || 'Anulación de comprobante de venta';
      const anulado = await ventaService.anular(empresaId, id, motivo, userId);
      return successResponse(res, anulado, 'Comprobante de venta anulado con extorno');
    } catch (err: any) {
      return errorResponse(res, err.message);
    }
  },

  async duplicarVenta(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const empresaId = req.empresaId!;
      const userId = req.user?.id || '00000000-0000-0000-0000-000000000001';
      const duplicado = await ventaService.duplicar(empresaId, id, userId);
      return successResponse(res, duplicado, 'Comprobante de venta duplicado como borrador');
    } catch (err: any) {
      return errorResponse(res, err.message);
    }
  },

  async listarVentas(req: Request, res: Response) {
    try {
      const empresaId = req.params.id || req.empresaId!;
      const ventas = await ventaService.listar(empresaId, {
        page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 50,
        periodoId: req.query.periodoId as string,
        tipoComprobante: req.query.tipoComprobante as string,
        clienteId: req.query.clienteId as string,
        estado: req.query.estado as string,
        fechaDesde: req.query.fechaDesde as string,
        fechaHasta: req.query.fechaHasta as string,
        search: req.query.search as string,
        sortBy: req.query.sortBy as string,
        sortOrder: req.query.sortOrder as any
      });
      return successResponse(res, ventas);
    } catch (err: any) {
      return errorResponse(res, err.message);
    }
  },

  async obtenerRegistroVentas(req: Request, res: Response) {
    try {
      const empresaId = req.params.id || req.empresaId!;
      const periodoId = (req.query.periodo as string) || (req.query.periodoId as string) || 'per-2026-09';
      const reporte = await ventaService.obtenerRegistroVentas(empresaId, periodoId);
      return successResponse(res, reporte);
    } catch (err: any) {
      return errorResponse(res, err.message);
    }
  },

  async importarLoteVentas(req: Request, res: Response) {
    try {
      const empresaId = req.params.id || req.empresaId!;
      const userId = req.user?.id || '00000000-0000-0000-0000-000000000001';
      const resultado = await ventaService.importarLote(empresaId, req.body, userId);
      if (!resultado.success) {
        return errorResponse(res, 'Errores en la validación del lote CSV', 400, resultado.errores);
      }
      return successResponse(res, resultado, 'Lote de ventas importado');
    } catch (err: any) {
      return errorResponse(res, err.message);
    }
  },

  // --------------------------------------------------------------------------
  // PREVISUALIZACIÓN DE ASIENTO
  // --------------------------------------------------------------------------
  async previsualizarAsiento(req: Request, res: Response) {
    try {
      const empresaId = req.params.id || req.empresaId!;
      const { tipoOperacion, datosOperacion } = req.body;
      const propuesta = await contabilizacionService.generar(empresaId, tipoOperacion, datosOperacion);
      return successResponse(res, propuesta);
    } catch (err: any) {
      return errorResponse(res, err.message);
    }
  },

  // --------------------------------------------------------------------------
  // NOTAS DE CRÉDITO / DÉBITO
  // --------------------------------------------------------------------------
  async aplicarNota(req: Request, res: Response) {
    try {
      const { id } = req.params; // Documento original ID
      const empresaId = req.empresaId!;
      const userId = req.user?.id || '00000000-0000-0000-0000-000000000001';
      const resultado = await notaCreditoDebitoService.aplicarNota(empresaId, id, req.body, userId);
      return successResponse(res, resultado, 'Nota de crédito/débito aplicada exitosamente');
    } catch (err: any) {
      return errorResponse(res, err.message);
    }
  },

  async anularNota(req: Request, res: Response) {
    try {
      const { id } = req.params; // Nota ID
      const empresaId = req.empresaId!;
      const userId = req.user?.id || '00000000-0000-0000-0000-000000000001';
      const motivo = req.body.motivo || 'Anulación de nota';
      const resultado = await notaCreditoDebitoService.anularNota(empresaId, id, motivo, userId);
      return successResponse(res, resultado, 'Nota anulada y saldo restituido');
    } catch (err: any) {
      return errorResponse(res, err.message);
    }
  },

  // --------------------------------------------------------------------------
  // CARTERA CxP / CxC & APLICACIONES
  // --------------------------------------------------------------------------
  async listarCxP(req: Request, res: Response) {
    try {
      const empresaId = req.params.id || req.empresaId!;
      const saldos = await saldosService.listarCxP(empresaId, {
        estado: req.query.estado as string,
        anexoId: req.query.anexoId as string,
        search: req.query.search as string
      });
      return successResponse(res, saldos);
    } catch (err: any) {
      return errorResponse(res, err.message);
    }
  },

  async listarCxC(req: Request, res: Response) {
    try {
      const empresaId = req.params.id || req.empresaId!;
      const saldos = await saldosService.listarCxC(empresaId, {
        estado: req.query.estado as string,
        anexoId: req.query.anexoId as string,
        search: req.query.search as string
      });
      return successResponse(res, saldos);
    } catch (err: any) {
      return errorResponse(res, err.message);
    }
  },

  async reporteAntiguedad(req: Request, res: Response) {
    try {
      const empresaId = req.params.id || req.empresaId!;
      const tipo = (req.query.tipo as 'CXP' | 'CXC') || 'CXP';
      const fechaCorte = req.query.fechaCorte as string;
      const reporte = await saldosService.reporteAntiguedad(empresaId, tipo, fechaCorte);
      return successResponse(res, reporte);
    } catch (err: any) {
      return errorResponse(res, err.message);
    }
  },

  async obtenerEstadoCuenta(req: Request, res: Response) {
    try {
      const empresaId = req.params.id || req.empresaId!;
      const { anexoId } = req.params;
      const tipo = (req.query.tipo as 'PROVEEDOR' | 'CLIENTE') || 'PROVEEDOR';
      const estado = await saldosService.obtenerEstadoCuenta(empresaId, anexoId, tipo);
      return successResponse(res, estado);
    } catch (err: any) {
      return errorResponse(res, err.message);
    }
  },

  async aplicarPago(req: Request, res: Response) {
    try {
      const empresaId = req.params.id || req.empresaId!;
      const userId = req.user?.id || '00000000-0000-0000-0000-000000000001';
      const resultado = await saldosService.aplicarPago(empresaId, req.body, userId);
      return successResponse(res, resultado, 'Pago aplicado exitosamente');
    } catch (err: any) {
      return errorResponse(res, err.message);
    }
  },

  async aplicarCobranza(req: Request, res: Response) {
    try {
      const empresaId = req.params.id || req.empresaId!;
      const userId = req.user?.id || '00000000-0000-0000-0000-000000000001';
      const resultado = await saldosService.aplicarCobranza(empresaId, req.body, userId);
      return successResponse(res, resultado, 'Cobranza aplicada exitosamente');
    } catch (err: any) {
      return errorResponse(res, err.message);
    }
  },

  // --------------------------------------------------------------------------
  // ANEXOS (ALTA RÁPIDA & BÚSQUEDA)
  // --------------------------------------------------------------------------
  async listarAnexos(req: Request, res: Response) {
    try {
      const empresaId = req.params.id || req.empresaId!;
      const query = req.query.query as string;
      const tipoEntidad = req.query.tipoEntidad as string;
      const anexos = await anexoService.listar(empresaId, { query, tipoEntidad });
      return successResponse(res, anexos);
    } catch (err: any) {
      return errorResponse(res, err.message);
    }
  },

  async crearAnexo(req: Request, res: Response) {
    try {
      const empresaId = req.params.id || req.empresaId!;
      const nuevo = await anexoService.crear(empresaId, req.body);
      return successResponse(res, nuevo, 'Anexo registrado exitosamente', 201);
    } catch (err: any) {
      return errorResponse(res, err.message);
    }
  },

  // --------------------------------------------------------------------------
  // DETRACCIONES SPOT
  // --------------------------------------------------------------------------
  async listarDetraccionesPendientes(req: Request, res: Response) {
    try {
      const empresaId = req.params.id || req.empresaId!;
      const detracciones = await detraccionService.listarPendientes(empresaId);
      return successResponse(res, detracciones);
    } catch (err: any) {
      return errorResponse(res, err.message);
    }
  },

  async registrarDepositoDetraccion(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const empresaId = req.empresaId!;
      const userId = req.user?.id || '00000000-0000-0000-0000-000000000001';
      const { numeroConstancia, fechaDeposito } = req.body;
      const resDet = await detraccionService.registrarDeposito(id, numeroConstancia, fechaDeposito, userId, empresaId);
      return successResponse(res, resDet, 'Constancia de depósito de detracción registrada');
    } catch (err: any) {
      return errorResponse(res, err.message);
    }
  },

  // --------------------------------------------------------------------------
  // LIQUIDACIÓN PREVENTIVA IGV Y RENTA
  // --------------------------------------------------------------------------
  async liquidarIGV(req: Request, res: Response) {
    try {
      const empresaId = req.params.id || req.empresaId!;
      const periodo = (req.query.periodo as string) || '2026-09';
      const saldoAnterior = req.query.saldoAnterior ? parseFloat(req.query.saldoAnterior as string) : 0;
      const liquidacion = await liquidacionIGVService.calcular(empresaId, periodo, saldoAnterior);
      return successResponse(res, liquidacion);
    } catch (err: any) {
      return errorResponse(res, err.message);
    }
  },

  // --------------------------------------------------------------------------
  // CONSULTA RUC SUNAT EN TIEMPO REAL (HÍBRIDO POSTGRESQL + API SUNAT)
  // --------------------------------------------------------------------------
  async consultarRucSunat(req: Request, res: Response) {
    try {
      const empresaId = req.params.id || req.empresaId!;
      const { ruc } = req.params;
      const tipoEntidad = (req.query.tipoEntidad as 'PROVEEDOR' | 'CLIENTE' | 'AMBOS') || 'PROVEEDOR';
      const forzarActualizacion = req.query.forzar === 'true' || req.query.refresh === 'true';

      const resultado = await SunatConsultaRucService.consultarRuc(
        empresaId,
        ruc,
        tipoEntidad,
        forzarActualizacion
      );

      return successResponse(res, resultado, 'RUC consultado y sincronizado con éxito');
    } catch (err: any) {
      return errorResponse(res, err.message, 400);
    }
  }
};
