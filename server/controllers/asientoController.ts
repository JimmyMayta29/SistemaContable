import { Request, Response } from 'express';
import { z } from 'zod';
import { asientoService } from '../services/asientoService';
import { contabilizacionService, TipoOperacionContable } from '../services/contabilizacionService';
import { periodoService } from '../services/periodoService';
import { librosEEFFService } from '../services/librosEEFFService';
import { auditoriaRepository } from '../repositories/auditoriaRepository';
import { successResponse, errorResponse } from '../utils/response';

// Esquemas de validación Zod
export const detalleInputSchema = z.object({
  linea: z.number().int().positive(),
  cuentaId: z.string().min(1),
  anexoId: z.string().nullable().optional(),
  debe: z.number().min(0).default(0),
  haber: z.number().min(0).default(0),
  debeMe: z.number().min(0).optional().default(0),
  haberMe: z.number().min(0).optional().default(0),
  centroCostoId: z.string().nullable().optional(),
  docTipo: z.string().nullable().optional(),
  docSerie: z.string().nullable().optional(),
  docNumero: z.string().nullable().optional(),
  fechaVencimiento: z.string().nullable().optional(),
  glosaLinea: z.string().nullable().optional()
});

export const asientoInputSchema = z.object({
  periodoId: z.string().min(1),
  subdiarioId: z.string().min(1),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha YYYY-MM-DD requerido'),
  glosa: z.string().min(3).max(255),
  moneda: z.enum(['PEN', 'USD']).default('PEN'),
  tipoCambio: z.number().positive().default(1.0),
  origen: z.string().optional().default('MANUAL'),
  origenId: z.string().nullable().optional(),
  version: z.number().int().optional(),
  detalles: z.array(detalleInputSchema).min(2, 'El asiento debe tener al menos 2 líneas')
});

export const previsualizarSchema = z.object({
  tipoOperacion: z.enum([
    'COMPRA_MERCADERIA', 'COMPRA_SERVICIO', 'VENTA', 'COBRANZA', 'PAGO',
    'HONORARIO', 'PLANILLA', 'DETRACCION', 'DESTINO_FUNCION', 'DESTINO_ALMACEN', 'DIFERENCIA_CAMBIO'
  ]),
  total: z.number().positive('El importe total debe ser mayor a 0'),
  baseImponible: z.number().optional(),
  igv: z.number().optional(),
  retencion: z.number().optional(),
  glosa: z.string().min(2),
  docTipo: z.string().optional(),
  docSerie: z.string().optional(),
  docNumero: z.string().optional(),
  anexoId: z.string().optional(),
  moneda: z.enum(['PEN', 'USD']).optional().default('PEN'),
  tipoCambio: z.number().positive().optional().default(1.0),
  porcentajeAdmin: z.number().min(0).max(100).optional(),
  porcentajeVentas: z.number().min(0).max(100).optional()
});

export const anularAsientoSchema = z.object({
  motivo: z.string().min(5, 'Debe especificar el motivo de anulación')
});

export const reabrirPeriodoSchema = z.object({
  motivo: z.string().min(10, 'Debe detallar el motivo de reapertura del período')
});

