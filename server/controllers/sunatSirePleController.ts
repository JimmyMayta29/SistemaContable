import { Request, Response } from 'express';
import { z } from 'zod';
import { sireService } from '../services/sireService';
import { conciliadorSireService } from '../services/conciliadorSireService';
import { xmlImportService } from '../services/xmlImportService';
import { pleExportService } from '../services/pleExportService';
import { sunatJobsService } from '../services/sunatJobsService';
import { empresaDemoService } from '../services/empresaDemoService';
import { successResponse, errorResponse } from '../utils/response';

// ============================================================================
// ESQUEMAS DE VALIDACIÓN ZOD
// ============================================================================
export const conexionSunatSchema = z.object({
  ruc: z.string().length(11, 'El RUC debe contener exactamente 11 dígitos'),
  usuarioSol: z.string().min(1, 'El usuario SOL es obligatorio'),
  claveSol: z.string().min(1, 'La clave SOL es obligatoria'),
  clientId: z.string().optional(),
  clientSecret: z.string().optional(),
  modoSimulado: z.boolean().optional().default(true)
});

export const descargarSireSchema = z.object({
  tipo: z.enum(['COMPRAS', 'VENTAS']),
  periodo: z.string().regex(/^\d{4}-\d{2}$/, 'El período debe tener formato YYYY-MM')
});

export const aplicarConciliacionSchema = z.object({
  accion: z.enum(['ACEPTAR', 'OBSERVAR', 'IGNORAR']),
  lineasIds: z.array(z.string()).min(1, 'Debe especificar al menos una línea'),
  motivo: z.string().optional()
});

export const importarXmlSchema = z.object({
  archivos: z.array(z.object({
    nombre: z.string().min(1),
    contenidoBase64: z.string().min(1)
  })).min(1, 'Debe adjuntar al menos un archivo XML')
});

export const exportarPleSchema = z.object({
  periodo: z.string().regex(/^\d{4}-\d{2}$/, 'El período debe tener formato YYYY-MM'),
  codigoLibro: z.string().min(1, 'Código de libro requerido'),
  ruc: z.string().length(11).optional()
});

export const guardarReglaProveedorSchema = z.object({
  proveedorRuc: z.string().length(11, 'El RUC debe tener 11 dígitos'),
  proveedorRazonSocial: z.string().min(2),
  destinoCompra: z.enum(['DESTINO_1', 'DESTINO_2', 'DESTINO_3', 'DESTINO_4']),
  cuentaGasto: z.string().min(2),
  centroCostoId: z.string().optional()
});

export const aceptarPropuestaOficialSchema = z.object({
  tipo: z.enum(['COMPRAS', 'VENTAS']),
  periodo: z.string().regex(/^\d{4}-\d{2}$/, 'El período debe tener formato YYYY-MM')
});

export const reemplazarPropuestaOficialSchema = z.object({
  tipo: z.enum(['COMPRAS', 'VENTAS']),
  periodo: z.string().regex(/^\d{4}-\d{2}$/, 'El período debe tener formato YYYY-MM'),
  comprobantesReemplazo: z.array(z.any()).default([])
});

export const ajustePosteriorSchema = z.object({
  periodoAjuste: z.string().regex(/^\d{4}-\d{2}$/, 'El período de ajuste debe tener formato YYYY-MM'),
  periodoAfectado: z.string().regex(/^\d{4}-\d{2}$/, 'El período afectado debe tener formato YYYY-MM'),
  ajusteData: z.any()
});

export const revertirLineaSchema = z.object({
  motivo: z.string().min(3, 'Debe especificar el motivo de la reversión')
});

