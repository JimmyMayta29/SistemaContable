-- ============================================================================
-- FASE 5 — Esquema SQL: Libros Contables, Balances, Estados Financieros y Exportación
-- ============================================================================

-- 1. Tabla / Almacén de Saldos Mensuales (Optimización para millones de líneas)
CREATE TABLE IF NOT EXISTS saldos_mensuales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    periodo VARCHAR(7) NOT NULL, -- '2026-09'
    cuenta_codigo VARCHAR(20) NOT NULL,
    cuenta_nombre VARCHAR(200) NOT NULL,
    anexo_id UUID REFERENCES anexos(id) ON DELETE SET NULL,
    saldo_inicial_debe NUMERIC(14,2) NOT NULL DEFAULT 0.00,
    saldo_inicial_haber NUMERIC(14,2) NOT NULL DEFAULT 0.00,
    movimiento_debe NUMERIC(14,2) NOT NULL DEFAULT 0.00,
    movimiento_haber NUMERIC(14,2) NOT NULL DEFAULT 0.00,
    saldo_final_debe NUMERIC(14,2) NOT NULL DEFAULT 0.00,
    saldo_final_haber NUMERIC(14,2) NOT NULL DEFAULT 0.00,
    actualizado_al TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_saldos_mensuales_cuenta UNIQUE (empresa_id, periodo, cuenta_codigo)
);

CREATE INDEX IF NOT EXISTS idx_saldos_mensuales_empresa_periodo 
ON saldos_mensuales(empresa_id, periodo);

CREATE INDEX IF NOT EXISTS idx_saldos_mensuales_busqueda 
ON saldos_mensuales(empresa_id, periodo, cuenta_codigo);

-- 2. Configuración y Mapeo de Estados Financieros por Empresa
CREATE TABLE IF NOT EXISTS config_estados_financieros (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    tipo_reporte VARCHAR(40) NOT NULL CHECK (
        tipo_reporte IN ('SITUACION_FINANCIERA', 'RESULTADOS_NATURALEZA', 'RESULTADOS_FUNCION', 'FLUJO_EFECTIVO')
    ),
    rubro_codigo VARCHAR(40) NOT NULL,
    rubro_nombre VARCHAR(150) NOT NULL,
    categoria VARCHAR(50) NOT NULL, -- 'ACTIVO_CORRIENTE', 'PASIVO_NO_CORRIENTE', etc.
    orden INTEGER NOT NULL,
    cuentas_patron VARCHAR(255) NOT NULL, -- Ej: '10*,11*,12*' o fórmula
    signo INTEGER NOT NULL DEFAULT 1, -- 1 o -1
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_config_ef_rubro UNIQUE (empresa_id, tipo_reporte, rubro_codigo)
);

-- 3. Configuración de Membrete y Firmantes de Reportes
CREATE TABLE IF NOT EXISTS configuracion_reportes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL UNIQUE REFERENCES empresas(id) ON DELETE CASCADE,
    razon_social VARCHAR(200) NOT NULL,
    ruc VARCHAR(11) NOT NULL,
    direccion_fiscal TEXT NOT NULL,
    logo_url TEXT,
    contador_nombre VARCHAR(150),
    contador_matricula VARCHAR(50),
    representante_nombre VARCHAR(150),
    representante_dni VARCHAR(20),
    moneda_presentacion VARCHAR(3) NOT NULL DEFAULT 'PEN',
    pie_pagina TEXT DEFAULT 'Documento emitido conforme al Plan Contable General Empresarial (PCGE) y normativa de SUNAT.',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 4. Registro y Cola de Reportes Generados Asíncronos
CREATE TABLE IF NOT EXISTS reportes_generados (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    tipo VARCHAR(50) NOT NULL, -- 'LIBRO_DIARIO', 'BALANCE_COMPROBACION', etc.
    formato VARCHAR(10) NOT NULL CHECK (formato IN ('PDF', 'XLSX', 'CSV', 'JSON')),
    parametros JSONB NOT NULL DEFAULT '{}'::jsonb,
    estado VARCHAR(20) NOT NULL DEFAULT 'EN_COLA' CHECK (estado IN ('EN_COLA', 'PROCESANDO', 'LISTO', 'ERROR')),
    nombre_archivo VARCHAR(255) NOT NULL,
    archivo_url TEXT,
    contenido_base64 TEXT,
    tamano_bytes INTEGER,
    hash_contenido VARCHAR(64), -- SHA-256
    mensaje_error TEXT,
    usuario_id UUID REFERENCES usuarios(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    finished_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_reportes_generados_empresa 
ON reportes_generados(empresa_id, created_at DESC);