export const asientoController = {
  async listar(req: Request, res: Response) {
    try {
      const empresaId = req.params.id || req.empresaId!;
      const filtros = {
        periodoId: req.query.periodoId as string,
        subdiarioId: req.query.subdiarioId as string,
        estado: req.query.estado as any,
        fechaDesde: req.query.fechaDesde as string,
        fechaHasta: req.query.fechaHasta as string,
        search: req.query.search as string,
        page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 25
      };

      const resultado = await asientoService.listar(empresaId, filtros);
      return successResponse(res, resultado);
    } catch (err: any) {
      return errorResponse(res, err.message);
    }
  },

  async obtener(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const asiento = await asientoService.obtenerPorId(id);
      if (!asiento) {
        return errorResponse(res, 'ASIENTO_NO_ENCONTRADO: Asiento no encontrado', 404);
      }
      return successResponse(res, asiento);
    } catch (err: any) {
      return errorResponse(res, err.message);
    }
  },

  async crear(req: Request, res: Response) {
    try {
      const empresaId = req.params.id || req.empresaId!;
      const userId = req.user?.id || '00000000-0000-0000-0000-000000000001';

      const nuevo = await asientoService.crearBorrador(empresaId, req.body, userId);
      return successResponse(res, nuevo, 'Asiento borrador creado exitosamente', 201);
    } catch (err: any) {
      return errorResponse(res, err.message);
    }
  },

  async actualizar(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user?.id || '00000000-0000-0000-0000-000000000001';
      const expectedVersion = req.body.version || 1;

      const actualizado = await asientoService.actualizarBorrador(id, req.body, userId, expectedVersion);
      return successResponse(res, actualizado, 'Asiento actualizado correctamente');
    } catch (err: any) {
      const status = err.message.startsWith('VERSION_DESACTUALIZADA') ? 409 : 400;
      return errorResponse(res, err.message, status);
    }
  },

  async contabilizar(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const empresaId = req.empresaId!;
      const userId = req.user?.id || '00000000-0000-0000-0000-000000000001';

      const contabilizado = await asientoService.contabilizar(id, empresaId, userId);
      return successResponse(res, contabilizado, `Asiento contabilizado con éxito con N° ${contabilizado.numero}`);
    } catch (err: any) {
      return errorResponse(res, err.message);
    }
  },

  async anular(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const empresaId = req.empresaId!;
      const userId = req.user?.id || '00000000-0000-0000-0000-000000000001';
      const { motivo } = req.body;

      const resultado = await asientoService.anular(id, motivo, userId, empresaId);
      return successResponse(res, resultado, 'Asiento anulado y extorno generado exitosamente');
    } catch (err: any) {
      return errorResponse(res, err.message);
    }
  },

  async duplicar(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const empresaId = req.empresaId!;
      const userId = req.user?.id || '00000000-0000-0000-0000-000000000001';

      const copia = await asientoService.duplicar(id, userId, empresaId);
      return successResponse(res, copia, 'Asiento duplicado como borrador');
    } catch (err: any) {
      return errorResponse(res, err.message);
    }
  },

  async previsualizar(req: Request, res: Response) {
    try {
      const empresaId = req.params.id || req.empresaId!;
      const { tipoOperacion, ...datos } = req.body;

      const propuesta = await contabilizacionService.generar(
        empresaId,
        tipoOperacion as TipoOperacionContable,
        datos
      );

      return successResponse(res, propuesta);
    } catch (err: any) {
      return errorResponse(res, err.message);
    }
  },

  async listarPeriodos(req: Request, res: Response) {
    try {
      const empresaId = req.params.id || req.empresaId!;
      const anio = req.query.anio ? parseInt(req.query.anio as string, 10) : 2026;
      const periodos = await periodoService.listar(empresaId, anio);
      return successResponse(res, periodos);
    } catch (err: any) {
      return errorResponse(res, err.message);
    }
  },

  async cerrarPeriodo(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const empresaId = req.empresaId!;
      const userId = req.user?.id || '00000000-0000-0000-0000-000000000001';

      const cerrado = await periodoService.cerrar(id, userId, empresaId);
      return successResponse(res, cerrado, 'Período contable cerrado exitosamente');
    } catch (err: any) {
      return errorResponse(res, err.message);
    }
  },

  async reabrirPeriodo(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const empresaId = req.empresaId!;
      const userId = req.user?.id || '00000000-0000-0000-0000-000000000001';
      const userRole = req.userRolEnEmpresa || req.user?.rolGlobal || 'ADMIN_ESTUDIO';
      const { motivo } = req.body;

      const reabierto = await periodoService.reabrir(id, motivo, userId, userRole, empresaId);
      return successResponse(res, reabierto, 'Período contable reabierto');
    } catch (err: any) {
      return errorResponse(res, err.message);
    }
  },

  async listarAuditoria(req: Request, res: Response) {
    try {
      const empresaId = req.params.id || req.empresaId!;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
      const registros = await auditoriaRepository.listarPorEmpresa(empresaId, limit);
      return successResponse(res, registros);
    } catch (err: any) {
      return errorResponse(res, err.message);
    }
  },

  async obtenerLibroDiario(req: Request, res: Response) {
    try {
      const empresaId = req.params.id || req.empresaId!;
      const periodo = (req.query.periodo as string) || (req.query.periodoId as string) || '2026-09';
      const libro = await librosEEFFService.generarLibroDiario(empresaId, periodo);
      return successResponse(res, libro);
    } catch (err: any) {
      return errorResponse(res, err.message);
    }
  },

  async obtenerLibroMayor(req: Request, res: Response) {
    try {
      const empresaId = req.params.id || req.empresaId!;
      const periodo = (req.query.periodo as string) || '2026-09';
      const mayor = await librosEEFFService.generarLibroMayor(empresaId, periodo);
      return successResponse(res, mayor);
    } catch (err: any) {
      return errorResponse(res, err.message);
    }
  },

  async obtenerBalanceComprobacion(req: Request, res: Response) {
    try {
      const empresaId = req.params.id || req.empresaId!;
      const periodo = (req.query.periodo as string) || '2026-09';
      const balance = await librosEEFFService.generarBalanceComprobacion(empresaId, periodo);
      return successResponse(res, balance);
    } catch (err: any) {
      return errorResponse(res, err.message);
    }
  },

  async obtenerEstadoSituacionFinanciera(req: Request, res: Response) {
    try {
      const empresaId = req.params.id || req.empresaId!;
      const periodo = (req.query.periodo as string) || '2026-09';
      const es = await librosEEFFService.generarEstadoSituacionFinanciera(empresaId, periodo);
      return successResponse(res, es);
    } catch (err: any) {
      return errorResponse(res, err.message);
    }
  },

  async obtenerEstadoResultados(req: Request, res: Response) {
    try {
      const empresaId = req.params.id || req.empresaId!;
      const periodo = (req.query.periodo as string) || '2026-09';
      const er = await librosEEFFService.generarEstadoResultados(empresaId, periodo);
      return successResponse(res, er);
    } catch (err: any) {
      return errorResponse(res, err.message);
    }
  },

  async obtenerFlujoEfectivo(req: Request, res: Response) {
    try {
      const empresaId = req.params.id || req.empresaId!;
      const periodo = (req.query.periodo as string) || '2026-09';
      const fe = await librosEEFFService.generarEstadoFlujoEfectivo(empresaId, periodo);
      return successResponse(res, fe);
    } catch (err: any) {
      return errorResponse(res, err.message);
    }
  },

  async obtenerRatiosFinancieros(req: Request, res: Response) {
    try {
      const empresaId = req.params.id || req.empresaId!;
      const periodo = (req.query.periodo as string) || '2026-09';
      const ratios = await librosEEFFService.calcularRatiosFinancieros(empresaId, periodo);
      return successResponse(res, ratios);
    } catch (err: any) {
      return errorResponse(res, err.message);
    }
  },

  async reconstruirSaldos(req: Request, res: Response) {
    try {
      const empresaId = req.params.id || req.empresaId!;
      const periodo = (req.body.periodo as string) || '2026-09';
      const rec = await librosEEFFService.reconstruirSaldosMensuales(empresaId, periodo);
      return successResponse(res, rec);
    } catch (err: any) {
      return errorResponse(res, err.message);
    }
  },

  async verificarSaldos(req: Request, res: Response) {
    try {
      const empresaId = req.params.id || req.empresaId!;
      const periodo = (req.query.periodo as string) || '2026-09';
      const ver = await librosEEFFService.verificarIntegridadSaldosContraDiario(empresaId, periodo);
      return successResponse(res, ver);
    } catch (err: any) {
      return errorResponse(res, err.message);
    }
  },

  async obtenerHojaTrabajo10Columnas(req: Request, res: Response) {
    try {
      const empresaId = req.params.id || req.params.empresaId || req.empresaId!;
      const periodo = (req.query.periodo as string) || '2026-09';
      const acumulado = req.query.acumulado !== 'false';
      const correctorasEnNegativo = req.query.correctorasEnNegativo === 'true';
      const incluirCierre = req.query.incluirCierre !== 'false';

      const hoja = await librosEEFFService.generarHojaTrabajo10Columnas(empresaId, periodo, {
        acumuladoAlMes: acumulado,
        correctorasActivoEnNegativo: correctorasEnNegativo,
        incluirCierreYAjustes: incluirCierre
      });
      return successResponse(res, hoja);
    } catch (err: any) {
      return errorResponse(res, err.message);
    }
  },

  async obtenerLibroDiarioESTANDAR(req: Request, res: Response) {
    try {
      const empresaId = req.params.id || req.params.empresaId || req.empresaId!;
      const periodo = (req.query.periodo as string) || '2026-09';
      const incluirCierre = req.query.incluirCierre !== 'false';
      const formatoFecha = (req.query.formatoFecha as any) || 'DD/MM/AAAA';
      const voucherDesde = req.query.voucherDesde as string;
      const voucherHasta = req.query.voucherHasta as string;

      const diario = await librosEEFFService.generarLibroDiarioESTANDAR(empresaId, periodo, {
        incluirAjustesYCierre: incluirCierre,
        formatoFecha,
        voucherDesde,
        voucherHasta
      });
      return successResponse(res, diario);
    } catch (err: any) {
      return errorResponse(res, err.message);
    }
  },

  async descargarPle51Diario(req: Request, res: Response) {
    try {
      const empresaId = req.params.id || req.params.empresaId || req.empresaId!;
      const periodo = (req.query.periodo as string) || '2026-09';
      const resultado = await librosEEFFService.generarPle51DiarioTxt(empresaId, periodo);

      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${resultado.nombreArchivo}"`);
      return res.send(resultado.contenidoTxt);
    } catch (err: any) {
      return errorResponse(res, err.message, 500);
    }
  }
};
