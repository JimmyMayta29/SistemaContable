import { Request, Response } from 'express';
import { z } from 'zod';
import { tesoreriaService } from '../services/tesoreriaService';
import { conciliacionService } from '../services/conciliacionService';
import { cajaChicaService } from '../services/cajaChicaService';
import { honorariosService } from '../services/honorariosService';
import { planillaService } from '../services/planillaService';
import { successResponse, errorResponse } from '../utils/response';

// ============================================================================
// ESQUEMAS ZOD DE VALIDACIÓN
// ============================================================================
export const cuentaFinancieraSchema = z.object({
  tipo: z.enum(['CAJA', 'BANCO', 'DETRACCIONES_BN']),
  banco: z.string().min(1),
  numero: z.string().min(1),
  moneda: z.enum(['PEN', 'USD']).default('PEN'),
  cuentaContableCodigo: z.string().optional(),
  saldoInicial: z.number().default(0),
  activa: z.boolean().optional().default(true)
});

export const movimientoTesoreriaSchema = z.object({
  periodoId: z.string().min(1),
  cuentaFinancieraId: z.string().min(1),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  tipo: z.enum(['INGRESO', 'EGRESO', 'COMISION', 'ITF', 'DEPOSITO_DETRACCION']),
  medioPago: z.string().default('003'),
  numeroOperacion: z.string().optional(),
  anexoId: z.string().optional(),
  moneda: z.enum(['PEN', 'USD']).default('PEN'),
  tipoCambio: z.number().positive().default(1.0),
  importe: z.number().positive(),
  glosa: z.string().min(1),
  detraccionId: z.string().optional(),
  aplicaciones: z.array(z.object({
    documentoId: z.string(),
    importeAplicado: z.number().positive()
  })).optional()
});

export const transferenciaSchema = z.object({
  periodoId: z.string().min(1),
  cuentaOrigenId: z.string().min(1),
  cuentaDestinoId: z.string().min(1),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  importeOrigen: z.number().positive(),
  importeDestino: z.number().positive().optional(),
  tipoCambio: z.number().positive().optional(),
  glosa: z.string().min(1)
});

export const extractoImportSchema = z.object({
  nombreArchivo: z.string().min(1),
  lineas: z.array(z.object({
    fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    descripcion: z.string(),
    referencia: z.string().optional(),
    monto: z.number(),
    saldo: z.number().optional()
  })).min(1),
  saldoInicial: z.number().optional(),
  saldoFinal: z.number().optional()
});

export const reciboHonorarioSchema = z.object({
  periodoId: z.string().min(1),
  proveedorId: z.string().min(1),
  proveedorNombre: z.string().optional(),
  proveedorRuc: z.string().optional(),
  serie: z.string().min(1).max(10),
  numero: z.string().min(1).max(20),
  fechaEmision: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  fechaPago: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  moneda: z.enum(['PEN', 'USD']).default('PEN'),
  tipoCambio: z.number().positive().default(1.0),
  importeBruto: z.number().positive(),
  cuentaGasto: z.string().default('6321'),
  glosa: z.string().optional(),
  suspensionCuarta: z.boolean().optional().default(false),
  numeroResolucionSuspension: z.string().optional(),
  vigenciaSuspensionDesde: z.string().optional(),
  vigenciaSuspensionHasta: z.string().optional()
});

export const trabajadorSchema = z.object({
  tipoDocumento: z.string().default('1'),
  numeroDocumento: z.string().min(8).max(15),
  nombres: z.string().min(1),
  apellidos: z.string().min(1),
  fechaNacimiento: z.string().optional(),
  direccion: z.string().optional(),
  telefono: z.string().optional(),
  email: z.string().email().optional(),
  fechaIngreso: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  cargo: z.string().min(1),
  regimenLaboral: z.enum(['GENERAL', 'MYPE_MICRO', 'MYPE_PEQUENA']).default('GENERAL'),
  sueldoBase: z.number().positive(),
  tieneAsignacionFamiliar: z.boolean().default(false),
  sistemaPensiones: z.enum(['ONP', 'AFP']),
  afpAdministradora: z.enum(['INTEGRA', 'PRIMA', 'PROFUTURO', 'HABITAT']).optional(),
  afpTipoComision: z.enum(['FLUJO', 'MIXTA']).default('FLUJO'),
  cuspp: z.string().optional(),
  centroCosto: z.string().default('ADMINISTRACION'),
  cuentaBancoSueldo: z.string().optional(),
  bancoSueldo: z.string().optional(),
  activo: z.boolean().default(true)
});

