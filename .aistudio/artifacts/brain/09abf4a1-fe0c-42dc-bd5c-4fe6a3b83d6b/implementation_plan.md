# Motor Único de Reportes Formato ESTANDAR para SUNAConta PRO

> Plan histórico de presentación. La adenda y el orden de corrección vigentes están en `docs/engineering/PLAN_IMPLEMENTACION.md`; prevalecen sus decisiones de almacenamiento, respaldo y verificación.

Implementación de un motor modular de reportes contables con la estética y estructura formal de ESTANDAR (monocromo estricto en blanco y negro, tipografía ligera, cabeceras enmarcadas por grupos, totales con doble subrayado, y paginación centrada "Pag. N") tanto en previsualización de impresión, PDF y hoja de cálculo, respaldado por un interruptor de reversibilidad (`REPORT_STYLE`) y con entrega inicial del **Registro de Compras (RCE)**.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> Decisiones confirmadas con el usuario para salvaguardar el sistema en producción:
> - **Libro de Honorarios (4ta):** Se confirmaron las columnas actuales completas, incluyendo acreditación de suspensión de retenciones SUNAT (con N° de resolución) y concepto/glosa del servicio.
> - **Interruptor de Estilo (`REPORT_STYLE`):** Se integrará un interruptor de dos estados (`"estandar"` | `"actual"`) ubicado en la barra superior (`TitleBar`) y sincronizado con el modal/diálogo de descarga, permitiendo alternar instantáneamente entre la vista original y el nuevo formato ESTANDAR sin alterar código.
> - **Inmutabilidad de Formatos SUNAT:** Los archivos TXT de libros electrónicos PLE (5.1, 6.1, 8.1, 14.1) y SIRE (RCE/RVIE) no sufrirán ninguna alteración, garantizando estricta paridad fiscal.
> - **Entrega Gradual por Pasos:** Implementación aislada del motor unificado y entrega inicial exclusiva del **Registro de Compras (RCE)** con 22 columnas para revisión y validación antes de proceder con los reportes restantes.

---

## 1. Overview & Core Concept

- **Qué hace:** Provee una capa de renderizado y exportación especializada que transforma las consultas contables existentes en reportes imprimibles y exportables que replican con precisión milimétrica la presentación de ESTANDAR:
  - Totalmente monocromo: negro puro (`#000000`) sobre fondo blanco, sin degradados, sombras, pastillas de colores ni fondos grises.
  - Tipografía fina (peso 300 / ligero) con alineaciones contables rigurosas (códigos centrados, descripciones a la izquierda, importes con coma de miles y 2 decimales alineados a la derecha).
  - Encabezado legal clásico: Razón social en tamaño destacado a la izquierda con RUC y dirección; título del libro entre asteriscos (ej. `*** REGISTRO DE COMPRAS DEL MES DE ENERO ***`) y moneda (`SOLES`).
  - Agrupaciones formales por tipo de documento con subtítulos (ej. `Tipo Doc.: 01 FACTURA`), línea fina de cierre, fila `TOTALES:` por grupo y `TOTAL GENERAL:` con línea superior y doble subrayado inferior.
  - Pie de página centrado con formato `Pag. N`.
- **Destinatarios:** Contadores públicos, auditores fiscales y analistas tributarios habituados al estándar gráfico de ESTANDAR en Perú.
- **Valor agregado:** Reportes listos para impresión oficial y fiscalización SUNAT que ahorran tinta, mejoran la legibilidad tabular y eliminan formatos informales.

---

## 2. User Experience & Visual Design

