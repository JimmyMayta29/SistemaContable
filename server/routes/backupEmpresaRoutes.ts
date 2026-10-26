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
  requireEmpresaMembership(['ADMINISTRADOR']),
  backupEmpresaController.generar
);

backupEmpresaRoutes.post(
  '/empresas/:empresaId/backups/auto-check',
  requireEmpresaMembership(['ADMINISTRADOR']),
  backupEmpresaController.autoCheck
);

backupEmpresaRoutes.get(
  '/empresas/:empresaId/backups/:backupId/descargar',
  requireEmpresaMembership(),
  backupEmpresaController.descargar
);

backupEmpresaRoutes.post(
  '/empresas/:empresaId/backups/verificar',
  requireEmpresaMembership(['ADMINISTRADOR']),
  backupEmpresaController.verificar
);

backupEmpresaRoutes.post(
  '/empresas/:empresaId/backups/restaurar',
  requireEmpresaMembership(['ADMINISTRADOR']),
  backupEmpresaController.restaurar
);
