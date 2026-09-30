import { Router } from 'express';
import { empresaRoutes } from './empresaRoutes';
import { parametroRoutes } from './parametroRoutes';
import { migrationRoutes } from './migrationRoutes';
import { asientoRoutes } from './asientoRoutes';
import { operacionesRoutes } from './operacionesRoutes';
import { tesoreriaPlanillaRoutes } from './tesoreriaPlanillaRoutes';
import { db } from '../config/database';

const router = Router();

router.get('/health', (req, res) => {
  res.json({
    status: 'UP',
    database: db.isPostgresConnected() ? 'POSTGRESQL_CONNECTED' : 'IN_MEMORY_FALLBACK',
    environment: process.env.NODE_ENV || 'development',
    version: '1.4.0-fase4',
    timestamp: new Date().toISOString()
  });
});

router.use('/empresas', empresaRoutes);
router.use('/parametros', parametroRoutes);
router.use('/migration', migrationRoutes);
router.use('/', asientoRoutes);
router.use('/', operacionesRoutes);
router.use('/', tesoreriaPlanillaRoutes);

export const apiRoutes = router;
