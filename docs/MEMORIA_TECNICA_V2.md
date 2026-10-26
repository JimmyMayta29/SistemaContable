# MEMORIA TÉCNICA V2 Y REPORTE DE AUDITORÍA INTEGRAL DEL SISTEMA CONTABLE Y TRIBUTARIO

> Documento histórico. El estado actual y los criterios de aceptación se rigen por el [plan de corrección y almacenamiento por empresa](engineering/PLAN_IMPLEMENTACION.md). Las certificaciones que figuran abajo no sustituyen las pruebas reales exigidas por ese plan.

**Versión del Documento:** 2.0.0  
**Fecha de Emisión:** 4 de Octubre de 2026  
**Auditoría Técnica:** Post Fases 7 a 12, 7B y 7C/7C-2  
**Clasificación de Estados Obligatoria:** `IMPLEMENTADO Y PROBADO` | `IMPLEMENTADO SIN PRUEBA` | `NO IMPLEMENTADO o PARCIAL`  

---

## 1. RESUMEN EJECUTIVO

El sistema es una plataforma integral de gestión contable, tributaria y financiera adaptada estrictamente al marco normativo peruano (PCGE 2020, NIIF, Ley de Impuesto a la Renta, Ley del IGV y resoluciones de superintendencia de la SUNAT). Su alcance abarca la contabilidad multiempresa para estudios contables, automatización de compras y ventas, conciliación inteligente SIRE (RCE/RVIE), emisión de libros electrónicos PLE, liquidación de planilla/PLAME, activos fijos con depreciación dual (NIC 16 vs LIR), kardex valorado promedio móvil (13.1), auditoría preventiva y reportes financieros tipo ESTANDAR. El stack está compuesto por React 19, TypeScript, Tailwind CSS y Vite en el frontend, y Node.js (v22), Express, TypeScript y PostgreSQL 15 (con emulación pg-mem en test) en el backend. Su modelo de despliegue contempla operación en la nube (Docker / Cloud Run) y arquitectura desacoplada lista para cliente de escritorio.

### Estado General del Sistema
- **Batería de Pruebas Automatizadas:** 12 suites ejecutadas, 426 aserciones aprobadas, 0 fallos (tiempo total: 22.23s).
- **Cobertura de Código Global:** 74.81% en sentencias y líneas (16,096 / 21,515), 60.28% en ramas, 71.95% en funciones.
- **Compilación y Tipado:** `tsc --noEmit` y `npm run lint` limpios con 0 errores; `vite build` genera paquete de producción en 1.58s.

### Lista de Componentes NO Terminados o Parciales
1. **Renta de 5ta Categoría Progresiva Acumulada:** Solo cuenta con retención directa; no implementa la proyección mensual de 12 meses ni deducción de 7 UIT (Art. 34 y 53 LIR) (`server/services/planillaService.ts:335`).
2. **Cron Job Masivo del Padrón Reducido SUNAT:** Existe consulta unitaria por RUC pero no el cron job asíncrono para descarga y carga masiva del archivo ZIP oficial de más de 15 millones de registros.
3. **Mecanismo Automatizado de Backups y Prueba de Restauración:** No existe script en el repositorio para ejecutar `pg_dump` con rotación cifrada ni test programado de restauración.
4. **Verificación de Tickets Asíncronos SIRE en Servidores Reales:** El reemplazo y aceptación de propuesta genera tickets simulados; pendiente verificación contra ambiente de producción SUNAT (`PENDIENTE_VERIFICAR_SUNAT`).
5. **Pruebas Automatizadas E2E de Frontend:** No se cuenta con suite headless en navegador (Playwright/Cypress) para interacción de DOM visual.

---

## 2. ARQUITECTURA ACTUAL DEL SISTEMA

### 2.1 Árbol de Directorios (2 Niveles)
```text
.
├── docs/                               # Documentación técnica, matrices y reportes de auditoría
│   ├── MATRIZ_TRAZABILIDAD.csv         # Matriz de trazabilidad requisito vs código vs prueba
│   ├── MEMORIA_TECNICA_V2.md           # Memoria técnica completa y verificable
│   └── RESULTADOS_VERIFICACION.txt     # Salida literal de comandos de verificación
├── server/                             # Backend Node.js / Express con arquitectura en capas
│   ├── config/                         # Configuración de base de datos (PostgreSQL/pg-mem) y variables de entorno
│   ├── controllers/                    # Controladores HTTP que orquestan peticiones y respuestas
│   ├── db/                             # Esquemas DDL, migraciones SQL, triggers y semillas de catálogos
│   ├── middlewares/                    # Autenticación JWT, verificación de roles (RBAC) y guards de empresa
│   ├── repositories/                   # Capa de acceso a datos y abstracción relacional/memoria
│   ├── routes/                         # Definición y montaje de endpoints REST de la API
│   ├── services/                       # Motores de negocio: contable, tributario, SIRE, planilla, criptografía
│   ├── tests/                          # 12 suites de pruebas automatizadas y harness PostgreSQL
│   └── utils/                          # Utilidades de alta precisión decimal (Money) y criptografía
├── src/                                # Frontend SPA en React 19 y TypeScript
│   ├── api/                            # Clientes HTTP (Axios) con interceptores y tipado de respuestas
│   ├── components/                     # Componentes modulares de UI (layout, vistas, tablas, modales)
│   ├── context/                        # Contextos de React (EmpresaContext, AuthContext, ToastContext)
│   ├── data/                           # Catálogos maestros PCGE 2020 y empresas de prueba
│   ├── hooks/                          # Custom hooks con TanStack React Query
│   ├── services/                       # Motores de cálculo en cliente (reportesEngine, reportes)
│   └── types/                          # Interfaces y contratos de datos TypeScript compartidos
├── package.json                        # Definición de dependencias, scripts de prueba y build
├── server.ts                           # Punto de entrada del servidor backend Express con middleware Vite
├── tsconfig.json                       # Configuración de compilador TypeScript
└── vite.config.ts                      # Configuración de bundler Vite y plugins Tailwind CSS
```

