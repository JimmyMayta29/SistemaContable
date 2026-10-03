import { Router, Request, Response } from 'express';
import { auditoriaTributariaService } from '../services/auditoriaTributariaService';
import { daotService } from '../services/daotService';
import { cierreAnualService } from '../services/cierreAnualService';
import { djRentaAnualService } from '../services/djRentaAnualService';
import { successResponse, errorResponse } from '../utils/response';

export const tributarioAnualRoutes = Router();

// ============================================================================
// AUDITORÍA PREVENTIVA & DETECCIÓN DE DISCREPANCIAS SUNAT
// ============================================================================
tributarioAnualRoutes.get('/empresas/:empresaId/auditoria/preventiva', async (req: Request, res: Response) => {
  try {
    const { empresaId } = req.params;
    const anio = parseInt((req.query.anio as string) || '2026', 10);
    const diagnostico = await auditoriaTributariaService.ejecutarDiagnostico(empresaId, anio);
    return successResponse(res, diagnostico);
  } catch (err: any) {
    return errorResponse(res, err.message, 500);
  }
});

// ============================================================================
// DAOT - DECLARACIÓN ANUAL DE OPERACIONES CON TERCEROS (FV 3500)
// ============================================================================
tributarioAnualRoutes.get('/empresas/:empresaId/daot/resumen', async (req: Request, res: Response) => {
  try {
    const { empresaId } = req.params;
    const anio = parseInt((req.query.anio as string) || '2026', 10);
    const resultado = await daotService.procesarDaot(empresaId, anio);
    return successResponse(res, resultado);
  } catch (err: any) {
    return errorResponse(res, err.message, 500);
  }
});

tributarioAnualRoutes.get('/empresas/:empresaId/daot/exportar-txt', async (req: Request, res: Response) => {
  try {
    const { empresaId } = req.params;
    const anio = parseInt((req.query.anio as string) || '2026', 10);
    const resultado = await daotService.procesarDaot(empresaId, anio);

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${resultado.nombreArchivoTxt}"`);
    res.send(resultado.txtGenerado || '');
  } catch (err: any) {
    return errorResponse(res, err.message, 500);
  }
});

// ============================================================================
// CIERRE ANUAL CONTABLE PCGE (CUENTAS 80-89 Y BALANCE)
// ============================================================================
tributarioAnualRoutes.post('/empresas/:empresaId/cierre-anual/simular', async (req: Request, res: Response) => {
  try {
    const { empresaId } = req.params;
    const anio = parseInt((req.body.anio as string) || '2026', 10);
    const propuesta = await cierreAnualService.simularCierreAnual(empresaId, anio);
    return successResponse(res, propuesta);
  } catch (err: any) {
    return errorResponse(res, err.message, 500);
  }
});

tributarioAnualRoutes.post('/empresas/:empresaId/cierre-anual/ejecutar', async (req: Request, res: Response) => {
  try {
    const { empresaId } = req.params;
    const anio = parseInt((req.body.anio as string) || '2026', 10);
    const resultado = await cierreAnualService.ejecutarCierreAnual(empresaId, anio);
    return successResponse(res, resultado);
  } catch (err: any) {
    return errorResponse(res, err.message, 500);
  }
});

tributarioAnualRoutes.post('/empresas/:empresaId/cierre-anual/revertir', async (req: Request, res: Response) => {
  try {
    const { empresaId } = req.params;
    const anio = parseInt((req.body.anio as string) || '2026', 10);
    const resultado = await cierreAnualService.revertirCierreAnual(empresaId, anio);
    return successResponse(res, resultado);
  } catch (err: any) {
    return errorResponse(res, err.message, 500);
  }
});

// ============================================================================
// DJ ANUAL RENTA TERCERA CATEGORÍA (FV 710)
// ============================================================================
tributarioAnualRoutes.post('/empresas/:empresaId/dj-anual/calcular', async (req: Request, res: Response) => {
  try {
    const { empresaId } = req.params;
    const anio = parseInt((req.body.anio as string) || '2026', 10);
    const calculo = await djRentaAnualService.calcularDjAnual(empresaId, anio, req.body);
    return successResponse(res, calculo);
  } catch (err: any) {
    return errorResponse(res, err.message, 500);
  }
});
