import { Router } from 'express';
import { parametroController } from '../controllers/parametroController';
import { requireAuth } from '../middlewares/auth';

const router = Router();

router.use(requireAuth);

router.get('/', parametroController.listar);
router.get('/cronograma', parametroController.obtenerCronograma);

export const parametroRoutes = router;