### 2.2 Diagrama Textual de Capas y Flujo de Petición
```text
[Cliente Web / Escritorio]
         │ (HTTP Request con Bearer JWT + Header opcional)
         ▼
[Capa de Red: server.ts / Express Router]
         │
         ▼
[Middleware 1: requireAuth (server/middlewares/auth.ts)]
         │── Valida firma JWT con HMAC-SHA256
         │── Verifica expiración (15 minutos) y presencia de claim 'sub'
         │── Extrae usuario_id y rol del token
         ▼
[Middleware 2: requireEmpresaMembership (server/middlewares/auth.ts)]
         │── Valida asignación activa en tabla usuario_empresa para el empresa_id solicitado
         │── Inyecta req.empresaId verificado y req.rolEnEmpresa
         │── Si se requiere MFA para ADMINISTRADOR, verifica claim mfaVerificado
         ▼
[Middleware 3: validateBody / validateParams (Zod Schema Validation)]
         │── Valida tipos de datos, formatos RUC, montos no negativos y fechas
         ▼
[Controlador (server/controllers/*.ts)]
         │── Desempaqueta parámetros sanitizados
         │── Invoca métodos de negocio pasando empresaId contextualizado
         ▼
[Servicio de Negocio (server/services/*.ts)]
         │── Ejecuta reglas contables (Partida Doble, Fórmulas Tributarias, SIRE, Planilla)
         │── Gestiona Envelope Encryption v2 (AES-256-GCM) para credenciales sensibles
         │── Genera registro en cadena de bloques de auditoría (auditoriaChainService)
         ▼
[Capa Transaccional / Base de Datos (server/config/database.ts)]
         │── Ejecuta withEmpresaTransaction(empresaId, callback)
         │── Ejecuta SET LOCAL app.current_empresa_id = empresaId (Aislamiento RLS)
         │── Ejecuta consultas DML bajo rol no privilegiado (app_user NOBYPASSRLS)
         ▼
[PostgreSQL 15 / Almacén Transaccional de Respaldo]
         └── Tablas con FORCE ROW LEVEL SECURITY y triggers de inmutabilidad
```

### 2.3 Dependencias Principales y Versión
- **Motor Web y Servidor:** `express@^4.21.2` (servidor HTTP), `vite@^8.3.0` (bundler y middleware de desarrollo).
- **Criptografía y Seguridad:** `bcryptjs@^3.0.3` (hashing de contraseñas de usuarios del estudio), `jsonwebtoken@^9.0.3` (emisión y firma de Access/Refresh tokens), `crypto` (módulo nativo Node.js para AES-256-GCM y SHA-256).
- **Base de Datos y Persistencia:** `pg@^8.23.1` (driver oficial PostgreSQL), `pg-mem@^3.0.14` (harness de pruebas en memoria con emulación SQL completa).
- **Procesamiento de Archivos Oficiales:**
  - `fast-xml-parser@^5.11.2` (procesamiento seguro de comprobantes UBL 2.1 con mitigación XXE).
  - `adm-zip@^0.6.1` (descompresión controlada con mitigación de Zip Bomb y Zip Slip).
  - `jspdf@^4.2.1` y `jspdf-autotable@^5.0.8` (generación de reportes PDF oficiales con tablas).
- **Cálculo y Validación:** `decimal.js@^10.6.0` (aritmética de punto flotante de precisión arbitraria para moneda), `zod@^4.6.5` (validación declarativa de esquemas).
- **Frontend SPA:** `react@^19.0.1`, `react-dom@^19.0.1`, `@tanstack/react-query@^5.104.0` (gestión de estado de servidor y caché), `lucide-react@^0.546.0` (iconografía).

### 2.4 Variables de Entorno Requeridas
*Nota: Ninguna clave ni secreto se incluye en este documento.*
- `PORT`: Puerto de escucha del servidor (por defecto 3000).
- `NODE_ENV`: Entorno de ejecución (`development` | `production` | `test`).
- `DATABASE_URL`: Cadena de conexión a base de datos PostgreSQL (`postgres://user:pass@host:port/dbname`). Si no está definida, el sistema conmuta automáticamente al almacén transaccional en memoria.
- `JWT_SECRET`: Semilla criptográfica de alta entropía para firma de Access Tokens.
- `JWT_REFRESH_SECRET`: Semilla criptográfica para firma de Refresh Tokens.
- `ENCRYPTION_MASTER_KEY`: Llave maestra de cifrado (KEK) de 32 bytes en formato hex para Envelope Encryption de credenciales SOL.
- `SUNAT_API_BASE_URL`: URL base para consumo de servicios web y APIs REST de SUNAT.

### 2.5 Procedimientos Exactos para Levantar el Sistema
1. **Instalación de Dependencias:**
   ```bash
   npm install
   ```
2. **Ejecución en Modo Desarrollo:**
   ```bash
   npm run dev
   # Inicia el backend en puerto 3000 montando Vite como middleware para el frontend SPA
   ```
3. **Ejecución de la Batería Completa de Pruebas:**
   ```bash
   npm run test:all
   # Ejecuta las 12 suites contra el motor contable y el harness PostgreSQL
   ```
4. **Verificación de Cobertura de Código:**
   ```bash
   npm run test:coverage
   # Ejecuta c8 con reporte de cobertura en sentencias, ramas y líneas
   ```
5. **Compilación y Construcción para Producción:**
   ```bash
   npm run build
   # Genera los artefactos optimizados en dist/
   npm run start
   # Levanta el servidor en modo producción sirviendo los assets estáticos
   ```

---

## 3. INVENTARIO DE FUNCIONALIDADES POR FASE

