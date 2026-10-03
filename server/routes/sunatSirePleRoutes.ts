import { Router } from 'express';
import { sunatSirePleController } from '../controllers/sunatSirePleController';

const router = Router();

// Conexión y credenciales SUNAT
router.put('/empresas/:id/sunat/conexion', sunatSirePleController.guardarConexion);
router.get('/empresas/:id/sunat/conexion/estado', sunatSirePleController.obtenerEstadoConexion);
router.post('/empresas/:id/sunat/conexion/validar', sunatSirePleController.validarConexion);

// Descarga de propuestas SIRE y seguimiento de cola asíncrona
router.post('/empresas/:id/sire/descargar', sunatSirePleController.descargarPropuesta);
router.get('/sunat-jobs/:id', sunatSirePleController.consultarJob);

// Conciliador SIRE (Cruce vs registros ERP)
router.get('/empresas/:id/sire/conciliacion', sunatSirePleController.obtenerConciliacion);
router.post('/empresas/:id/sire/conciliacion/aplicar', sunatSirePleController.aplicarConciliacion);
router.post('/empresas/:id/sire/lineas/:lineaId/revertir', sunatSirePleController.revertirAceptacionLinea);

// Reglas de Contabilización Automática por Proveedor (Fase 9.2)
router.post('/empresas/:id/sire/reglas-proveedor', sunatSirePleController.guardarReglaProveedor);
router.get('/empresas/:id/sire/reglas-proveedor', sunatSirePleController.listarReglasProveedor);

// Cierre Oficial del Ciclo SIRE y Ajustes Posteriores (Fase 9.3)
router.post('/empresas/:id/sire/aceptar-oficial', sunatSirePleController.aceptarPropuestaOficial);
router.post('/empresas/:id/sire/reemplazar-oficial', sunatSirePleController.reemplazarPropuestaOficial);
router.post('/empresas/:id/sire/ajustes-posteriores', sunatSirePleController.registrarAjustePosterior);

// Importación de comprobantes XML UBL y CDR
router.post('/empresas/:id/comprobantes-xml/importar', sunatSirePleController.importarXml);
router.get('/empresas/:id/comprobantes-xml', sunatSirePleController.listarComprobantesXml);

// Libros Electrónicos PLE 5.2
router.get('/empresas/:id/ple/libros', sunatSirePleController.listarLibrosPle);
router.post('/empresas/:id/ple/exportar', sunatSirePleController.exportarPle);
router.get('/ple-exportaciones/:id', sunatSirePleController.obtenerExportacionPle);

export const sunatSirePleRoutes = router;
