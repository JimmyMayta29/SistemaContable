import { Router } from 'express';
import { migrationController } from '../controllers/migrationController';
import { requireAuth } from '../middlewares/auth';

const router = Router();

router.use(requireAuth);

router.post('/localstorage', migrationController.migrar);

export const migrationRoutes = router;
