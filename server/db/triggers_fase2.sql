-- ============================================================================
-- SUNAConta PRO — Triggers y Funciones de Integridad Contable en BD (Fase 2)
-- ============================================================================

-- 1. Función para validar período cerrado
CREATE OR REPLACE FUNCTION fn_check_periodo_abierto()
RETURNS TRIGGER AS $$
DECLARE
    v_estado_periodo VARCHAR(20);
BEGIN
    SELECT estado INTO v_estado_periodo
    FROM periodos
    WHERE id = COALESCE(NEW.periodo_id, OLD.periodo_id);

    IF v_estado_periodo = 'CERRADO' THEN
        RAISE EXCEPTION 'PERIODO_CERRADO: No se pueden realizar operaciones en un período contable cerrado.';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_asiento_check_periodo ON asientos;
CREATE TRIGGER trg_asiento_check_periodo
BEFORE INSERT OR UPDATE OR DELETE ON asientos
FOR EACH ROW EXECUTE FUNCTION fn_check_periodo_abierto();

-- 2. Función de Inmutabilidad de Asientos Contabilizados o Anulados
CREATE OR REPLACE FUNCTION fn_inmutabilidad_asiento()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        IF OLD.estado IN ('CONTABILIZADO', 'ANULADO') THEN
            RAISE EXCEPTION 'ASIENTO_INMUTABLE: Un asiento contabilizado o anulado no puede ser eliminado físicamente. Use anulación/extorno.';
        END IF;
        RETURN OLD;
    END IF;

    IF TG_OP = 'UPDATE' THEN
        IF OLD.estado = 'ANULADO' THEN
            RAISE EXCEPTION 'ASIENTO_INMUTABLE: Un asiento anulado no puede ser modificado.';
        END IF;

        IF OLD.estado = 'CONTABILIZADO' THEN
            -- Solo se permite transición a ANULADO con sus campos respectivos
            IF NOT (NEW.estado = 'ANULADO' AND NEW.asiento_extorno_id IS NOT NULL) THEN
                RAISE EXCEPTION 'ASIENTO_INMUTABLE: Un asiento contabilizado es inmutable y solo puede ser anulado mediante extorno.';
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_asiento_inmutabilidad ON asientos;
CREATE TRIGGER trg_asiento_inmutabilidad
BEFORE UPDATE OR DELETE ON asientos
FOR EACH ROW EXECUTE FUNCTION fn_inmutabilidad_asiento();

-- 3. Inmutabilidad en Detalle de Asiento
CREATE OR REPLACE FUNCTION fn_inmutabilidad_asiento_detalle()
RETURNS TRIGGER AS $$
DECLARE
    v_estado_asiento VARCHAR(20);
BEGIN
    SELECT estado INTO v_estado_asiento
    FROM asientos
    WHERE id = COALESCE(NEW.asiento_id, OLD.asiento_id);

    IF v_estado_asiento IN ('CONTABILIZADO', 'ANULADO') THEN
        RAISE EXCEPTION 'DETALLE_INMUTABLE: No se puede modificar el detalle de un asiento contabilizado o anulado.';
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_asiento_detalle_inmutabilidad ON asiento_detalle;
CREATE TRIGGER trg_asiento_detalle_inmutabilidad
BEFORE INSERT OR UPDATE OR DELETE ON asiento_detalle
FOR EACH ROW EXECUTE FUNCTION fn_inmutabilidad_asiento_detalle();

-- 4. Constraint Trigger Diferido para Partida Doble al Contabilizar
CREATE OR REPLACE FUNCTION fn_validar_partida_doble()
RETURNS TRIGGER AS $$
DECLARE
    v_total_debe NUMERIC(18,2);
    v_total_haber NUMERIC(18,2);
    v_count_lineas INTEGER;
BEGIN
    IF NEW.estado = 'CONTABILIZADO' THEN
        SELECT 
            COALESCE(SUM(debe), 0.00), 
            COALESCE(SUM(haber), 0.00), 
            COUNT(*)
        INTO v_total_debe, v_total_haber, v_count_lineas
        FROM asiento_detalle
        WHERE asiento_id = NEW.id;

        IF v_count_lineas < 2 THEN
            RAISE EXCEPTION 'ASIENTO_DESCUADRADO: El asiento debe tener al menos 2 líneas para ser contabilizado.';
        END IF;

        IF v_total_debe <> v_total_haber THEN
            RAISE EXCEPTION 'ASIENTO_DESCUADRADO: El asiento está descuadrado (Debe S/ % != Haber S/ %).', v_total_debe, v_total_haber;
        END IF;

        IF v_total_debe <= 0 THEN
            RAISE EXCEPTION 'ASIENTO_DESCUADRADO: El importe total debe ser mayor a cero.';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_asiento_partida_doble ON asientos;
CREATE CONSTRAINT TRIGGER trg_asiento_partida_doble
AFTER INSERT OR UPDATE ON asientos
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION fn_validar_partida_doble();

-- 5. Validación de Cuentas Imputables y Anexo Obligatorio
CREATE OR REPLACE FUNCTION fn_validar_cuenta_detalle()
RETURNS TRIGGER AS $$
DECLARE
    v_permite_movimiento BOOLEAN;
    v_requiere_anexo BOOLEAN;
    v_is_active BOOLEAN;
    v_cuenta_empresa_id UUID;
BEGIN
    SELECT permite_movimiento, requiere_anexo, is_active, empresa_id
    INTO v_permite_movimiento, v_requiere_anexo, v_is_active, v_cuenta_empresa_id
    FROM plan_cuentas
    WHERE id = NEW.cuenta_id;

    IF v_cuenta_empresa_id IS NULL OR v_cuenta_empresa_id <> NEW.empresa_id THEN
        RAISE EXCEPTION 'CUENTA_NO_PERTENECE: La cuenta contable no pertenece a la misma empresa.';
    END IF;

    IF NOT v_is_active THEN
        RAISE EXCEPTION 'CUENTA_INACTIVA: La cuenta contable especificada se encuentra inactiva.';
    END IF;

    IF NOT v_permite_movimiento THEN
        RAISE EXCEPTION 'CUENTA_NO_IMPUTABLE: La cuenta no permite movimientos (es cuenta de nivel título/mayor).';
    END IF;

    IF v_requiere_anexo AND NEW.anexo_id IS NULL THEN
        RAISE EXCEPTION 'ANEXO_REQUERIDO: La cuenta contable exige indicar anexo (RUC/DNI del cliente o proveedor).';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_asiento_detalle_validar_cuenta ON asiento_detalle;
CREATE TRIGGER trg_asiento_detalle_validar_cuenta
BEFORE INSERT OR UPDATE ON asiento_detalle
FOR EACH ROW EXECUTE FUNCTION fn_validar_cuenta_detalle();
