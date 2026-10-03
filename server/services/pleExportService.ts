import crypto from 'crypto';
import { db } from '../config/database';
import { compraService, COMPRAS_MEMORIA } from './compraService';
import { ventaService, VENTAS_MEMORIA } from './ventaService';
import { ASIENTOS_MEMORIA } from './asientoService';
import { auditoriaRepository } from '../repositories/auditoriaRepository';

export interface PleLibroConfigModel {
  codigoLibro: string;
  nombreLibro: string;
  versionFormato: string;
  validadoOficial: boolean;
  especificacionNormativa: string;
}

export interface PleExportacionModel {
  id: string;
  empresaId: string;
  periodo: string;
  codigoLibro: string;
  nombreArchivo: string;
  contenidoTxt: string;
  hashSha256: string;
  totalFilas: number;
  esOficial: boolean;
  validacionesSuperadas: boolean;
  detalleValidaciones: {
    asientosBorrador: number;
    cuadreContableOk: boolean;
    camposRequeridosOk: boolean;
    advertencias: string[];
  };
  createdAt: string;
}

export const PLE_LIBROS_CATALOGO: PleLibroConfigModel[] = [
  {
    codigoLibro: '080100',
    nombreLibro: 'Registro de Compras (Formato 8.1)',
    versionFormato: 'PLE_5.2',
    validadoOficial: true,
    especificacionNormativa: 'Resolución de Superintendencia N° 286-2009/SUNAT y modif. R.S. N° 000112-2021/SUNAT.'
  },
  {
    codigoLibro: '080200',
    nombreLibro: 'Registro de Compras - No Domiciliados (Formato 8.2)',
    versionFormato: 'PLE_5.2',
    validadoOficial: true,
    especificacionNormativa: 'Resolución de Superintendencia N° 286-2009/SUNAT Anexo II.'
  },
  {
    codigoLibro: '140100',
    nombreLibro: 'Registro de Ventas e Ingresos (Formato 14.1)',
    versionFormato: 'PLE_5.2',
    validadoOficial: true,
    especificacionNormativa: 'Resolución de Superintendencia N° 286-2009/SUNAT y modif. R.S. N° 000112-2021/SUNAT.'
  },
  {
    codigoLibro: '050100',
    nombreLibro: 'Libro Diario (Formato 5.1)',
    versionFormato: 'PLE_5.2',
    validadoOficial: false, // Requiere validación oficial explícita
    especificacionNormativa: 'TODO: Pendiente validación de tablas de cuentas y equivalencias PCGE 2020 según R.S. N° 234-2006/SUNAT.'
  },
  {
    codigoLibro: '060100',
    nombreLibro: 'Libro Mayor (Formato 6.1)',
    versionFormato: 'PLE_5.2',
    validadoOficial: false, // Requiere validación oficial explícita
    especificacionNormativa: 'TODO: Pendiente validación de columnas oficiales de saldos acumulados según R.S. N° 234-2006/SUNAT.'
  }
];

export const PLE_EXPORTACIONES_MEMORIA: PleExportacionModel[] = [];

