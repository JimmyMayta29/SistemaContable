import { Router } from 'express';
import { 
  operacionesController, 
  compraSchema, 
  ventaSchema, 
  notaSchema,
  anularSchema,
  depositoDetraccionSchema,
  aplicacionPagoSchema,
  aplicacionCobranzaSchema,
  previsualizarAsientoSchema,
  anexoSchema,
  importarLoteSchema
} from '../controllers/operacionesController';
import { requireAuth, requireEmpresaMembership } from '../middlewares/auth';
import { validateBody } from '../middlewares/validate';

const router = Router();

router.use(requireAuth);

// --------------------------------------------------------------------------
// COMPRAS (RCE)
// --------------------------------------------------------------------------
router.get('/empresas/:id/compras', requireEmpresaMembership(), operacionesController.listarCompras);
router.post('/empresas/:id/compras', requireEmpresaMembership(['ADMIN_ESTUDIO', 'CONTADOR', 'ASISTENTE']), validateBody(compraSchema), operacionesController.crearCompra);
router.post('/empresas/:id/compras/importar-lote', requireEmpresaMembership(['ADMIN_ESTUDIO', 'CONTADOR']), validateBody(importarLoteSchema), operacionesController.importarLoteCompras);
router.get('/empresas/:id/registro-compras', requireEmpresaMembership(), operacionesController.obtenerRegistroCompras);

router.get('/compras/:id', operacionesController.obtenerCompra);
router.put('/compras/:id', validateBody(compraSchema.partial()), operacionesController.actualizarCompra);
router.delete('/compras/:id', operacionesController.eliminarCompra);
router.post('/compras/:id/registrar', operacionesController.registrarBorradorCompra);
router.post('/compras/:id/anular', validateBody(anularSchema), operacionesController.anularCompra);
router.post('/compras/:id/duplicar', operacionesController.duplicarCompra);

// --------------------------------------------------------------------------
// VENTAS (RVIE)
// --------------------------------------------------------------------------
router.get('/empresas/:id/ventas', requireEmpresaMembership(), operacionesController.listarVentas);
router.post('/empresas/:id/ventas', requireEmpresaMembership(['ADMIN_ESTUDIO', 'CONTADOR', 'ASISTENTE']), validateBody(ventaSchema), operacionesController.crearVenta);
router.post('/empresas/:id/ventas/importar-lote', requireEmpresaMembership(['ADMIN_ESTUDIO', 'CONTADOR']), validateBody(importarLoteSchema), operacionesController.importarLoteVentas);
router.get('/empresas/:id/registro-ventas', requireEmpresaMembership(), operacionesController.obtenerRegistroVentas);

router.get('/ventas/:id', operacionesController.obtenerVenta);
router.put('/ventas/:id', validateBody(ventaSchema.partial()), operacionesController.actualizarVenta);
router.delete('/ventas/:id', operacionesController.eliminarVenta);
router.post('/ventas/:id/registrar', operacionesController.registrarBorradorVenta);
router.post('/ventas/:id/anular', validateBody(anularSchema), operacionesController.anularVenta);
router.post('/ventas/:id/duplicar', operacionesController.duplicarVenta);

// --------------------------------------------------------------------------
// PREVISUALIZACIÓN CONTABLE
// --------------------------------------------------------------------------
router.post('/empresas/:id/contabilizacion/previsualizar', requireEmpresaMembership(), validateBody(previsualizarAsientoSchema), operacionesController.previsualizarAsiento);

// --------------------------------------------------------------------------
// NOTAS DE CRÉDITO Y DÉBITO
// --------------------------------------------------------------------------
router.post('/comprobantes/:id/nota-credito', validateBody(notaSchema), operacionesController.aplicarNota);
router.post('/comprobantes/:id/nota-debito', validateBody(notaSchema), operacionesController.aplicarNota);
router.post('/notas/:id/anular', validateBody(anularSchema), operacionesController.anularNota);

// --------------------------------------------------------------------------
// CARTERA CxP / CxC, SALDOS Y ESTADOS DE CUENTA
// --------------------------------------------------------------------------
router.get('/empresas/:id/cuentas-por-pagar', requireEmpresaMembership(), operacionesController.listarCxP);
router.get('/empresas/:id/cuentas-por-cobrar', requireEmpresaMembership(), operacionesController.listarCxC);
router.get('/empresas/:id/antiguedad-de-saldos', requireEmpresaMembership(), operacionesController.reporteAntiguedad);
router.get('/empresas/:id/antiguedad-saldos', requireEmpresaMembership(), operacionesController.reporteAntiguedad); // Alias
router.get('/empresas/:id/estado-de-cuenta/:anexoId', requireEmpresaMembership(), operacionesController.obtenerEstadoCuenta);

router.post('/empresas/:id/aplicaciones-pago', requireEmpresaMembership(['ADMIN_ESTUDIO', 'CONTADOR', 'ASISTENTE']), validateBody(aplicacionPagoSchema), operacionesController.aplicarPago);
router.post('/empresas/:id/aplicaciones-cobranza', requireEmpresaMembership(['ADMIN_ESTUDIO', 'CONTADOR', 'ASISTENTE']), validateBody(aplicacionCobranzaSchema), operacionesController.aplicarCobranza);

// --------------------------------------------------------------------------
// ANEXOS (ALTA RÁPIDA & BÚSQUEDA)
// --------------------------------------------------------------------------
router.get('/empresas/:id/anexos', requireEmpresaMembership(), operacionesController.listarAnexos);
router.post('/empresas/:id/anexos', requireEmpresaMembership(['ADMIN_ESTUDIO', 'CONTADOR', 'ASISTENTE']), validateBody(anexoSchema), operacionesController.crearAnexo);

// --------------------------------------------------------------------------
// DETRACCIONES SPOT
// --------------------------------------------------------------------------
router.get('/empresas/:id/detracciones', requireEmpresaMembership(), operacionesController.listarDetraccionesPendientes);
router.post('/detracciones/:id/deposito', validateBody(depositoDetraccionSchema), operacionesController.registrarDepositoDetraccion);

// --------------------------------------------------------------------------
// LIQUIDACIÓN PREVENTIVA IGV Y RENTA
// --------------------------------------------------------------------------
router.get('/empresas/:id/liquidacion-igv', requireEmpresaMembership(), operacionesController.liquidarIGV);

// --------------------------------------------------------------------------
// CONSULTA RUC EN TIEMPO REAL SUNAT (HÍBRIDO POSTGRESQL + SUNAT)
// --------------------------------------------------------------------------
router.get('/empresas/:id/sunat/consulta-ruc/:ruc', requireEmpresaMembership(), operacionesController.consultarRucSunat);

export const operacionesRoutes = router;
