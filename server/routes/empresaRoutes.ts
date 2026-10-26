import { Router } from 'express';
import { empresaController, crearEmpresaSchema, credencialesSunatSchema } from '../controllers/empresaController';
import { requireAuth, requireEmpresaMembership, requireRol } from '../middlewares/auth';
import { validateBody } from '../middlewares/validate';

const router = Router();

router.use(requireAuth);

router.get('/', empresaController.listar);
router.post('/demo/restablecer', requireRol(['ADMINISTRADOR']), empresaController.restablecerDemo);
router.get('/:id', requireEmpresaMembership(), empresaController.obtener);
router.get('/:id/verificar-acceso', requireEmpresaMembership(), (req, res) => {
  res.json({
    permitida: true,
    empresaId: req.empresaId,
    rolEnEmpresa: req.userRolEnEmpresa,
    usuarioId: req.user?.id
  });
});
router.post('/', requireRol(['ADMINISTRADOR']), validateBody(crearEmpresaSchema), empresaController.crear);

router.post(
  '/:id/credenciales-sunat',
  requireEmpresaMembership(['ADMINISTRADOR', 'CONTADOR_SENIOR']),
  validateBody(credencialesSunatSchema),
  empresaController.actualizarCredencialesSunat
);

export const empresaRoutes = router;
