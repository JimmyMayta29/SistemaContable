import { Router } from 'express';
import { backupEmpresaController } from '../controllers/backupEmpresaController';
import { requireAuth, requireEmpresaMembership } from '../middlewares/auth';

export const backupEmpresaRoutes = Router();

backupEmpresaRoutes.use(requireAuth);

backupEmpresaRoutes.get(
  '/empresas/:empresaId/backups',
  requireEmpresaMembership(),
  backupEmpresaController.listar
);

backupEmpresaRoutes.post(
  '/empresas/:empresaId/backups/generar',
  requireEmpresaMembership(['ADMIN_ESTUDIO', 'CONTADOR']),
  backupEmpresaController.generar
);

backupEmpresaRoutes.post(
  '/empresas/:empresaId/backups/auto-check',
  requireEmpresaMembership(),
  backupEmpresaController.autoCheck
);

backupEmpresaRoutes.get(
  '/empresas/:empresaId/backups/:backupId/descargar',
  requireEmpresaMembership(),
  backupEmpresaController.descargar
);

backupEmpresaRoutes.post(
  '/empresas/:empresaId/backups/verificar',
  requireEmpresaMembership(),
  backupEmpresaController.verificar
);

backupEmpresaRoutes.post(
  '/empresas/:empresaId/backups/restaurar',
  requireEmpresaMembership(['ADMIN_ESTUDIO']),
  backupEmpresaController.restaurar
);