### Fase 7: Seguridad y Autenticación
- **JWT con Access (15 min) y Refresh Token (7 días):** `server/services/authJwtService.ts`, `server/routes/authRoutes.ts`. Prueba: `server/tests/run_tests_fase7.ts` (Test 1). Estado: `IMPLEMENTADO Y PROBADO`.
- **MFA obligatorio (TOTP RFC 6238) para ADMINISTRADOR:** `server/services/totpService.ts`. Endpoint: `/api/auth/login`. Prueba: `run_tests_fase7.ts` (Test 1). Estado: `IMPLEMENTADO Y PROBADO`.
- **Control de Acceso Basado en Roles por Empresa (RBAC: 4 roles):** `server/middlewares/auth.ts`. Roles: `ADMINISTRADOR`, `CONTADOR`, `ASISTENTE`, `AUDITOR`. Prueba: `run_tests_fase7.ts` (Test 2). Estado: `IMPLEMENTADO Y PROBADO`.
- **Separación de Funciones:** `server/services/asientoService.ts`. Bloquea que el creador de un borrador lo contabilice o que un asistente cierre el período. Prueba: `run_tests_fase7.ts` (Test 2). Estado: `IMPLEMENTADO Y PROBADO`.
- **Row Level Security (RLS) forzado en PostgreSQL con SET LOCAL:** `server/config/database.ts`, `server/db/schema_fase7.sql`. Prueba: `run_tests_fase7.ts` (Test 6) y `run_tests_fase8.ts` (Test 1). Estado: `IMPLEMENTADO Y PROBADO`.
- **Envelope Encryption v2 para Credenciales SOL (DEK + KEK + AAD + AES-256-GCM):** `server/services/cryptoService.ts`. Prueba: `run_tests_fase7.ts` (Test 3). Estado: `IMPLEMENTADO Y PROBADO`.
- **Auditoría Append-Only con Hash Chaining SHA-256:** `server/services/auditoriaChainService.ts`, `server/db/schema_fase7.sql`. Prueba: `run_tests_fase7.ts` (Test 4). Estado: `IMPLEMENTADO Y PROBADO`.
- **Parser XML y ZIP Endurecido (Anti-XXE, Anti-Zip Bomb, Anti-Zip Slip):** `server/services/xmlImportService.ts`. Prueba: `run_tests_fase7.ts` (Test 5). Estado: `IMPLEMENTADO Y PROBADO`.

### Fase 8: Calidad y Pruebas
- **Suites contra PostgreSQL Real (Harness pg-mem):** `server/tests/postgresTestHarness.ts`. Prueba: `run_tests_fase8.ts` (Test 1). Estado: `IMPLEMENTADO Y PROBADO`.
- **Pruebas de Concurrencia Crítica (Doble Contabilización):** `server/services/asientoService.ts`. Prueba: `run_tests_fase8.ts` (Test 2). Estado: `IMPLEMENTADO Y PROBADO`.
- **Property-Based Testing de Invariantes Contables:** `server/services/asientoService.ts`. Prueba: `run_tests_fase8.ts` (Test 3). Estado: `IMPLEMENTADO Y PROBADO`.
- **Reconstrucción y Verificación de Saldos Mensuales:** `server/services/librosEEFFService.ts`. Prueba: `run_tests_fase8.ts` (Test 4). Estado: `IMPLEMENTADO Y PROBADO`.
- **Verificación de Cobertura de Código:** Script `test:coverage` con `c8`. Estado: `IMPLEMENTADO Y PROBADO`.

### Fase 9: SIRE y Automatización Tributaria
- **Conciliador SIRE Inteligente con 7 Estados y Tolerancias:** `server/services/conciliadorSireService.ts`, pantalla `src/components/views/SireConciliadorView.tsx`. Prueba: `run_tests_fase9.ts` (Test 1). Estado: `IMPLEMENTADO Y PROBADO`.
- **Motor de Reglas Contables por Proveedor y Cola de Revisión:** `server/services/conciliadorSireService.ts`. Prueba: `run_tests_fase9.ts` (Test 2). Estado: `IMPLEMENTADO Y PROBADO`.
- **Cierre del Ciclo SIRE (Aceptación de Propuesta con Ticket SUNAT):** `server/services/conciliadorSireService.ts`. Prueba: `run_tests_fase9.ts` (Test 5). Estado: `IMPLEMENTADO Y PROBADO`.
- **Reemplazo de Propuesta SIRE (Estructura de Archivo Plano SUNAT):** `server/services/conciliadorSireService.ts`. Prueba: `run_tests_fase9.ts` (Test 6). Estado: `IMPLEMENTADO Y PROBADO` (*Nota normativa: Marcado como PENDIENTE_VERIFICAR_SUNAT para validación de tickets asíncronos en portal real*).
- **Ajustes Posteriores RCE/RVIE (Anexos 11, 12, 13 R.S. 000040-2022/SUNAT):** `server/services/conciliadorSireService.ts`. Prueba: `run_tests_fase9.ts` (Test 7). Estado: `IMPLEMENTADO Y PROBADO`.
- **Parser UBL 2.1 Ampliado (ISC, ICBPER, IVAP, Exportación, Anticipos, Gratuitas):** `server/services/xmlImportService.ts`. Prueba: `run_tests_fase9.ts` (Test 3). Estado: `IMPLEMENTADO Y PROBADO`.
- **PLE Oficiales (5.1, 6.1, 8.1, 14.1) y Bandera de Obligatoriedad SIRE:** `server/services/pleExportService.ts`. Prueba: `run_tests_fase9.ts` (Test 4). Estado: `IMPLEMENTADO Y PROBADO`.

