-- Identidades y configuración pertenecen al control del estudio.
CREATE TABLE IF NOT EXISTS usuario_empresa (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL REFERENCES usuarios_estudio(id) ON DELETE CASCADE,
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    rol_en_empresa VARCHAR(50) NOT NULL CHECK (rol_en_empresa IN ('ADMINISTRADOR', 'CONTADOR_SENIOR', 'ASISTENTE_CONTABLE', 'AUDITOR_REVISOR')),
    estado VARCHAR(20) NOT NULL DEFAULT 'ACTIVO' CHECK (estado IN ('ACTIVO', 'INACTIVO', 'REVOCADO')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_usuario_empresa_asignacion UNIQUE (usuario_id, empresa_id)
);
CREATE INDEX IF NOT EXISTS idx_usuario_empresa_uid ON usuario_empresa(usuario_id);
CREATE INDEX IF NOT EXISTS idx_usuario_empresa_eid ON usuario_empresa(empresa_id);

CREATE TABLE IF NOT EXISTS estudio_configuracion (
    id BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (id),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    nombre_estudio TEXT NOT NULL,
    ruc_estudio TEXT NOT NULL,
    email_contacto TEXT NOT NULL,
    telefono_contacto TEXT NOT NULL,
    direccion_fiscal TEXT,
    fecha_registro TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
    token_id UUID PRIMARY KEY,
    usuario_id UUID NOT NULL REFERENCES usuarios_estudio(id) ON DELETE CASCADE,
    empresa_id TEXT NOT NULL DEFAULT '',
    expires_at TIMESTAMPTZ NOT NULL,
    revoked BOOLEAN NOT NULL DEFAULT FALSE,
    mfa_verificado BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_usuario ON refresh_tokens(usuario_id);

CREATE TABLE IF NOT EXISTS sunat_empresa_keys (
    empresa_id UUID PRIMARY KEY REFERENCES empresas(id) ON DELETE CASCADE,
    encrypted_dek TEXT NOT NULL,
    key_version INTEGER NOT NULL DEFAULT 2,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS auditoria_log (
    id VARCHAR(64) PRIMARY KEY,
    empresa_id UUID NOT NULL REFERENCES empresas(id),
    usuario_id UUID NOT NULL REFERENCES usuarios_estudio(id),
    tabla_afectada VARCHAR(100) NOT NULL,
    registro_id VARCHAR(100) NOT NULL,
    accion VARCHAR(50) NOT NULL,
    datos_anteriores JSONB,
    datos_nuevos JSONB,
    hash_previo VARCHAR(64) NOT NULL,
    hash_actual VARCHAR(64) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_auditoria_log_empresa ON auditoria_log(empresa_id, created_at);

CREATE OR REPLACE FUNCTION fn_auditoria_append_only() RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'AUDITORIA_INMUTABLE';
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_auditoria_append_only ON auditoria_log;
CREATE TRIGGER trg_auditoria_append_only BEFORE UPDATE OR DELETE OR TRUNCATE ON auditoria_log
FOR EACH STATEMENT EXECUTE FUNCTION fn_auditoria_append_only();
