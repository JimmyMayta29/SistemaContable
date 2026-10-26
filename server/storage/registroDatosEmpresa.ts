export type AmbitoDatos = 'empresa' | 'control' | 'compartido';
export type RemapeoReferencia = 'identificador' | 'empresa_destino' | 'control_destino' | 'evidencia_origen';

export interface ReferenciaTabla {
  columna: string;
  tabla: string;
  columnaDestino: string;
  remapeo: RemapeoReferencia;
}

export interface RegistroTablaEmpresa {
  tabla: string;
  ambito: AmbitoDatos;
  exportar: boolean;
  motivoExclusion?: string;
  clavePrimaria: readonly string[];
  remapearClave: boolean;
  columnaEmpresa: string | null;
  empresaDesde?: { columna: string; tabla: string };
  referencias: readonly ReferenciaTabla[];
}

// Única lista de tablas; las referencias declaran sus dependencias y su tratamiento al restaurar.
// Las referencias al propio registro requieren una segunda pasada; los actores conservan evidencia de origen.
export const REGISTRO_DATOS_EMPRESA: readonly RegistroTablaEmpresa[] = [
  { tabla: 'catalogos_sunat', ambito: 'compartido', exportar: true, clavePrimaria: ['id'], remapearClave: true, columnaEmpresa: null, referencias: [] },
  { tabla: 'cronograma_vencimientos', ambito: 'compartido', exportar: true, clavePrimaria: ['id'], remapearClave: true, columnaEmpresa: null, referencias: [] },
  { tabla: 'parametros_tributarios', ambito: 'compartido', exportar: true, clavePrimaria: ['id'], remapearClave: true, columnaEmpresa: null, referencias: [] },
  { tabla: 'permisos', ambito: 'control', exportar: false, motivoExclusion: 'Datos de control, identidades o permisos excluidos.', clavePrimaria: ['id'], remapearClave: false, columnaEmpresa: null, referencias: [] },
  { tabla: 'plantilla_pcge', ambito: 'compartido', exportar: true, clavePrimaria: ['codigo'], remapearClave: false, columnaEmpresa: null, referencias: [] },
  { tabla: 'ple_libros_config', ambito: 'compartido', exportar: true, clavePrimaria: ['id'], remapearClave: true, columnaEmpresa: null, referencias: [] },
  { tabla: 'roles', ambito: 'control', exportar: false, motivoExclusion: 'Datos de control, identidades o permisos excluidos.', clavePrimaria: ['id'], remapearClave: false, columnaEmpresa: null, referencias: [] },
  { tabla: 'rol_permisos', ambito: 'control', exportar: false, motivoExclusion: 'Datos de control, identidades o permisos excluidos.', clavePrimaria: ['rol_id','permiso_id'], remapearClave: false, columnaEmpresa: null, referencias: [
    { columna: 'permiso_id', tabla: 'permisos', columnaDestino: 'id', remapeo: 'control_destino' },
    { columna: 'rol_id', tabla: 'roles', columnaDestino: 'id', remapeo: 'control_destino' },
  ] },
  { tabla: 'schema_migrations', ambito: 'control', exportar: false, motivoExclusion: 'Datos de control, identidades o permisos excluidos.', clavePrimaria: ['nombre'], remapearClave: false, columnaEmpresa: null, referencias: [] },
  { tabla: 'tenants', ambito: 'control', exportar: false, motivoExclusion: 'Datos de control, identidades o permisos excluidos.', clavePrimaria: ['id'], remapearClave: false, columnaEmpresa: null, referencias: [] },
  { tabla: 'empresas', ambito: 'control', exportar: true, clavePrimaria: ['id'], remapearClave: true, columnaEmpresa: 'id', referencias: [
    { columna: 'tenant_id', tabla: 'tenants', columnaDestino: 'id', remapeo: 'control_destino' },
  ] },
  { tabla: 'anexos', ambito: 'empresa', exportar: true, clavePrimaria: ['id'], remapearClave: true, columnaEmpresa: 'empresa_id', referencias: [
    { columna: 'empresa_id', tabla: 'empresas', columnaDestino: 'id', remapeo: 'empresa_destino' },
  ] },
  { tabla: 'asientos_recurrentes', ambito: 'empresa', exportar: true, clavePrimaria: ['id'], remapearClave: true, columnaEmpresa: 'empresa_id', referencias: [
    { columna: 'empresa_id', tabla: 'empresas', columnaDestino: 'id', remapeo: 'empresa_destino' },
  ] },
  { tabla: 'centros_costo', ambito: 'empresa', exportar: true, clavePrimaria: ['id'], remapearClave: true, columnaEmpresa: 'empresa_id', referencias: [
    { columna: 'empresa_id', tabla: 'empresas', columnaDestino: 'id', remapeo: 'empresa_destino' },
  ] },
  { tabla: 'comprobantes_xml', ambito: 'empresa', exportar: true, clavePrimaria: ['id'], remapearClave: true, columnaEmpresa: 'empresa_id', referencias: [
    { columna: 'empresa_id', tabla: 'empresas', columnaDestino: 'id', remapeo: 'empresa_destino' },
  ] },
  { tabla: 'conceptos_planilla', ambito: 'empresa', exportar: true, clavePrimaria: ['id'], remapearClave: true, columnaEmpresa: 'empresa_id', referencias: [
    { columna: 'empresa_id', tabla: 'empresas', columnaDestino: 'id', remapeo: 'empresa_destino' },
  ] },
  { tabla: 'config_estados_financieros', ambito: 'empresa', exportar: true, clavePrimaria: ['id'], remapearClave: true, columnaEmpresa: 'empresa_id', referencias: [
    { columna: 'empresa_id', tabla: 'empresas', columnaDestino: 'id', remapeo: 'empresa_destino' },
  ] },
  { tabla: 'configuracion_reportes', ambito: 'empresa', exportar: true, clavePrimaria: ['id'], remapearClave: true, columnaEmpresa: 'empresa_id', referencias: [
    { columna: 'empresa_id', tabla: 'empresas', columnaDestino: 'id', remapeo: 'empresa_destino' },
  ] },
  { tabla: 'credenciales_sunat', ambito: 'empresa', exportar: false, motivoExclusion: 'Credenciales, tokens o claves SUNAT excluidos.', clavePrimaria: ['id'], remapearClave: false, columnaEmpresa: 'empresa_id', referencias: [
    { columna: 'empresa_id', tabla: 'empresas', columnaDestino: 'id', remapeo: 'empresa_destino' },
  ] },
  { tabla: 'cuentas_financieras', ambito: 'empresa', exportar: true, clavePrimaria: ['id'], remapearClave: true, columnaEmpresa: 'empresa_id', referencias: [
    { columna: 'empresa_id', tabla: 'empresas', columnaDestino: 'id', remapeo: 'empresa_destino' },
  ] },
  { tabla: 'cajas_chicas', ambito: 'empresa', exportar: true, clavePrimaria: ['id'], remapearClave: true, columnaEmpresa: 'empresa_id', referencias: [
    { columna: 'cuenta_financiera_id', tabla: 'cuentas_financieras', columnaDestino: 'id', remapeo: 'identificador' },
    { columna: 'empresa_id', tabla: 'empresas', columnaDestino: 'id', remapeo: 'empresa_destino' },
    { columna: 'responsable_anexo_id', tabla: 'anexos', columnaDestino: 'id', remapeo: 'identificador' },
  ] },
  { tabla: 'detracciones', ambito: 'empresa', exportar: true, clavePrimaria: ['id'], remapearClave: true, columnaEmpresa: 'empresa_id', referencias: [
    { columna: 'empresa_id', tabla: 'empresas', columnaDestino: 'id', remapeo: 'empresa_destino' },
  ] },
  { tabla: 'ejercicios', ambito: 'empresa', exportar: true, clavePrimaria: ['id'], remapearClave: true, columnaEmpresa: 'empresa_id', referencias: [
    { columna: 'empresa_id', tabla: 'empresas', columnaDestino: 'id', remapeo: 'empresa_destino' },
  ] },
  { tabla: 'estudio_configuracion', ambito: 'control', exportar: false, motivoExclusion: 'Datos de control, identidades o permisos excluidos.', clavePrimaria: ['id'], remapearClave: false, columnaEmpresa: null, referencias: [
    { columna: 'tenant_id', tabla: 'tenants', columnaDestino: 'id', remapeo: 'control_destino' },
  ] },
  { tabla: 'extractos_bancarios', ambito: 'empresa', exportar: true, clavePrimaria: ['id'], remapearClave: true, columnaEmpresa: 'empresa_id', referencias: [
    { columna: 'cuenta_financiera_id', tabla: 'cuentas_financieras', columnaDestino: 'id', remapeo: 'identificador' },
    { columna: 'empresa_id', tabla: 'empresas', columnaDestino: 'id', remapeo: 'empresa_destino' },
  ] },
  { tabla: 'plan_cuentas', ambito: 'empresa', exportar: true, clavePrimaria: ['id'], remapearClave: true, columnaEmpresa: 'empresa_id', referencias: [
    { columna: 'empresa_id', tabla: 'empresas', columnaDestino: 'id', remapeo: 'empresa_destino' },
  ] },
  { tabla: 'reglas_contabilizacion', ambito: 'empresa', exportar: true, clavePrimaria: ['id'], remapearClave: true, columnaEmpresa: 'empresa_id', referencias: [
    { columna: 'empresa_id', tabla: 'empresas', columnaDestino: 'id', remapeo: 'empresa_destino' },
  ] },
  { tabla: 'reglas_contabilizacion_detalle', ambito: 'empresa', exportar: true, clavePrimaria: ['id'], remapearClave: true, columnaEmpresa: null, empresaDesde: { columna: 'regla_id', tabla: 'reglas_contabilizacion' }, referencias: [
    { columna: 'regla_id', tabla: 'reglas_contabilizacion', columnaDestino: 'id', remapeo: 'identificador' },
  ] },
  { tabla: 'retenciones_percepciones_igv', ambito: 'empresa', exportar: true, clavePrimaria: ['id'], remapearClave: true, columnaEmpresa: 'empresa_id', referencias: [
    { columna: 'anexo_id', tabla: 'anexos', columnaDestino: 'id', remapeo: 'identificador' },
    { columna: 'empresa_id', tabla: 'empresas', columnaDestino: 'id', remapeo: 'empresa_destino' },
  ] },
  { tabla: 'saldos_mensuales', ambito: 'empresa', exportar: true, clavePrimaria: ['id'], remapearClave: true, columnaEmpresa: 'empresa_id', referencias: [
    { columna: 'anexo_id', tabla: 'anexos', columnaDestino: 'id', remapeo: 'identificador' },
    { columna: 'empresa_id', tabla: 'empresas', columnaDestino: 'id', remapeo: 'empresa_destino' },
  ] },
  { tabla: 'sire_propuestas', ambito: 'empresa', exportar: true, clavePrimaria: ['id'], remapearClave: true, columnaEmpresa: 'empresa_id', referencias: [
    { columna: 'empresa_id', tabla: 'empresas', columnaDestino: 'id', remapeo: 'empresa_destino' },
  ] },
  { tabla: 'sire_conciliaciones', ambito: 'empresa', exportar: true, clavePrimaria: ['id'], remapearClave: true, columnaEmpresa: 'empresa_id', referencias: [
    { columna: 'empresa_id', tabla: 'empresas', columnaDestino: 'id', remapeo: 'empresa_destino' },
    { columna: 'propuesta_id', tabla: 'sire_propuestas', columnaDestino: 'id', remapeo: 'identificador' },
  ] },
  { tabla: 'sire_propuesta_lineas', ambito: 'empresa', exportar: true, clavePrimaria: ['id'], remapearClave: true, columnaEmpresa: 'empresa_id', referencias: [
    { columna: 'empresa_id', tabla: 'empresas', columnaDestino: 'id', remapeo: 'empresa_destino' },
    { columna: 'propuesta_id', tabla: 'sire_propuestas', columnaDestino: 'id', remapeo: 'identificador' },
  ] },
  { tabla: 'subdiarios', ambito: 'empresa', exportar: true, clavePrimaria: ['id'], remapearClave: true, columnaEmpresa: 'empresa_id', referencias: [
    { columna: 'empresa_id', tabla: 'empresas', columnaDestino: 'id', remapeo: 'empresa_destino' },
  ] },
  { tabla: 'sunat_conexiones', ambito: 'empresa', exportar: false, motivoExclusion: 'Credenciales, tokens o claves SUNAT excluidos.', clavePrimaria: ['id'], remapearClave: false, columnaEmpresa: 'empresa_id', referencias: [
    { columna: 'empresa_id', tabla: 'empresas', columnaDestino: 'id', remapeo: 'empresa_destino' },
  ] },
  { tabla: 'sunat_empresa_keys', ambito: 'empresa', exportar: false, motivoExclusion: 'Credenciales, tokens o claves SUNAT excluidos.', clavePrimaria: ['empresa_id'], remapearClave: false, columnaEmpresa: 'empresa_id', referencias: [
    { columna: 'empresa_id', tabla: 'empresas', columnaDestino: 'id', remapeo: 'empresa_destino' },
  ] },
  { tabla: 'sunat_jobs', ambito: 'empresa', exportar: true, clavePrimaria: ['id'], remapearClave: true, columnaEmpresa: 'empresa_id', referencias: [
    { columna: 'empresa_id', tabla: 'empresas', columnaDestino: 'id', remapeo: 'empresa_destino' },
  ] },
  { tabla: 'sunat_tokens', ambito: 'empresa', exportar: false, motivoExclusion: 'Credenciales, tokens o claves SUNAT excluidos.', clavePrimaria: ['id'], remapearClave: false, columnaEmpresa: 'empresa_id', referencias: [
    { columna: 'empresa_id', tabla: 'empresas', columnaDestino: 'id', remapeo: 'empresa_destino' },
  ] },
  { tabla: 'tipos_cambio', ambito: 'compartido', exportar: true, clavePrimaria: ['id'], remapearClave: true, columnaEmpresa: null, referencias: [] },
  { tabla: 'trabajadores', ambito: 'empresa', exportar: true, clavePrimaria: ['id'], remapearClave: true, columnaEmpresa: 'empresa_id', referencias: [
    { columna: 'empresa_id', tabla: 'empresas', columnaDestino: 'id', remapeo: 'empresa_destino' },
  ] },
  { tabla: 'usuarios', ambito: 'control', exportar: false, motivoExclusion: 'Datos de control, identidades o permisos excluidos.', clavePrimaria: ['id'], remapearClave: false, columnaEmpresa: null, referencias: [
    { columna: 'tenant_id', tabla: 'tenants', columnaDestino: 'id', remapeo: 'control_destino' },
  ] },
  { tabla: 'usuarios_estudio', ambito: 'control', exportar: false, motivoExclusion: 'Datos de control, identidades o permisos excluidos.', clavePrimaria: ['id'], remapearClave: false, columnaEmpresa: null, referencias: [] },
  { tabla: 'auditoria', ambito: 'empresa', exportar: true, clavePrimaria: ['id'], remapearClave: true, columnaEmpresa: 'empresa_id', referencias: [
    { columna: 'empresa_id', tabla: 'empresas', columnaDestino: 'id', remapeo: 'empresa_destino' },
    { columna: 'tenant_id', tabla: 'tenants', columnaDestino: 'id', remapeo: 'control_destino' },
    { columna: 'usuario_id', tabla: 'usuarios_estudio', columnaDestino: 'id', remapeo: 'evidencia_origen' },
  ] },
  { tabla: 'auditoria_log', ambito: 'empresa', exportar: true, clavePrimaria: ['id'], remapearClave: true, columnaEmpresa: 'empresa_id', referencias: [
    { columna: 'empresa_id', tabla: 'empresas', columnaDestino: 'id', remapeo: 'empresa_destino' },
    { columna: 'usuario_id', tabla: 'usuarios_estudio', columnaDestino: 'id', remapeo: 'evidencia_origen' },
  ] },
  { tabla: 'membresias', ambito: 'control', exportar: false, motivoExclusion: 'Datos de control, identidades o permisos excluidos.', clavePrimaria: ['id'], remapearClave: false, columnaEmpresa: 'empresa_id', referencias: [
    { columna: 'empresa_id', tabla: 'empresas', columnaDestino: 'id', remapeo: 'empresa_destino' },
    { columna: 'rol_id', tabla: 'roles', columnaDestino: 'id', remapeo: 'control_destino' },
    { columna: 'usuario_id', tabla: 'usuarios_estudio', columnaDestino: 'id', remapeo: 'evidencia_origen' },
  ] },
  { tabla: 'periodos', ambito: 'empresa', exportar: true, clavePrimaria: ['id'], remapearClave: true, columnaEmpresa: 'empresa_id', referencias: [
    { columna: 'cerrado_por', tabla: 'usuarios_estudio', columnaDestino: 'id', remapeo: 'evidencia_origen' },
    { columna: 'ejercicio_id', tabla: 'ejercicios', columnaDestino: 'id', remapeo: 'identificador' },
    { columna: 'empresa_id', tabla: 'empresas', columnaDestino: 'id', remapeo: 'empresa_destino' },
  ] },
  { tabla: 'asientos', ambito: 'empresa', exportar: true, clavePrimaria: ['id'], remapearClave: true, columnaEmpresa: 'empresa_id', referencias: [
    { columna: 'anulado_by', tabla: 'usuarios_estudio', columnaDestino: 'id', remapeo: 'evidencia_origen' },
    { columna: 'asiento_extorno_id', tabla: 'asientos', columnaDestino: 'id', remapeo: 'identificador' },
    { columna: 'created_by', tabla: 'usuarios_estudio', columnaDestino: 'id', remapeo: 'evidencia_origen' },
    { columna: 'empresa_id', tabla: 'empresas', columnaDestino: 'id', remapeo: 'empresa_destino' },
    { columna: 'periodo_id', tabla: 'periodos', columnaDestino: 'id', remapeo: 'identificador' },
    { columna: 'subdiario_id', tabla: 'subdiarios', columnaDestino: 'id', remapeo: 'identificador' },
    { columna: 'updated_by', tabla: 'usuarios_estudio', columnaDestino: 'id', remapeo: 'evidencia_origen' },
  ] },
  { tabla: 'asiento_detalle', ambito: 'empresa', exportar: true, clavePrimaria: ['id'], remapearClave: true, columnaEmpresa: 'empresa_id', referencias: [
    { columna: 'anexo_id', tabla: 'anexos', columnaDestino: 'id', remapeo: 'identificador' },
    { columna: 'asiento_id', tabla: 'asientos', columnaDestino: 'id', remapeo: 'identificador' },
    { columna: 'centro_costo_id', tabla: 'centros_costo', columnaDestino: 'id', remapeo: 'identificador' },
    { columna: 'cuenta_id', tabla: 'plan_cuentas', columnaDestino: 'id', remapeo: 'identificador' },
    { columna: 'empresa_id', tabla: 'empresas', columnaDestino: 'id', remapeo: 'empresa_destino' },
  ] },
  { tabla: 'comprobantes_compra', ambito: 'empresa', exportar: true, clavePrimaria: ['id'], remapearClave: true, columnaEmpresa: 'empresa_id', referencias: [
    { columna: 'asiento_id', tabla: 'asientos', columnaDestino: 'id', remapeo: 'identificador' },
    { columna: 'created_by', tabla: 'usuarios_estudio', columnaDestino: 'id', remapeo: 'evidencia_origen' },
    { columna: 'documento_modificado_id', tabla: 'comprobantes_compra', columnaDestino: 'id', remapeo: 'identificador' },
    { columna: 'empresa_id', tabla: 'empresas', columnaDestino: 'id', remapeo: 'empresa_destino' },
    { columna: 'periodo_id', tabla: 'periodos', columnaDestino: 'id', remapeo: 'identificador' },
    { columna: 'proveedor_id', tabla: 'anexos', columnaDestino: 'id', remapeo: 'identificador' },
    { columna: 'updated_by', tabla: 'usuarios_estudio', columnaDestino: 'id', remapeo: 'evidencia_origen' },
  ] },
  { tabla: 'comprobantes_venta', ambito: 'empresa', exportar: true, clavePrimaria: ['id'], remapearClave: true, columnaEmpresa: 'empresa_id', referencias: [
    { columna: 'asiento_id', tabla: 'asientos', columnaDestino: 'id', remapeo: 'identificador' },
    { columna: 'cliente_id', tabla: 'anexos', columnaDestino: 'id', remapeo: 'identificador' },
    { columna: 'created_by', tabla: 'usuarios_estudio', columnaDestino: 'id', remapeo: 'evidencia_origen' },
    { columna: 'documento_modificado_id', tabla: 'comprobantes_venta', columnaDestino: 'id', remapeo: 'identificador' },
    { columna: 'empresa_id', tabla: 'empresas', columnaDestino: 'id', remapeo: 'empresa_destino' },
    { columna: 'periodo_id', tabla: 'periodos', columnaDestino: 'id', remapeo: 'identificador' },
    { columna: 'updated_by', tabla: 'usuarios_estudio', columnaDestino: 'id', remapeo: 'evidencia_origen' },
  ] },
  { tabla: 'conciliaciones_bancarias', ambito: 'empresa', exportar: true, clavePrimaria: ['id'], remapearClave: true, columnaEmpresa: 'empresa_id', referencias: [
    { columna: 'cuenta_financiera_id', tabla: 'cuentas_financieras', columnaDestino: 'id', remapeo: 'identificador' },
    { columna: 'empresa_id', tabla: 'empresas', columnaDestino: 'id', remapeo: 'empresa_destino' },
    { columna: 'periodo_id', tabla: 'periodos', columnaDestino: 'id', remapeo: 'identificador' },
  ] },
  { tabla: 'correlativos', ambito: 'empresa', exportar: true, clavePrimaria: ['id'], remapearClave: true, columnaEmpresa: 'empresa_id', referencias: [
    { columna: 'empresa_id', tabla: 'empresas', columnaDestino: 'id', remapeo: 'empresa_destino' },
    { columna: 'periodo_id', tabla: 'periodos', columnaDestino: 'id', remapeo: 'identificador' },
    { columna: 'subdiario_id', tabla: 'subdiarios', columnaDestino: 'id', remapeo: 'identificador' },
  ] },
  { tabla: 'cuentas_por_cobrar', ambito: 'empresa', exportar: true, clavePrimaria: ['id'], remapearClave: true, columnaEmpresa: 'empresa_id', referencias: [
    { columna: 'cliente_id', tabla: 'anexos', columnaDestino: 'id', remapeo: 'identificador' },
    { columna: 'comprobante_id', tabla: 'comprobantes_venta', columnaDestino: 'id', remapeo: 'identificador' },
    { columna: 'empresa_id', tabla: 'empresas', columnaDestino: 'id', remapeo: 'empresa_destino' },
  ] },
  { tabla: 'aplicaciones_cobranza', ambito: 'empresa', exportar: true, clavePrimaria: ['id'], remapearClave: true, columnaEmpresa: 'empresa_id', referencias: [
    { columna: 'asiento_id', tabla: 'asientos', columnaDestino: 'id', remapeo: 'identificador' },
    { columna: 'cuenta_por_cobrar_id', tabla: 'cuentas_por_cobrar', columnaDestino: 'id', remapeo: 'identificador' },
    { columna: 'empresa_id', tabla: 'empresas', columnaDestino: 'id', remapeo: 'empresa_destino' },
  ] },
  { tabla: 'cuentas_por_pagar', ambito: 'empresa', exportar: true, clavePrimaria: ['id'], remapearClave: true, columnaEmpresa: 'empresa_id', referencias: [
    { columna: 'comprobante_id', tabla: 'comprobantes_compra', columnaDestino: 'id', remapeo: 'identificador' },
    { columna: 'empresa_id', tabla: 'empresas', columnaDestino: 'id', remapeo: 'empresa_destino' },
    { columna: 'proveedor_id', tabla: 'anexos', columnaDestino: 'id', remapeo: 'identificador' },
  ] },
  { tabla: 'aplicaciones_pago', ambito: 'empresa', exportar: true, clavePrimaria: ['id'], remapearClave: true, columnaEmpresa: 'empresa_id', referencias: [
    { columna: 'asiento_id', tabla: 'asientos', columnaDestino: 'id', remapeo: 'identificador' },
    { columna: 'cuenta_por_pagar_id', tabla: 'cuentas_por_pagar', columnaDestino: 'id', remapeo: 'identificador' },
    { columna: 'empresa_id', tabla: 'empresas', columnaDestino: 'id', remapeo: 'empresa_destino' },
  ] },
  { tabla: 'movimientos_tesoreria', ambito: 'empresa', exportar: true, clavePrimaria: ['id'], remapearClave: true, columnaEmpresa: 'empresa_id', referencias: [
    { columna: 'anexo_id', tabla: 'anexos', columnaDestino: 'id', remapeo: 'identificador' },
    { columna: 'asiento_id', tabla: 'asientos', columnaDestino: 'id', remapeo: 'identificador' },
    { columna: 'cuenta_financiera_id', tabla: 'cuentas_financieras', columnaDestino: 'id', remapeo: 'identificador' },
    { columna: 'empresa_id', tabla: 'empresas', columnaDestino: 'id', remapeo: 'empresa_destino' },
    { columna: 'periodo_id', tabla: 'periodos', columnaDestino: 'id', remapeo: 'identificador' },
  ] },
  { tabla: 'extracto_lineas', ambito: 'empresa', exportar: true, clavePrimaria: ['id'], remapearClave: true, columnaEmpresa: 'empresa_id', referencias: [
    { columna: 'empresa_id', tabla: 'empresas', columnaDestino: 'id', remapeo: 'empresa_destino' },
    { columna: 'extracto_id', tabla: 'extractos_bancarios', columnaDestino: 'id', remapeo: 'identificador' },
    { columna: 'movimiento_tesoreria_id', tabla: 'movimientos_tesoreria', columnaDestino: 'id', remapeo: 'identificador' },
  ] },
  { tabla: 'planillas', ambito: 'empresa', exportar: true, clavePrimaria: ['id'], remapearClave: true, columnaEmpresa: 'empresa_id', referencias: [
    { columna: 'asiento_id', tabla: 'asientos', columnaDestino: 'id', remapeo: 'identificador' },
    { columna: 'asiento_pago_id', tabla: 'asientos', columnaDestino: 'id', remapeo: 'identificador' },
    { columna: 'empresa_id', tabla: 'empresas', columnaDestino: 'id', remapeo: 'empresa_destino' },
    { columna: 'periodo_id', tabla: 'periodos', columnaDestino: 'id', remapeo: 'identificador' },
  ] },
  { tabla: 'planilla_lineas', ambito: 'empresa', exportar: true, clavePrimaria: ['id'], remapearClave: true, columnaEmpresa: null, empresaDesde: { columna: 'planilla_id', tabla: 'planillas' }, referencias: [
    { columna: 'planilla_id', tabla: 'planillas', columnaDestino: 'id', remapeo: 'identificador' },
    { columna: 'trabajador_id', tabla: 'trabajadores', columnaDestino: 'id', remapeo: 'identificador' },
  ] },
  { tabla: 'ple_exportaciones', ambito: 'empresa', exportar: true, clavePrimaria: ['id'], remapearClave: true, columnaEmpresa: 'empresa_id', referencias: [
    { columna: 'empresa_id', tabla: 'empresas', columnaDestino: 'id', remapeo: 'empresa_destino' },
    { columna: 'usuario_id', tabla: 'usuarios_estudio', columnaDestino: 'id', remapeo: 'evidencia_origen' },
  ] },
  { tabla: 'provisiones_sociales', ambito: 'empresa', exportar: true, clavePrimaria: ['id'], remapearClave: true, columnaEmpresa: 'empresa_id', referencias: [
    { columna: 'asiento_id', tabla: 'asientos', columnaDestino: 'id', remapeo: 'identificador' },
    { columna: 'empresa_id', tabla: 'empresas', columnaDestino: 'id', remapeo: 'empresa_destino' },
    { columna: 'periodo_id', tabla: 'periodos', columnaDestino: 'id', remapeo: 'identificador' },
    { columna: 'trabajador_id', tabla: 'trabajadores', columnaDestino: 'id', remapeo: 'identificador' },
  ] },
  { tabla: 'recibos_honorarios', ambito: 'empresa', exportar: true, clavePrimaria: ['id'], remapearClave: true, columnaEmpresa: 'empresa_id', referencias: [
    { columna: 'asiento_id', tabla: 'asientos', columnaDestino: 'id', remapeo: 'identificador' },
    { columna: 'cuenta_por_pagar_id', tabla: 'cuentas_por_pagar', columnaDestino: 'id', remapeo: 'identificador' },
    { columna: 'empresa_id', tabla: 'empresas', columnaDestino: 'id', remapeo: 'empresa_destino' },
    { columna: 'periodo_id', tabla: 'periodos', columnaDestino: 'id', remapeo: 'identificador' },
    { columna: 'proveedor_id', tabla: 'anexos', columnaDestino: 'id', remapeo: 'identificador' },
  ] },
  { tabla: 'refresh_tokens', ambito: 'control', exportar: false, motivoExclusion: 'Datos de control, identidades o permisos excluidos.', clavePrimaria: ['token_id'], remapearClave: false, columnaEmpresa: 'empresa_id', referencias: [
    { columna: 'usuario_id', tabla: 'usuarios_estudio', columnaDestino: 'id', remapeo: 'evidencia_origen' },
  ] },
  { tabla: 'rendiciones_caja_chica', ambito: 'empresa', exportar: true, clavePrimaria: ['id'], remapearClave: true, columnaEmpresa: 'empresa_id', referencias: [
    { columna: 'asiento_reposicion_id', tabla: 'asientos', columnaDestino: 'id', remapeo: 'identificador' },
    { columna: 'caja_chica_id', tabla: 'cajas_chicas', columnaDestino: 'id', remapeo: 'identificador' },
    { columna: 'empresa_id', tabla: 'empresas', columnaDestino: 'id', remapeo: 'empresa_destino' },
    { columna: 'movimiento_reposicion_id', tabla: 'movimientos_tesoreria', columnaDestino: 'id', remapeo: 'identificador' },
  ] },
  { tabla: 'reportes_generados', ambito: 'empresa', exportar: true, clavePrimaria: ['id'], remapearClave: true, columnaEmpresa: 'empresa_id', referencias: [
    { columna: 'empresa_id', tabla: 'empresas', columnaDestino: 'id', remapeo: 'empresa_destino' },
    { columna: 'usuario_id', tabla: 'usuarios_estudio', columnaDestino: 'id', remapeo: 'evidencia_origen' },
  ] },
  { tabla: 'sire_conciliacion_lineas', ambito: 'empresa', exportar: true, clavePrimaria: ['id'], remapearClave: true, columnaEmpresa: 'empresa_id', referencias: [
    { columna: 'conciliacion_id', tabla: 'sire_conciliaciones', columnaDestino: 'id', remapeo: 'identificador' },
    { columna: 'empresa_id', tabla: 'empresas', columnaDestino: 'id', remapeo: 'empresa_destino' },
    { columna: 'linea_propuesta_id', tabla: 'sire_propuesta_lineas', columnaDestino: 'id', remapeo: 'identificador' },
    { columna: 'usuario_decision_id', tabla: 'usuarios_estudio', columnaDestino: 'id', remapeo: 'evidencia_origen' },
  ] },
  { tabla: 'transferencias_cuentas', ambito: 'empresa', exportar: true, clavePrimaria: ['id'], remapearClave: true, columnaEmpresa: 'empresa_id', referencias: [
    { columna: 'asiento_id', tabla: 'asientos', columnaDestino: 'id', remapeo: 'identificador' },
    { columna: 'cuenta_destino_id', tabla: 'cuentas_financieras', columnaDestino: 'id', remapeo: 'identificador' },
    { columna: 'cuenta_origen_id', tabla: 'cuentas_financieras', columnaDestino: 'id', remapeo: 'identificador' },
    { columna: 'empresa_id', tabla: 'empresas', columnaDestino: 'id', remapeo: 'empresa_destino' },
    { columna: 'movimiento_destino_id', tabla: 'movimientos_tesoreria', columnaDestino: 'id', remapeo: 'identificador' },
    { columna: 'movimiento_origen_id', tabla: 'movimientos_tesoreria', columnaDestino: 'id', remapeo: 'identificador' },
    { columna: 'periodo_id', tabla: 'periodos', columnaDestino: 'id', remapeo: 'identificador' },
  ] },
  { tabla: 'usuario_empresa', ambito: 'control', exportar: false, motivoExclusion: 'Datos de control, identidades o permisos excluidos.', clavePrimaria: ['id'], remapearClave: false, columnaEmpresa: 'empresa_id', referencias: [
    { columna: 'empresa_id', tabla: 'empresas', columnaDestino: 'id', remapeo: 'empresa_destino' },
    { columna: 'usuario_id', tabla: 'usuarios_estudio', columnaDestino: 'id', remapeo: 'evidencia_origen' },
  ] },
];

export const REGISTRO_ARCHIVOS_EMPRESA = [
  { carpeta: 'adjuntos', exportar: true },
  { carpeta: 'xml', exportar: true },
  { carpeta: 'cdr', exportar: true },
  { carpeta: 'pdf', exportar: true },
  { carpeta: 'txt', exportar: true },
  { carpeta: 'temporales', exportar: false, motivoExclusion: 'Archivos operativos transitorios.' },
  { carpeta: 'respaldos', exportar: false, motivoExclusion: 'Evitar respaldos recursivos; retención independiente.' }
] as const;