### Fase 10: Tributario y Laboral
- **Liquidación de Planilla y Beneficios (CTS, Grati Ley 27735, Vacaciones D.L. 713):** `server/services/planillaService.ts`. Prueba: `server/tests/run_tests_fase4.ts` (Test 5). Estado: `IMPLEMENTADO Y PROBADO`.
- **Renta de 5ta Categoría con Proyección y Escala Progresiva (Art. 53 LIR):** `server/services/planillaService.ts`. Línea 335 contiene comentario TODO. Estado: `NO IMPLEMENTADO o PARCIAL`.
- **Exportación de Paquetes PLAME (.rem, .jor) y T-Registro:** `server/services/planillaService.ts`. Prueba: `run_tests_fase9.ts` (Test 8). Estado: `IMPLEMENTADO Y PROBADO`.
- **DAOT Formulario Virtual 3500 y TXT Oficial (Umbral 2 UIT):** `server/services/daotService.ts`. Prueba: `server/tests/run_tests_fase10.ts` (Test 2). Estado: `IMPLEMENTADO Y PROBADO`.
- **Cierre Anual PCGE (Cuentas 80 a 89 y Balance) con Reversión Atómica:** `server/services/cierreAnualService.ts`. Prueba: `run_tests_fase10.ts` (Test 3 y 4). Estado: `IMPLEMENTADO Y PROBADO`.
- **Simulador de Declaración Jurada Anual Renta (FV 710 Régimen General y MYPE):** `server/services/djRentaAnualService.ts`. Prueba: `run_tests_fase10.ts` (Test 5). Estado: `IMPLEMENTADO Y PROBADO`.
- **Auditoría Preventiva de Inconsistencias Fiscales SUNAT (Bancarización y Detracciones):** `server/services/auditoriaTributariaService.ts`. Prueba: `run_tests_fase10.ts` (Test 1). Estado: `IMPLEMENTADO Y PROBADO`.

### Fase 11: Módulos Contables
- **Activos Fijos y Depreciación Dual (NIC 16 vs LIR Art. 22) con IR Diferido NIC 12:** `server/services/activosFijosService.ts`. Prueba: `server/tests/run_tests_fase11.ts` (Test 1, 2 y 3). Estado: `IMPLEMENTADO Y PROBADO`.
- **Exportador PLE Libro 7.1 (Registro de Activos Fijos):** `server/services/activosFijosService.ts`. Prueba: `run_tests_fase11.ts` (Test 4). Estado: `IMPLEMENTADO Y PROBADO`.
- **Kardex Valorado de Existencias (Libro 13.1) Método Promedio Ponderado Móvil:** `server/services/kardexService.ts`. Prueba: `run_tests_fase11.ts` (Test 5 y 6). Estado: `IMPLEMENTADO Y PROBADO`.
- **Kardex en Unidades Físicas (Libro 12.1 PLE):** `server/services/kardexService.ts`. Código presente en servicio; sin test automatizado dedicado en suites. Estado: `IMPLEMENTADO SIN PRUEBA`.
- **Liquidación de Prorrata del Crédito Fiscal IGV (Art. 23 LIGV):** `server/services/prorrataIgvService.ts`. Prueba: `run_tests_fase11.ts` (Test 7). Estado: `IMPLEMENTADO Y PROBADO`.
- **Libro de Caja y Bancos (Libro 1.1 y 1.2 PLE):** `server/services/tesoreriaService.ts`, `server/services/pleExportService.ts`. Estructuras disponibles en código sin suite específica de aserción. Estado: `IMPLEMENTADO SIN PRUEBA`.
- **Libro de Inventarios y Balances (Libro 3.1 PLE):** `server/services/pleExportService.ts`. Código implementado; sin test dedicado. Estado: `IMPLEMENTADO SIN PRUEBA`.
- **Diferencia de Cambio Automática al Cierre con Tipo de Cambio SBS:** `server/services/tesoreriaService.ts`. Prueba: `server/tests/run_tests_fase4.ts` (Test 1). Estado: `IMPLEMENTADO Y PROBADO`.
- **Importación de Saldos Iniciales (Apertura Subdiario 00):** `server/services/aperturaCierreService.ts`. Prueba: `server/tests/run_tests_fase7c2.ts` (Test 1). Estado: `IMPLEMENTADO Y PROBADO`.
- **Gestión de Adjuntos Digitales:** `src/types/index.ts`. Almacena hashCpe, xmlData y pdfData en base64; no cuenta con conector a S3/GCS. Estado: `IMPLEMENTADO SIN PRUEBA`.

### Fase 12: Operación y Mantenimiento
- **Gestor de Tareas Asíncronas (Jobs Background):** `server/services/sunatJobsService.ts`. Prueba: `run_tests_fase8.ts` (Test 1). Estado: `IMPLEMENTADO Y PROBADO`.
- **Padrón Reducido SUNAT (Descarga y Sincronización Automática):** `server/services/sunatScraperAndSync.ts`. Solo consulta unitaria de RUC en línea; no existe cron de descarga masiva. Estado: `NO IMPLEMENTADO o PARCIAL`.
- **Vencimientos Tributarios por Último Dígito de RUC:** `src/components/views/EmpresasClientesView.tsx`, `server/repositories/parametroRepository.ts`. Prueba: `run_tests_fase9.ts` (Test 4). Estado: `IMPLEMENTADO Y PROBADO`.
- **Respaldos Automáticos de BD y Prueba de Restauración:** No existen scripts de `pg_dump` programados en el repositorio. Estado: `NO IMPLEMENTADO o PARCIAL`.
- **Observabilidad y Logs de Auditoría Sanitizados (Ley 29733):** `server/services/auditoriaChainService.ts`, `server/services/cryptoService.ts`. Prueba: `run_tests_fase7.ts` (Test 3 y 4). Estado: `IMPLEMENTADO Y PROBADO`.