### Especificaciones Gráficas Obligatorias (Formato ESTANDAR)
- **Paleta de Colores:** Estricto `#000000` (texto y líneas) sobre `#FFFFFF` (fondo). Cero sombreado de filas, cero cebreado alternado, cero íconos en el reporte impreso o exportado.
- **Tipografía:** `Segoe UI Light`, `Helvetica Neue`, `Arial` o sans-serif de peso ligero (`font-light` / `font-weight: 300`). En PDF, texto regular excepto en títulos de bloque y totales.
- **Estructura de Cabecera:**
  - *Bloque Superior Izquierdo:* Razón social (11pt / negrita o peso regular destacado), línea de Periodo `PERIODO aaaa` (o `aaaa-mm`), Dirección fiscal, `R.U.C.: [Número]`.
  - *Bloque Central:* Título entre asteriscos `*** REGISTRO DE COMPRAS DEL MES DE [MES] ***`, subtítulo centrado `(Expresado en SOLES)`.
  - *Fecha y Hora de Emisión:* Oculta por defecto según especificación, con interruptor opcional para activarla.
- **Enmarcado de Columnas:**
  - Cabecera enmarcada con borde negro fino (0.5pt), borde superior e inferior más marcado (1pt).
  - Agrupaciones jerárquicas de columnas (ej. "Datos del Documento", "Referencia del Documento", "Datos del Proveedor").
  - La cabecera se repite automáticamente al inicio de cada página física en PDF e impresión continua.
- **Filas de Datos:**
  - Filas de datos sin bordes verticales ni horizontales intermedios para máxima limpieza visual.
  - Subtotales por grupo precedidos por línea fina horizontal superior.
  - Fila final `TOTAL GENERAL:` con línea superior simple y doble subrayado inferior continuo contable (`border-b-4 border-double border-black`).
- **Pie de Página:** Centrado con la leyenda `Pag. N` (y `Pag. N de M` en vista previa).

---

## 3. Key Product Decisions & Trade-Offs

- **Decisión 1: Módulo Aislado `src/services/reports/formato_estandar/formatoEstandarEngine.ts`**
  - *Enfoque:* Crear una arquitectura basada en especificación declarativa (`EstandarReportDefinition`). El motor recibe columnas agrupadas, tipos de datos, funciones de suma y formateo, y se encarga de generar la vista previa HTML imprimible, el documento PDF vectorial vía `jsPDF` y la hoja de cálculo limpia sin estilos redundantes.
  - *Por qué:* Desacopla la lógica de presentación de los componentes de vista existentes. Los datos provienen intactos de los hooks y servicios actuales.
- **Decisión 2: Interruptor Global Reactivo (`REPORT_STYLE`)**
  - *Enfoque:* Almacenar el valor en `localStorage` (`'sunaconta_report_style' = 'estandar' | 'actual'`) con fallback predeterminado a `'estandar'`, expuesto mediante el contexto de la aplicación y un selector en el `TitleBar` y en el diálogo de exportación.
  - *Por qué:* Permite a cualquier usuario revertir instantáneamente a los formatos previos con un solo clic sin modificar el código fuente.
- **Decisión 3: Exportación a hoja de cálculo Tab-Separated Values (TSV / .xls) con UTF-8 BOM**
  - *Enfoque:* Generar un flujo de texto tabulado con codificación `\uFEFF` que replica las mismas filas, cabeceras agrupadas y totales sin dependencias externas pesadas, abriéndose directamente en una hoja de cálculo con cuadrícula nativa sin colores de fondo.
- **Decisión 4: Entrega Gradual por Reportes**
  - *Enfoque:* Entregar en esta etapa el motor base y el **Registro de Compras (RCE)** completo (22 columnas). Validar cuadre exacto de importes contra el formato actual antes de implementar los siguientes reportes.

---

## 4. Technical Architecture & Data Strategy

### Diagrama de Arquitectura del Motor de Reportes

