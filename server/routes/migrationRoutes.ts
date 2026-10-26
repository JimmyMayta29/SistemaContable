import { Router } from 'express';
import { migrationController } from '../controllers/migrationController';
import { requireAuth, requireRol } from '../middlewares/auth';

const router = Router();

router.use(requireAuth);

router.post('/localstorage', requireRol(['ADMINISTRADOR']), migrationController.migrar);

export const migrationRoutes = router;
