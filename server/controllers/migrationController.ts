import { Request, Response } from 'express';
import { migrationService } from '../services/migrationService';
import { successResponse, errorResponse } from '../utils/response';

export const migrationController = {
  async migrar(req: Request, res: Response) {
    try {
      const payload = req.body;
      const userId = req.user?.id || '00000000-0000-0000-0000-000000000001';
      const userEmail = req.user?.email || 'admin@sunaconta.pe';

      const reporte = await migrationService.migrarDesdeLocalStorage(
        payload,
        userId,
        userEmail,
        req.ip
      );

      return successResponse(res, reporte, 'Validación y migración de datos completada');
    } catch (error: any) {
      console.error('Error en migración:', error);
      return errorResponse(res, error.message || 'Error durante la migración de datos');
    }
  }
};
