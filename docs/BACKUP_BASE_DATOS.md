# ESTRATEGIA DE RESPALDO Y RESTAURACIÓN INTEGRAL — SUNACONTA PRO

Este documento especifica la política operativa de copias de seguridad de nivel de infraestructura (sysadmin/DevOps) para la base de datos PostgreSQL, complementando los respaldos aislados por empresa implementados en la plataforma.

---

## 1. Niveles de Respaldo

| Nivel | Mecanismo | Formato | Frecuencia | Destino | Responsable |
|---|---|---|---|---|---|
| **Nivel 1: Por Empresa** | `backupEmpresaService` | ZIP cifrado AES-256-GCM con `manifest.json` y NDJSON | Automático al ingresar (60 min debounce) y previo a operaciones críticas | Almacén de empresa / Descarga usuario | Contador / Administrador |
| **Nivel 2: Base de Datos Completa** | `pg_dump` binario | `.dump` comprimido custom (`-Fc`) | Diario (02:00 UTC) | Object Storage (GCS / S3) cifrado | Sysadmin / DevOps |
| **Nivel 3: WAL Archiving (PITR)** | Continuous Archiving | Segmentos WAL de 16MB | Continuo (RPO < 5 min) | Cloud Storage seguro | Infraestructura Cloud SQL |

---

## 2. Script Automatizado de Respaldo (`scripts/backup_postgres.sh`)

```bash
#!/usr/bin/env bash
# ==============================================================================
# Script de Backup Diario PostgreSQL — SUNAConta PRO
# Modo de uso: ./scripts/backup_postgres.sh
# ==============================================================================
set -euo pipefail

# Configuración
TIMESTAMP=$(date -u +"%Y%m%d_%H%M%SZ")
BACKUP_DIR="${BACKUP_DIR:-/var/backups/sunaconta}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-sunaconta_db}"
DB_USER="${DB_USER:-sunaconta_admin}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"

FILENAME="sunaconta_db_${TIMESTAMP}.dump"
FILEPATH="${BACKUP_DIR}/${FILENAME}"

mkdir -p "${BACKUP_DIR}"

echo "[$(date -u)] Iniciando pg_dump para ${DB_NAME} en ${DB_HOST}:${DB_PORT}..."

# Exportar dump comprimido con formato personalizado (-Fc) para soporte de pg_restore multi-hilo
PGPASSWORD="${DB_PASSWORD}" pg_dump \
  -h "${DB_HOST}" \
  -p "${DB_PORT}" \
  -U "${DB_USER}" \
  -d "${DB_NAME}" \
  -F c \
  -b \
  -v \
  -f "${FILEPATH}"

# Generar checksum SHA-256 para verificación de integridad
sha256sum "${FILEPATH}" > "${FILEPATH}.sha256"

echo "[$(date -u)] Backup generado exitosamente: ${FILEPATH} ($(du -h "${FILEPATH}" | cut -f1))"

# Rotación de copias locales (retención de 30 días)
find "${BACKUP_DIR}" -name "sunaconta_db_*.dump*" -mtime "+${RETENTION_DAYS}" -exec rm -f {} \;

echo "[$(date -u)] Rotación completada. Backups anteriores a ${RETENTION_DAYS} días eliminados."
```

---

## 3. Configuración del Cron Job (Sysadmin)

Editar la tabla de tareas de cron del usuario `postgres` o de servicio:
```bash
crontab -e
```

Agregar la siguiente entrada para ejecución diaria a las 02:00 AM UTC:
```cron
# Respaldo completo de la base de datos PostgreSQL de SUNAConta PRO
0 2 * * * /opt/sunaconta/scripts/backup_postgres.sh >> /var/log/sunaconta_backup.log 2>&1
```

---

## 4. Procedimiento de Restauración (`pg_restore`)

### 4.1 Verificación de Integridad Previa
```bash
sha256sum -c sunaconta_db_20261004_020000Z.dump.sha256
```

### 4.2 Restauración en Entorno de Pruebas o Recuperación ante Desastres
```bash
# 1. Crear base de datos limpia de destino
createdb -h localhost -U sunaconta_admin -p 5432 sunaconta_db_recovery

# 2. Ejecutar restauración en paralelo (-j 4)
pg_restore \
  -h localhost \
  -p 5432 \
  -U sunaconta_admin \
  -d sunaconta_db_recovery \
  -v \
  --clean \
  --if-exists \
  -j 4 \
  sunaconta_db_20261004_020000Z.dump
```

---

## 5. Pruebas Periódicas de Restauración (Simulacro)

De acuerdo con las directrices de seguridad de la información y la Ley N° 29733:
1. Se debe realizar un simulacro de restauración en base de datos aislada el primer domingo de cada mes.
2. Comprobar que las sumas de saldos contables en la tabla `asientos` coincidan exactamente antes y después del restore.
3. Registrar la fecha, duración y resultado en el cuaderno de bitácora de auditoría.