export const calcularPlanillaSchema = z.object({
  periodoId: z.string().min(1),
  mes: z.string().regex(/^\d{4}-\d{2}$/)
});

// ============================================================================
// CONTROLADOR REST
// ============================================================================
export const tesoreriaPlanillaController = {
  // CUENTAS FINANCIERAS
  async listarCuentas(req: Request, res: Response) {
    try {
      const empresaId = req.params.id;
      const cuentas = await tesoreriaService.listarCuentas(empresaId);
      return successResponse(res, cuentas);
    } catch (err: any) {
      return errorResponse(res, err.message);
    }
  },

  async crearCuenta(req: Request, res: Response) {
    try {
      const empresaId = req.params.id;
      const data = cuentaFinancieraSchema.parse(req.body);
      const cuenta = await tesoreriaService.crearCuenta(empresaId, data as any);
      return successResponse(res, cuenta, 'Cuenta financiera creada', 201);
    } catch (err: any) {
      return errorResponse(res, err.message);
    }
  },

  // MOVIMIENTOS DE TESORERÍA
  async listarMovimientos(req: Request, res: Response) {
    try {
      const empresaId = req.params.id;
      const { cuentaFinancieraId, tipo, estado, fechaDesde, fechaHasta, page, limit } = req.query;
      const result = await tesoreriaService.listarMovimientos(empresaId, {
        cuentaFinancieraId: cuentaFinancieraId as string,
        tipo: tipo as string,
        estado: estado as string,
        fechaDesde: fechaDesde as string,
        fechaHasta: fechaHasta as string,
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 50
      });
      return successResponse(res, result);
    } catch (err: any) {
      return errorResponse(res, err.message);
    }
  },

  async registrarMovimiento(req: Request, res: Response) {
    try {
      const empresaId = req.params.id;
      const userId = (req as any).user?.id || '00000000-0000-0000-0000-000000000001';
      const data = movimientoTesoreriaSchema.parse(req.body);
      const mov = await tesoreriaService.registrarMovimiento(empresaId, data as any, userId);
      return successResponse(res, mov, 'Movimiento registrado y contabilizado', 201);
    } catch (err: any) {
      return errorResponse(res, err.message);
    }
  },

  async anularMovimiento(req: Request, res: Response) {
    try {
      const empresaId = req.params.id;
      const movimientoId = req.params.movimientoId;
      const { motivo } = req.body;
      const userId = (req as any).user?.id || '00000000-0000-0000-0000-000000000001';
      const result = await tesoreriaService.anularMovimiento(empresaId, movimientoId, motivo || 'Anulación solicitada por usuario', userId);
      return successResponse(res, result, 'Movimiento anulado');
    } catch (err: any) {
      return errorResponse(res, err.message);
    }
  },

  // TRANSFERENCIAS
  async registrarTransferencia(req: Request, res: Response) {
    try {
      const empresaId = req.params.id;
      const userId = (req as any).user?.id || '00000000-0000-0000-0000-000000000001';
      const data = transferenciaSchema.parse(req.body);
      const transf = await tesoreriaService.registrarTransferencia(empresaId, data, userId);
      return successResponse(res, transf, 'Transferencia registrada exitosamente', 201);
    } catch (err: any) {
      return errorResponse(res, err.message);
    }
  },

  // CAJA CHICA
  async listarCajasChicas(req: Request, res: Response) {
    try {
      const empresaId = req.params.id;
      const cajas = await cajaChicaService.listarCajas(empresaId);
      return successResponse(res, cajas);
    } catch (err: any) {
      return errorResponse(res, err.message);
    }
  },

  async aperturaCajaChica(req: Request, res: Response) {
    try {
      const empresaId = req.params.id;
      const userId = (req as any).user?.id || '00000000-0000-0000-0000-000000000001';
      const caja = await cajaChicaService.abrirFondo(empresaId, req.body, userId);
      return successResponse(res, caja, 'Caja chica abierta', 201);
    } catch (err: any) {
      return errorResponse(res, err.message);
    }
  },

  async reponerCajaChica(req: Request, res: Response) {
    try {
      const empresaId = req.params.id;
      const { rendicionId, periodoId } = req.body;
      const userId = (req as any).user?.id || '00000000-0000-0000-0000-000000000001';
      const result = await cajaChicaService.reponerFondo(empresaId, rendicionId, periodoId, userId);
      return successResponse(res, result, 'Fondo repuesto');
    } catch (err: any) {
      return errorResponse(res, err.message);
    }
  },

  // EXTRACTOS Y CONCILIACIÓN
  async importarExtracto(req: Request, res: Response) {
    try {
      const empresaId = req.params.id;
      const { cuentaFinancieraId } = req.body;
      const userId = (req as any).user?.id || '00000000-0000-0000-0000-000000000001';
      const data = extractoImportSchema.parse(req.body);
      const extracto = await conciliacionService.importarExtracto(empresaId, cuentaFinancieraId, data, userId);
      return successResponse(res, extracto, 'Extracto bancario importado exitosamente', 201);
    } catch (err: any) {
      return errorResponse(res, err.message);
    }
  },

  async obtenerConciliacion(req: Request, res: Response) {
    try {
      const empresaId = req.params.id;
      const { cuentaFinancieraId, periodoId, fechaCorte } = req.query;
      const result = await conciliacionService.obtenerEstadoConciliacion(
        empresaId,
        cuentaFinancieraId as string,
        periodoId as string,
        (fechaCorte as string) || new Date().toISOString().split('T')[0]
      );
      return successResponse(res, result);
    } catch (err: any) {
      return errorResponse(res, err.message);
    }
  },

  async conciliarPartida(req: Request, res: Response) {
    try {
      const empresaId = req.params.id;
      const { extractoLineaId, movimientoId } = req.body;
      const userId = (req as any).user?.id || '00000000-0000-0000-0000-000000000001';
      const result = await conciliacionService.conciliar(empresaId, extractoLineaId, movimientoId, userId);
      return successResponse(res, result);
    } catch (err: any) {
      return errorResponse(res, err.message);
    }
  },

  async desconciliarPartida(req: Request, res: Response) {
    try {
      const empresaId = req.params.id;
      const { extractoLineaId } = req.body;
      const userId = (req as any).user?.id || '00000000-0000-0000-0000-000000000001';
      const result = await conciliacionService.desconciliar(empresaId, extractoLineaId, userId);
      return successResponse(res, result);
    } catch (err: any) {
      return errorResponse(res, err.message);
    }
  },

  async cerrarConciliacion(req: Request, res: Response) {
    try {
      const empresaId = req.params.id;
      const { cuentaFinancieraId, periodoId, fechaCorte } = req.body;
      const userId = (req as any).user?.id || '00000000-0000-0000-0000-000000000001';
      const result = await conciliacionService.cerrarConciliacion(empresaId, cuentaFinancieraId, periodoId, fechaCorte, userId);
      return successResponse(res, result, 'Conciliación del período cerrada');
    } catch (err: any) {
      return errorResponse(res, err.message);
    }
  },

  // HONORARIOS (4TA CATEGORÍA)
  async listarHonorarios(req: Request, res: Response) {
    try {
      const empresaId = req.params.id;
      const { fechaDesde, fechaHasta, proveedorId, estado } = req.query;
      const list = await honorariosService.listarRecibos(empresaId, {
        fechaDesde: fechaDesde as string,
        fechaHasta: fechaHasta as string,
        proveedorId: proveedorId as string,
        estado: estado as string
      });
      return successResponse(res, list);
    } catch (err: any) {
      return errorResponse(res, err.message);
    }
  },

  async registrarHonorario(req: Request, res: Response) {
    try {
      const empresaId = req.params.id;
      const userId = (req as any).user?.id || '00000000-0000-0000-0000-000000000001';
      const data = reciboHonorarioSchema.parse(req.body);
      const recibo = await honorariosService.registrarRecibo(empresaId, data as any, userId);
      return successResponse(res, recibo, 'Recibo por honorarios registrado y contabilizado', 201);
    } catch (err: any) {
      return errorResponse(res, err.message);
    }
  },

  async anularHonorario(req: Request, res: Response) {
    try {
      const empresaId = req.params.id;
      const id = req.params.honorarioId;
      const { motivo } = req.body;
      const userId = (req as any).user?.id || '00000000-0000-0000-0000-000000000001';
      const result = await honorariosService.anularRecibo(empresaId, id, motivo || 'Anulación solicitada', userId);
      return successResponse(res, result, 'Recibo por honorarios anulado');
    } catch (err: any) {
      return errorResponse(res, err.message);
    }
  },

  // TRABAJADORES Y PLANILLAS
  async listarTrabajadores(req: Request, res: Response) {
    try {
      const empresaId = req.params.id;
      const userRole = (req as any).user?.role || 'CONTADOR';
      const tienePermiso = userRole === 'ADMIN_ESTUDIO' || userRole === 'RRHH';
      const list = await planillaService.listarTrabajadores(empresaId, tienePermiso);
      return successResponse(res, list);
    } catch (err: any) {
      return errorResponse(res, err.message);
    }
  },

  async crearTrabajador(req: Request, res: Response) {
    try {
      const empresaId = req.params.id;
      const userId = (req as any).user?.id || '00000000-0000-0000-0000-000000000001';
      const data = trabajadorSchema.parse(req.body);
      const nuevo = await planillaService.crearTrabajador(empresaId, data as any, userId);
      return successResponse(res, nuevo, 'Trabajador registrado en nómina', 201);
    } catch (err: any) {
      return errorResponse(res, err.message);
    }
  },

  async calcularPlanilla(req: Request, res: Response) {
    try {
      const empresaId = req.params.id;
      const userId = (req as any).user?.id || '00000000-0000-0000-0000-000000000001';
      const { periodoId, mes } = calcularPlanillaSchema.parse(req.body);
      const planilla = await planillaService.calcularPlanilla(empresaId, periodoId, mes, userId);
      return successResponse(res, planilla, 'Planilla calculada exitosamente', 200);
    } catch (err: any) {
      return errorResponse(res, err.message);
    }
  },

  async contabilizarPlanilla(req: Request, res: Response) {
    try {
      const empresaId = req.params.id;
      const planillaId = req.params.planillaId;
      const userId = (req as any).user?.id || '00000000-0000-0000-0000-000000000001';
      const result = await planillaService.contabilizarPlanilla(empresaId, planillaId, userId);
      return successResponse(res, result, 'Planilla contabilizada');
    } catch (err: any) {
      return errorResponse(res, err.message);
    }
  },

  async anularPlanilla(req: Request, res: Response) {
    try {
      const empresaId = req.params.id;
      const planillaId = req.params.planillaId;
      const { motivo } = req.body;
      const userId = (req as any).user?.id || '00000000-0000-0000-0000-000000000001';
      const result = await planillaService.anularPlanilla(empresaId, planillaId, motivo || 'Anulación de planilla', userId);
      return successResponse(res, result, 'Planilla anulada y extornada');
    } catch (err: any) {
      return errorResponse(res, err.message);
    }
  },

  async exportarPlame(req: Request, res: Response) {
    try {
      const empresaId = req.params.id;
      const planillaId = req.params.planillaId;
      const info = planillaService.exportarPlame(empresaId, planillaId);
      return successResponse(res, info);
    } catch (err: any) {
      return errorResponse(res, err.message);
    }
  },

  // FLUJO DE CAJA
  async obtenerFlujoCaja(req: Request, res: Response) {
    try {
      const empresaId = req.params.id;
      const { desde, hasta } = req.query;
      const flujo = await tesoreriaService.obtenerFlujoCaja(empresaId, desde as string, hasta as string);
      return successResponse(res, flujo);
    } catch (err: any) {
      return errorResponse(res, err.message);
    }
  }
};
