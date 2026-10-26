-- ============================================================================
-- FASE 6 — Esquema SQL: Integración SUNAT/SIRE, XML UBL/CDR y Libros PLE
-- ============================================================================

-- 1. Conexiones y Credenciales SUNAT Cifradas (AES-256-GCM)
CREATE TABLE IF NOT EXISTS sunat_conexiones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    ruc VARCHAR(11) NOT NULL,
    usuario_sol_encrypted TEXT NOT NULL,
    clave_sol_encrypted TEXT NOT NULL,
    client_id_encrypted TEXT,
    client_secret_encrypted TEXT,
    key_version INTEGER NOT NULL DEFAULT 1,
    estado VARCHAR(30) NOT NULL DEFAULT 'SIN_CONFIGURAR' CHECK (
        estado IN ('SIN_CONFIGURAR', 'VALIDANDO', 'CONECTADO', 'ERROR', 'CREDENCIALES_VENCIDAS', 'MODO_SIMULADO')
    ),
    modo_simulado BOOLEAN NOT NULL DEFAULT TRUE,
    ultimo_chequeo TIMESTAMPTZ,
    ultimo_error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_sunat_conexion_empresa UNIQUE (empresa_id)
);

-- 2. Tokens de Acceso SUNAT OAuth 2.0 Cifrados
CREATE TABLE IF NOT EXISTS sunat_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    access_token_encrypted TEXT NOT NULL,
    token_type VARCHAR(20) NOT NULL DEFAULT 'Bearer',
    expires_in INTEGER NOT NULL DEFAULT 3600,
    expires_at TIMESTAMPTZ NOT NULL,
    key_version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_sunat_token_empresa UNIQUE (empresa_id)
);

-- 3. Propuestas SIRE (RCE Compras / RVIE Ventas)
CREATE TABLE IF NOT EXISTS sire_propuestas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    tipo VARCHAR(10) NOT NULL CHECK (tipo IN ('COMPRAS', 'VENTAS')),
    periodo VARCHAR(7) NOT NULL, -- YYYY-MM
    fecha_descarga TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    hash_archivo VARCHAR(64) NOT NULL,
    total_registros INTEGER NOT NULL DEFAULT 0,
    total_base_gravada NUMERIC(14,2) NOT NULL DEFAULT 0.00,
    total_igv NUMERIC(14,2) NOT NULL DEFAULT 0.00,
    total_importe NUMERIC(14,2) NOT NULL DEFAULT 0.00,
    raw_data JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_sire_propuesta_hash UNIQUE (empresa_id, tipo, periodo, hash_archivo)
);

CREATE TABLE IF NOT EXISTS sire_propuesta_lineas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    propuesta_id UUID NOT NULL REFERENCES sire_propuestas(id) ON DELETE CASCADE,
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    car VARCHAR(50) NOT NULL,
    tipo_comprobante VARCHAR(5) NOT NULL,
    serie VARCHAR(10) NOT NULL,
    numero VARCHAR(20) NOT NULL,
    fecha_emision DATE NOT NULL,
    fecha_vencimiento DATE,
    ruc_emisor VARCHAR(15) NOT NULL,
    razon_social_emisor VARCHAR(200) NOT NULL,
    ruc_receptor VARCHAR(15) NOT NULL,
    razon_social_receptor VARCHAR(200) NOT NULL,
    moneda VARCHAR(3) NOT NULL DEFAULT 'PEN',
    tipo_cambio NUMERIC(8,4) NOT NULL DEFAULT 1.0000,
    base_gravada NUMERIC(14,2) NOT NULL DEFAULT 0.00,
    igv NUMERIC(14,2) NOT NULL DEFAULT 0.00,
    total NUMERIC(14,2) NOT NULL DEFAULT 0.00,
    tiene_detraccion BOOLEAN NOT NULL DEFAULT FALSE,
    codigo_detraccion VARCHAR(10),
    clasificacion VARCHAR(30) DEFAULT 'MERCADERIA',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 4. Conciliaciones SIRE vs ERP
