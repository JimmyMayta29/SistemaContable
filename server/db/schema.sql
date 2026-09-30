-- ============================================================================
-- SUNAConta PRO — Esquema de Base de Datos Relacional (PostgreSQL)
-- Fase 1: Fundaciones, Tenancy, Seguridad, Maestros y Parámetros
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1. TENANTS Y SEGURIDAD MULTIEMPRESA
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(150) NOT NULL,
    subdominio VARCHAR(60) UNIQUE,
    estado VARCHAR(20) NOT NULL DEFAULT 'ACTIVO' CHECK (estado IN ('ACTIVO', 'SUSPENDIDO', 'INACTIVO')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS usuarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    email VARCHAR(120) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    nombres VARCHAR(80) NOT NULL,
    apellidos VARCHAR(80) NOT NULL,
    telefono VARCHAR(30),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo VARCHAR(30) NOT NULL UNIQUE, -- 'ADMIN_ESTUDIO', 'CONTADOR', 'ASISTENTE', 'AUDITOR'
    nombre VARCHAR(80) NOT NULL,
    descripcion TEXT
);

CREATE TABLE IF NOT EXISTS permisos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    modulo VARCHAR(40) NOT NULL,
    accion VARCHAR(40) NOT NULL,
    descripcion TEXT,
    CONSTRAINT uq_modulo_accion UNIQUE (modulo, accion)
);

CREATE TABLE IF NOT EXISTS rol_permisos (
    rol_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permiso_id UUID NOT NULL REFERENCES permisos(id) ON DELETE CASCADE,
    PRIMARY KEY (rol_id, permiso_id)
);

-- ----------------------------------------------------------------------------
-- 2. EMPRESAS CLIENTES Y MEMBRESÍAS
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS empresas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
    codigo_empresa VARCHAR(20) NOT NULL,
    ruc CHAR(11) NOT NULL,
    razon_social VARCHAR(200) NOT NULL,
    nombre_comercial VARCHAR(200),
    regimen_tributario VARCHAR(30) NOT NULL CHECK (
        regimen_tributario IN ('MYPE_TRIBUTARIO', 'REGIMEN_GENERAL', 'REGIMEN_ESPECIAL', 'NRUS')
    ),
    domicilio_fiscal TEXT NOT NULL,
    urbanizacion VARCHAR(100),
    departamento VARCHAR(50),
    provincia VARCHAR(50),
    distrito VARCHAR(50),
    ubigeo CHAR(6),
    contacto_nombre VARCHAR(120),
    contacto_telefono VARCHAR(40),
    contacto_email VARCHAR(120),
    moneda_principal CHAR(3) NOT NULL DEFAULT 'PEN' CHECK (moneda_principal IN ('PEN', 'USD')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_empresa_ruc_tenant UNIQUE (tenant_id, ruc)
);

CREATE TABLE IF NOT EXISTS membresias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    rol_id UUID NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_usuario_empresa UNIQUE (usuario_id, empresa_id)
);

CREATE TABLE IF NOT EXISTS credenciales_sunat (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL UNIQUE REFERENCES empresas(id) ON DELETE CASCADE,
    usuario_sol VARCHAR(100) NOT NULL,
    clave_sol_encrypted TEXT NOT NULL,
    clave_sol_iv TEXT NOT NULL,
    clave_sol_tag TEXT NOT NULL,
    client_id_sire VARCHAR(150),
    client_secret_encrypted TEXT,
    client_secret_iv TEXT,
    client_secret_tag TEXT,
    ambiente VARCHAR(20) NOT NULL DEFAULT 'PRODUCCION' CHECK (ambiente IN ('PRODUCCION', 'BETA_TEST')),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 3. EJERCICIOS Y PERÍODOS CONTABLES
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS ejercicios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    anio SMALLINT NOT NULL CHECK (anio BETWEEN 2000 AND 2100),
    estado VARCHAR(20) NOT NULL DEFAULT 'ABIERTO' CHECK (estado IN ('ABIERTO', 'CERRADO')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_empresa_ejercicio UNIQUE (empresa_id, anio)
);

CREATE TABLE IF NOT EXISTS periodos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    ejercicio_id UUID NOT NULL REFERENCES ejercicios(id) ON DELETE CASCADE,
    anio SMALLINT NOT NULL,
    mes SMALLINT NOT NULL CHECK (mes BETWEEN 0 AND 13),
    codigo_periodo CHAR(7) NOT NULL, -- '2026-09'
    estado VARCHAR(20) NOT NULL DEFAULT 'ABIERTO' CHECK (estado IN ('ABIERTO', 'CERRADO', 'BLOQUEADO_AUDITORIA')),
    fecha_cierre TIMESTAMPTZ,
    cerrado_por UUID REFERENCES usuarios(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_empresa_periodo UNIQUE (empresa_id, codigo_periodo)
);

-- ----------------------------------------------------------------------------
-- 4. MAESTROS: PCGE, ANEXOS, SUBDIARIOS, TIPOS DE CAMBIO
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS plantilla_pcge (
    codigo VARCHAR(10) PRIMARY KEY,
    nombre VARCHAR(200) NOT NULL,
    nivel SMALLINT NOT NULL CHECK (nivel BETWEEN 1 AND 5),
    tipo_cuenta VARCHAR(20) NOT NULL CHECK (tipo_cuenta IN ('ACTIVO', 'PASIVO', 'PATRIMONIO', 'GASTO', 'INGRESO', 'FUNCION', 'ORDEN')),
    permite_movimiento BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS plan_cuentas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    codigo VARCHAR(10) NOT NULL,
    nombre VARCHAR(200) NOT NULL,
    nivel SMALLINT NOT NULL CHECK (nivel BETWEEN 1 AND 5),
    tipo_cuenta VARCHAR(20) NOT NULL CHECK (tipo_cuenta IN ('ACTIVO', 'PASIVO', 'PATRIMONIO', 'GASTO', 'INGRESO', 'FUNCION', 'ORDEN')),
    permite_movimiento BOOLEAN NOT NULL DEFAULT TRUE,
    requiere_anexo BOOLEAN NOT NULL DEFAULT FALSE,
    requiere_doc_ref BOOLEAN NOT NULL DEFAULT FALSE,
    requiere_centro_costo BOOLEAN NOT NULL DEFAULT FALSE,
    cuenta_destino_debe VARCHAR(10),
    cuenta_destino_haber VARCHAR(10),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_empresa_cuenta UNIQUE (empresa_id, codigo)
);

CREATE TABLE IF NOT EXISTS subdiarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    codigo CHAR(2) NOT NULL,
    descripcion VARCHAR(120) NOT NULL,
    tipo VARCHAR(30) NOT NULL CHECK (
        tipo IN ('APERTURA', 'COMPRAS', 'VENTAS', 'COBRANZAS', 'PAGOS', 'BANCOS', 'HONORARIOS', 'PLANILLA', 'DESTINO', 'CIERRE')
    ),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT uq_empresa_subdiario UNIQUE (empresa_id, codigo)
);