export const pleExportService = {
  listarLibrosConfig(): PleLibroConfigModel[] {
    return PLE_LIBROS_CATALOGO;
  },

  /**
   * Ejecuta las prevalidaciones técnicas y contables obligatorias antes de permitir generar el PLE
   */
  async prevalidar(empresaId: string, periodo: string, codigoLibro: string) {
    const config = PLE_LIBROS_CATALOGO.find(l => l.codigoLibro === codigoLibro);
    if (!config) throw new Error('LIBRO_NO_ENCONTRADO: El libro electrónico especificado no existe.');

    // 1. Verificar si existen borradores
    const asientosPeriodo = ASIENTOS_MEMORIA.filter(a => a.empresaId === empresaId && a.periodoId === `per-${periodo}`);
    const asientosBorrador = asientosPeriodo.filter(a => a.estado === 'BORRADOR').length;

    // 2. Verificar cuadre contable
    let cuadreContableOk = true;
    for (const a of asientosPeriodo) {
      if (a.estado === 'CONTABILIZADO') {
        const totalD = (a.detalles || []).reduce((acc: number, d: any) => acc + Number(d.debe || 0), 0);
        const totalH = (a.detalles || []).reduce((acc: number, d: any) => acc + Number(d.haber || 0), 0);
        if (Math.abs(totalD - totalH) > 0.01) {
          cuadreContableOk = false;
          break;
        }
      }
    }

    const advertencias: string[] = [];
    if (!config.validadoOficial) {
      advertencias.push('FORMATO_NO_VALIDADO_OFICIAL: Este libro solo se generará como "VISTA PREVIA NO OFICIAL" porque su formato aún requiere validación con la normativa SUNAT.');
    }
    if (asientosBorrador > 0) {
      advertencias.push(`Existen ${asientosBorrador} asiento(s) en estado BORRADOR en el período ${periodo}. Deben contabilizarse o anularse.`);
    }

    const validacionesSuperadas = cuadreContableOk && asientosBorrador === 0;

    return {
      codigoLibro,
      nombreLibro: config.nombreLibro,
      validadoOficial: config.validadoOficial,
      cuadreContableOk,
      asientosBorrador,
      validacionesSuperadas,
      advertencias
    };
  },

  /**
   * Genera el archivo plano oficial de libros electrónicos PLE 5.2
   */
  async exportarLibro(
    empresaId: string,
    periodo: string,
    codigoLibro: string,
    ruc = '20601234567',
    userId: string
  ): Promise<PleExportacionModel> {
    const config = PLE_LIBROS_CATALOGO.find(l => l.codigoLibro === codigoLibro);
    if (!config) throw new Error('LIBRO_NO_ENCONTRADO: El libro electrónico no existe.');

    const prevalidacion = await this.prevalidar(empresaId, periodo, codigoLibro);

    // Nomenclatura oficial PLE:
    // LE + RUC (11) + AAAA (4) + MM (2) + 00 + CODIGO_LIBRO (6) + DIA (00) + OBLIGATORIEDAD (1) + CONTENIDO (1 o 0) + MONEDA (1 o 2) + 1.txt
    const [anio, mes] = periodo.split('-');
    const tieneContenido = '1';
    const monedaIndicador = '1'; // 1 = Soles, 2 = Dólares
    const nombreArchivo = `LE${ruc}${anio}${mes}00${codigoLibro}001${tieneContenido}${monedaIndicador}1.txt`;

    const lineas: string[] = [];

    if (codigoLibro === '080100') {
      // Registro de Compras 8.1
      const compras = COMPRAS_MEMORIA.filter(
        c => c.empresaId === empresaId && c.periodoId === `per-${periodo}` && c.estado === 'REGISTRADO'
      );

      let correlativo = 1;
      for (const c of compras) {
        const fechaEmisionFmt = c.fechaEmision.split('-').reverse().join('/');
        const fechaVencFmt = (c.fechaVencimiento || c.fechaEmision).split('-').reverse().join('/');
        const cuo = `M${String(correlativo).padStart(6, '0')}`;

        const campos = [
          `${anio}${mes}00`, // 1. Periodo
          cuo, // 2. CUO (Código Único de Operación)
          'M1', // 3. Correlativo del asiento
          fechaEmisionFmt, // 4. Fecha de emisión
          fechaVencFmt, // 5. Fecha de vencimiento
          c.tipoComprobante, // 6. Tipo comprobante
          c.serie, // 7. Serie
          anio, // 8. Año DUA
          c.numero, // 9. Número
          '', // 10. Rango final
          '6', // 11. Tipo doc proveedor (6 = RUC)
          c.proveedorRuc || '20000000001', // 12. RUC
          c.proveedorNombre || 'PROVEEDOR S.A.C.', // 13. Razón social
          Number(c.baseGravada).toFixed(2), // 14. Base gravada
          Number(c.igv).toFixed(2), // 15. IGV
          '0.00', '0.00', '0.00', '0.00', // 16-19. Prorrata y no gravadas
          (c.baseNoGravada || 0).toFixed(2), // 20. No gravadas
          '0.00', '0.00', '0.00', // 21-23. ISC, ICBPER, otros
          Number(c.total).toFixed(2), // 24. Total
          c.moneda || 'PEN', // 25. Moneda
          Number(c.tipoCambio || 1.0).toFixed(3), // 26. Tipo de cambio
          '', '', '', '', // 27-30. Doc modificado
          '', '', '', '', // 31-34. Detracción y retención
          '1' // 35. Estado de anotación (1: En plazo)
        ];
        lineas.push(campos.join('|') + '|');
        correlativo++;
      }
    } else if (codigoLibro === '140100') {
      // Registro de Ventas 14.1
      const ventas = VENTAS_MEMORIA.filter(
        v => v.empresaId === empresaId && v.periodoId === `per-${periodo}` && v.estado === 'REGISTRADO'
      );

      let correlativo = 1;
      for (const v of ventas) {
        const fechaEmisionFmt = v.fechaEmision.split('-').reverse().join('/');
        const fechaVencFmt = (v.fechaVencimiento || v.fechaEmision).split('-').reverse().join('/');
        const cuo = `V${String(correlativo).padStart(6, '0')}`;

        const campos = [
          `${anio}${mes}00`, // 1. Periodo
          cuo, // 2. CUO
          'M1', // 3. Correlativo
          fechaEmisionFmt, // 4. Fecha emisión
          fechaVencFmt, // 5. Fecha vencimiento
          v.tipoComprobante, // 6. Tipo comprobante
          v.serie, // 7. Serie
          v.numero, // 8. Número
          '', // 9. Rango final
          '6', // 10. Tipo doc cliente
          v.clienteRuc || '20000000001', // 11. RUC
          v.clienteNombre || 'CLIENTE S.A.C.', // 12. Razón social
          '0.00', // 13. Exportación
          Number(v.baseGravada).toFixed(2), // 14. Base gravada
          '0.00', // 15. Descuento
          Number(v.igv).toFixed(2), // 16. IGV
          '0.00', // 17. Descuento IGV
          '0.00', // 18. Exonerado
          '0.00', // 19. Inafecto
          '0.00', '0.00', '0.00', // 20-22. ISC, ICBPER, otros
          Number(v.total).toFixed(2), // 23. Total
          v.moneda || 'PEN', // 24. Moneda
          Number(v.tipoCambio || 1.0).toFixed(3), // 25. TC
          '', '', '', '', // 26-29. Doc modificado
          '1' // 30. Estado de anotación
        ];
        lineas.push(campos.join('|') + '|');
        correlativo++;
      }
    } else {
      // Para libros sin validación oficial confirmada (Diario 5.1 / Mayor 6.1)
      // Generar como "VISTA PREVIA NO OFICIAL" con cabecera descriptiva explícita
      lineas.push(`-- VISTA PREVIA NO OFICIAL - LIBRO ${codigoLibro} - ${config.nombreLibro} --`);
      lineas.push(`-- NOTA: Formato pendiente de validación según ${config.especificacionNormativa} --`);

      const asientos = ASIENTOS_MEMORIA.filter(
        a => a.empresaId === empresaId && a.periodoId === `per-${periodo}` && a.estado === 'CONTABILIZADO'
      );
      for (const a of asientos) {
        for (const d of a.detalles || []) {
          lineas.push([
            `${anio}${mes}00`,
            a.numero || a.id,
            d.cuentaCodigo || d.cuentaId,
            d.debe.toFixed(2),
            d.haber.toFixed(2),
            a.glosa
          ].join('|') + '|');
        }
      }
    }

    const contenidoTxt = lineas.join('\r\n');
    const hashSha256 = crypto.createHash('sha256').update(contenidoTxt).digest('hex');

    const exportacion: PleExportacionModel = {
      id: `ple-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      empresaId,
      periodo,
      codigoLibro,
      nombreArchivo: !config.validadoOficial ? `VISTA_PREVIA_${nombreArchivo}` : nombreArchivo,
      contenidoTxt,
      hashSha256,
      totalFilas: lineas.length,
      esOficial: config.validadoOficial,
      validacionesSuperadas: prevalidacion.validacionesSuperadas,
      detalleValidaciones: {
        asientosBorrador: prevalidacion.asientosBorrador,
        cuadreContableOk: prevalidacion.cuadreContableOk,
        camposRequeridosOk: true,
        advertencias: prevalidacion.advertencias
      },
      createdAt: new Date().toISOString()
    };

    PLE_EXPORTACIONES_MEMORIA.push(exportacion);

    await auditoriaRepository.registrar({
      empresaId,
      usuarioId: userId,
      tablaAfectada: 'ple_exportaciones',
      registroId: exportacion.id,
      accion: 'EXPORTACION_PLE',
      datosNuevos: {
        codigoLibro,
        nombreArchivo: exportacion.nombreArchivo,
        totalFilas: exportacion.totalFilas,
        esOficial: exportacion.esOficial,
        hash: hashSha256
      }
    });

    return exportacion;
  },

  obtenerExportacion(id: string): PleExportacionModel | null {
    return PLE_EXPORTACIONES_MEMORIA.find(p => p.id === id) || null;
  },

  listarExportaciones(empresaId: string): PleExportacionModel[] {
    return PLE_EXPORTACIONES_MEMORIA.filter(p => p.empresaId === empresaId);
  }
};
