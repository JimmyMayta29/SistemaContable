-- ============================================================================
-- FASE 4 — Esquema SQL: Tesorería, Conciliación Bancaria, Honorarios y Planillas
-- ============================================================================

-- 1. Cuentas Financieras (Caja, Bancos, Detracciones BN)
CREATE TABLE IF NOT EXISTS cuentas_financieras (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('CAJA', 'BANCO', 'DETRACCIONES_BN')),
    banco VARCHAR(50) NOT NULL, -- 'BCP', 'BBVA', 'INTERBANK', 'BANCO_DE_LA_NACION', 'CAJA_CENTRAL'
    numero VARCHAR(50) NOT NULL,
    moneda VARCHAR(3) NOT NULL DEFAULT 'PEN' CHECK (moneda IN ('PEN', 'USD')),
    cuenta_contable_codigo VARCHAR(20) NOT NULL DEFAULT '1041', -- PCGE: 1011 (Caja), 1041 (Ctas Ctes), 1042 (BN Detracciones)
    saldo_inicial NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    saldo_actual NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    activa BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_cuenta_empresa_numero UNIQUE (empresa_id, banco, numero)
);

-- 2. Movimientos de Tesorería (Ingresos, Egresos, Comisiones, etc.)
CREATE TABLE IF NOT EXISTS movimientos_tesoreria (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    periodo_id UUID NOT NULL REFERENCES periodos(id),
    cuenta_financiera_id UUID NOT NULL REFERENCES cuentas_financieras(id) ON DELETE RESTRICT,
    fecha DATE NOT NULL,
    tipo VARCHAR(30) NOT NULL CHECK (tipo IN ('INGRESO', 'EGRESO', 'TRANSFERENCIA', 'COMISION', 'ITF', 'DEPOSITO_DETRACCION')),
    medio_pago VARCHAR(50) NOT NULL DEFAULT '003', -- Catálogo 01 SUNAT (001: Depósito, 003: Transferencia, 008: Efectivo)
    numero_operacion VARCHAR(50),
    anexo_id UUID REFERENCES anexos(id),
    moneda VARCHAR(3) NOT NULL DEFAULT 'PEN' CHECK (moneda IN ('PEN', 'USD')),
    tipo_cambio NUMERIC(8, 4) NOT NULL DEFAULT 1.0000,
    importe NUMERIC(14, 2) NOT NULL,
    importe_me NUMERIC(14, 2) DEFAULT 0.00,
    saldo_sin_aplicar NUMERIC(14, 2) NOT NULL DEFAULT 0.00, -- Para anticipos o saldo remanente
    glosa TEXT NOT NULL,
    estado VARCHAR(20) NOT NULL DEFAULT 'REGISTRADO' CHECK (estado IN ('BORRADOR', 'REGISTRADO', 'ANULADO')),
    conciliado BOOLEAN NOT NULL DEFAULT FALSE,
    asiento_id UUID REFERENCES asientos(id),
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID
);

-- 3. Transferencias Entre Cuentas
CREATE TABLE IF NOT EXISTS transferencias_cuentas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    periodo_id UUID NOT NULL REFERENCES periodos(id),
    cuenta_origen_id UUID NOT NULL REFERENCES cuentas_financieras(id) ON DELETE RESTRICT,
    cuenta_destino_id UUID NOT NULL REFERENCES cuentas_financieras(id) ON DELETE RESTRICT,
    fecha DATE NOT NULL,
    importe_origen NUMERIC(14, 2) NOT NULL,
    moneda_origen VARCHAR(3) NOT NULL,
    importe_destino NUMERIC(14, 2) NOT NULL,
    moneda_destino VARCHAR(3) NOT NULL,
    tipo_cambio NUMERIC(8, 4) NOT NULL DEFAULT 1.0000,
    diferencia_cambio NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    tipo_diferencia VARCHAR(10) CHECK (tipo_diferencia IN ('GANANCIA', 'PERDIDA', 'NINGUNA')),
    movimiento_origen_id UUID REFERENCES movimientos_tesoreria(id),
    movimiento_destino_id UUID REFERENCES movimientos_tesoreria(id),
    asiento_id UUID REFERENCES asientos(id),
    glosa TEXT NOT NULL,
    estado VARCHAR(20) NOT NULL DEFAULT 'REGISTRADO' CHECK (estado IN ('BORRADOR', 'REGISTRADO', 'ANULADO')),
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID
);

