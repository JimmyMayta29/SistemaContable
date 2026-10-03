-- ============================================================================
-- MIGRACIÓN FASE 7: SEGURIDAD, RBAC, ENVELOPE ENCRYPTION, AUDITORÍA Y RLS
-- ============================================================================

-- 1. TABLA DE USUARIOS DEL ESTUDIO CONTABLE
CREATE TABLE IF NOT EXISTS usuarios_estudio (
    id VARCHAR(50) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    nombre VARCHAR(150) NOT NULL,
    rol_global VARCHAR(50) NOT NULL CHECK (rol_global IN ('ADMIN_ESTUDIO', 'CONTADOR_SENIOR', 'ASISTENTE_CONTABLE', 'AUDITOR_REVISOR')),
    mfa_secret VARCHAR(64),
    mfa_activado BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_usuarios_estudio_email ON usuarios_estudio(email);

-- 2. TABLA DE ASIGNACIÓN USUARIO - EMPRESA (MEMBRESÍAS CON RBAC)
CREATE TABLE IF NOT EXISTS usuario_empresa (
    id VARCHAR(50) PRIMARY KEY,
    usuario_id VARCHAR(50) NOT NULL REFERENCES usuarios_estudio(id) ON DELETE CASCADE,
    empresa_id VARCHAR(50) NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    rol_en_empresa VARCHAR(50) NOT NULL CHECK (rol_en_empresa IN ('ADMIN_ESTUDIO', 'CONTADOR_SENIOR', 'ASISTENTE_CONTABLE', 'AUDITOR_REVISOR')),
    estado VARCHAR(20) DEFAULT 'ACTIVO' CHECK (estado IN ('ACTIVO', 'INACTIVO', 'REVOCADO')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_usuario_empresa UNIQUE (usuario_id, empresa_id)
);

CREATE INDEX IF NOT EXISTS idx_usuario_empresa_uid ON usuario_empresa(usuario_id);
CREATE INDEX IF NOT EXISTS idx_usuario_empresa_eid ON usuario_empresa(empresa_id);

-- 3. TABLA DE LLAVES DE ENVELOPE ENCRYPTION POR EMPRESA (DEK cifrada con KEK)
CREATE TABLE IF NOT EXISTS sunat_empresa_keys (
    empresa_id VARCHAR(50) PRIMARY KEY REFERENCES empresas(id) ON DELETE CASCADE,
    encrypted_dek TEXT NOT NULL,
    key_version INTEGER NOT NULL DEFAULT 2,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. TABLA DE AUDITORÍA APPEND-ONLY CON ENCADENAMIENTO DE HASH (BLOCKCHAIN-STYLE)
CREATE TABLE IF NOT EXISTS auditoria_log (
    id VARCHAR(64) PRIMARY KEY,
    empresa_id VARCHAR(50) NOT NULL,
    usuario_id VARCHAR(50) NOT NULL,
    tabla_afectada VARCHAR(100) NOT NULL,
    registro_id VARCHAR(100) NOT NULL,
    accion VARCHAR(50) NOT NULL,
    datos_anteriores JSONB,
    datos_nuevos JSONB,
    hash_previo VARCHAR(64) NOT NULL,
    hash_actual VARCHAR(64) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_auditoria_log_empresa ON auditoria_log(empresa_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_auditoria_log_hash ON auditoria_log(hash_actual);

-- RESTRICCIÓN DE SEGURIDAD CRÍTICA: La tabla de auditoría es exclusivamente APPEND-ONLY
-- No se permiten UPDATE ni DELETE bajo ninguna circunstancia.
REVOKE UPDATE, DELETE, TRUNCATE ON auditoria_log FROM PUBLIC;

-- 5. ROL DE APLICACIÓN CON RLS FORZADO (SIN BYPASSRLS)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_user') THEN
        CREATE ROLE app_user WITH LOGIN PASSWORD 'AppUserSecure2026!';
    END IF;
    -- Asegurar que el rol de aplicación NO tenga privilegios para eludir RLS
    ALTER ROLE app_user NOBYPASSRLS;
END
$$;

-- 6. HABILITAR Y FORZAR ROW LEVEL SECURITY EN TODAS LAS TABLAS CON empresa_id
-- Tablas del núcleo contable y comercial
ALTER TABLE asientos ENABLE ROW LEVEL SECURITY;
ALTER TABLE asientos FORCE ROW LEVEL SECURITY;

ALTER TABLE asiento_detalle ENABLE ROW LEVEL SECURITY;
ALTER TABLE asiento_detalle FORCE ROW LEVEL SECURITY;

ALTER TABLE comprobantes_compra ENABLE ROW LEVEL SECURITY;
ALTER TABLE comprobantes_compra FORCE ROW LEVEL SECURITY;

ALTER TABLE comprobantes_venta ENABLE ROW LEVEL SECURITY;
ALTER TABLE comprobantes_venta FORCE ROW LEVEL SECURITY;

ALTER TABLE cuentas_por_cobrar ENABLE ROW LEVEL SECURITY;
ALTER TABLE cuentas_por_cobrar FORCE ROW LEVEL SECURITY;

ALTER TABLE cuentas_por_pagar ENABLE ROW LEVEL SECURITY;
ALTER TABLE cuentas_por_pagar FORCE ROW LEVEL SECURITY;

ALTER TABLE movimientos_caja_banco ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimientos_caja_banco FORCE ROW LEVEL SECURITY;

ALTER TABLE recibos_honorarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE recibos_honorarios FORCE ROW LEVEL SECURITY;

ALTER TABLE planillas ENABLE ROW LEVEL SECURITY;
ALTER TABLE planillas FORCE ROW LEVEL SECURITY;

ALTER TABLE sunat_conexiones ENABLE ROW LEVEL SECURITY;
ALTER TABLE sunat_conexiones FORCE ROW LEVEL SECURITY;

ALTER TABLE comprobantes_xml ENABLE ROW LEVEL SECURITY;
ALTER TABLE comprobantes_xml FORCE ROW LEVEL SECURITY;

ALTER TABLE sire_conciliaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE sire_conciliaciones FORCE ROW LEVEL SECURITY;

ALTER TABLE ple_exportaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE ple_exportaciones FORCE ROW LEVEL SECURITY;

ALTER TABLE auditoria_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE auditoria_log FORCE ROW LEVEL SECURITY;

-- 7. POLÍTICAS DE AISLAMIENTO ESTRICTO MEDIANTE SET LOCAL app.empresa_id
-- Políticas para asientos
DROP POLICY IF EXISTS rls_asientos_empresa ON asientos;
CREATE POLICY rls_asientos_empresa ON asientos
    FOR ALL TO app_user
    USING (empresa_id = NULLIF(current_setting('app.empresa_id', true), ''))
    WITH CHECK (empresa_id = NULLIF(current_setting('app.empresa_id', true), ''));

-- Políticas para comprobantes_compra
DROP POLICY IF EXISTS rls_compras_empresa ON comprobantes_compra;
CREATE POLICY rls_compras_empresa ON comprobantes_compra
    FOR ALL TO app_user
    USING (empresa_id = NULLIF(current_setting('app.empresa_id', true), ''))
    WITH CHECK (empresa_id = NULLIF(current_setting('app.empresa_id', true), ''));

-- Políticas para comprobantes_venta
DROP POLICY IF EXISTS rls_ventas_empresa ON comprobantes_venta;
CREATE POLICY rls_ventas_empresa ON comprobantes_venta
    FOR ALL TO app_user
    USING (empresa_id = NULLIF(current_setting('app.empresa_id', true), ''))
    WITH CHECK (empresa_id = NULLIF(current_setting('app.empresa_id', true), ''));

-- Políticas para auditoria_log
DROP POLICY IF EXISTS rls_auditoria_empresa ON auditoria_log;
CREATE POLICY rls_auditoria_empresa ON auditoria_log
    FOR ALL TO app_user
    USING (empresa_id = NULLIF(current_setting('app.empresa_id', true), ''))
    WITH CHECK (empresa_id = NULLIF(current_setting('app.empresa_id', true), ''));

-- Concesión de privilegios mínimos al usuario de aplicación
GRANT USAGE ON SCHEMA public TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
REVOKE UPDATE, DELETE ON auditoria_log FROM app_user;

-- ============================================================================
-- SCRIPT DE ROLLBACK / DOWN
-- ============================================================================
/*
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM app_user;
DROP POLICY IF EXISTS rls_asientos_empresa ON asientos;
DROP POLICY IF EXISTS rls_compras_empresa ON comprobantes_compra;
DROP POLICY IF EXISTS rls_ventas_empresa ON comprobantes_venta;
DROP POLICY IF EXISTS rls_auditoria_empresa ON auditoria_log;
ALTER TABLE asientos NO FORCE ROW LEVEL SECURITY;
ALTER TABLE comprobantes_compra NO FORCE ROW LEVEL SECURITY;
ALTER TABLE comprobantes_venta NO FORCE ROW LEVEL SECURITY;
ALTER TABLE auditoria_log NO FORCE ROW LEVEL SECURITY;
DROP TABLE IF EXISTS auditoria_log;
DROP TABLE IF EXISTS sunat_empresa_keys;
DROP TABLE IF EXISTS usuario_empresa;
DROP TABLE IF EXISTS usuarios_estudio;
*/
