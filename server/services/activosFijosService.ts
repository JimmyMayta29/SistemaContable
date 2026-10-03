import { Money } from '../utils/decimal';
import { ASIENTOS_MEMORIA, asientoService } from './asientoService';

export interface ActivoFijoModel {
  id: string;
  empresaId: string;
  codigoActivo: string;
  descripcion: string;
  categoria: 'EDIFICIOS' | 'VEHICULOS' | 'MAQUINARIA' | 'EQUIPOS_COMPUTO' | 'MUEBLES_ENSERES' | 'OTROS';
  fechaAdquisicion: string;
  fechaInicioUso: string;
  moneda: 'PEN' | 'USD';
  valorAdquisicion: number;
  tipoCambio?: number;
  valorAdquisicionSoles: number;
  vidaUtilMesesFinanciera: number; // NIC 16
  tasaDepreciacionTributariaAnual: number; // LIR Art. 22
  cuentaActivoPCGE: string; // Ej: 33211, 33411, 33511, 33611
  cuentaDepreciacionPCGE: string; // Ej: 39132, 39134, 39136
  centroCosto: string; // Ej: CC-ADMINISTRACION, CC-OPERACIONES
  depreciacionAcumuladaFinanciera: number;
  depreciacionAcumuladaTributaria: number;
  valorNetoEnLibrosFinanciero: number;
  valorNetoEnLibrosTributario: number;
  estado: 'ACTIVO' | 'DEPRECIADO_TOTAL' | 'BAJA';
  createdAt: string;
  updatedAt: string;
}

export interface CalculoDepreciacionPeriodo {
  activoId: string;
  codigoActivo: string;
  descripcion: string;
  periodo: string;
  depreciacionMensualFinanciera: number;
  depreciacionMensualTributaria: number;
  diferenciaTemporariaMes: number; // Financiera - Tributaria
  irDiferidoMes: number; // 29.5% de diferencia temporaria (NIC 12)
  tipoEfecto: 'ACTIVO_IR_DIFERIDO' | 'PASIVO_IR_DIFERIDO' | 'SIN_DIFERENCIA';
}

export const ACTIVOS_FIJOS_MEMORIA: ActivoFijoModel[] = [];

