# Reglas del proyecto

Las instrucciones directas del usuario tienen prioridad. El plan vigente está en [docs/engineering/PLAN_IMPLEMENTACION.md](docs/engineering/PLAN_IMPLEMENTACION.md).

- Usar nombres propios neutrales para módulos, reportes, rutas, símbolos, archivos, comentarios, commits y documentación. No nombrar funciones del producto con marcas de otros sistemas.
- Los reportes se llaman Registro de Compras, Libro Diario y demás nombres contables simples. El estilo visual se llama formato estándar; `REPORT_STYLE` admite `"estandar" | "actual"` y su motor vive en `src/services/reports/formato_estandar`.
- Antes de cada entrega comprobar cero referencias de marca en nombres y textos del producto, en nombres de archivos y en documentación, incluidos archivos ocultos y README. Revisar el historial disponible de README cuando corresponda; no reescribir historial compartido para una limpieza rutinaria.
- Arquitectura elegida: B, concretada en el plan como una base por empresa y una base de control del estudio. No introducir dependencias de datos entre empresas.
- Toda tabla o archivo nuevo perteneciente a una empresa se registra en la lista declarativa única, junto con sus dependencias y prueba, en el mismo commit. Las tablas hijas sin `empresa_id` también pertenecen al registro. La fase B2 debe establecer ese registro y su comprobación contra el catálogo de PostgreSQL real antes de declararse terminada.
- Los reportes, libros y estados leen exclusivamente el almacenamiento persistente de la empresa autorizada. No usar arrays en memoria como sustitución silenciosa de fallos o ausencia de datos reales.
- El respaldo excluye credenciales SUNAT y usuarios/roles conforme a las decisiones confirmadas. Solo ADMINISTRADOR puede generarlo o restaurarlo. No registrar secretos en archivos de auditoría o respuestas.
- Implementar en orden A → B → B2 → C → D → E. B incluye los hallazgos 5, 6, 7, 12, 8 y 10; el hallazgo 9 se cierra en B2, después de sus pruebas reales.
- No certificar B2 sin ida y vuelta completa, archivo alterado rechazado, aislamiento de otra empresa y persistencia tras reinicio sobre PostgreSQL real. La fase E debe ejecutar estas pruebas desde `npm run verify` y fallar si falta el entorno real.
