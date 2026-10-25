# Plan de corrección y almacenamiento por empresa

Fecha: 25 de octubre de 2026. Esta adenda prevalece sobre planes anteriores cuando exista conflicto. Los hallazgos numerados corresponden a la auditoría funcional de esta fecha; un requisito documentado no se considera implementado ni probado.

## Decisiones confirmadas

| Decisión | Elección del usuario | Consecuencia |
|---|---|---|
| Arquitectura | B: esquema o base por empresa | Cada empresa tendrá almacenamiento aislado y portable. |
| Credenciales SUNAT | Excluirlas por defecto | El respaldo no contiene secretos ni sus claves de cifrado. Se configuran de nuevo al restaurar. |
| Usuarios y roles | Excluirlos | No se exportan cuentas, contraseñas, sesiones, factores de autenticación, membresías ni asignaciones de permisos. |

La implementación propuesta para B es **una base PostgreSQL por empresa**, dentro del servidor disponible, más una base de control del estudio. Esta concreta la alternativa elegida; no presupone servidores separados. Los permisos de conexión deben impedir acceder a bases ajenas. Los usuarios globales, autorizaciones y programación se mantienen en la base de control; la contabilidad y sus archivos pertenecen a la empresa.

La empresa nueva restaurada se asigna al administrador que realiza la operación mediante una autorización nueva de la instalación destino. No se importan usuarios ni roles del archivo. Las referencias históricas a actores se conservan como evidencia de origen, sin crear cuentas ni conceder permisos.

### Alternativas evaluadas para un estudio con varias empresas

| Alternativa | Ventajas | Costos y límites |
|---|---|---|
| A: una base, `empresa_id` y RLS | Reutiliza la estructura actual; menos conexiones; una sola migración por versión; menor operación. | Todas las consultas deben aplicar aislamiento; respaldo y restauración dependen de filtros completos; un error de autorización afecta varias empresas. |
| B: esquema por empresa | Separa espacios de nombres y permite preparar una restauración por esquema. | Comparte la base; no equivale a aislamiento físico; exige controlar permisos y resolución del esquema, y repetir migraciones. |
| B: base por empresa, propuesta elegida para implementar B | Catálogo y conexiones independientes; sustitución y recuperación de una empresa más delimitadas; permisos por base. | Más bases, conexiones, migraciones y seguimiento de versiones; la coordinación con la base de control requiere un protocolo recuperable. |

## Secuencia y puertas de salida

| Fase | Alcance | Hallazgos | Criterio para continuar |
|---|---|---|---|
| N: nomenclatura, commit separado | Nombres neutrales en interfaz, símbolos propios, rutas, archivos, comentarios y documentación; `REPORT_STYLE = "estandar" \| "actual"`; carpeta `src/services/reports/formato_estandar`. | Regla de diseño 1 | Cero referencias de marca en los nombres del producto, imports internos resueltos, pruebas de paridad y revisión del cambio sin alterar cálculos. |
| A: arranque, acceso y preparación | Instalación reproducible, conexión antes de migrar, esquema completo, configuración inicial, sesión, autorización sobre la empresa real, rol administrativo coherente y secretos de instalación. | 19, 4, 2, 3, 1, 14, 15 | Una instalación vacía permite configurar e iniciar sesión; otro usuario no accede a una empresa ajena; las migraciones fallidas impiden anunciar disponibilidad. |
| B: integridad y persistencia contable | Corregir SQL y contratos del esquema; validar partida doble al contabilizar; extornos; resolver cuentas reales; atomicidad de pagos; cierre con datos reales y sin duplicación. | **5, 6, 7, 12, 8, 10**, en ese orden | Crear, editar, contabilizar, anular, pagar y cerrar sobre PostgreSQL real produce saldos correctos y persistentes, también con errores y concurrencia. |
| **B2: Almacenamiento y respaldo por empresa** | Arquitectura B, registro declarativo, archivos, exportación, restauración, programación, retención e interfaz de respaldo. | **9, sustituido íntegramente por esta fase** | Todas las condiciones y pruebas B2 descritas abajo aprobadas contra PostgreSQL real. |
| C: interfaz e informes conectados | Libros, estados, liquidación mensual y exportaciones leen el almacenamiento persistente activo. Completar cambios de empresa, miembros y alta única. | 11, 13, 18 | Una operación aparece en pantalla, libros y exportaciones; cambiar de empresa o mes no mezcla datos; reiniciar conserva la información. |
| D: integración tributaria | Descarga real de propuestas y lectura persistente de credenciales; sin documentos simulados en operaciones reales. | 16, 17 | Integraciones y errores comprobados; las credenciales se mantienen fuera del respaldo conforme a la decisión del usuario. |
| E: verificación integral | Medición real de cobertura y comprobaciones de servicios, HTTP, interfaz y persistencia, incluida la ida y vuelta B2. | 20 y regresiones | `npm run verify` ejecuta todas las comprobaciones obligatorias y termina con error si falta PostgreSQL real o si falla una prueba. |

