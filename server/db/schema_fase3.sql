-- ============================================================================
-- SUNAConta PRO — Migración Fase 3: Compras, Ventas, Cartera CxC/CxP y Tributos
-- ============================================================================

-- 1. Catálogos SUNAT Parametrizables con Vigencia
-- TODO: Validar y homologar códigos con Catálogos Oficiales de SUNAT Anexo 8 (RCE) y Anexo 10 (RVIE) vigentes
CREATE TABLE IF NOT EXISTS catalogos_sunat (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tabla_sunat VARCHAR(50) NOT NULL, -- Ej: 'TIPO_COMPROBANTE', 'BIEN_DETRACCION', 'MOTIVO_NC'
    codigo VARCHAR(20) NOT NULL,
    descripcion VARCHAR(200) NOT NULL,
    vigencia_desde DATE NOT NULL DEFAULT '2020-01-01',
    vigencia_hasta DATE,
    datos_extra JSONB, -- Porcentajes, cuentas asociadas, etc.
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT uq_catalogo_sunat_codigo UNIQUE (tabla_sunat, codigo, vigencia_desde)
);

-- 2. Comprobantes de Compra (Registro de Compras Electrónico - SIRE RCE)
-- TODO: Validar especificación de campos de propuesta RCE con RS 000040-2022/SUNAT
CREATE TABLE IF NOT EXISTS comprobantes_compra (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    periodo_id UUID NOT NULL REFERENCES periodos(id) ON DELETE RESTRICT,
    fecha_emision DATE NOT NULL,
    fecha_vencimiento DATE,
    fecha_contable DATE NOT NULL,
    tipo_comprobante CHAR(2) NOT NULL, -- 01: Factura, 03: Boleta, 07: NC, 08: ND, etc.
    serie VARCHAR(10) NOT NULL,
    numero VARCHAR(20) NOT NULL,
    proveedor_id UUID NOT NULL REFERENCES anexos(id) ON DELETE RESTRICT,
    moneda CHAR(3) NOT NULL DEFAULT 'PEN' CHECK (moneda IN ('PEN', 'USD')),
    tipo_cambio NUMERIC(10,4) NOT NULL DEFAULT 1.0000 CHECK (tipo_cambio > 0),
    base_gravada NUMERIC(18,2) NOT NULL DEFAULT 0.00 CHECK (base_gravada >= 0),
    igv NUMERIC(18,2) NOT NULL DEFAULT 0.00 CHECK (igv >= 0),
    base_no_gravada NUMERIC(18,2) NOT NULL DEFAULT 0.00 CHECK (base_no_gravada >= 0),
    exonerado NUMERIC(18,2) NOT NULL DEFAULT 0.00 CHECK (exonerado >= 0),
    isc NUMERIC(18,2) NOT NULL DEFAULT 0.00 CHECK (isc >= 0),
    icbper NUMERIC(18,2) NOT NULL DEFAULT 0.00 CHECK (icbper >= 0),
    otros_tributos NUMERIC(18,2) NOT NULL DEFAULT 0.00 CHECK (otros_tributos >= 0),
    total NUMERIC(18,2) NOT NULL CHECK (total > 0),
    
    -- Destino del Crédito Fiscal:
    -- '1': Destinado exclusivamente a operaciones gravadas (100% crédito fiscal)
    -- '2': Destinado a operaciones gravadas y no gravadas (prorrata - TODO: prorrata mixta)
    -- '3': Destinado exclusivamente a operaciones no gravadas (sin derecho a crédito)
    -- '4': Adquisiciones no gravadas
    tipo_adquisicion CHAR(1) NOT NULL DEFAULT '1' CHECK (tipo_adquisicion IN ('1', '2', '3', '4')),
    
    forma_pago VARCHAR(20) NOT NULL DEFAULT 'CONTADO' CHECK (forma_pago IN ('CONTADO', 'CREDITO')),
    dias_credito INTEGER DEFAULT 0,
    tiene_detraccion BOOLEAN NOT NULL DEFAULT FALSE,
    tiene_retencion BOOLEAN NOT NULL DEFAULT FALSE,
    estado VARCHAR(20) NOT NULL DEFAULT 'BORRADOR' CHECK (estado IN ('BORRADOR', 'REGISTRADO', 'ANULADO')),
    documento_modificado_id UUID REFERENCES comprobantes_compra(id),
    motivo_nc_nd VARCHAR(150),
    origen VARCHAR(20) NOT NULL DEFAULT 'MANUAL' CHECK (origen IN ('MANUAL', 'SIRE', 'XML')),
    asiento_id UUID REFERENCES asientos(id),
    version INTEGER NOT NULL DEFAULT 1,
    created_by UUID REFERENCES usuarios(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID REFERENCES usuarios(id),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_compra_documento UNIQUE (empresa_id, tipo_comprobante, serie, numero, proveedor_id)
);

-- 3. Comprobantes de Venta (Registro de Ventas e Ingresos Electrónico - SIRE RVIE)
-- TODO: Validar especificación de campos de propuesta RVIE con RS 000112-2021/SUNAT
CREATE TABLE IF NOT EXISTS comprobantes_venta (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    periodo_id UUID NOT NULL REFERENCES periodos(id) ON DELETE RESTRICT,
    fecha_emision DATE NOT NULL,
    fecha_vencimiento DATE,
    fecha_contable DATE NOT NULL,
    tipo_comprobante CHAR(2) NOT NULL, -- 01: Factura, 03: Boleta, 07: NC, 08: ND
    serie VARCHAR(10) NOT NULL,
    numero VARCHAR(20) NOT NULL,
    cliente_id UUID NOT NULL REFERENCES anexos(id) ON DELETE RESTRICT,
    moneda CHAR(3) NOT NULL DEFAULT 'PEN' CHECK (moneda IN ('PEN', 'USD')),
    tipo_cambio NUMERIC(10,4) NOT NULL DEFAULT 1.0000 CHECK (tipo_cambio > 0),
    base_gravada NUMERIC(18,2) NOT NULL DEFAULT 0.00 CHECK (base_gravada >= 0),
    igv NUMERIC(18,2) NOT NULL DEFAULT 0.00 CHECK (igv >= 0),
    base_no_gravada NUMERIC(18,2) NOT NULL DEFAULT 0.00 CHECK (base_no_gravada >= 0),
    exonerado NUMERIC(18,2) NOT NULL DEFAULT 0.00 CHECK (exonerado >= 0),
    isc NUMERIC(18,2) NOT NULL DEFAULT 0.00 CHECK (isc >= 0),
    icbper NUMERIC(18,2) NOT NULL DEFAULT 0.00 CHECK (icbper >= 0),
    otros_tributos NUMERIC(18,2) NOT NULL DEFAULT 0.00 CHECK (otros_tributos >= 0),
    total NUMERIC(18,2) NOT NULL CHECK (total > 0),
    tipo_operacion VARCHAR(30) NOT NULL DEFAULT 'VENTA_INTERNA',
    forma_pago VARCHAR(20) NOT NULL DEFAULT 'CONTADO' CHECK (forma_pago IN ('CONTADO', 'CREDITO')),
    dias_credito INTEGER DEFAULT 0,
    tiene_detraccion BOOLEAN NOT NULL DEFAULT FALSE,
    tiene_percepcion BOOLEAN NOT NULL DEFAULT FALSE,
    estado VARCHAR(20) NOT NULL DEFAULT 'BORRADOR' CHECK (estado IN ('BORRADOR', 'REGISTRADO', 'ANULADO')),
    documento_modificado_id UUID REFERENCES comprobantes_venta(id),
    motivo_nc_nd VARCHAR(150),
    origen VARCHAR(20) NOT NULL DEFAULT 'MANUAL' CHECK (origen IN ('MANUAL', 'SIRE', 'XML')),
    hash_cpe VARCHAR(100),
    asiento_id UUID REFERENCES asientos(id),
    version INTEGER NOT NULL DEFAULT 1,
    created_by UUID REFERENCES usuarios(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID REFERENCES usuarios(id),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_venta_documento UNIQUE (empresa_id, tipo_comprobante, serie, numero)
);

-- 4. Cuentas por Pagar (Proveedores)
CREATE TABLE IF NOT EXISTS cuentas_por_pagar (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    comprobante_id UUID NOT NULL REFERENCES comprobantes_compra(id) ON DELETE CASCADE,
    proveedor_id UUID NOT NULL REFERENCES anexos(id) ON DELETE RESTRICT,
    moneda CHAR(3) NOT NULL DEFAULT 'PEN',
    importe_original NUMERIC(18,2) NOT NULL,
    saldo NUMERIC(18,2) NOT NULL,
    fecha_emision DATE NOT NULL,
    fecha_vencimiento DATE NOT NULL,
    estado VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE' CHECK (estado IN ('PENDIENTE', 'PARCIAL', 'CANCELADO')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_cxp_comprobante UNIQUE (comprobante_id)
);

-- 5. Cuentas por Cobrar (Clientes)
CREATE TABLE IF NOT EXISTS cuentas_por_cobrar (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    comprobante_id UUID NOT NULL REFERENCES comprobantes_venta(id) ON DELETE CASCADE,
    cliente_id UUID NOT NULL REFERENCES anexos(id) ON DELETE RESTRICT,
    moneda CHAR(3) NOT NULL DEFAULT 'PEN',
    importe_original NUMERIC(18,2) NOT NULL,
    saldo NUMERIC(18,2) NOT NULL,
    fecha_emision DATE NOT NULL,
    fecha_vencimiento DATE NOT NULL,
    estado VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE' CHECK (estado IN ('PENDIENTE', 'PARCIAL', 'CANCELADO')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_cxc_comprobante UNIQUE (comprobante_id)
);

-- 6. Aplicaciones de Pago y Cobranza (Relación N:M sin edición manual de saldos)
CREATE TABLE IF NOT EXISTS aplicaciones_pago (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    cuenta_por_pagar_id UUID NOT NULL REFERENCES cuentas_por_pagar(id) ON DELETE CASCADE,
    asiento_id UUID REFERENCES asientos(id),
    fecha_pago DATE NOT NULL,
    importe_aplicado NUMERIC(18,2) NOT NULL CHECK (importe_aplicado > 0),
    moneda CHAR(3) NOT NULL DEFAULT 'PEN',
    tipo_cambio NUMERIC(10,4) NOT NULL DEFAULT 1.0000,
    referencia_banco VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS aplicaciones_cobranza (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    cuenta_por_cobrar_id UUID NOT NULL REFERENCES cuentas_por_cobrar(id) ON DELETE CASCADE,
    asiento_id UUID REFERENCES asientos(id),
    fecha_cobranza DATE NOT NULL,
    importe_aplicado NUMERIC(18,2) NOT NULL CHECK (importe_aplicado > 0),
    moneda CHAR(3) NOT NULL DEFAULT 'PEN',
    tipo_cambio NUMERIC(10,4) NOT NULL DEFAULT 1.0000,
    referencia_banco VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 7. Detracciones SPOT (Sistema de Pago de Obligaciones Tributarias)
-- TODO: Validar catálogo de bienes y servicios sujetos a detracción con RS 183-2004/SUNAT
CREATE TABLE IF NOT EXISTS detracciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    tipo_operacion VARCHAR(20) NOT NULL CHECK (tipo_operacion IN ('COMPRA', 'VENTA')),
    comprobante_id UUID NOT NULL,
    codigo_bien_servicio VARCHAR(10) NOT NULL,
    descripcion_bien VARCHAR(150),
    porcentaje NUMERIC(5,2) NOT NULL,
    monto NUMERIC(18,2) NOT NULL CHECK (monto > 0),
    cuenta_banco_nacion VARCHAR(40),
    numero_constancia VARCHAR(30),
    fecha_deposito DATE,
    estado VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE' CHECK (estado IN ('PENDIENTE', 'DEPOSITADA', 'NO_APLICA')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 8. Retenciones y Percepciones del IGV
-- TODO: Validar agentes de retención y percepción con catálogo oficial de SUNAT
CREATE TABLE IF NOT EXISTS retenciones_percepciones_igv (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    tipo VARCHAR(30) NOT NULL CHECK (tipo IN ('RETENCION_COMPRA', 'PERCEPCION_VENTA')),
    comprobante_id UUID NOT NULL,
    anexo_id UUID NOT NULL REFERENCES anexos(id) ON DELETE RESTRICT,
    serie_documento VARCHAR(10),
    numero_documento VARCHAR(20),
    fecha_emision DATE NOT NULL,
    porcentaje NUMERIC(5,2) NOT NULL,
    monto NUMERIC(18,2) NOT NULL CHECK (monto > 0),
    periodo_aplicacion CHAR(7) NOT NULL, -- YYYY-MM
    estado VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE' CHECK (estado IN ('PENDIENTE', 'APLICADA')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- ÍNDICES DE RENDIMIENTO
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_compras_empresa_periodo ON comprobantes_compra(empresa_id, periodo_id, estado);
CREATE INDEX IF NOT EXISTS idx_compras_fecha ON comprobantes_compra(empresa_id, fecha_emision);
CREATE INDEX IF NOT EXISTS idx_compras_proveedor ON comprobantes_compra(empresa_id, proveedor_id);
CREATE INDEX IF NOT EXISTS idx_ventas_empresa_periodo ON comprobantes_venta(empresa_id, periodo_id, estado);
CREATE INDEX IF NOT EXISTS idx_ventas_fecha ON comprobantes_venta(empresa_id, fecha_emision);
CREATE INDEX IF NOT EXISTS idx_ventas_cliente ON comprobantes_venta(empresa_id, cliente_id);
CREATE INDEX IF NOT EXISTS idx_cxp_saldo ON cuentas_por_pagar(empresa_id, estado, fecha_vencimiento);
CREATE INDEX IF NOT EXISTS idx_cxc_saldo ON cuentas_por_cobrar(empresa_id, estado, fecha_vencimiento);
CREATE INDEX IF NOT EXISTS idx_detracciones_estado ON detracciones(empresa_id, estado);

-- ----------------------------------------------------------------------------
-- POLÍTICAS RLS (Row Level Security)
-- ----------------------------------------------------------------------------
ALTER TABLE comprobantes_compra ENABLE ROW LEVEL SECURITY;
ALTER TABLE comprobantes_venta ENABLE ROW LEVEL SECURITY;
ALTER TABLE cuentas_por_pagar ENABLE ROW LEVEL SECURITY;
ALTER TABLE cuentas_por_cobrar ENABLE ROW LEVEL SECURITY;
ALTER TABLE aplicaciones_pago ENABLE ROW LEVEL SECURITY;
ALTER TABLE aplicaciones_cobranza ENABLE ROW LEVEL SECURITY;
ALTER TABLE detracciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE retenciones_percepciones_igv ENABLE ROW LEVEL SECURITY;

CREATE POLICY rls_compras ON comprobantes_compra
    FOR ALL
    USING (empresa_id = NULLIF(current_setting('app.current_empresa_id', true), '')::UUID);

CREATE POLICY rls_ventas ON comprobantes_venta
    FOR ALL
    USING (empresa_id = NULLIF(current_setting('app.current_empresa_id', true), '')::UUID);

CREATE POLICY rls_cxp ON cuentas_por_pagar
    FOR ALL
    USING (empresa_id = NULLIF(current_setting('app.current_empresa_id', true), '')::UUID);

CREATE POLICY rls_cxc ON cuentas_por_cobrar
    FOR ALL
    USING (empresa_id = NULLIF(current_setting('app.current_empresa_id', true), '')::UUID);

CREATE POLICY rls_app_pago ON aplicaciones_pago
    FOR ALL
    USING (empresa_id = NULLIF(current_setting('app.current_empresa_id', true), '')::UUID);

CREATE POLICY rls_app_cobranza ON aplicaciones_cobranza
    FOR ALL
    USING (empresa_id = NULLIF(current_setting('app.current_empresa_id', true), '')::UUID);

CREATE POLICY rls_detracciones ON detracciones
    FOR ALL
    USING (empresa_id = NULLIF(current_setting('app.current_empresa_id', true), '')::UUID);

CREATE POLICY rls_ret_per ON retenciones_percepciones_igv
    FOR ALL
    USING (empresa_id = NULLIF(current_setting('app.current_empresa_id', true), '')::UUID);
