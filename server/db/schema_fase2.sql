-- ============================================================================
-- SUNAConta PRO — Migración Fase 2: Motor Contable Relacional
-- ============================================================================

-- 1. Centros de Costo
CREATE TABLE IF NOT EXISTS centros_costo (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    codigo VARCHAR(20) NOT NULL,
    descripcion VARCHAR(120) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_centro_costo_empresa UNIQUE (empresa_id, codigo)
);

-- 2. Correlativos por Empresa, Período y Subdiario (Garantía atómica anti-saltos)
CREATE TABLE IF NOT EXISTS correlativos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    periodo_id UUID NOT NULL REFERENCES periodos(id) ON DELETE CASCADE,
    subdiario_id UUID NOT NULL REFERENCES subdiarios(id) ON DELETE CASCADE,
    ultimo_numero INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_correlativo_empresa_periodo_subdiario UNIQUE (empresa_id, periodo_id, subdiario_id)
);

-- 3. Cabecera de Asientos Contables
CREATE TABLE IF NOT EXISTS asientos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    periodo_id UUID NOT NULL REFERENCES periodos(id) ON DELETE RESTRICT,
    subdiario_id UUID NOT NULL REFERENCES subdiarios(id) ON DELETE RESTRICT,
    numero VARCHAR(20), -- Nullable para borradores; obligatorio y correlativo al contabilizar
    fecha DATE NOT NULL,
    glosa VARCHAR(255) NOT NULL,
    moneda CHAR(3) NOT NULL DEFAULT 'PEN' CHECK (moneda IN ('PEN', 'USD')),
    tipo_cambio NUMERIC(10,4) NOT NULL DEFAULT 1.0000 CHECK (tipo_cambio > 0),
    estado VARCHAR(20) NOT NULL DEFAULT 'BORRADOR' CHECK (estado IN ('BORRADOR', 'CONTABILIZADO', 'ANULADO')),
    origen VARCHAR(30) NOT NULL DEFAULT 'MANUAL' CHECK (
        origen IN ('MANUAL', 'COMPRA', 'VENTA', 'COBRANZA', 'PAGO', 'HONORARIO', 'PLANILLA', 'DESTINO', 'AJUSTE', 'CIERRE', 'APERTURA', 'RECURRENTE')
    ),
    origen_id VARCHAR(64),
    asiento_extorno_id UUID REFERENCES asientos(id),
    motivo_anulacion TEXT,
    version INTEGER NOT NULL DEFAULT 1, -- Bloqueo optimista
    created_by UUID REFERENCES usuarios(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID REFERENCES usuarios(id),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    anulado_by UUID REFERENCES usuarios(id),
    anulado_at TIMESTAMPTZ,
    CONSTRAINT uq_asiento_empresa_periodo_subdiario_numero UNIQUE (empresa_id, periodo_id, subdiario_id, numero)
);

-- 4. Detalle de Asientos Contables
CREATE TABLE IF NOT EXISTS asiento_detalle (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asiento_id UUID NOT NULL REFERENCES asientos(id) ON DELETE CASCADE,
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    linea INTEGER NOT NULL,
    cuenta_id UUID NOT NULL REFERENCES plan_cuentas(id) ON DELETE RESTRICT,
    anexo_id UUID REFERENCES anexos(id) ON DELETE RESTRICT,
    debe NUMERIC(18,2) NOT NULL DEFAULT 0.00 CHECK (debe >= 0),
    haber NUMERIC(18,2) NOT NULL DEFAULT 0.00 CHECK (haber >= 0),
    debe_me NUMERIC(18,2) NOT NULL DEFAULT 0.00 CHECK (debe_me >= 0),
    haber_me NUMERIC(18,2) NOT NULL DEFAULT 0.00 CHECK (haber_me >= 0),
    centro_costo_id UUID REFERENCES centros_costo(id),
    doc_tipo CHAR(2),
    doc_serie VARCHAR(10),
    doc_numero VARCHAR(20),
    fecha_vencimiento DATE,
    glosa_linea VARCHAR(200),
    CONSTRAINT chk_debe_haber_excluyente CHECK (NOT (debe > 0 AND haber > 0)),
    CONSTRAINT chk_debe_haber_me_excluyente CHECK (NOT (debe_me > 0 AND haber_me > 0)),
    CONSTRAINT uq_asiento_linea UNIQUE (asiento_id, linea)
);