La fase B2 empieza **después de aprobar B**. El hallazgo 9 permanece abierto hasta aprobar B2; no se cierra por cambiar el formato del ZIP o por actualizar este documento. Los planes visuales anteriores continúan únicamente en lo compatible con esta adenda.

## B2.1 — Unidad de almacenamiento por empresa

- Cada empresa tiene su base de datos versionada y un directorio raíz propio identificado por un UUID interno. El RUC no se usa para construir rutas o identificadores SQL.
- La base de control resuelve empresa, base, versión y permisos desde identificadores validados por el servidor. No se admiten nombres de base, esquemas, rutas o conexiones aportados libremente por el cliente.
- La transición desde la base compartida conserva registros, relaciones, bloqueos y resultados. Se valida por empresa antes de activar su nueva base; se mantiene el origen recuperable hasta comprobar la migración.
- Maestros, plan de cuentas, asientos, compras, ventas, honorarios, tesorería, cartera, activos, planilla, cierres, periodos y bloqueos, parámetros, auditoría, adjuntos y archivos generados forman una sola unidad portable.
- Los catálogos compartidos utilizados por una empresa deben quedar identificados por versión o materializados en su respaldo para reconstruir su significado. Las referencias entre tablas no pueden depender de otra empresa.
- Libros, reportes, estados y saldos leen exclusivamente el almacenamiento persistente de la empresa autenticada. No se sustituye un error de base por arrays en memoria ni por información de demostración.

## B2.2 — Registro declarativo y archivos

Se creará **un solo registro declarativo**, en `server/storage/registroDatosEmpresa.ts`, ordenado según dependencias. Será utilizado por migración, respaldo, vista previa, restauración y sus pruebas. Este documento no constituye una segunda lista de tablas.

Cada entrada declara tabla, clave primaria, dependencias, referencias que requieren remapeo y política de exportación. Incluye también tablas hijas sin `empresa_id`; omitir la columna no permite escapar del registro. Las exclusiones confirmadas de seguridad deben declararse de forma explícita, con su tratamiento de restauración, en lugar de desaparecer de la lista.

Una prueba consulta el catálogo de **PostgreSQL real** y falla si:

1. Hay una tabla con `empresa_id` no registrada.
2. Hay una tabla de negocio en una base de empresa no registrada, aunque no tenga `empresa_id`.
3. Una dependencia o referencia a remapear falta, tiene orden inválido o apunta a otra empresa.
4. Una carpeta de datos o clase de archivo no tiene entrada en el registro.

La capa de archivos se implementará en `server/storage/archivosEmpresa.ts`. Todas las escrituras pasan por ella y registran metadatos persistentes: empresa, identificador, ruta relativa, tipo de documento, tamaño, SHA-256, vínculo de negocio y fecha.

La raíz de cada empresa contendrá las carpetas registradas para adjuntos, XML/CDR, PDF, TXT y demás documentos. Los temporales de importación, exportación y restauración permanecen bajo esa raíz; se publican mediante operaciones atómicas y se recuperan o limpian tras un reinicio. Se rechazan rutas absolutas, `..`, enlaces que salgan de la raíz y archivos no registrados.

Los propios respaldos y temporales se clasifican como artefactos operativos en el registro, con retención y limpieza; no se incluyen recursivamente dentro de otros respaldos. Esta exclusión no afecta a los documentos de negocio ni a los archivos generados por los módulos.

**Regla permanente:** toda tabla o archivo nuevo perteneciente a una empresa debe añadirse al registro y sus comprobaciones en el mismo commit.

## B2.3 — Formato del respaldo

El usuario descarga un único ZIP cifrado con una contraseña elegida por él. El contenido descifrado consta de:

```text
manifest.json
tablas/<tabla>.ndjson
archivos/<rutas relativas registradas>
```

El manifiesto contiene versiones de aplicación, esquema y formato; RUC y razón social; fecha de creación; rango de periodos; exclusiones aplicadas; conteo de filas por tabla; y SHA-256 y tamaño de cada archivo de datos o documento. No incluye su propio hash, que sería circular: su integridad debe quedar cubierta por el cifrado autenticado del contenedor.

La exportación usa una instantánea consistente de la base y versiones inmutables de los documentos para que los conteos y saldos pertenezcan al mismo momento. Las filas se leen por cursor o copia incremental, se escriben como NDJSON y se comprimen, cifran y calculan sus hashes por flujo. La memoria no crece con el tamaño total de la empresa.