export const activosFijosService = {
  /**
   * Tasas oficiales máximas de depreciación anual tributaria según LIR Art. 22
   */
  obtenerTasaTributariaOficial(categoria: ActivoFijoModel['categoria']): number {
    switch (categoria) {
      case 'EDIFICIOS': return 5.0; // 5% anual lineal
      case 'VEHICULOS': return 20.0; // 20% anual
      case 'EQUIPOS_COMPUTO': return 25.0; // 25% anual
      case 'MAQUINARIA': return 10.0; // 10% anual
      case 'MUEBLES_ENSERES': return 10.0; // 10% anual
      case 'OTROS': return 10.0;
    }
  },

  /**
   * Registra un nuevo activo fijo con cálculo automático de cuentas PCGE y tasas LIR
   */
  async registrarActivo(empresaId: string, input: {
    codigoActivo: string;
    descripcion: string;
    categoria: ActivoFijoModel['categoria'];
    fechaAdquisicion: string;
    fechaInicioUso: string;
    moneda?: 'PEN' | 'USD';
    valorAdquisicion: number;
    tipoCambio?: number;
    vidaUtilMesesFinanciera?: number;
    centroCosto?: string;
  }): Promise<ActivoFijoModel> {
    const id = `act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const moneda = input.moneda || 'PEN';
    const tc = input.tipoCambio || 3.75;
    const valorSoles = moneda === 'USD' 
      ? Money.toNumber(Money.mul(input.valorAdquisicion, tc))
      : input.valorAdquisicion;

    const tasaTrib = this.obtenerTasaTributariaOficial(input.categoria);
    // Vida útil tributaria equivalente en meses = (100 / tasaTrib) * 12
    const vidaUtilFinanciera = input.vidaUtilMesesFinanciera || Math.round((100 / tasaTrib) * 12);

    // Cuentas PCGE predeterminadas según categoría
    let cuentaActivo = '33511';
    let cuentaDeprec = '39135';
    if (input.categoria === 'EDIFICIOS') {
      cuentaActivo = '33211';
      cuentaDeprec = '39132';
    } else if (input.categoria === 'VEHICULOS') {
      cuentaActivo = '33411';
      cuentaDeprec = '39134';
    } else if (input.categoria === 'EQUIPOS_COMPUTO') {
      cuentaActivo = '33611';
      cuentaDeprec = '39136';
    } else if (input.categoria === 'MAQUINARIA') {
      cuentaActivo = '33311';
      cuentaDeprec = '39133';
    }

    const nuevoActivo: ActivoFijoModel = {
      id,
      empresaId,
      codigoActivo: input.codigoActivo,
      descripcion: input.descripcion,
      categoria: input.categoria,
      fechaAdquisicion: input.fechaAdquisicion,
      fechaInicioUso: input.fechaInicioUso,
      moneda,
      valorAdquisicion: input.valorAdquisicion,
      tipoCambio: tc,
      valorAdquisicionSoles: valorSoles,
      vidaUtilMesesFinanciera: vidaUtilFinanciera,
      tasaDepreciacionTributariaAnual: tasaTrib,
      cuentaActivoPCGE: cuentaActivo,
      cuentaDepreciacionPCGE: cuentaDeprec,
      centroCosto: input.centroCosto || 'CC-ADMINISTRACION',
      depreciacionAcumuladaFinanciera: 0,
      depreciacionAcumuladaTributaria: 0,
      valorNetoEnLibrosFinanciero: valorSoles,
      valorNetoEnLibrosTributario: valorSoles,
      estado: 'ACTIVO',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    ACTIVOS_FIJOS_MEMORIA.push(nuevoActivo);
    return nuevoActivo;
  },

  /**
   * Calcula la depreciación de un período mensual para todos los activos de la empresa
   */
  async calcularDepreciacionPeriodo(empresaId: string, periodo: string): Promise<{
    periodo: string;
    totalActivosDepreciados: number;
    totalDepreciacionFinanciera: number;
    totalDepreciacionTributaria: number;
    diferenciaTemporariaTotal: number;
    totalIrDiferido: number;
    detalles: CalculoDepreciacionPeriodo[];
  }> {
    const activos = ACTIVOS_FIJOS_MEMORIA.filter(a => a.empresaId === empresaId && a.estado === 'ACTIVO');
    const detalles: CalculoDepreciacionPeriodo[] = [];

    let totalFin = Money.create(0);
    let totalTrib = Money.create(0);
    let totalDif = Money.create(0);
    let totalIrDif = Money.create(0);

    for (const act of activos) {
      // Depreciación financiera mensual = Valor Soles / vida útil meses
      const depFinMes = Money.toNumber(Money.div(act.valorAdquisicionSoles, act.vidaUtilMesesFinanciera));
      // Depreciación tributaria mensual = (Valor Soles * tasaTrib / 100) / 12
      const depTribAnual = Money.mul(act.valorAdquisicionSoles, act.tasaDepreciacionTributariaAnual / 100);
      const depTribMes = Money.toNumber(Money.div(depTribAnual, 12));

      const difMes = Money.toNumber(Money.sub(depFinMes, depTribMes));
      const irDif = Money.toNumber(Money.mul(Math.abs(difMes), 0.295)); // 29.5% NIC 12

      let tipoEfecto: CalculoDepreciacionPeriodo['tipoEfecto'] = 'SIN_DIFERENCIA';
      if (difMes > 0) {
        // Gasto contable > Gasto tributario -> Adición tributaria temporal -> Activo por IR Diferido (Cta 371)
        tipoEfecto = 'ACTIVO_IR_DIFERIDO';
      } else if (difMes < 0) {
        // Gasto tributario > Gasto contable -> Deducción temporal -> Pasivo por IR Diferido (Cta 491)
        tipoEfecto = 'PASIVO_IR_DIFERIDO';
      }

      totalFin = Money.add(totalFin, depFinMes);
      totalTrib = Money.add(totalTrib, depTribMes);
      totalDif = Money.add(totalDif, difMes);
      totalIrDif = Money.add(totalIrDif, irDif);

      detalles.push({
        activoId: act.id,
        codigoActivo: act.codigoActivo,
        descripcion: act.descripcion,
        periodo,
        depreciacionMensualFinanciera: depFinMes,
        depreciacionMensualTributaria: depTribMes,
        diferenciaTemporariaMes: difMes,
        irDiferidoMes: irDif,
        tipoEfecto
      });
    }

    return {
      periodo,
      totalActivosDepreciados: detalles.length,
      totalDepreciacionFinanciera: Money.toNumber(totalFin),
      totalDepreciacionTributaria: Money.toNumber(totalTrib),
      diferenciaTemporariaTotal: Money.toNumber(totalDif),
      totalIrDiferido: Money.toNumber(totalIrDif),
      detalles
    };
  },

  /**
   * Genera y registra automáticamente el asiento contable de depreciación en el Libro Diario
   */
  async generarAsientoDepreciacion(empresaId: string, periodo: string, userId: string = 'usr-sistema'): Promise<{
    asientoId: string;
    numeroAsiento: string;
    totalDepreciado: number;
    mensaje: string;
  }> {
    const calculo = await this.calcularDepreciacionPeriodo(empresaId, periodo);

    if (calculo.totalActivosDepreciados === 0) {
      throw new Error(`No hay activos fijos activos registrados para el período ${periodo}.`);
    }

    const fechaAsiento = `${periodo}-28`;
    const numAsiento = `08${periodo.replace('-', '').slice(2)}0091`;

    // Asiento contable de depreciación (Subdiario 08 / 05)
    // Cargo: 68141 Depreciación de edificaciones y equipos
    // Abono: 3913 Depreciación acumulada
    // Destino: Cargo 941 / 951 vs Abono 791
    const totalMonto = calculo.totalDepreciacionFinanciera;

    const lineas = [
      {
        linea: 1,
        codigoCuenta: '68141',
        denominacionCuenta: 'Depreciación de Propiedades, Planta y Equipo - Financiera',
        debe: totalMonto,
        haber: 0,
        glosa: `Depreciación correspondiente al período ${periodo}`
      },
      {
        linea: 2,
        codigoCuenta: '39131',
        denominacionCuenta: 'Depreciación acumulada de activos fijos',
        debe: 0,
        haber: totalMonto,
        glosa: `Provisión depreciación acumulada ${periodo}`
      },
      {
        linea: 3,
        codigoCuenta: '9411',
        denominacionCuenta: 'Gastos de Administración - Depreciación',
        debe: totalMonto,
        haber: 0,
        glosa: `Asiento de destino gastos administrativos`
      },
      {
        linea: 4,
        codigoCuenta: '7911',
        denominacionCuenta: 'Cargas imputables a cuentas de costos y gastos',
        debe: 0,
        haber: totalMonto,
        glosa: `Asiento de imputación de costos y gastos`
      }
    ];

    const asiento = {
      id: `asiento-deprec-${empresaId}-${periodo}`,
      empresaId,
      subdiarioId: '08',
      subdiario: '08',
      numeroAsiento: numAsiento,
      periodoId: periodo,
      periodo,
      fecha: fechaAsiento,
      moneda: 'PEN',
      tipoCambio: 3.75,
      tipoOperacion: 'AJUSTE',
      glosa: `Depreciación mensual de activos fijos del período ${periodo}`,
      detalles: lineas,
      totalDebe: Money.toNumber(Money.add(totalMonto, totalMonto)),
      totalHaber: Money.toNumber(Money.add(totalMonto, totalMonto)),
      cuadrado: true,
      estado: 'CONTABILIZADO',
      origenAutomatico: true
    };

    ASIENTOS_MEMORIA.unshift(asiento);

    // Actualizar acumulados de los activos
    for (const act of ACTIVOS_FIJOS_MEMORIA.filter(a => a.empresaId === empresaId && a.estado === 'ACTIVO')) {
      const depFinMes = Money.toNumber(Money.div(act.valorAdquisicionSoles, act.vidaUtilMesesFinanciera));
      const depTribAnual = Money.mul(act.valorAdquisicionSoles, act.tasaDepreciacionTributariaAnual / 100);
      const depTribMes = Money.toNumber(Money.div(depTribAnual, 12));

      act.depreciacionAcumuladaFinanciera = Money.toNumber(Money.add(act.depreciacionAcumuladaFinanciera, depFinMes));
      act.depreciacionAcumuladaTributaria = Money.toNumber(Money.add(act.depreciacionAcumuladaTributaria, depTribMes));
      act.valorNetoEnLibrosFinanciero = Money.toNumber(Money.sub(act.valorAdquisicionSoles, act.depreciacionAcumuladaFinanciera));
      act.valorNetoEnLibrosTributario = Money.toNumber(Money.sub(act.valorAdquisicionSoles, act.depreciacionAcumuladaTributaria));
      act.updatedAt = new Date().toISOString();
    }

    return {
      asientoId: asiento.id,
      numeroAsiento: numAsiento,
      totalDepreciado: totalMonto,
      mensaje: `Asiento de depreciación mensual ${numAsiento} generado con éxito en el Subdiario 08 con sus asientos de destino correspondientes.`
    };
  },

  /**
   * Genera el archivo plano oficial PLE Libro 7.1 (Registro de Activos Fijos)
   * Nomenclatura oficial: LE{RUC}{AAAA}0000070100001111.txt
   */
  async exportarPleLibro71(empresaId: string, anio: number, ruc: string = '20100000001'): Promise<{
    nombreArchivo: string;
    contenidoTxt: string;
    totalActivos: number;
  }> {
    const activos = ACTIVOS_FIJOS_MEMORIA.filter(a => a.empresaId === empresaId);

    const lineas = activos.map(a => {
      return [
        `${anio}1200`, // Período
        a.codigoActivo, // Código del activo
        '1', // Estado de activo: 1=Activo en uso
        a.cuentaActivoPCGE, // Código PCGE
        a.categoria, // Tipo activo
        a.descripcion.replace(/\|/g, ' '),
        a.fechaAdquisicion.replace(/-/g, ''),
        a.fechaInicioUso.replace(/-/g, ''),
        '1', // Método de depreciación: 1=Línea recta
        a.tasaDepreciacionTributariaAnual.toFixed(2),
        a.valorAdquisicionSoles.toFixed(2),
        a.depreciacionAcumuladaTributaria.toFixed(2),
        a.valorNetoEnLibrosTributario.toFixed(2),
        '1' // Estado de la anotación: 1
      ].join('|') + '|';
    });

    const nombreArchivo = `LE${ruc}${anio}0000070100001111.txt`;
    const contenidoTxt = lineas.join('\r\n');

    return {
      nombreArchivo,
      contenidoTxt,
      totalActivos: activos.length
    };
  }
};