// ============================================================================
// CONTROLADOR
// ============================================================================
export const sunatSirePleController = {
  // 1. CONEXIÓN Y CREDENCIALES
  async guardarConexion(req: Request, res: Response) {
    try {
      const empresaId = req.params.id;
      empresaDemoService.validarOperacionOficialPermitida(empresaId, 'SOL_CONEXION');
      const data = conexionSunatSchema.parse(req.body);
      const userId = (req as any).user?.id || '00000000-0000-0000-0000-000000000001';
      const result = await sireService.guardarConexion(empresaId, data, userId);
      return successResponse(res, result, 'Credenciales SUNAT guardadas y cifradas exitosamente.');
    } catch (err: any) {
      return errorResponse(res, err.message);
    }
  },

  async obtenerEstadoConexion(req: Request, res: Response) {
    try {
      const empresaId = req.params.id;
      const estado = await sireService.obtenerEstadoConexion(empresaId);
      return successResponse(res, estado);
    } catch (err: any) {
      return errorResponse(res, err.message);
    }
  },

  async validarConexion(req: Request, res: Response) {
    try {
      const empresaId = req.params.id;
      empresaDemoService.validarOperacionOficialPermitida(empresaId, 'SOL_CONEXION');
      const userId = (req as any).user?.id || '00000000-0000-0000-0000-000000000001';
      const resultado = await sireService.validarConexion(empresaId, userId);
      return successResponse(res, resultado);
    } catch (err: any) {
      return errorResponse(res, err.message);
    }
  },

  // 2. SIRE (DESCARGA Y PROPUESTAS)
  async descargarPropuesta(req: Request, res: Response) {
    try {
      const empresaId = req.params.id;
      empresaDemoService.validarOperacionOficialPermitida(empresaId, 'SIRE_ENVIO');
      const data = descargarSireSchema.parse(req.body);
      const tipoTrabajo = data.tipo === 'COMPRAS' ? 'DESCARGA_SIRE_COMPRAS' : 'DESCARGA_SIRE_VENTAS';
      const job = sunatJobsService.crearJob(empresaId, tipoTrabajo, { periodo: data.periodo });
      return successResponse(res, { jobId: job.id, estado: job.estado }, 'Trabajo de descarga SIRE encolado', 202);
    } catch (err: any) {
      return errorResponse(res, err.message);
    }
  },

  async consultarJob(req: Request, res: Response) {
    try {
      const jobId = req.params.id;
      const job = sunatJobsService.obtenerJob(jobId);
      if (!job) return errorResponse(res, 'JOB_NO_ENCONTRADO: El trabajo solicitado no existe.', 404);
      return successResponse(res, job);
    } catch (err: any) {
      return errorResponse(res, err.message);
    }
  },

  // 3. CONCILIACIÓN SIRE
  async obtenerConciliacion(req: Request, res: Response) {
    try {
      const empresaId = req.params.id;
      const tipo = (req.query.tipo as any) || 'COMPRAS';
      const periodo = (req.query.periodo as string) || '2026-09';
      const tolerancia = req.query.tolerancia ? parseFloat(req.query.tolerancia as string) : 0.05;

      const resultado = await conciliadorSireService.conciliarPeriodo(empresaId, tipo, periodo, { toleranciaImporte: tolerancia });
      return successResponse(res, resultado);
    } catch (err: any) {
      return errorResponse(res, err.message);
    }
  },

  async aplicarConciliacion(req: Request, res: Response) {
    try {
      const empresaId = req.params.id;
      const data = aplicarConciliacionSchema.parse(req.body);
      const userId = (req as any).user?.id || '00000000-0000-0000-0000-000000000001';

      const resultado = await conciliadorSireService.procesarLote(
        empresaId,
        data.accion,
        data.lineasIds,
        data.motivo,
        userId
      );
      return successResponse(res, resultado);
    } catch (err: any) {
      return errorResponse(res, err.message);
    }
  },

  // 4. IMPORTACIÓN XML / CDR
  async importarXml(req: Request, res: Response) {
    try {
      const empresaId = req.params.id;
      const data = importarXmlSchema.parse(req.body);
      const userId = (req as any).user?.id || '00000000-0000-0000-0000-000000000001';

      const archivos = data.archivos.map(a => ({
        nombre: a.nombre,
        buffer: Buffer.from(a.contenidoBase64, 'base64')
      }));

      const resultado = await xmlImportService.importarLote(empresaId, archivos, userId);
      return successResponse(res, resultado);
    } catch (err: any) {
      return errorResponse(res, err.message);
    }
  },

  async listarComprobantesXml(req: Request, res: Response) {
    try {
      const empresaId = req.params.id;
      const items = await xmlImportService.listarComprobantesXml(empresaId);
      return successResponse(res, items);
    } catch (err: any) {
      return errorResponse(res, err.message);
    }
  },

  // 5. LIBROS ELECTRÓNICOS PLE
  async listarLibrosPle(req: Request, res: Response) {
    try {
      const libros = pleExportService.listarLibrosConfig();
      return successResponse(res, libros);
    } catch (err: any) {
      return errorResponse(res, err.message);
    }
  },

  async exportarPle(req: Request, res: Response) {
    try {
      const empresaId = req.params.id;
      empresaDemoService.validarOperacionOficialPermitida(empresaId, 'PLE_ENVIO');
      const data = exportarPleSchema.parse(req.body);
      const userId = (req as any).user?.id || '00000000-0000-0000-0000-000000000001';

      const job = sunatJobsService.crearJob(empresaId, 'GENERACION_PLE', {
        periodo: data.periodo,
        codigoLibro: data.codigoLibro,
        ruc: data.ruc
      });

      return successResponse(res, { jobId: job.id, estado: job.estado }, 'Generación de archivo PLE encolada.', 202);
    } catch (err: any) {
      return errorResponse(res, err.message);
    }
  },

  async obtenerExportacionPle(req: Request, res: Response) {
    try {
      const id = req.params.id;
      const exportacion = pleExportService.obtenerExportacion(id);
      if (!exportacion) return errorResponse(res, 'EXPORTACION_NO_ENCONTRADA', 404);
      return successResponse(res, exportacion);
    } catch (err: any) {
      return errorResponse(res, err.message);
    }
  },

  // 6. REGLAS DE PROVEEDOR SIRE (FASE 9.2)
  async guardarReglaProveedor(req: Request, res: Response) {
    try {
      const empresaId = req.params.id;
      const data = guardarReglaProveedorSchema.parse(req.body);
      const resultado = await conciliadorSireService.guardarReglaProveedor(empresaId, {
        empresaId,
        proveedorRuc: data.proveedorRuc,
        proveedorRazonSocial: data.proveedorRazonSocial,
        destinoCompra: data.destinoCompra,
        cuentaGasto: data.cuentaGasto,
        centroCostoId: data.centroCostoId,
        formaPagoDefault: 'CONTADO',
        aprobacionAutomatica: true
      });
      return successResponse(res, resultado, 'Regla de contabilización por proveedor guardada exitosamente.');
    } catch (err: any) {
      return errorResponse(res, err.message);
    }
  },

  async listarReglasProveedor(req: Request, res: Response) {
    try {
      const empresaId = req.params.id;
      const reglas = conciliadorSireService.listarReglasProveedor(empresaId);
      return successResponse(res, reglas);
    } catch (err: any) {
      return errorResponse(res, err.message);
    }
  },

  // 7. CIERRE OFICIAL SIRE Y AJUSTES POSTERIORES (FASE 9.3)
  async aceptarPropuestaOficial(req: Request, res: Response) {
    try {
      const empresaId = req.params.id;
      empresaDemoService.validarOperacionOficialPermitida(empresaId, 'SIRE_ENVIO');
      const data = aceptarPropuestaOficialSchema.parse(req.body);
      const userId = (req as any).user?.id || '00000000-0000-0000-0000-000000000001';
      const resultado = await conciliadorSireService.aceptarPropuestaSireOficial(empresaId, data.tipo, data.periodo, userId);
      return successResponse(res, resultado, 'Propuesta oficial SIRE aceptada ante SUNAT.');
    } catch (err: any) {
      return errorResponse(res, err.message);
    }
  },

  async reemplazarPropuestaOficial(req: Request, res: Response) {
    try {
      const empresaId = req.params.id;
      empresaDemoService.validarOperacionOficialPermitida(empresaId, 'SIRE_ENVIO');
      const data = reemplazarPropuestaOficialSchema.parse(req.body);
      const userId = (req as any).user?.id || '00000000-0000-0000-0000-000000000001';
      const resultado = await conciliadorSireService.reemplazarPropuestaSireOficial(
        empresaId,
        data.tipo,
        data.periodo,
        data.comprobantesReemplazo,
        userId
      );
      return successResponse(res, resultado, 'Propuesta oficial SIRE reemplazada exitosamente.');
    } catch (err: any) {
      return errorResponse(res, err.message);
    }
  },

  async registrarAjustePosterior(req: Request, res: Response) {
    try {
      const empresaId = req.params.id;
      const data = ajustePosteriorSchema.parse(req.body);
      const userId = (req as any).user?.id || '00000000-0000-0000-0000-000000000001';
      const resultado = await conciliadorSireService.registrarAjustePosterior(
        empresaId,
        data.periodoAjuste,
        data.periodoAfectado,
        data.ajusteData,
        userId
      );
      return successResponse(res, resultado, 'Ajuste posterior SIRE registrado.');
    } catch (err: any) {
      return errorResponse(res, err.message);
    }
  },

  async revertirAceptacionLinea(req: Request, res: Response) {
    try {
      const empresaId = req.params.id;
      const lineaId = req.params.lineaId;
      const data = revertirLineaSchema.parse(req.body);
      const userId = (req as any).user?.id || '00000000-0000-0000-0000-000000000001';
      const resultado = await conciliadorSireService.revertirAceptacionPropuesta(
        empresaId,
        lineaId,
        data.motivo,
        userId
      );
      return successResponse(res, resultado);
    } catch (err: any) {
      return errorResponse(res, err.message);
    }
  }
};
