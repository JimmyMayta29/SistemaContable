import { Router, Request, Response } from 'express';
import { requireAuth, requireEmpresaMembership } from '../middlewares/auth';
import { db } from '../config/database';
import { auditoriaChainService } from '../services/auditoriaChainService';
import { asientoService } from '../services/asientoService';
import { compraService } from '../services/compraService';
import { ventaService } from '../services/ventaService';
import { anexoService } from '../services/anexoService';

const router = Router();

// Endpoint autenticado para obtener el mapa estructural del sistema
router.get('/auditoria/sistema/mapa', requireAuth, (req: Request, res: Response) => {
  const isPostgres = db.isPostgresConnected();

  const mapaSistema = {
    sistema: {
      nombre: 'SUNAConta PRO',
      version: '1.7.0-fase7-enterprise',
      descripcion: 'Sistema Contable, Financiero y Tributario Integral para MYPEs en el Perú con Cumplimiento SUNAT (SIRE, PLE, PDT 621)',
      estadoMotorDatos: isPostgres ? 'POSTGRESQL_ONLINE' : 'IN_MEMORY_RESILIENT',
      generadoEl: new Date().toISOString()
    },
    stack: {
      frontend: {
        framework: 'React 19.x (SPA)',
        lenguaje: 'TypeScript 5.x',
        bundler: 'Vite 6.x',
        estilos: 'Tailwind CSS v4 (Importación nativa)',
        iconografia: 'Lucide React',
        manejoEstadoServidor: 'TanStack React Query v5',
        notificaciones: 'Custom Animated Toast Context'
      },
      backend: {
        entorno: 'Node.js (LTS) / tsx',
        framework: 'Express 4.21.x',
        seguridad: 'CORS, Helmet, Rate Limiter, RBAC, Hasheo Criptográfico SHA-256',
        validacion: 'Zod Schemas en todas las rutas de mutación',
        autenticacion: 'JWT Bearer Tokens con revocación y caducidad'
      },
      persistencia: {
        motorPrincipal: 'Cloud SQL / PostgreSQL 15+',
        orm: 'Drizzle ORM con DDL tipado estricto',
        mecanismoFallback: 'Dual-Storage Resilient In-Memory Repository (Desarrollo y Tolerancia a Fallos)',
        aislamientoMultitenant: 'Clave foránea forzosa tenant_id y empresa_id en cada registro',
        integridadTransaccional: 'Transacciones ACID con commit/rollback atómico'
      },
      integracionesExternas: {
        sunatRuc: {
          tipo: 'Híbrido (API SUNAT Oficial + Validación Algorítmica Módulo 11 + Caché PostgreSQL)',
          estado: 'OPERATIVO'
        },
        sunatSire: {
          modulos: ['RCE (Compras Electrónicas)', 'RVIE (Ventas Electrónicas)'],
          formatosExportacion: ['TXT Delimitado por Pipes (|)', 'Estructura ZIP SUNAT'],
          conciliador: 'Conciliación automatizada de propuestas vs compras registradas con detección de discrepancias'
        },
        sunatPle: {
          librosSoportados: ['5.1 Libro Diario', '5.3 Libro Diario Simplificado', '6.1 Libro Mayor', '8.1 RCE Compras', '14.1 RVIE Ventas'],
          nomenclaturaOficial: 'LE + RUC + Periodo (YYYYMM) + 00 + IdentificadorLibro + Oportunidad + IndicadorOperaciones + IndicadorMoneda + IndicadorPLE.txt'
        },
        pdt621: {
          liquidaciones: 'Preliquidación mensual con desglose casilla por casilla (100, 107, 108, 113, IGV, Renta por Régimen, SPOT, Retenciones/Percepciones)'
        }
      }
    },
    topologiaModulos: [
      {
        modulo: 'Gestión Multitenant & Empresas',
        rutaUI: '/empresas / mis-empresas',
        endpoints: ['/api/empresas', '/api/empresas/:id', '/api/empresas/:id/periodos'],
        tablasAfectadas: ['tenants', 'empresas_clientes', 'periodos_tributarios', 'usuarios_empresas'],
        seguridad: 'Aislamiento estricto por empresaId verificado en middleware empresaGuard'
      },
      {
        modulo: 'Plan Contable & Asientos (Libro Diario / Mayor)',
        rutaUI: '/vouchers / diario / mayor / balance_comprobacion',
        endpoints: ['/api/empresas/:id/asientos', '/api/empresas/:id/libro-diario', '/api/empresas/:id/libro-mayor', '/api/empresas/:id/balance-comprobacion'],
        tablasAfectadas: ['asientos_cabecera', 'asientos_detalle', 'catalogo_cuentas_pcge', 'subdiarios'],
        seguridad: 'Validación estricta de cuadre (Debe = Haber). Asientos cerrados inmutables.'
      },
      {
        modulo: 'Compras (RCE) & Ventas (RVIE)',
        rutaUI: '/rce_compras / rvie_ventas',
        endpoints: ['/api/empresas/:id/comprobantes/compras', '/api/empresas/:id/comprobantes/ventas', '/api/sunat/consultar-ruc'],
        tablasAfectadas: ['comprobantes_compras', 'comprobantes_ventas', 'anexos'],
        seguridad: 'Validación RUC con Módulo 11 SUNAT, estado Habido/Activo, alertas tributarias sin bloqueo preventivo'
      },
      {
        modulo: 'Conciliador SIRE & Libros PLE',
        rutaUI: '/sire_smart / ple',
        endpoints: ['/api/empresas/:id/sire/conciliar', '/api/empresas/:id/sire/descargar-txt', '/api/empresas/:id/reportes/ple-5-1-diario'],
        tablasAfectadas: ['sire_propuestas', 'comprobantes_compras', 'comprobantes_ventas'],
        seguridad: 'Cumplimiento de resolución de superintendencia SUNAT para nombres de archivos y estructura de 35+ campos'
      },
      {
        modulo: 'Tesorería, Caja y Bancos',
        rutaUI: '/caja_bancos / cartera_saldos',
        endpoints: ['/api/empresas/:id/caja-bancos', '/api/empresas/:id/cartera-saldos'],
        tablasAfectadas: ['movimientos_caja_bancos', 'cuentas_bancarias_empresa', 'cartera_documentos'],
        seguridad: 'Conciliación de referencias con facturas de compras y ventas'
      },
      {
        modulo: 'Planilla PLAME & Honorarios 4ta',
        rutaUI: '/planilla / honorarios',
        endpoints: ['/api/empresas/:id/planilla', '/api/empresas/:id/honorarios'],
        tablasAfectadas: ['trabajadores_planilla', 'conceptos_laborales', 'recibos_honorarios'],
        seguridad: 'Cálculo de aportes EsSalud 9%, ONP 13% / AFP y retención del 8% de 4ta categoría'
      },
      {
        modulo: 'Cierre Mensual & Anual',
        rutaUI: '/cierre / destinos_dc',
        endpoints: ['/api/empresas/:id/cierre-anual', '/api/periodos/:id/cerrar', '/api/periodos/:id/reabrir'],
        tablasAfectadas: ['periodos_tributarios', 'asientos_cabecera', 'auditoria_log'],
        seguridad: 'Bloqueo transaccional de operaciones en períodos con estado CERRADO'
      },
      {
        modulo: 'Auditoría Criptográfica Inmutable',
        rutaUI: '/auditoria',
        endpoints: ['/api/empresas/:id/auditoria', '/api/auditoria/sistema/diagnostico/:empresaId'],
        tablasAfectadas: ['auditoria_log'],
        seguridad: 'Cadena de bloques SHA-256 (Hash previo + Hash actual) con verificación de integridad a prueba de manipulaciones'
      }
    ],
    esquemaBaseDatos: [
      {
        tabla: 'empresas_clientes',
        descripcion: 'Entidad multitenant raíz que agrupa toda la contabilidad, RUC, régimen y credenciales',
        clavePrimaria: 'id (VARCHAR(36))',
        indices: ['idx_empresas_ruc', 'idx_empresas_tenant'],
        camposClave: ['id', 'tenant_id', 'ruc', 'razon_social', 'regimen_tributario', 'estado_sunat', 'condicion_domicilio', 'moneda_defecto']
      },
      {
        tabla: 'periodos_tributarios',
        descripcion: 'Control mensual y anual de ejercicio contable (ej. 2026-03) con control de bloqueo',
        clavePrimaria: 'id (VARCHAR(36))',
        indices: ['idx_periodos_empresa_periodo'],
        camposClave: ['id', 'empresa_id', 'periodo', 'estado', 'fecha_cierre', 'usuario_cierre_id']
      },
      {
        tabla: 'asientos_cabecera',
        descripcion: 'Vouchers del Libro Diario con Código Único de Operación (CUO), fecha y glosa',
        clavePrimaria: 'id (VARCHAR(36))',
        indices: ['idx_asientos_empresa_periodo', 'idx_asientos_cuo'],
        camposClave: ['id', 'empresa_id', 'periodo_id', 'subdiario_id', 'correlativo', 'cuo', 'fecha', 'glosa', 'moneda', 'tipo_cambio', 'estado']
      },
      {
        tabla: 'asientos_detalle',
        descripcion: 'Líneas Debe y Haber vinculadas a cuentas PCGE 2020 y anexos (clientes/proveedores)',
        clavePrimaria: 'id (VARCHAR(36))',
        indices: ['idx_asientos_det_asiento', 'idx_asientos_det_cuenta'],
        camposClave: ['id', 'asiento_id', 'linea', 'cuenta_id', 'anexo_id', 'debe', 'haber', 'debe_me', 'haber_me', 'glosa_linea']
      },
      {
        tabla: 'comprobantes_compras',
        descripcion: 'Registro de Compras Electrónico (RCE) según especificaciones SUNAT Resolución 000112-2021',
        clavePrimaria: 'id (VARCHAR(36))',
        indices: ['idx_compras_empresa_periodo', 'idx_compras_ruc_doc'],
        camposClave: ['id', 'empresa_id', 'periodo', 'tipo_comprobante', 'serie', 'numero', 'fecha_emision', 'proveedor_ruc', 'proveedor_razon_social', 'base_imponible', 'igv', 'total', 'detraccion_tasa', 'detraccion_monto']
      },
      {
        tabla: 'comprobantes_ventas',
        descripcion: 'Registro de Ventas e Ingresos Electrónico (RVIE) con desglose de gravadas, exoneradas e inafectas',
        clavePrimaria: 'id (VARCHAR(36))',
        indices: ['idx_ventas_empresa_periodo', 'idx_ventas_ruc_doc'],
        camposClave: ['id', 'empresa_id', 'periodo', 'tipo_comprobante', 'serie', 'numero', 'fecha_emision', 'cliente_ruc', 'cliente_razon_social', 'base_imponible', 'igv', 'total', 'tipo_cambio']
      },
      {
        tabla: 'anexos',
        descripcion: 'Catálogo de clientes, proveedores y personal con verificación de RUC y DNI',
        clavePrimaria: 'id (VARCHAR(36))',
        indices: ['idx_anexos_empresa_doc'],
        camposClave: ['id', 'empresa_id', 'tipo_documento', 'numero_documento', 'razon_social', 'direccion', 'estado_sunat', 'condicion_domicilio']
      },
      {
        tabla: 'catalogo_cuentas_pcge',
        descripcion: 'Plan Contable General Empresarial (PCGE 2020) modificado por Resolución CNC 002-2019',
        clavePrimaria: 'id (VARCHAR(36))',
        indices: ['idx_cuentas_codigo'],
        camposClave: ['id', 'codigo', 'descripcion', 'nivel', 'naturaleza', 'permite_movimiento', 'requiere_anexo', 'cuenta_destino_debe', 'cuenta_destino_haber']
      },
      {
        tabla: 'auditoria_log',
        descripcion: 'Cadena inmutable SHA-256 de eventos del sistema (quién, cuándo, qué tabla, datos previos y nuevos)',
        clavePrimaria: 'id (VARCHAR(36))',
        indices: ['idx_auditoria_empresa_fecha', 'idx_auditoria_hash_actual'],
        camposClave: ['id', 'empresa_id', 'usuario_id', 'tabla_afectada', 'registro_id', 'accion', 'datos_anteriores', 'datos_nuevos', 'hash_previo', 'hash_actual', 'created_at']
      }
    ],
    reglasTributariasSunat: {
      igv: {
        tasaNominal: '18% (16% IGV + 2% Impuesto de Promoción Municipal IPM)',
        formulaBase: 'IGV = Base Imponible * 0.18',
        redondeo: 'A 2 decimales estándar monetario (ROUND_HALF_UP)',
        creditoFiscalRequisitos: [
          'Comprobante emitido con RUC y Razón Social coincidentes con el adquirente',
          'Que el gasto sea necesario para producir la renta o mantener la fuente (Art. 37 Ley del Impuesto a la Renta)',
          'Que el proveedor no se encuentre como No Habido o No Activo a la fecha de emisión',
          'Anotación oportuna en el Registro de Compras antes de que venza el plazo de 12 meses'
        ]
      },
      regimenesRenta: {
        rmt: {
          nombre: 'Régimen MYPE Tributario (RMT)',
          tasasAnuales: 'Primeras 15 UIT: 10% | Exceso de 15 UIT: 29.5%',
          pagosACuenta: 'Ingresos netos hasta 300 UIT: 1.0% mensual | Más de 300 UIT: Coeficiente o 1.5%',
          topeIngresos: 'Hasta 1,700 UIT anuales'
        },
        rer: {
          nombre: 'Régimen Especial de Renta (RER)',
          tasaMensual: '1.5% sobre ingresos netos mensuales (Pago de carácter definitivo, no presenta DJ Anual)',
          topeIngresos: 'Hasta S/ 525,000 anuales',
          restricciones: 'Máximo 10 trabajadores por turno y activos fijos no mayores a S/ 126,000 (sin predios ni vehículos)'
        },
        rg: {
          nombre: 'Régimen General (RG)',
          tasaAnual: '29.5% sobre la renta neta imponible',
          pagosACuenta: 'Sistema de coeficiente (Impuesto calculado año anterior / Ingresos netos año anterior) o 1.5%',
          topeIngresos: 'Sin límite de ingresos'
        },
        rus: {
          nombre: 'Nuevo RUS',
          cuotasFijas: 'Cat. 1 (Hasta S/ 5,000): S/ 20 | Cat. 2 (Hasta S/ 8,000): S/ 50',
          restricciones: 'Solo personas naturales con consumidores finales. No emiten factura ni llevan libros contables'
        }
      },
      spotDetracciones: {
        concepto: 'Sistema de Pago de Obligaciones Tributarias con el Gobierno Central (D.L. 940)',
        montoMinimoGeneral: 'S/ 700.00 (Servicios y bienes afectos)',
        serviciosFrecuentes: [
          { codigo: '022', descripcion: 'Otros servicios empresariales', tasa: '12%' },
          { codigo: '025', descripcion: 'Fabricación de bienes por encargo', tasa: '10%' },
          { codigo: '037', descripcion: 'Demás servicios gravados con el IGV', tasa: '12%' },
          { codigo: '019', descripcion: 'Arrendamiento de bienes muebles', tasa: '10%' },
          { codigo: '030', descripcion: 'Contratos de construcción', tasa: '4%' },
          { codigo: '020', descripcion: 'Mantenimiento y reparación de bienes muebles', tasa: '12%' }
        ]
      }
    }
  };

  return res.json(mapaSistema);
});