La implementación debe comprobar soporte de cifrado autenticado, contraseña e integridad, además de flujo continuo. No se considera cumplido con un ZIP completo cargado en un `Buffer`, cifrado posteriormente. La librería actual solo se reutilizará si cumple estos requisitos; cualquier dependencia adicional debe justificarse por una capacidad que no exista.

Las credenciales SUNAT, sus claves y los usuarios/roles quedan excluidos. La contraseña del respaldo no se guarda en texto claro, bitácoras, argumentos de procesos ni respuestas de la API.

## B2.4 — Autorización y bitácora

- Solo el rol **ADMINISTRADOR** de la empresa autorizada puede generar o restaurar respaldos y cambiar su programación. La fase A debe resolver de forma coherente el rol administrativo existente; no se cambia su significado dentro del commit de nomenclatura.
- Listar y descargar requieren autorización sobre esa empresa; nunca basta con conocer un identificador de archivo. La vista previa hereda los permisos de restauración.
- Se registran generación, descarga, programación, vista previa, inicio, éxito y fallo de restauración, con empresa, actor, fecha, identificador y resultado. Nunca se registran contraseñas o secretos.
- La auditoría histórica incluida se conserva como evidencia de origen. Remapear identificadores no debe falsificar una cadena de hashes histórica: el destino registra la importación y su procedencia de forma verificable.

## B2.5 — Restauración

### Vista previa sin escrituras en la empresa

La vista previa descifra, valida versiones, estructura y hashes, cuenta registros y detecta conflictos de RUC, claves y documentos. Informa remapeos, exclusiones y migraciones requeridas. No crea bases, filas, archivos temporales, respaldos ni eventos de negocio en la empresa; cualquier almacenamiento temporal necesario debe proceder de la recepción del archivo, no de efectos del análisis. Tampoco bloquea a la empresa por una simple vista previa. La solicitud y su resultado se auditan en la base de control, sin modificar los datos o archivos que se analizan.

### Modo 1: como empresa nueva

1. Validar primero el archivo completo y la compatibilidad del esquema.
2. Crear una base y un área de archivos de preparación, todavía invisibles para usuarios.
3. Remapear identificadores y todas sus referencias según el registro, incluyendo metadatos y enlaces de archivos. Conservar RUC y datos de negocio; no sobrescribir ni mezclar otra empresa con el mismo RUC.
4. Aplicar solo migraciones hacia adelante admitidas; rechazar versiones futuras o sin ruta de actualización.
5. Restaurar las tablas en una transacción y validar relaciones, conteos, documentos, saldos y libros.
6. Activar la empresa de forma recuperable en la base de control y asignar acceso nuevo al administrador que ejecutó la operación. No importar permisos del respaldo.

### Modo 2: reemplazar una empresa existente

1. Exigir que el usuario escriba el RUC exacto del destino; volver a comprobar autorización y correspondencia en el servidor.
2. Obtener un bloqueo persistente y exclusivo por empresa, válido entre procesos. Todas sus rutas de escritura y trabajos deben respetarlo; las demás empresas continúan operando.
3. Generar y verificar un respaldo automático del destino antes de reemplazarlo. Si falta una contraseña o un secreto de programación válido para cifrarlo, la operación se detiene antes de cambiar datos.
4. Preparar y validar la restauración como en el modo nuevo. El destino conserva su identidad local y sus autorizaciones; los permisos y secretos excluidos no se borran ni se sustituyen inadvertidamente. Los secretos locales se mantienen fuera de las tablas reemplazadas y deben seguir vinculados al RUC del destino.
5. Ejecutar el reemplazo de datos de negocio en una transacción de todo o nada y activar el conjunto de documentos correspondiente.
6. Registrar el resultado y liberar el bloqueo al terminar. Ante error o caída, conservar o recuperar el estado anterior y el respaldo previo.

**Límite técnico a resolver en la implementación:** una transacción PostgreSQL no revierte archivos ni coordina por sí sola dos bases. Se requiere preparación separada, publicación atómica de archivos y un estado de operación persistente y recuperable. Ningún éxito debe anunciarse antes de completar la publicación; las pruebas deben cortar el proceso en esas fronteras y comprobar recuperación, no solo lanzar excepciones dentro del SQL.

Se rechazan archivos alterados, truncados, incompletos, con archivos extra no declarados, rutas fuera de la raíz, nombres duplicados, límites de expansión abusivos o referencias inválidas. La validación no confía en conteos o tamaños declarados sin comprobarlos.

## B2.6 — Programación, retención y pantalla

La pantalla se llama **Respaldo de empresa** y permite generar, listar, descargar, programar y restaurar; ofrece vista previa y los dos modos de restauración. Los reportes mantienen nombres simples, por ejemplo Registro de Compras y Libro Diario; el estilo se llama formato estándar.