CREATE TABLE IF NOT EXISTS anexos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    tipo_documento CHAR(1) NOT NULL CHECK (tipo_documento IN ('6', '1', '4', '7', '0')),
    numero_documento VARCHAR(20) NOT NULL,
    razon_social VARCHAR(200) NOT NULL,
    direccion TEXT,
    tipo_entidad VARCHAR(20) NOT NULL CHECK (tipo_entidad IN ('CLIENTE', 'PROVEEDOR', 'EMPLEADO', 'AMBOS')),
    condicion_sunat VARCHAR(20) DEFAULT 'HABIDO',
    estado_sunat VARCHAR(20) DEFAULT 'ACTIVO',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_empresa_anexo UNIQUE (empresa_id, tipo_documento, numero_documento)
);

CREATE TABLE IF NOT EXISTS tipos_cambio (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fecha DATE NOT NULL UNIQUE,
    compra NUMERIC(10,4) NOT NULL CHECK (compra > 0),
    venta NUMERIC(10,4) NOT NULL CHECK (venta > 0),
    fuente VARCHAR(20) NOT NULL DEFAULT 'SUNAT' CHECK (fuente IN ('SUNAT', 'SBS', 'MANUAL')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 5. PARÁMETROS TRIBUTARIOS Y CRONOGRAMA SUNAT
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS parametros_tributarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo_parametro VARCHAR(50) NOT NULL,
    descripcion VARCHAR(200) NOT NULL,
    valor_numerico NUMERIC(18,4) NOT NULL,
    vigente_desde DATE NOT NULL,
    vigente_hasta DATE,
    categoria VARCHAR(40) NOT NULL CHECK (categoria IN ('IGV', 'RENTA', 'LABORAL', 'DETRACCIONES', 'UIT')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_parametro_vigencia UNIQUE (codigo_parametro, vigente_desde)
);

CREATE TABLE IF NOT EXISTS cronograma_vencimientos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    periodo CHAR(7) NOT NULL,
    ultimo_digito_ruc CHAR(1) NOT NULL CHECK (ultimo_digito_ruc IN ('0','1','2','3','4','5','6','7','8','9','B')),
    fecha_vencimiento_pdt621 DATE NOT NULL,
    fecha_vencimiento_sire DATE NOT NULL,
    fecha_vencimiento_plame DATE NOT NULL,
    CONSTRAINT uq_cronograma_periodo_digito UNIQUE (periodo, ultimo_digito_ruc)
);

-- ----------------------------------------------------------------------------
-- 6. AUDITORÍA INMUTABLE
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS auditoria (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
    empresa_id UUID REFERENCES empresas(id) ON DELETE SET NULL,
    usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    usuario_email VARCHAR(120),
    tabla_afectada VARCHAR(60) NOT NULL,
    registro_id VARCHAR(64) NOT NULL,
    accion VARCHAR(20) NOT NULL CHECK (accion IN ('INSERT', 'UPDATE', 'DELETE', 'ANULAR', 'CIERRE_PERIODO', 'LOGIN')),
    datos_anteriores JSONB,
    datos_nuevos JSONB,
    direccion_ip VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_auditoria_empresa ON auditoria (empresa_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auditoria_registro ON auditoria (tabla_afectada, registro_id);
