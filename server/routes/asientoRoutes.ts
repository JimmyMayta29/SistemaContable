import { Router } from 'express';
import { 
  asientoController, 
  asientoInputSchema, 
  previsualizarSchema, 
  anularAsientoSchema,
  reabrirPeriodoSchema 
} from '../controllers/asientoController';
import { requireAuth, requireEmpresaMembership } from '../middlewares/auth';
import { validateBody } from '../middlewares/validate';

const router = Router();

router.use(requireAuth);

// Rutas directas de asientos por ID
router.get('/asientos/:id', asientoController.obtener);
router.put('/asientos/:id', validateBody(asientoInputSchema), asientoController.actualizar);
router.post('/asientos/:id/contabilizar', asientoController.contabilizar);
router.post('/asientos/:id/anular', validateBody(anularAsientoSchema), asientoController.anular);
router.post('/asientos/:id/duplicar', asientoController.duplicar);

// Rutas de períodos por ID
router.post('/periodos/:id/cerrar', asientoController.cerrarPeriodo);
router.post('/periodos/:id/reabrir', validateBody(reabrirPeriodoSchema), asientoController.reabrirPeriodo);

// Rutas contextuales a la empresa (/empresas/:id/...)
router.get('/empresas/:id/asientos', requireEmpresaMembership(), asientoController.listar);
router.post('/empresas/:id/asientos', requireEmpresaMembership(['ADMIN_ESTUDIO', 'CONTADOR', 'ASISTENTE']), validateBody(asientoInputSchema), asientoController.crear);
router.post('/empresas/:id/contabilizacion/previsualizar', requireEmpresaMembership(), validateBody(previsualizarSchema), asientoController.previsualizar);
router.get('/empresas/:id/periodos', requireEmpresaMembership(), asientoController.listarPeriodos);
router.get('/empresas/:id/auditoria', requireEmpresaMembership(['ADMIN_ESTUDIO', 'CONTADOR', 'AUDITOR']), asientoController.listarAuditoria);
router.get('/empresas/:id/libro-diario', requireEmpresaMembership(), asientoController.obtenerLibroDiario);

export const asientoRoutes = router;
