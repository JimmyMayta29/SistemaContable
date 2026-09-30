import { Router } from 'express';
import { empresaController, crearEmpresaSchema, credencialesSunatSchema } from '../controllers/empresaController';
import { requireAuth, requireEmpresaMembership } from '../middlewares/auth';
import { validateBody } from '../middlewares/validate';

const router = Router();

router.use(requireAuth);

router.get('/', empresaController.listar);
router.get('/:id', empresaController.obtener);
router.post('/', validateBody(crearEmpresaSchema), empresaController.crear);

router.post(
  '/:id/credenciales-sunat',
  requireEmpresaMembership(['ADMIN_ESTUDIO', 'CONTADOR']),
  validateBody(credencialesSunatSchema),
  empresaController.actualizarCredencialesSunat
);

export const empresaRoutes = router;
