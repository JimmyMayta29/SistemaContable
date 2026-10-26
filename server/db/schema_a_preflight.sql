-- Homologa UUID anteriores y conserva el identificador original como evidencia.
DO $$
DECLARE c RECORD; old_type TEXT;
BEGIN
    IF to_regclass('usuarios_estudio') IS NULL THEN RETURN; END IF;
    ALTER TABLE usuarios_estudio ADD COLUMN IF NOT EXISTS legacy_id TEXT;
    SELECT data_type INTO old_type FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'usuarios_estudio' AND column_name = 'id';
    IF old_type <> 'uuid' THEN
        CREATE TEMP TABLE identidad_fk_original ON COMMIT DROP AS
        SELECT conrelid::regclass AS tabla, conname, pg_get_constraintdef(oid) AS definicion,
               (SELECT attname FROM pg_attribute WHERE attrelid = conrelid AND attnum = conkey[1]) AS columna
        FROM pg_constraint WHERE contype = 'f' AND confrelid = 'usuarios_estudio'::regclass;
        FOR c IN SELECT * FROM identidad_fk_original LOOP
            EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', c.tabla, c.conname);
            EXECUTE format('ALTER TABLE %s ALTER COLUMN %I TYPE UUID USING (CASE WHEN %I IS NULL THEN NULL WHEN %I::text ~* %L THEN %I::text::uuid ELSE md5(%L || %I::text)::uuid END)',
                c.tabla, c.columna, c.columna, c.columna, '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$', c.columna, 'usuario-estudio:', c.columna);
        END LOOP;
        UPDATE usuarios_estudio SET legacy_id = id::text WHERE legacy_id IS NULL;
        ALTER TABLE usuarios_estudio ALTER COLUMN id DROP DEFAULT;
        ALTER TABLE usuarios_estudio ALTER COLUMN id TYPE UUID USING
            (CASE WHEN id::text ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN id::text::uuid ELSE md5('usuario-estudio:' || id::text)::uuid END);
        ALTER TABLE usuarios_estudio ALTER COLUMN id SET DEFAULT gen_random_uuid();
        FOR c IN SELECT * FROM identidad_fk_original LOOP
            EXECUTE format('ALTER TABLE %s ADD CONSTRAINT %I %s', c.tabla, c.conname, c.definicion);
        END LOOP;
    END IF;
    ALTER TABLE usuarios_estudio DROP CONSTRAINT IF EXISTS usuarios_estudio_rol_global_check;
    UPDATE usuarios_estudio SET rol_global = 'ADMINISTRADOR' WHERE rol_global = 'ADMIN_ESTUDIO';
    ALTER TABLE usuarios_estudio ADD CONSTRAINT usuarios_estudio_rol_global_check
        CHECK (rol_global IN ('ADMINISTRADOR', 'CONTADOR_SENIOR', 'ASISTENTE_CONTABLE', 'AUDITOR_REVISOR'));
    IF to_regclass('usuario_empresa') IS NOT NULL THEN
        ALTER TABLE usuario_empresa DROP CONSTRAINT IF EXISTS usuario_empresa_rol_en_empresa_check;
        UPDATE usuario_empresa SET rol_en_empresa = 'ADMINISTRADOR' WHERE rol_en_empresa = 'ADMIN_ESTUDIO';
        ALTER TABLE usuario_empresa ADD CONSTRAINT usuario_empresa_rol_en_empresa_check
            CHECK (rol_en_empresa IN ('ADMINISTRADOR', 'CONTADOR_SENIOR', 'ASISTENTE_CONTABLE', 'AUDITOR_REVISOR'));
    END IF;
END;
$$;