CREATE TABLE IF NOT EXISTS sire_conciliaciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    propuesta_id UUID NOT NULL REFERENCES sire_propuestas(id) ON DELETE CASCADE,
    tipo VARCHAR(10) NOT NULL CHECK (tipo IN ('COMPRAS', 'VENTAS')),
    periodo VARCHAR(7) NOT NULL,
    fecha_conciliacion TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    total_coinciden INTEGER NOT NULL DEFAULT 0,
    total_solo_sistema INTEGER NOT NULL DEFAULT 0,
    total_solo_sunat INTEGER NOT NULL DEFAULT 0,
    total_diferencias INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sire_conciliacion_lineas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conciliacion_id UUID NOT NULL REFERENCES sire_conciliaciones(id) ON DELETE CASCADE,
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    comprobante_sistema_id VARCHAR(50),
    linea_propuesta_id UUID REFERENCES sire_propuesta_lineas(id),
    clave_comprobante VARCHAR(100) NOT NULL, -- TIPO-SERIE-NUMERO-RUC
    estado_conciliacion VARCHAR(30) NOT NULL CHECK (
        estado_conciliacion IN ('COINCIDE', 'SOLO_EN_SISTEMA', 'SOLO_EN_SUNAT', 'DIFERENCIA_IMPORTE')
    ),
    decision VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE' CHECK (
        decision IN ('PENDIENTE', 'ACEPTADA', 'OBSERVADA', 'IGNORADA')
    ),
    motivo_decision TEXT,
    usuario_decision_id UUID REFERENCES usuarios_estudio(id),
    fecha_decision TIMESTAMPTZ,
    diferencia_base NUMERIC(14,2) NOT NULL DEFAULT 0.00,
    diferencia_igv NUMERIC(14,2) NOT NULL DEFAULT 0.00,
    diferencia_total NUMERIC(14,2) NOT NULL DEFAULT 0.00,
    comprobante_generado_id VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 5. Comprobantes XML UBL 2.1 y CDR Importados
CREATE TABLE IF NOT EXISTS comprobantes_xml (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    nombre_archivo VARCHAR(255) NOT NULL,
    hash_sha256 VARCHAR(64) NOT NULL,
    tamano_bytes INTEGER NOT NULL,
    tipo_documento VARCHAR(5) NOT NULL,
    serie VARCHAR(10) NOT NULL,
    numero VARCHAR(20) NOT NULL,
    ruc_emisor VARCHAR(15) NOT NULL,
    ruc_receptor VARCHAR(15) NOT NULL,
    fecha_emision DATE NOT NULL,
    moneda VARCHAR(3) NOT NULL DEFAULT 'PEN',
    total NUMERIC(14,2) NOT NULL,
    tiene_cdr BOOLEAN NOT NULL DEFAULT FALSE,
    cdr_estado VARCHAR(30) DEFAULT 'ACEPTADO',
    estado_procesamiento VARCHAR(20) NOT NULL DEFAULT 'IMPORTADO' CHECK (
        estado_procesamiento IN ('IMPORTADO', 'REGISTRADO', 'ERROR')
    ),
    comprobante_registrado_id VARCHAR(50),
    error_mensaje TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_xml_empresa_hash UNIQUE (empresa_id, hash_sha256)
);

-- 6. Configuración Versionada de Libros Electrónicos PLE
CREATE TABLE IF NOT EXISTS ple_libros_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo_libro VARCHAR(20) NOT NULL, -- '080100', '080200', '140100', '050100', '060100'
    nombre_libro VARCHAR(150) NOT NULL,
    version_formato VARCHAR(20) NOT NULL DEFAULT 'PLE_5.2',
    estructura_columnas JSONB NOT NULL,
    reglas_nomenclatura VARCHAR(100) NOT NULL,
    validado_oficial BOOLEAN NOT NULL DEFAULT FALSE,
    especificacion_normativa TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_ple_libro_codigo_ver UNIQUE (codigo_libro, version_formato)
);

-- 7. Historial de Exportaciones PLE
CREATE TABLE IF NOT EXISTS ple_exportaciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    periodo VARCHAR(7) NOT NULL,
    codigo_libro VARCHAR(20) NOT NULL,
    nombre_archivo VARCHAR(255) NOT NULL,
    contenido_txt TEXT NOT NULL,
    hash_sha256 VARCHAR(64) NOT NULL,
    total_filas INTEGER NOT NULL DEFAULT 0,
    es_oficial BOOLEAN NOT NULL DEFAULT FALSE,
    validaciones_superadas BOOLEAN NOT NULL DEFAULT TRUE,
    detalle_validaciones JSONB,
    usuario_id UUID REFERENCES usuarios_estudio(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 8. Cola Asíncrona de Trabajos SUNAT (Descargas SIRE, Lotes XML, PLE)
CREATE TABLE IF NOT EXISTS sunat_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    tipo_trabajo VARCHAR(40) NOT NULL CHECK (
        tipo_trabajo IN ('DESCARGA_SIRE_COMPRAS', 'DESCARGA_SIRE_VENTAS', 'IMPORTACION_XML_LOTE', 'GENERACION_PLE')
    ),
    parametros JSONB NOT NULL DEFAULT '{}',
    estado VARCHAR(20) NOT NULL DEFAULT 'EN_COLA' CHECK (
        estado IN ('EN_COLA', 'PROCESANDO', 'COMPLETADO', 'ERROR')
    ),
    progreso INTEGER NOT NULL DEFAULT 0 CHECK (progreso BETWEEN 0 AND 100),
    reintentos INTEGER NOT NULL DEFAULT 0,
    max_reintentos INTEGER NOT NULL DEFAULT 3,
    resultado JSONB,
    error_mensaje TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