La programación y retención son por empresa y persisten entre reinicios. El programador registra ejecuciones y evita trabajos duplicados entre procesos. Los horarios se muestran con su zona; las contraseñas o secretos necesarios se guardan cifrados fuera del propio respaldo, con una clave de instalación ajena a la BD exportada.

Para que una tarea automática funcione sin intervención, el administrador debe configurar explícitamente el secreto con el que se cifrarán sus respaldos y el respaldo previo obligatorio. No se inventa una contraseña fija ni se reutiliza una clave publicada en código. La contraseña elegida protege los respaldos manuales; los automáticos usan el secreto configurado por el administrador y recuperable según la política de la instalación.

La retención elimina únicamente respaldos de la empresa y solo después de confirmar uno nuevo válido, según la configuración. Debe preservar un respaldo previo mientras una restauración esté pendiente de recuperación. La descarga usa flujo y no carga el archivo entero en memoria.

## B2.7 — Pruebas obligatorias y fase E

Las pruebas se ejecutan sobre bases PostgreSQL reales descartables y directorios aislados. No utilizan bases de clientes ni consideran equivalente un emulador.

1. **Registro completo:** crear una tabla de prueba con `empresa_id` sin registrarla debe hacer fallar la verificación. Repetir con una tabla hija de negocio y con un tipo de documento no registrado.
2. **Ida y vuelta de todos los módulos:** llenar una empresa con maestros, cuentas, asientos, compras, ventas, honorarios, tesorería, cartera, activos, planilla, cierres, periodos/bloqueos, parámetros, auditoría, adjuntos y XML/CDR/PDF/TXT. Respaldar, restaurar como empresa nueva y comparar los conteos de todas las tablas incluidas, Balance de Comprobación, saldos de cartera y libros. Deben coincidir exactamente después de normalizar identificadores remapeados; también deben coincidir los hashes de documentos. Comparar las exclusiones de forma explícita, sin ocultar diferencias de datos de negocio.
3. **Manipulación:** alterar un byte de un respaldo válido debe provocar rechazo sin activar una empresa ni modificar datos. Repetir con truncamiento y archivo faltante.
4. **Aislamiento:** registrar antes y después conteos, saldos y hashes de una segunda empresa; restaurar la primera no modifica ninguno.
5. **Reinicio:** detener y arrancar el servidor; confirmar que empresas, permisos locales, movimientos, archivos, programación y resultados persisten.
6. **Todo o nada:** inyectar fallos en inserciones, remapeo, publicación de archivos y cambio de estado de control. Reiniciar durante la operación y comprobar recuperación completa, sin conjuntos parciales.
7. **Permisos y bloqueos:** un rol distinto de ADMINISTRADOR no genera ni restaura; la escritura concurrente de la empresa en restauración se rechaza o espera; otra empresa sigue operando.
8. **Compatibilidad y cifrado:** contraseña incorrecta, versión futura y migración no soportada se rechazan. Un respaldo antiguo admitido migra hacia adelante sin cambiar saldos.
9. **Flujo y retención:** exportar y descargar un conjunto grande sin memoria proporcional al archivo; comprobar programación, ausencia de ejecuciones duplicadas y retención independiente por empresa.
10. **Vista previa:** comparar el estado de las bases de empresa y sus archivos antes y después; no se escribe nada en ellos ni se activa un bloqueo operativo. Verificar por separado el evento de acceso de la bitácora de control.

En la fase E, **`npm run verify` debe incluir la prueba de ida y vuelta**, las restantes comprobaciones B2, revisión de nombres, tipos, compilación y suites de regresión. Debe fallar si la conexión de pruebas reales no está configurada o no es un servidor PostgreSQL; no saltará silenciosamente esta parte ni devolverá éxito con pruebas pendientes.

## Estado de esta entrega

- Diseño B y exclusiones: confirmados por el usuario.
- Limpieza de nomenclatura: cambio separado de la corrección funcional.
- A, B, B2, C, D y E: pendientes de implementar y aprobar por sus pruebas. Este documento no habilita ni certifica el respaldo existente.
- La ejecución de B2 está condicionada a cerrar B; no se migran ni reemplazan bases de empresas en esta entrega de diseño.

### Verificación del cambio de nombres

Se aprobaron la comprobación de tipos, compilación, las 16 suites existentes y la paridad de importes de los reportes. Se revisaron nombres y contenido actuales, archivos ocultos e historial disponible de README, con cero referencias de las marcas retiradas.

Esto no cierra las fases funcionales: un diagnóstico separado reprodujo diez defectos de la auditoría en servicios y HTTP aislados. La batería existente usa memoria y un emulador para parte de sus comprobaciones; no se ejecutó PostgreSQL real ni conexión externa SUNAT. La prueba B2 y `npm run verify` permanecen como condiciones de salida por implementar, sin scripts que simulen su aprobación.
