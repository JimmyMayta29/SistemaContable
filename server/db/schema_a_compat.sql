-- Migra identidades anteriores conservando sus UUID y hashes, sin generar contraseñas.
INSERT INTO usuarios_estudio (id, email, password_hash, nombre, rol_global, is_active, created_at, updated_at)
SELECT id, email, password_hash, concat_ws(' ', nombres, apellidos), 'CONTADOR_SENIOR', is_active, created_at, updated_at
FROM usuarios
ON CONFLICT (id) DO NOTHING;

UPDATE usuarios_estudio SET rol_global = 'ADMINISTRADOR'
WHERE id IN (SELECT m.usuario_id FROM membresias m JOIN roles r ON r.id = m.rol_id WHERE r.codigo IN ('ADMIN_ESTUDIO', 'ADMINISTRADOR'));

INSERT INTO usuario_empresa (usuario_id, empresa_id, rol_en_empresa, estado)
SELECT m.usuario_id, m.empresa_id,
    CASE r.codigo WHEN 'ADMIN_ESTUDIO' THEN 'ADMINISTRADOR' WHEN 'ADMINISTRADOR' THEN 'ADMINISTRADOR'
        WHEN 'CONTADOR' THEN 'CONTADOR_SENIOR' WHEN 'ASISTENTE' THEN 'ASISTENTE_CONTABLE' ELSE 'AUDITOR_REVISOR' END,
    CASE WHEN m.is_active THEN 'ACTIVO' ELSE 'INACTIVO' END
FROM membresias m JOIN roles r ON r.id = m.rol_id
ON CONFLICT (usuario_id, empresa_id) DO NOTHING;

DO $$
DECLARE c RECORD;
BEGIN
    FOR c IN SELECT conrelid::regclass AS tabla, conname, pg_get_constraintdef(oid) AS definicion
             FROM pg_constraint WHERE contype = 'f' AND confrelid = 'usuarios'::regclass
    LOOP
        EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', c.tabla, c.conname);
        EXECUTE format('ALTER TABLE %s ADD CONSTRAINT %I %s', c.tabla, c.conname,
            replace(c.definicion, 'REFERENCES usuarios(', 'REFERENCES usuarios_estudio('));
    END LOOP;
END;
$$;
