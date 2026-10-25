import { Router } from 'express';
import { empresaRoutes } from './empresaRoutes';
import { parametroRoutes } from './parametroRoutes';
import { migrationRoutes } from './migrationRoutes';
import { asientoRoutes } from './asientoRoutes';
import { operacionesRoutes } from './operacionesRoutes';
import { tesoreriaPlanillaRoutes } from './tesoreriaPlanillaRoutes';
import { sunatSirePleRoutes } from './sunatSirePleRoutes';
import { tributarioAnualRoutes } from './tributarioAnualRoutes';
import { activosKardexRoutes } from './activosKardexRoutes';
import { sistemaAuditRoutes } from './sistemaAuditRoutes';
import { authRoutes } from './authRoutes';
import { setupRoutes } from './setupRoutes';
import { importacionRoutes } from './importacionRoutes';
import { backupEmpresaRoutes } from './backupEmpresaRoutes';
import { requireAuth } from '../middlewares/auth';
import { empresaGuard } from '../middlewares/empresaGuard';
import { db } from '../config/database';

const router = Router();

router.get('/health', (req, res) => {
  res.json({
    status: 'UP',
    database: db.isPostgresConnected() ? 'POSTGRESQL_CONNECTED' : 'IN_MEMORY_FALLBACK',
    environment: process.env.NODE_ENV || 'development',
    version: '1.7.0-fase7',
    timestamp: new Date().toISOString()
  });
});

// Guard de acceso por empresa para rutas /e/:empresaId/...
router.get('/e/:empresaId/verificar-acceso', requireAuth, empresaGuard(), (req, res) => {
  res.json({
    permitida: true,
    empresaId: req.empresaId,
    rolEnEmpresa: req.userRolEnEmpresa,
    usuarioId: req.user?.id
  });
});

router.use('/auth', authRoutes);
router.use('/setup', setupRoutes);
router.use('/importacion', importacionRoutes);
router.use('/', backupEmpresaRoutes);
router.use('/empresas', empresaRoutes);
router.use('/parametros', parametroRoutes);
router.use('/migration', migrationRoutes);
router.use('/', asientoRoutes);
router.use('/', operacionesRoutes);
router.use('/', tesoreriaPlanillaRoutes);
router.use('/', sunatSirePleRoutes);
router.use('/', tributarioAnualRoutes);
router.use('/', activosKardexRoutes);
router.use('/', sistemaAuditRoutes);

export const apiRoutes = router;