-- 4. Caja Chica y Rendiciones
CREATE TABLE IF NOT EXISTS cajas_chicas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    nombre VARCHAR(100) NOT NULL,
    responsable_anexo_id UUID REFERENCES anexos(id),
    cuenta_financiera_id UUID NOT NULL REFERENCES cuentas_financieras(id),
    monto_fondo NUMERIC(14, 2) NOT NULL,
    saldo_actual NUMERIC(14, 2) NOT NULL,
    estado VARCHAR(20) NOT NULL DEFAULT 'ABIERTA' CHECK (estado IN ('ABIERTA', 'CERRADA')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS rendiciones_caja_chica (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    caja_chica_id UUID NOT NULL REFERENCES cajas_chicas(id) ON DELETE CASCADE,
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    fecha DATE NOT NULL,
    total_rendido NUMERIC(14, 2) NOT NULL,
    glosa TEXT NOT NULL,
    estado VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE' CHECK (estado IN ('PENDIENTE', 'REPUERTA', 'ANULADA')),
    asiento_reposicion_id UUID REFERENCES asientos(id),
    movimiento_reposicion_id UUID REFERENCES movimientos_tesoreria(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID
);

-- 5. Extractos Bancarios y Conciliación
CREATE TABLE IF NOT EXISTS extractos_bancarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    cuenta_financiera_id UUID NOT NULL REFERENCES cuentas_financieras(id) ON DELETE CASCADE,
    nombre_archivo VARCHAR(255) NOT NULL,
    fecha_corte_desde DATE NOT NULL,
    fecha_corte_hasta DATE NOT NULL,
    saldo_inicial NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    saldo_final NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    hash_archivo VARCHAR(64) NOT NULL,
    estado VARCHAR(20) NOT NULL DEFAULT 'CARGADO' CHECK (estado IN ('CARGADO', 'CONCILIADO', 'ANULADO')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_extracto_hash UNIQUE (empresa_id, cuenta_financiera_id, hash_archivo)
);

CREATE TABLE IF NOT EXISTS extracto_lineas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    extracto_id UUID NOT NULL REFERENCES extractos_bancarios(id) ON DELETE CASCADE,
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    fecha DATE NOT NULL,
    descripcion TEXT NOT NULL,
    referencia VARCHAR(100),
    monto NUMERIC(14, 2) NOT NULL, -- Positivo = Abono (Ingreso), Negativo = Cargo (Egreso)
    saldo NUMERIC(14, 2),
    conciliada BOOLEAN NOT NULL DEFAULT FALSE,
    movimiento_tesoreria_id UUID REFERENCES movimientos_tesoreria(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS conciliaciones_bancarias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    cuenta_financiera_id UUID NOT NULL REFERENCES cuentas_financieras(id) ON DELETE RESTRICT,
    periodo_id UUID NOT NULL REFERENCES periodos(id),
    fecha_corte DATE NOT NULL,
    saldo_segun_libros NUMERIC(14, 2) NOT NULL,
    saldo_segun_banco NUMERIC(14, 2) NOT NULL,
    partidas_conciliadas NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    partidas_en_transito NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    diferencia NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    estado VARCHAR(20) NOT NULL DEFAULT 'ABIERTA' CHECK (estado IN ('ABIERTA', 'CERRADA')),
    cerrada_por UUID,
    fecha_cierre TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_conciliacion_periodo UNIQUE (empresa_id, cuenta_financiera_id, periodo_id)
);

-- 6. Recibos por Honorarios (Rentas de 4ta Categoría)
CREATE TABLE IF NOT EXISTS recibos_honorarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    periodo_id UUID NOT NULL REFERENCES periodos(id),
    proveedor_id UUID NOT NULL REFERENCES anexos(id),
    serie VARCHAR(10) NOT NULL,
    numero VARCHAR(20) NOT NULL,
    fecha_emision DATE NOT NULL,
    fecha_pago DATE,
    moneda VARCHAR(3) NOT NULL DEFAULT 'PEN' CHECK (moneda IN ('PEN', 'USD')),
    tipo_cambio NUMERIC(8, 4) NOT NULL DEFAULT 1.0000,
    importe_bruto NUMERIC(14, 2) NOT NULL,
    aplica_retencion BOOLEAN NOT NULL DEFAULT TRUE,
    tasa_retencion NUMERIC(5, 2) NOT NULL DEFAULT 8.00,
    retencion NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    neto_pagar NUMERIC(14, 2) NOT NULL,
    suspension_cuarta BOOLEAN NOT NULL DEFAULT FALSE,
    numero_resolucion_suspension VARCHAR(50),
    vigencia_suspension_desde DATE,
    vigencia_suspension_hasta DATE,
    cuenta_gasto VARCHAR(20) NOT NULL DEFAULT '6321', -- PCGE 632: Asesoría y consultoría
    glosa TEXT NOT NULL,
    estado VARCHAR(20) NOT NULL DEFAULT 'REGISTRADO' CHECK (estado IN ('BORRADOR', 'REGISTRADO', 'PAGADO', 'ANULADO')),
    asiento_id UUID REFERENCES asientos(id),
    cuenta_por_pagar_id UUID REFERENCES cuentas_por_pagar(id) ON DELETE SET NULL,
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    CONSTRAINT uq_recibo_honorario UNIQUE (empresa_id, serie, numero, proveedor_id)
);

-- 7. Ficha de Trabajadores (Planilla / T-Registro)
CREATE TABLE IF NOT EXISTS trabajadores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    tipo_documento VARCHAR(2) NOT NULL DEFAULT '1', -- 1: DNI, 4: CE, 7: Pasaporte
    numero_documento VARCHAR(15) NOT NULL,
    nombres VARCHAR(100) NOT NULL,
    apellidos VARCHAR(100) NOT NULL,
    fecha_nacimiento DATE,
    direccion TEXT,
    telefono VARCHAR(20),
    email VARCHAR(100),
    fecha_ingreso DATE NOT NULL,
    fecha_cese DATE,
    cargo VARCHAR(100) NOT NULL,
    regimen_laboral VARCHAR(20) NOT NULL DEFAULT 'GENERAL' CHECK (regimen_laboral IN ('GENERAL', 'MYPE_MICRO', 'MYPE_PEQUENA')),
    sueldo_base NUMERIC(14, 2) NOT NULL,
    tiene_asignacion_familiar BOOLEAN NOT NULL DEFAULT FALSE,
    sistema_pensiones VARCHAR(10) NOT NULL CHECK (sistema_pensiones IN ('ONP', 'AFP')),
    afp_administradora VARCHAR(20) CHECK (afp_administradora IN ('INTEGRA', 'PRIMA', 'PROFUTURO', 'HABITAT')),
    afp_tipo_comision VARCHAR(10) DEFAULT 'FLUJO' CHECK (afp_tipo_comision IN ('FLUJO', 'MIXTA')),
    cuspp VARCHAR(20),
    centro_costo VARCHAR(50) NOT NULL DEFAULT 'ADMINISTRACION',
    cuenta_banco_sueldo VARCHAR(50),
    banco_sueldo VARCHAR(30),
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_trabajador_documento UNIQUE (empresa_id, tipo_documento, numero_documento)
);