// Endpoint para ejecutar diagnóstico en tiempo real de la empresa
router.get('/auditoria/sistema/diagnostico/:empresaId', requireAuth, requireEmpresaMembership(), async (req: Request, res: Response) => {
  const { empresaId } = req.params;

  try {
    // 1. Obtener asientos y verificar cuadre Debe vs Haber
    const asientosRes = await asientoService.listar(empresaId, { limit: 1000 });
    const asientos = asientosRes.data || [];
    let totalAsientos = asientos.length;
    let asientosDescuadrados: any[] = [];
    let sumaDebeTotal = 0;
    let sumaHaberTotal = 0;

    for (const asiento of asientos) {
      const debeAsiento = Number(asiento.totalDebe || 0);
      const haberAsiento = Number(asiento.totalHaber || 0);
      sumaDebeTotal += debeAsiento;
      sumaHaberTotal += haberAsiento;

      const dif = Math.abs(debeAsiento - haberAsiento);
      if (dif > 0.01) {
        asientosDescuadrados.push({
          asientoId: asiento.id,
          numero: asiento.numero || asiento.id,
          fecha: asiento.fecha,
          glosa: asiento.glosa,
          debe: Number(debeAsiento.toFixed(2)),
          haber: Number(haberAsiento.toFixed(2)),
          diferencia: Number(dif.toFixed(2))
        });
      }
    }

    // 2. Obtener comprobantes de compras y ventas
    const [comprasRes, ventasRes] = await Promise.all([
      compraService.listar(empresaId, { limit: 500 }),
      ventaService.listar(empresaId, { limit: 500 })
    ]);

    const compras = comprasRes.items || [];
    const ventas = ventasRes.items || [];

    // Comprobar compras con posible inconsistencia de IGV
    const comprasAlertas: any[] = [];
    for (const c of compras) {
      const igvCalculado = Math.round((Number(c.baseGravada || 0) * 0.18) * 100) / 100;
      const igvRegistrado = Number(c.igv || 0);
      const difIgv = Math.abs(igvCalculado - igvRegistrado);
      if (difIgv > 0.10 && Number(c.baseGravada || 0) > 0) {
        comprasAlertas.push({
          id: c.id,
          documento: `${c.serie}-${c.numero}`,
          proveedorRuc: c.proveedorRuc,
          baseGravada: c.baseGravada,
          igvRegistrado,
          igvEsperado: igvCalculado,
          diferencia: Number(difIgv.toFixed(2))
        });
      }
    }

    // 3. Verificar cadena criptográfica de auditoría
    const resultadoCadena = await auditoriaChainService.verificarIntegridad(empresaId);

    // 4. Verificar anexos y RUCs
    const anexos = await anexoService.listar(empresaId);
    const anexosNoHabidos = anexos.filter((a: any) => a.condicionSunat && a.condicionSunat !== 'HABIDO');
    const anexosNoActivos = anexos.filter((a: any) => a.estadoSunat && a.estadoSunat !== 'ACTIVO');

    // 5. Determinar estado general de auditoría
    const hallazgosCriticos: string[] = [];
    const observaciones: string[] = [];

    if (asientosDescuadrados.length > 0) {
      hallazgosCriticos.push(`Se detectaron ${asientosDescuadrados.length} asiento(s) contable(s) descuadrado(s) donde Debe != Haber.`);
    }

    if (!resultadoCadena.valido) {
      hallazgosCriticos.push(`Violación de integridad detectada en la cadena criptográfica SHA-256 de auditoría: ${resultadoCadena.mensaje}`);
    }

    if (comprasAlertas.length > 0) {
      observaciones.push(`${comprasAlertas.length} comprobante(s) de compra tienen discrepancia superior a S/ 0.10 entre el IGV registrado y la tasa 18%.`);
    }

    if (anexosNoHabidos.length > 0) {
      observaciones.push(`${anexosNoHabidos.length} anexo(s) figuran como 'NO HABIDO' en el padrón de contribuyentes.`);
    }

    if (anexosNoActivos.length > 0) {
      observaciones.push(`${anexosNoActivos.length} anexo(s) figuran en estado distinto a 'ACTIVO' (Baja o Suspensión temporal).`);
    }

    const dictamen = hallazgosCriticos.length === 0
      ? (observaciones.length === 0 ? 'CONFORME_SIN_OBSERVACIONES' : 'CONFORME_CON_OBSERVACIONES_PREVENTIVAS')
      : 'NO_CONFORME_REQUIERE_SUBSANACION';

    const diagnostico = {
      empresaId,
      fechaDiagnostico: new Date().toISOString(),
      dictamen,
      resumen: {
        totalAsientos,
        asientosDescuadradosCount: asientosDescuadrados.length,
        totalDebe: Number(sumaDebeTotal.toFixed(2)),
        totalHaber: Number(sumaHaberTotal.toFixed(2)),
        diferenciaGlobal: Number(Math.abs(sumaDebeTotal - sumaHaberTotal).toFixed(2)),
        totalCompras: compras.length,
        comprasConAlertaIgv: comprasAlertas.length,
        totalVentas: ventas.length,
        totalAnexos: anexos.length,
        anexosNoHabidos: anexosNoHabidos.length,
        anexosNoActivos: anexosNoActivos.length,
        cadenaAuditoriaValida: resultadoCadena.valido,
        eventosAuditoriaRegistrados: resultadoCadena.totalRegistros
      },
      detalles: {
        asientosDescuadrados: asientosDescuadrados.slice(0, 10),
        comprasAlertas: comprasAlertas.slice(0, 10),
        cadenaAuditoria: resultadoCadena
      },
      hallazgosCriticos,
      observaciones
    };

    return res.json(diagnostico);
  } catch (error: any) {
    console.error('Error ejecutando diagnóstico de auditoría:', error);
    return res.status(500).json({
      error: 'Error interno ejecutando diagnóstico de auditoría',
      detalle: error.message
    });
  }
});

export const sistemaAuditRoutes = router;