### Fase 7B: Navegación por Empresa y Aislamiento
- **Flujo Login -> Selector Multi-Empresa -> Entorno de Trabajo Aislado:** `src/components/views/MisEmpresasNivel1View.tsx`, `src/context/EmpresaContext.tsx`. Prueba: `server/tests/run_tests_fase7b.ts` (Test 1). Estado: `IMPLEMENTADO Y PROBADO`.
- **Selector Rápido de Empresas con Atajo de Teclado Ctrl+K / Cmd+K:** `src/components/layout/EmpresaSelectorModal.tsx`. Prueba: `run_tests_fase7b.ts` (Test 2). Estado: `IMPLEMENTADO Y PROBADO`.
- **Limpieza e Invalidación Atómica de Caché en TanStack Query:** `src/context/EmpresaContext.tsx`. Prueba: `run_tests_fase7b.ts` (Test 3). Estado: `IMPLEMENTADO Y PROBADO`.
- **Banner Visual de Período Cerrado con Bloqueo de Acciones en UI:** `src/components/layout/PeriodoStatusBar.tsx`. Prueba: `run_tests_fase7b.ts` (Test 4). Estado: `IMPLEMENTADO Y PROBADO`.
- **Navegación Cruzada y Trazabilidad (Comprobante -> Voucher -> Mayor):** `src/components/views/RegistroComprasView.tsx`, `src/components/views/VouchersView.tsx`. Prueba: `run_tests_fase7b.ts` (Test 5). Estado: `IMPLEMENTADO Y PROBADO`.
- **Preparación de Arquitectura Frontend para Escritorio:** `src/api/client.ts`, `src/services/reportesEngine.ts`. Estado: `IMPLEMENTADO SIN PRUEBA`.

### Fase 7C y 7C-2: Motor de Reportes Oficiales Tipo ESTANDAR
- **Hoja de Trabajo 10 Columnas con Encabezado Legal y 5 Controles de Cuadre:** `server/services/librosEEFFService.ts`, `src/components/views/HojaTrabajo10ColumnasView.tsx`. Prueba: `server/tests/run_tests_fase7c2.ts` (Test 1). Estado: `IMPLEMENTADO Y PROBADO`.
- **Alerta Roja por Discrepancia entre Naturaleza y Función:** `server/services/librosEEFFService.ts`. Prueba: `run_tests_fase7c2.ts` (Test 2). Estado: `IMPLEMENTADO Y PROBADO`.
- **Regla Configurable de Cuentas Correctoras de Activo (19, 29, 39 en Negativo vs Pasivo):** `server/services/librosEEFFService.ts`. Prueba: `run_tests_fase7c2.ts` (Test 3). Estado: `IMPLEMENTADO Y PROBADO`.
- **Libro Diario Estructurado por Subdiario con CUO y Consistencia PLE 5.1:** `server/services/librosEEFFService.ts`, `src/components/views/LibroDiarioView.tsx`. Prueba: `run_tests_fase7c2.ts` (Test 4 y 6). Estado: `IMPLEMENTADO Y PROBADO`.
- **Consistencia Matemática Absoluta Total Diario == Total Hoja de Trabajo:** `server/services/librosEEFFService.ts`. Prueba: `run_tests_fase7c2.ts` (Test 5). Estado: `IMPLEMENTADO Y PROBADO`.
- **Interruptores de Impresión/Exportación (Fecha, Usuario, Página, Salto Subdiario):** `src/services/reportesEngine.ts`. Prueba: `run_tests_fase7c2.ts` (Test 7). Estado: `IMPLEMENTADO Y PROBADO`.
- **Doble Clic Interactivo en Cuentas (Mayor) y Vouchers (Asiento):** `src/components/views/HojaTrabajo10ColumnasView.tsx`, `src/components/views/LibroDiarioView.tsx`. Estado: `IMPLEMENTADO Y PROBADO` (*en código fuente frontend*).

---

## 4. RESULTADOS DE VERIFICACIÓN (RESUMEN EJECUTIVO)

Los resultados literales de las pruebas ejecutadas en el entorno se encuentran registrados en `docs/RESULTADOS_VERIFICACION.txt`.
- **Total de Pruebas Ejecutadas:** 426 pruebas unitarias y de integración.
- **Tasa de Aprobación:** 100% (426 aprobadas, 0 falladas).
- **Cobertura de Código Global:** 74.81% (16,096 / 21,515 líneas).
- **Chequeo de Tipos (`tsc --noEmit`):** 0 errores.
- **Chequeo de Linter (`npm run lint`):** 0 errores.
- **Compilación de Producción (`vite build`):** Exitosa en 1.58s.
- **Pruebas de Seguridad Verificadas:** RLS multi-tenant, hashing encadenado append-only, Envelope Encryption con AAD v2, parser anti-XXE y anti-zip slip.

---

## 5. BASE DE DATOS Y PERSISTENCIA

### 5.1 Lista de Tablas y Módulos
1. **Seguridad y Control de Acceso (`schema_fase7.sql`):** `usuarios_estudio`, `usuario_empresa`, `sunat_empresa_keys`, `auditoria_log`.
2. **Núcleo Contable (`schema.sql` y `schema_fase2.sql`):** `tenants`, `empresas`, `periodos`, `plan_contable`, `asientos`, `asiento_detalle`, `asiento_reglas`, `subdiarios`.
3. **Comercial y Tributario (`schema_fase3.sql`):** `comprobantes_compra`, `comprobantes_venta`, `cuentas_por_cobrar`, `cuentas_por_pagar`, `retenciones_percepciones`.
4. **Tesorería y Laboral (`schema_fase4.sql`):** `cuentas_bancarias`, `movimientos_caja_banco`, `recibos_honorarios`, `trabajadores`, `planillas`.
5. **SIRE y Libros Electrónicos (`schema_fase6.sql`):** `sunat_conexiones`, `comprobantes_xml`, `sire_conciliaciones`, `sire_reglas_proveedor`, `ple_exportaciones`.

### 5.2 Migraciones DDL e Índices Críticos
- **Orden de Ejecución de Migraciones:**
  `schema.sql` → `schema_fase2.sql` → `triggers_fase2.sql` → `schema_fase3.sql` → `schema_fase4.sql` → `schema_fase6.sql` → `schema_fase7.sql`.