-- 8. Catálogo de Conceptos de Planilla (Ingresos, Descuentos, Aportes)
CREATE TABLE IF NOT EXISTS conceptos_planilla (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    codigo VARCHAR(20) NOT NULL, -- '0121' Básico, '0201' Asignación Familiar, etc. (Catálogo 18 PLAME)
    descripcion VARCHAR(100) NOT NULL,
    tipo VARCHAR(30) NOT NULL CHECK (tipo IN ('INGRESOS', 'DESCUENTOS', 'APORTES_TRABAJADOR', 'APORTES_EMPLEADOR')),
    naturaleza VARCHAR(30) NOT NULL, -- REMUNERATIVO, NO_REMUNERATIVO, RETENCION, APORTE_PATRONAL
    afecto_essalud BOOLEAN NOT NULL DEFAULT TRUE,
    afecto_onp_afp BOOLEAN NOT NULL DEFAULT TRUE,
    afecto_renta_quinta BOOLEAN NOT NULL DEFAULT TRUE,
    codigo_cuenta_contable VARCHAR(20) NOT NULL,
    orden INTEGER NOT NULL DEFAULT 1,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    UNIQUE (empresa_id, codigo)
);

-- 9. Planilla Mensual y Líneas de Liquidación
CREATE TABLE IF NOT EXISTS planillas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    periodo_id UUID NOT NULL REFERENCES periodos(id),
    mes VARCHAR(7) NOT NULL, -- YYYY-MM
    fecha_calculo DATE NOT NULL,
    fecha_pago DATE,
    total_ingresos NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    total_descuentos NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    total_aportes_empleador NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    total_neto NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    estado VARCHAR(20) NOT NULL DEFAULT 'BORRADOR' CHECK (estado IN ('BORRADOR', 'CALCULADA', 'CONTABILIZADA', 'PAGADA')),
    asiento_id UUID REFERENCES asientos(id),
    asiento_pago_id UUID REFERENCES asientos(id),
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    CONSTRAINT uq_planilla_periodo UNIQUE (empresa_id, mes)
);

