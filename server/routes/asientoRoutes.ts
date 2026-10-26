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
import { requireDocumentoEmpresa } from '../middlewares/empresaGuard';
import { asientoService } from '../services/asientoService';
import { db } from '../config/database';
import { PERIODOS_MEMORIA } from '../services/periodoService';

const router = Router();

router.use(requireAuth);
router.use('/asientos/:id', requireDocumentoEmpresa(id => asientoService.obtenerPorId(id)));
router.use('/periodos/:id', requireDocumentoEmpresa(async (id, empresaId) => {
  if (db.isPostgresConnected()) return (await db.query('SELECT id, empresa_id FROM periodos WHERE id = $1 AND empresa_id = $2', [id, empresaId])).rows[0];
  return PERIODOS_MEMORIA.find(p => p.id === id && p.empresaId === empresaId);
}));

// Rutas directas de asientos por ID
router.get('/asientos/:id', asientoController.obtener);
router.put('/asientos/:id', validateBody(asientoInputSchema), asientoController.actualizar);
router.post('/asientos/:id/contabilizar', requireEmpresaMembership(['ADMINISTRADOR', 'CONTADOR_SENIOR']), asientoController.contabilizar);
router.post('/asientos/:id/anular', requireEmpresaMembership(['ADMINISTRADOR', 'CONTADOR_SENIOR']), validateBody(anularAsientoSchema), asientoController.anular);
router.post('/asientos/:id/duplicar', asientoController.duplicar);

// Rutas de períodos por ID
router.post('/periodos/:id/cerrar', requireEmpresaMembership(['ADMINISTRADOR', 'CONTADOR_SENIOR']), asientoController.cerrarPeriodo);
router.post('/periodos/:id/reabrir', requireEmpresaMembership(['ADMINISTRADOR']), validateBody(reabrirPeriodoSchema), asientoController.reabrirPeriodo);

// Rutas contextuales a la empresa (/empresas/:id/...)
router.get('/empresas/:id/asientos', requireEmpresaMembership(), asientoController.listar);
router.post('/empresas/:id/asientos', requireEmpresaMembership(['ADMINISTRADOR', 'CONTADOR_SENIOR', 'ASISTENTE_CONTABLE']), validateBody(asientoInputSchema), asientoController.crear);
router.post('/empresas/:id/contabilizacion/previsualizar', requireEmpresaMembership(), validateBody(previsualizarSchema), asientoController.previsualizar);
router.get('/empresas/:id/periodos', requireEmpresaMembership(), asientoController.listarPeriodos);
router.get('/empresas/:id/auditoria', requireEmpresaMembership(['ADMINISTRADOR', 'CONTADOR_SENIOR', 'AUDITOR_REVISOR']), asientoController.listarAuditoria);
router.get('/empresas/:id/libro-diario', requireEmpresaMembership(), asientoController.obtenerLibroDiario);
router.get('/empresas/:id/libro-mayor', requireEmpresaMembership(), asientoController.obtenerLibroMayor);
router.get('/empresas/:id/balance-comprobacion', requireEmpresaMembership(), asientoController.obtenerBalanceComprobacion);
router.get('/empresas/:id/estado-situacion-financiera', requireEmpresaMembership(), asientoController.obtenerEstadoSituacionFinanciera);
router.get('/empresas/:id/estado-resultados', requireEmpresaMembership(), asientoController.obtenerEstadoResultados);
router.get('/empresas/:id/flujo-efectivo', requireEmpresaMembership(), asientoController.obtenerFlujoEfectivo);
router.get('/empresas/:id/ratios-financieros', requireEmpresaMembership(), asientoController.obtenerRatiosFinancieros);
router.post('/empresas/:id/reconstruir-saldos', requireEmpresaMembership(['ADMINISTRADOR', 'CONTADOR_SENIOR']), asientoController.reconstruirSaldos);
router.get('/empresas/:id/verificar-saldos', requireEmpresaMembership(), asientoController.verificarSaldos);

// Reportes Oficiales Especializados (Fase 7C-2 / ESTANDAR)
router.get('/empresas/:id/reportes/hoja-trabajo-10-columnas', requireEmpresaMembership(), asientoController.obtenerHojaTrabajo10Columnas);
router.get('/empresas/:id/hoja-trabajo-10-columnas', requireEmpresaMembership(), asientoController.obtenerHojaTrabajo10Columnas);
router.get('/empresas/:id/reportes/libro-diario-estructurado', requireEmpresaMembership(), asientoController.obtenerLibroDiarioESTANDAR);
router.get('/empresas/:id/libro-diario-estandar', requireEmpresaMembership(), asientoController.obtenerLibroDiarioESTANDAR);
router.get('/empresas/:id/reportes/ple-5-1-diario', requireEmpresaMembership(), asientoController.descargarPle51Diario);

export const asientoRoutes = router;
