import { Router } from 'express';
import { tesoreriaPlanillaController } from '../controllers/tesoreriaPlanillaController';

const router = Router();

// Cuentas Financieras
router.get('/empresas/:id/cuentas-financieras', tesoreriaPlanillaController.listarCuentas);
router.post('/empresas/:id/cuentas-financieras', tesoreriaPlanillaController.crearCuenta);

// Movimientos de Tesorería
router.get('/empresas/:id/movimientos-tesoreria', tesoreriaPlanillaController.listarMovimientos);
router.post('/empresas/:id/movimientos-tesoreria', tesoreriaPlanillaController.registrarMovimiento);
router.post('/empresas/:id/movimientos-tesoreria/:movimientoId/anular', tesoreriaPlanillaController.anularMovimiento);

// Transferencias
router.post('/empresas/:id/transferencias', tesoreriaPlanillaController.registrarTransferencia);

// Caja Chica
router.get('/empresas/:id/caja-chica', tesoreriaPlanillaController.listarCajasChicas);
router.post('/empresas/:id/caja-chica/apertura', tesoreriaPlanillaController.aperturaCajaChica);
router.post('/empresas/:id/caja-chica/reponer', tesoreriaPlanillaController.reponerCajaChica);

// Extractos y Conciliación Bancaria
router.post('/empresas/:id/extractos', tesoreriaPlanillaController.importarExtracto);
router.get('/empresas/:id/conciliaciones', tesoreriaPlanillaController.obtenerConciliacion);
router.post('/empresas/:id/conciliaciones/conciliar', tesoreriaPlanillaController.conciliarPartida);
router.post('/empresas/:id/conciliaciones/desconciliar', tesoreriaPlanillaController.desconciliarPartida);
router.post('/empresas/:id/conciliaciones/cerrar', tesoreriaPlanillaController.cerrarConciliacion);

// Recibos por Honorarios (4ta Categoría)
router.get('/empresas/:id/honorarios', tesoreriaPlanillaController.listarHonorarios);
router.post('/empresas/:id/honorarios', tesoreriaPlanillaController.registrarHonorario);
router.post('/empresas/:id/honorarios/:honorarioId/anular', tesoreriaPlanillaController.anularHonorario);

// Trabajadores (Nómina / T-Registro)
router.get('/empresas/:id/trabajadores', tesoreriaPlanillaController.listarTrabajadores);
router.post('/empresas/:id/trabajadores', tesoreriaPlanillaController.crearTrabajador);

// Planillas (PDT 0601 / PLAME)
router.post('/empresas/:id/planillas/calcular', tesoreriaPlanillaController.calcularPlanilla);
router.post('/empresas/:id/planillas/:planillaId/contabilizar', tesoreriaPlanillaController.contabilizarPlanilla);
router.post('/empresas/:id/planillas/:planillaId/anular', tesoreriaPlanillaController.anularPlanilla);
router.get('/empresas/:id/planillas/:planillaId/exportar-plame', tesoreriaPlanillaController.exportarPlame);

// Flujo de Caja
router.get('/empresas/:id/flujo-de-caja', tesoreriaPlanillaController.obtenerFlujoCaja);

export const tesoreriaPlanillaRoutes = router;