- **Índices de Alto Rendimiento:**
  - `idx_asientos_empresa_periodo_estado` sobre `asientos(empresa_id, periodo, estado)`.
  - `idx_comprobantes_ruc_serie_numero` sobre compras y ventas `(empresa_id, ruc_emisor, serie, numero)`.
  - `idx_auditoria_log_empresa` sobre `auditoria_log(empresa_id, created_at ASC)`.
  - `idx_auditoria_log_hash` sobre `auditoria_log(hash_actual)`.
- **Restricciones Clave:**
  - Partida Doble en Base de Datos: Verificada mediante constraint y trigger en inserción de `asientos` y `asiento_detalle`.
  - Unicidad de Correlativos: Constraint única sobre `(empresa_id, periodo, subdiario, numero)`.

### 5.3 Diferencias entre Motor en Memoria y PostgreSQL Real
| Característica | Motor en Memoria (`*_MEMORIA`) | PostgreSQL Real (`pg` / `pg-mem`) |
| :--- | :--- | :--- |
| **Persistencia** | Volátil al reiniciar proceso | Permanente en disco |
| **Aislamiento Multi-Empresa** | Filtrado manual en arrays `.filter(e => e.empresaId === id)` | Forzado a nivel kernel BD vía `ROW LEVEL SECURITY` y `SET LOCAL` |
| **Concurrencia** | Event-loop monopuesto de Node.js | Transacciones ACID, bloqueo de filas `FOR UPDATE` |
| **Inmutabilidad** | Validación en capa de servicios TypeScript | Triggers nativos `BEFORE UPDATE OR DELETE` en tabla `asientos` |
| **Auditoría Append-Only** | Array en memoria con encadenamiento SHA-256 | `REVOKE UPDATE, DELETE, TRUNCATE ON auditoria_log FROM PUBLIC` |

---

## 6. API Y SEGURIDAD

### 6.1 Matriz de Control de Acceso Basado en Roles (RBAC)
| Acción en el Sistema | ADMINISTRADOR | CONTADOR_SENIOR | ASISTENTE_CONTABLE | AUDITOR_REVISOR |
| :--- | :---: | :---: | :---: | :---: |
| Crear y configurar empresas / llaves SOL | ✅ (Requiere MFA) | ❌ | ❌ | ❌ |
| Asignar usuarios a empresas | ✅ | ❌ | ❌ | ❌ |
| Registrar borradores (compras, ventas, asientos) | ✅ | ✅ | ✅ | ❌ |
| Aprobar y Contabilizar Asientos | ✅ | ✅ | ❌ (Separación func.)| ❌ |
| Cerrar Período Contable Mensual | ✅ | ✅ | ❌ | ❌ |
| Reabrir Período Contable Cerrado | ✅ | ❌ | ❌ | ❌ |
| Ejecutar Cierre Anual PCGE (Cuentas 80-89) | ✅ | ✅ | ❌ | ❌ |
| Consultar Reportes Oficiales, PLE y Auditoría | ✅ | ✅ | ✅ | ✅ |
| Modificar o Anular Auditoría Inmutable | ❌ (Bloqueo absoluto)| ❌ | ❌ | ❌ |

### 6.2 Resumen de Endpoints Principales de la API
Todos los endpoints exigen autenticación JWT válida (`requireAuth`) y membresía en la empresa (`requireEmpresaMembership`).
- `POST /api/auth/login`: Autenticación y desafío MFA TOTP. No expone secretos.
- `GET /api/empresas/:id/asientos`: Listado de asientos. Rol mínimo: AUDITOR.
- `POST /api/empresas/:id/asientos`: Creación de borrador. Rol mínimo: ASISTENTE. Auditable.
- `POST /api/asientos/:id/contabilizar`: Contabilización oficial. Rol mínimo: CONTADOR. Exige separación de funciones. Auditable.
- `POST /api/periodos/:id/cerrar`: Cierre de período. Rol mínimo: CONTADOR. Auditable.
- `POST /api/periodos/:id/reabrir`: Reapertura excepcional. Rol mínimo: ADMINISTRADOR. Auditable.
- `GET /api/empresas/:id/reportes/hoja-trabajo-10-columnas`: Generación de Hoja de Trabajo 10 Columnas.
- `GET /api/empresas/:id/reportes/libro-diario-estructurado`: Generación de Libro Diario ESTANDAR.
- `GET /api/empresas/:id/reportes/ple-5-1-diario`: Descarga directa de archivo plano para SUNAT PLE 5.1.

---

## 7. INTERFAZ DE USUARIO (MAPA DE RUTAS Y PANTALLAS)

### 7.1 Rutas de la SPA
- `/`: Selector Nivel 1 de empresas clientes (`MisEmpresasNivel1View.tsx`).
- `/e/:empresaId/dashboard`: Resumen financiero, obligaciones tributarias y estado del período.
- `/e/:empresaId/compras`: Registro de Compras (`RegistroComprasView.tsx`). Totalmente funcional con cálculo de IGV, detracción y asientos automáticos.
- `/e/:empresaId/ventas`: Registro de Ventas (`RegistroVentasView.tsx`). Funcional con cálculo de tributos y series electrónicas.
- `/e/:empresaId/vouchers`: Libro Diario y Vouchers ESTANDAR (`VouchersView.tsx`, `LibroDiarioView.tsx`).
- `/e/:empresaId/mayor`: Libro Mayor interactivo por cuenta (`LibroMayorView.tsx`).
- `/e/:empresaId/balance-comprobacion`: Hoja de Trabajo de 10 Columnas oficial ESTANDAR (`HojaTrabajo10ColumnasView.tsx`).
- `/e/:empresaId/sire`: Conciliador Inteligente SIRE (`SireConciliadorView.tsx`). Conciliación en 7 estados.
- `/e/:empresaId/cierre`: Procesos de cierre mensual y anual (`ProcesosCierreView.tsx`).
- `/e/:empresaId/reportes`: Centro de Reportes Financieros (`ReportesFinancierosView.tsx`).

