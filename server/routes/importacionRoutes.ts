import { Router } from 'express';
import { importacionController } from '../controllers/importacionController';
import { requireAuth, requireEmpresaMembership } from '../middlewares/auth';

export const importacionRoutes = Router();

// Descarga de plantilla CSV (público / autenticado)
importacionRoutes.get('/plantillas/:tipo', importacionController.descargarPlantilla);

// Operaciones de importación por empresa
importacionRoutes.post(
  '/empresas/:empresaId/analizar',
  requireAuth,
  requireEmpresaMembership(),
  importacionController.analizar
);

importacionRoutes.post(
  '/empresas/:empresaId/confirmar',
  requireAuth,
  requireEmpresaMembership(['ADMIN_ESTUDIO', 'CONTADOR']),
  importacionController.confirmar
);

importacionRoutes.post(
  '/empresas/:empresaId/deshacer/:loteId',
  requireAuth,
  requireEmpresaMembership(['ADMIN_ESTUDIO', 'CONTADOR']),
  importacionController.deshacer
);

importacionRoutes.get(
  '/empresas/:empresaId/historial',
  requireAuth,
  requireEmpresaMembership(),
  importacionController.listarHistorial
);
