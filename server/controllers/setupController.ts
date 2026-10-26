import { Request, Response } from 'express';
import { setupService } from '../services/setupService';
import { successResponse, errorResponse } from '../utils/response';

export const setupController = {
  async obtenerEstado(req: Request, res: Response) {
    try {
      return successResponse(res, await setupService.obtenerEstadoSetup());
    } catch {
      return errorResponse(res, 'No se pudo consultar la configuración del estudio.', 500);
    }
  },

  async generarMfa(req: Request, res: Response) {
    try {
      return successResponse(res, setupService.generarMfaSecret((req.query.email as string) || 'admin@estudio.pe'));
    } catch {
      return errorResponse(res, 'Ingrese un correo válido para configurar la autenticación.', 400);
    }
  },

  async inicializar(req: Request, res: Response) {
    try {
      const resultado = await setupService.inicializarEstudio(req.body);
      return successResponse(res, resultado, 'Estudio contable configurado exitosamente.', 201);
    } catch (err: any) {
      const status = err.message.includes('SISTEMA_YA_CONFIGURADO') ? 409 : 400;
      return errorResponse(res, err.message, status);
    }
  }
};