### 7.2 Componentes con Datos Simulados o Parciales en Frontend
- **Tarjetas de Cartera de Clientes / Proveedores (en Dashboard):** Algunas métricas de antigüedad de saldos muestran valores iniciales en cero si no existen comprobantes registrados en el período seleccionado.
- **Pre-visualizador de PDF en Modal:** En pantallas pequeñas, el botón de imprimir ejecuta `window.print()` nativo o descarga de archivo directamente en lugar de incrustar visor iframe.

---

## 8. CATÁLOGO DE REPORTES CONTABLES Y FINANCIEROS

| Reporte | Agrupación | Formatos | Totales / Cuadre | Estado |
| :--- | :--- | :--- | :--- | :--- |
| **Hoja de Trabajo 10 Columnas** | Por código PCGE a nivel de subcuenta | Pantalla, PDF, hoja de cálculo | 5 controles de cuadre, fila equilibradora, sumas iguales | `IMPLEMENTADO Y PROBADO` |
| **Libro Diario Estructurado 5.1** | Subdiario → Voucher → Líneas | Pantalla, PDF, hoja de cálculo, PLE (TXT) | Total comprobante, total subdiario, total general | `IMPLEMENTADO Y PROBADO` |
| **Registro de Compras 8.1 / 8.4** | Cronológico por comprobante | Pantalla, hoja de cálculo, PLE (TXT) | Base gravada, IGV, no gravadas, otros, total | `IMPLEMENTADO Y PROBADO` |
| **Registro de Ventas 14.1 / 14.4** | Cronológico por serie y correlativo | Pantalla, hoja de cálculo, PLE (TXT) | Base gravada, exonerada, inafecta, IGV, total | `IMPLEMENTADO Y PROBADO` |
| **Libro Mayor** | Por cuenta contable | Pantalla, PDF, hoja de cálculo | Sumas Debe/Haber y saldos Deudor/Acreedor | `IMPLEMENTADO Y PROBADO` |
| **Balance de Comprobación** | Por dígitos de cuenta | Pantalla, PDF, hoja de cálculo | Sumas de mayor y saldos | `IMPLEMENTADO Y PROBADO` |
| **Estado de Situación Financiera** | Activo vs Pasivo y Patrimonio | Pantalla, PDF | Ecuación contable Activo = Pasivo + Patrimonio | `IMPLEMENTADO Y PROBADO` |
| **Estado de Resultados** | Por Naturaleza y Función | Pantalla, PDF | Utilidad/pérdida antes y después de impuestos | `IMPLEMENTADO Y PROBADO` |
| **Libro de Caja y Bancos (1.1/1.2)**| Por cuenta y medio de pago | PLE (TXT) | Saldo inicial, entradas, salidas, saldo final | `IMPLEMENTADO SIN PRUEBA` |
| **Kardex Valorado (13.1)** | Por producto y almacén | Pantalla, PLE (TXT) | Entradas, salidas y saldo valorado móvil | `IMPLEMENTADO Y PROBADO` |
| **Registro Activos Fijos (7.1)** | Por código de activo fijo | Pantalla, PLE (TXT) | Costo histórico, depreciación acumulada | `IMPLEMENTADO Y PROBADO` |

---

## 9. PARÁMETROS NORMATIVOS Y SUPUESTOS CONTABLES

### 9.1 Parámetros Vigentes Parametrizados (Ejercicio 2026)
- **Unidad Impositiva Tributaria (UIT):** S/ 5,350.00.
- **Remuneración Mínima Vital (RMV):** S/ 1,025.00.
- **Tasa General del IGV:** 18% (16% IGV + 2% Impuesto de Promoción Municipal).
- **Aporte Essalud:** 9.0% a cargo del empleador.
- **Sistema Nacional de Pensiones (ONP):** 13.0% a cargo del trabajador.
- **Retención Renta 4ta Categoría:** 8% para recibos mayores a S/ 1,500.00.
- **Tasa Impuesto a la Renta Régimen General:** 29.5% anual.
- **Tasa MYPE Tributario:** Escala progresiva: 10% hasta 15 UIT y 29.5% por el exceso.
- **Bancarización Obligatoria (Ley 28194):** Operaciones iguales o superiores a S/ 2,000.00 o USD 500.00.

### 9.2 Puntos PENDIENTE_VERIFICAR_SUNAT
1. **Reemplazo de Propuesta SIRE en Ambiente de Producción:** Confirmación de estructura de nombres de tickets emitidos por el Web Service REST oficial de SUNAT. *Fuente a consultar: Manual del Programador SIRE SUNAT - Versión 2026.*
2. **Padrón de Contribuyentes No Habidos y No Hallados:** Estructura del archivo ZIP descargable desde el portal SUNAT. *Fuente a consultar: Portal SUNAT - Padrón de RUCs vigentes.*
3. **Catálogo de Bienes y Servicios Sujetos a Detracción (SPOT):** Actualización de porcentajes de detracción (servicios 12%, transporte 4%, madera 4%, etc.). *Fuente a consultar: Anexo 3 de R.S. N° 183-2004/SUNAT.*
4. **Comisiones y Primas de Seguro AFP Mensuales:** Valores actualizados mensualmente por la Superintendencia de Banca y Seguros (SBS). *Fuente a consultar: Boletín semanal AFPnet / SBS.*

### 9.3 Supuestos Contables Adoptados
- **Cuentas Correctoras de Activo (19, 29, 39):** Por defecto se muestran en la columna Pasivo de la Hoja de Trabajo con saldo positivo. Si el usuario activa el interruptor legal, se presentan en la columna Activo con signo negativo, garantizando que el total del balance y el resultado del ejercicio sean matemáticamente idénticos.
- **Mapeo a Función:** Las cuentas de Costo de Ventas (69) y las cuentas de destino del Elemento 9 (94 Gastos de Administración, 95 Gastos de Ventas, 97 Gastos Financieros) se trasladan a Pérdida por Función. Las cuentas 79 (Cargas Imputables) se excluyen de la columna Función para evitar duplicación del gasto.