CREATE TABLE IF NOT EXISTS planilla_lineas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    planilla_id UUID NOT NULL REFERENCES planillas(id) ON DELETE CASCADE,
    trabajador_id UUID NOT NULL REFERENCES trabajadores(id) ON DELETE RESTRICT,
    dias_laborados INTEGER NOT NULL DEFAULT 30,
    sueldo_basico NUMERIC(14, 2) NOT NULL,
    asignacion_familiar NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    horas_extras NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    otros_ingresos NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    total_remuneracion NUMERIC(14, 2) NOT NULL,
    aporte_obligatorio_pension NUMERIC(14, 2) NOT NULL DEFAULT 0.00, -- ONP 13% o Fondo AFP 10%
    comision_afp NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    prima_seguro_afp NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    retencion_quinta NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    otros_descuentos NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    total_descuentos NUMERIC(14, 2) NOT NULL,
    aporte_essalud NUMERIC(14, 2) NOT NULL DEFAULT 0.00, -- 9%
    otros_aportes_empleador NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    neto_pagar NUMERIC(14, 2) NOT NULL,
    centro_costo VARCHAR(50) NOT NULL DEFAULT 'ADMINISTRACION',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. Estructuras de Provisiones Sociales Laborales (Gratificaciones, CTS, Vacaciones)
-- TODO: Validar fórmulas legales con laboralista para cada régimen (Ley 27735 Gratificaciones, D.S. 001-97-TR CTS, D.L. 713 Vacaciones)
CREATE TABLE IF NOT EXISTS provisiones_sociales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    periodo_id UUID NOT NULL REFERENCES periodos(id),
    trabajador_id UUID NOT NULL REFERENCES trabajadores(id) ON DELETE CASCADE,
    concepto VARCHAR(30) NOT NULL CHECK (concepto IN ('GRATIFICACION', 'BONIFICACION_EXTRAORDINARIA_9PCT', 'CTS', 'VACACIONES')),
    base_calculo NUMERIC(14, 2) NOT NULL,
    monto_provisionado NUMERIC(14, 2) NOT NULL,
    asiento_id UUID REFERENCES asientos(id),
    estado VARCHAR(20) NOT NULL DEFAULT 'PROVISIONADO' CHECK (estado IN ('PROVISIONADO', 'PAGADO', 'ANULADO')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