-- 5. Reglas de Contabilización Parametrizables por Empresa
CREATE TABLE IF NOT EXISTS reglas_contabilizacion (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    tipo_operacion VARCHAR(40) NOT NULL CHECK (
        tipo_operacion IN (
            'COMPRA_MERCADERIA', 'COMPRA_SERVICIO', 'VENTA', 'COBRANZA', 'PAGO', 
            'HONORARIO', 'PLANILLA', 'DETRACCION', 'DESTINO_FUNCION', 'DESTINO_ALMACEN', 'DIFERENCIA_CAMBIO'
        )
    ),
    nombre VARCHAR(120) NOT NULL,
    descripcion TEXT,
    porcentaje_admin NUMERIC(5,2) DEFAULT 60.00, -- Ej. 60% Admin para destino
    porcentaje_ventas NUMERIC(5,2) DEFAULT 40.00, -- Ej. 40% Ventas para destino
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_empresa_regla_tipo UNIQUE (empresa_id, tipo_operacion)
);

CREATE TABLE IF NOT EXISTS reglas_contabilizacion_detalle (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    regla_id UUID NOT NULL REFERENCES reglas_contabilizacion(id) ON DELETE CASCADE,
    orden INTEGER NOT NULL,
    codigo_cuenta VARCHAR(10) NOT NULL,
    lado VARCHAR(10) NOT NULL CHECK (lado IN ('DEBE', 'HABER')),
    base_calculo VARCHAR(40) NOT NULL CHECK (
        base_calculo IN (
            'TOTAL', 'BASE_IMPONIBLE', 'IGV', 'RETENCION', 'NETO', 'PORCENTAJE_DE_OTRA_LINEA'
        )
    ),
    porcentaje NUMERIC(7,4) DEFAULT 100.0000,
    parametro_referencia VARCHAR(50), -- Ej. 'TASA_IGV', 'TASA_RETENCION_4TA'
    glosa_defecto VARCHAR(150),
    CONSTRAINT uq_regla_orden UNIQUE (regla_id, orden)
);

-- 6. Asientos Recurrentes
CREATE TABLE IF NOT EXISTS asientos_recurrentes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    nombre VARCHAR(120) NOT NULL,
    frecuencia VARCHAR(20) NOT NULL DEFAULT 'MENSUAL' CHECK (frecuencia IN ('MENSUAL', 'QUINCENAL', 'ANUAL')),
    dia_del_mes SMALLINT NOT NULL DEFAULT 1 CHECK (dia_del_mes BETWEEN 1 AND 31),
    proxima_generacion DATE NOT NULL,
    datos_asiento JSONB NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- ÍNDICES DE RENDIMIENTO Y CONSULTAS FRECUENTES
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_asientos_empresa_periodo ON asientos(empresa_id, periodo_id, estado);
CREATE INDEX IF NOT EXISTS idx_asientos_fecha ON asientos(empresa_id, fecha);
CREATE INDEX IF NOT EXISTS idx_asientos_subdiario_numero ON asientos(empresa_id, subdiario_id, numero);
CREATE INDEX IF NOT EXISTS idx_asiento_detalle_asiento ON asiento_detalle(asiento_id);
CREATE INDEX IF NOT EXISTS idx_asiento_detalle_cuenta ON asiento_detalle(empresa_id, cuenta_id);
CREATE INDEX IF NOT EXISTS idx_asiento_detalle_anexo ON asiento_detalle(empresa_id, anexo_id);

-- ----------------------------------------------------------------------------
-- POLÍTICAS RLS (Row Level Security)
-- ----------------------------------------------------------------------------
ALTER TABLE asientos ENABLE ROW LEVEL SECURITY;
ALTER TABLE asiento_detalle ENABLE ROW LEVEL SECURITY;
ALTER TABLE correlativos ENABLE ROW LEVEL SECURITY;
ALTER TABLE reglas_contabilizacion ENABLE ROW LEVEL SECURITY;
ALTER TABLE reglas_contabilizacion_detalle ENABLE ROW LEVEL SECURITY;
ALTER TABLE centros_costo ENABLE ROW LEVEL SECURITY;
ALTER TABLE asientos_recurrentes ENABLE ROW LEVEL SECURITY;

CREATE POLICY rls_asientos ON asientos
    FOR ALL
    USING (empresa_id = NULLIF(current_setting('app.current_empresa_id', true), '')::UUID);

CREATE POLICY rls_asiento_detalle ON asiento_detalle
    FOR ALL
    USING (empresa_id = NULLIF(current_setting('app.current_empresa_id', true), '')::UUID);

CREATE POLICY rls_correlativos ON correlativos
    FOR ALL
    USING (empresa_id = NULLIF(current_setting('app.current_empresa_id', true), '')::UUID);

CREATE POLICY rls_reglas_contabilizacion ON reglas_contabilizacion
    FOR ALL
    USING (empresa_id = NULLIF(current_setting('app.current_empresa_id', true), '')::UUID);

CREATE POLICY rls_centros_costo ON centros_costo
    FOR ALL
    USING (empresa_id = NULLIF(current_setting('app.current_empresa_id', true), '')::UUID);

CREATE POLICY rls_asientos_recurrentes ON asientos_recurrentes
    FOR ALL
    USING (empresa_id = NULLIF(current_setting('app.current_empresa_id', true), '')::UUID);