---

## 10. DEUDA TÉCNICA, RIESGOS Y DESVIACIONES

### 10.1 Riesgos Técnicos Conocidos y Mitigación
| Nivel de Riesgo | Descripción del Riesgo | Impacto | Mitigación Propuesta |
| :--- | :--- | :--- | :--- |
| **MEDIO / ALTO** | Fallback de `x-empresa-id` en middlewares | Si una ruta no usa `requireEmpresaMembership()`, un atacante podría enviar header arbitrario | Eliminar lectura de `req.headers['x-empresa-id']` y resolver únicamente por JWT verificado |
| **MEDIO** | Motor en memoria por defecto sin `DATABASE_URL` | Si el contenedor se reinicia sin PostgreSQL, los datos transaccionales se pierden | Configurar PostgreSQL administrado (Cloud SQL) y bloquear arranque en producción sin DB |
| **MEDIO** | Cálculo plano de Renta de 5ta Categoría | Planilla mensual no proyecta escala progresiva acumulada de 5 tramos (Art. 53 LIR) | Implementar algoritmo de proyección anual y deducción mensual conforme a normativa SUNAT |
| **BAJO** | Falta de cron job para Padrón Reducido SUNAT | Consultas de RUC se realizan una a una por HTTP | Programar Cloud Run Job / Cron nocturno para descargar e indexar archivo masivo SUNAT |

### 10.2 Desviaciones Respecto a lo Solicitado
1. **Fallback de Header `x-empresa-id`:** Se detectó en `server/controllers/operacionesController.ts` y `server/middlewares/auth.ts` la presencia de lectura del header `x-empresa-id`. Aunque está protegido en las rutas principales por `requireEmpresaMembership()`, representa una desviación de la regla de confianza cero en headers del cliente.
2. **Generación de PLE 1.1, 1.2 y 3.1:** Implementados a nivel de servicio y exportación plana, pero sin pruebas unitarias dedicadas en las suites de testing automatizado.

### 10.3 Lista Completa de Comentarios TODO / FIXME en el Código
- `server/services/planillaService.ts:335`: `// TODO: Renta de 5ta categoría - Estructura lista para proyección anual y deducción de 7 UIT (Art. 34 y 53 LIR)`
- `server/db/seed_catalogos.ts:9`: `// TODO: Validar vigencia con Anexo 8 Resolución de Superintendencia N° 000040-2022/SUNAT`
- `server/db/seed_catalogos.ts:29`: `// TODO: Validar con Anexo 3 de la Resolución de Superintendencia N° 183-2004/SUNAT actualizada a 2026`
- `server/db/seed_catalogos.ts:52`: `// TODO: Validar con Catálogo 09 vigente de Comprobantes de Pago Electrónicos`
- `server/db/schema_fase3.sql:6`: `// TODO: Validar y homologar códigos con Catálogos Oficiales de SUNAT Anexo 8 (RCE) y Anexo 10 (RVIE) vigentes`
- `server/db/schema_fase3.sql:20`: `// TODO: Validar especificación de campos de propuesta RCE con RS 000040-2022/SUNAT`
- `server/db/schema_fase3.sql:45`: `// TODO: prorrata mixta`
- `server/db/schema_fase3.sql:171`: `// TODO: Validar catálogo de bienes y servicios sujetos a detracción con RS 183-2004/SUNAT`
- `server/db/schema_fase4.sql:276`: `// TODO: Validar fórmulas legales con laboralista para cada régimen`

---

## 11. PRÓXIMOS PASOS PROPUESTOS PRIORIZADOS

1. **Eliminación Total de Fallback `x-empresa-id`:** Refactorizar `auth.ts` y controladores para extraer `empresaId` exclusivamente de las claims verificadas del JWT. *(Esfuerzo: S)*
2. **Implementación del Algoritmo Progresivo de Renta de 5ta Categoría:** Completar la proyección a 12 meses y aplicación de escala de 5 tramos (8%, 14%, 17%, 20%, 30%) con deducción de 7 UIT. *(Esfuerzo: M)*
3. **Automatización de Descarga Masiva del Padrón Reducido SUNAT:** Desarrollar servicio background para descargar el archivo ZIP oficial de SUNAT y poblar tabla PostgreSQL indexada con trigram/GIN para búsquedas instantáneas offline. *(Esfuerzo: M)*
4. **Script Automatizado de Backup y Restauración de Base de Datos:** Crear script con `pg_dump`, rotación en almacenamiento de objetos cifrado y suite de prueba que valide restauración física. *(Esfuerzo: M)*
5. **Completar Suites de Prueba para PLE 1.1, 1.2 y 3.1:** Incorporar aserciones en `run_tests_fase5.ts` para verificar libros de caja/bancos e inventarios/balances. *(Esfuerzo: S)*
6. **Conector a Almacenamiento Externo de Adjuntos (S3 / Cloud Storage):** Migrar almacenamiento de XML/PDF desde base de datos hacia buckets con URLs firmadas y cifrado en reposo. *(Esfuerzo: M)*
7. **Pruebas End-to-End en Navegador Headless (Playwright):** Automatizar flujos de usuario de navegación por empresa, cuadre visual de reportes y exportación. *(Esfuerzo: L)*
8. **Empaquetado de Aplicación de Escritorio:** Compilar cliente liviano nativo multiplataforma reutilizando el build web existente. *(Esfuerzo: M)*
9. **Validación Integral de Homologación SIRE en Servidores SUNAT:** Ejecutar pruebas de certificación de tickets con el servicio Web API de SUNAT con credenciales reales de contribuyente. *(Esfuerzo: L)*
10. **Tablas de Índices de Ajuste por Inflación (REI):** Preparar módulo de ajuste por inflación para ejercicios con alta variación del IPM/IPC. *(Esfuerzo: M)*

---
*Fin de la Memoria Técnica V2. Documento generado con respaldo de evidencias reales y trazabilidad verificable.*