```
┌────────────────────────────────────────────────────────────────────────┐
│                   VISTAS EXISTENTES DEL SISTEMA                        │
│   (RegistroComprasView, RegistroVentasView, HonorariosView, etc.)      │
│   * Conservan sus consultas, hooks, estados y navegación intactos      │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                        REPORT_STYLE Selector
                 ┌──────────────────┴──────────────────┐
                 ▼                                     ▼
        ["actual" (Legacy)]                 ["estandar" (Nuevo Estilo)]
  ┌───────────────────────────────┐   ┌────────────────────────────────────┐
  │   pdfExportService.ts         │   │  src/services/reports/             │
  │   - jsPDF autotable clásico   │   │  formatoEstandarEngine.ts            │
  │   - Colores azul/esmeralda    │   │  - Definición declarativa          │
  │   - Membrete decorativo       │   │  - Blanco y negro puro (#000000)   │
  └───────────────────────────────┘   │  - Tipografía fina / Segoe UI Light│
                                      │  - Agrupación por Tipo Doc.        │
                                      │  - Repetición de cabecera por pág  │
                                      │  - Doble subrayado en Totales      │
                                      └─────────────────┬──────────────────┘
                                                        │
                         ┌──────────────────────────────┼──────────────────────────────┐
                         ▼                              ▼                              ▼
                 [ Vista Previa HTML ]           [ Exportación PDF ]            [ Exportación hoja de cálculo ]
                 (window.print ready)            (jsPDF nativo vectorial)       (TSV/.xls con UTF-8 BOM)
```

### Estructura de Columnas: Registro de Compras ESTANDAR (22 Columnas)
1. **O:** Origen / Orden correlativo del registro.
2. **N° VOU:** Número de voucher contable asignado.
3. **F. Emisión:** Fecha de emisión del comprobante (formato `d/mm/aaaa`).
4. **F. Venc.:** Fecha de vencimiento del comprobante.
5. **Documento (T/D, Serie, Número):** Cabecera combinada para Tipo de Documento SUNAT (01, 03, 07, 08), Serie y Número correlativo.
6. **Referencia (Fecha, T/D, Serie, Número):** Para notas de crédito y débito.
7. **Proveedor (Doc, Número, Razón Social):** Tipo documento identidad (6=RUC), número y nombre del proveedor.
8. **Base Imp. Adq. Grav. y de Exp. A:** Base imponible destinada a operaciones gravadas y de exportación (18%).
9. **Base B:** Base imponible destinada a operaciones gravadas y/o de exportación y a operaciones no gravadas (prorrata).
10. **Base C:** Base imponible de adquisiciones sin derecho a crédito fiscal.
11. **Adq. no Gravadas:** Adquisiciones no gravadas / exoneradas / inafectas.
12. **I.S.C.:** Impuesto Selectivo al Consumo.
13. **I.G.V. A 18%:** Impuesto General a las Ventas correspondiente a la Base A.
14. **I.G.V. A 10%:** IGV con tasa reducida de la Ley 31556 (restaurantes y hoteles) si aplica.
15. **I.G.V. B:** IGV correspondiente a la Base B (prorrata).
16. **I.G.V. C:** IGV correspondiente a la Base C (sin crédito).
17. **ICBPER:** Impuesto al consumo de bolsas de plástico.
18. **Otros Tributos:** Otros cargos y tributos que no forman parte de la base imponible.
19. **Total:** Importe total facturado en soles.
20. **T/C:** Tipo de cambio oficial de la transacción.
21. **Spot Fecha:** Fecha de depósito de la detracción SPOT.
22. **Spot Número:** Número de constancia de depósito de detracción.

---

## 5. Plan de Verificación y Pruebas

1. **Paridad de Totales:**
   - Comparación estricta entre el `totalBase`, `totalIgv`, `totalNoGrav` y `totalGeneral` generados en el formato ESTANDAR frente a los del formato actual para el mismo período y empresa cliente. Diferencia permitida: `0.00`.
2. **Verificación de Formato y Paginación:**
   - Comprobación de repetición de cabecera en documentos de múltiples páginas físicas.
   - Paginación centrada `Pag. N`.
   - Ninguna celda o columna truncada en orientación horizontal A4.
3. **Prueba de Reversibilidad:**
   - Conmutación del interruptor `REPORT_STYLE` entre `"estandar"` y `"actual"` desde el `TitleBar` y desde el diálogo de descarga, confirmando que el usuario puede volver a la vista anterior sin recargar el sistema.
4. **Verificación de Inmutabilidad de Archivos SUNAT:**
   - Ejecución de pruebas de generación de archivos TXT de PLE 8.1 / SIRE RCE para confirmar que la estructura pipe-delimited (`|`) permanece exactamente idéntica.
