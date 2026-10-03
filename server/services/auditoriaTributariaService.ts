import { db } from '../config/database';
import { Money } from '../utils/decimal';
import { COMPRAS_MEMORIA } from './compraService';
import { VENTAS_MEMORIA } from './ventaService';
import { MOVIMIENTOS_TESORERIA_MEMORIA } from './tesoreriaService';

export interface AlertaFiscal {
  id: string;
  tipo: 'BANCARIZACION' | 'DETRACCION_PENDIENTE' | 'PROVEEDOR_RIESGO' | 'CORRELATIVO_SALTADO' | 'COMPROBANTE_DUPLICADO' | 'RATIO_CREDITO_FISCAL';
  nivelRiesgo: 'CRITICO' | 'MEDIO' | 'INFORMATIVO';
  titulo: string;
  descripcion: string;
  baseLegal: string;
  comprobanteRef?: string;
  montoInvolucrado?: number;
  recomendacion: string;
}

export interface DiagnosticoAuditoriaPreventiva {
  empresaId: string;
  anio: number;
  fechaDiagnostico: string;
  scoreSaludFiscal: number; // 0 - 100
  nivelRiesgoGeneral: 'BAJO' | 'MEDIO' | 'ALTO';
  resumenMetricas: {
    totalComprobantesAnalizados: number;
    totalComprasAnalizadas: number;
    totalVentasAnalizadas: number;
    totalAlertasDetectadas: number;
    alertasCriticas: number;
    alertasMedias: number;
    alertasInformativas: number;
    montoTotalEnRiesgo: number;
  };
  alertas: AlertaFiscal[];
}

export const auditoriaTributariaService = {
  /**
   * Ejecuta el escaneo de auditoría tributaria preventiva para un año y empresa dados.
   */
  async ejecutarDiagnostico(empresaId: string, anio: number = 2026): Promise<DiagnosticoAuditoriaPreventiva> {
    const compras = COMPRAS_MEMORIA.filter(c => c.empresaId === empresaId);
    const ventas = VENTAS_MEMORIA.filter(v => v.empresaId === empresaId);
    const movimientos = MOVIMIENTOS_TESORERIA_MEMORIA.filter(m => m.empresaId === empresaId);

    // Filtrar por año
    const comprasAnio = compras.filter(c => (c.fechaEmision || '').startsWith(String(anio)) || (c.periodoId || '').startsWith(String(anio)));
    const ventasAnio = ventas.filter(v => (v.fechaEmision || '').startsWith(String(anio)) || (v.periodoId || '').startsWith(String(anio)));

    const alertas: AlertaFiscal[] = [];
    let montoTotalRiesgo = Money.create(0);

    // 1. REGLA: Bancarización (Ley N° 28194)
    // Comprobantes >= S/ 2,000 o USD 500
    for (const c of comprasAnio) {
      const montoTotal = Number(c.total) || 0;
      const esMonedaExtranjera = c.moneda === 'USD';
      const umbralBancarizacion = esMonedaExtranjera ? 500 : 2000;

      if (montoTotal >= umbralBancarizacion) {
        // Verificar si existe pago bancarizado en movimientos de caja/bancos
        const tieneMovimientoBancario = movimientos.some(m => 
          (m.glosa && m.glosa.includes(c.numero || '')) ||
          ((m as any).entidadRuc === (c as any).proveedorRuc && Math.abs(Number((m as any).monto || m.importe) - montoTotal) < 1.0)
        );

        if (!tieneMovimientoBancario && c.estado !== 'ANULADO') {
          montoTotalRiesgo = Money.add(montoTotalRiesgo, montoTotal);
          alertas.push({
            id: `alt-banc-${c.id}`,
            tipo: 'BANCARIZACION',
            nivelRiesgo: 'CRITICO',
            titulo: `Comprobante sin Bancarización Obligatoria (${c.tipoComprobante} ${c.serie}-${c.numero})`,
            descripcion: `El comprobante por ${c.moneda} ${montoTotal.toFixed(2)} excede el umbral legal de ${c.moneda} ${umbralBancarizacion} y no registra trazabilidad en cuentas bancarias.`,
            baseLegal: 'Art. 3, 4 y 8 de la Ley N° 28194 (Ley para la Lucha contra la Evasión y para la Formalización de la Economía)',
            comprobanteRef: `${c.serie}-${c.numero}`,
            montoInvolucrado: montoTotal,
            recomendacion: 'Asegúrese de realizar el pago mediante transferencia, cheque no negociable o depósito bancario para no perder el crédito fiscal y la deducción del costo/gasto para el Impuesto a la Renta.'
          });
        }
      }
    }

    // 2. REGLA: Detracciones SPOT no pagadas o fuera de plazo
    for (const c of comprasAnio) {
      const montoTotal = Number(c.total) || 0;
      const tieneDetraccion = c.tieneDetraccion || (c as any).detraccion || ((c as any).categoriaGasto && ((c as any).categoriaGasto.includes('SERVICIOS') || (c as any).categoriaGasto.includes('TRANSPORTE') || (c as any).categoriaGasto.includes('CONSTRUCCION')));
      
      if (tieneDetraccion && montoTotal > 700) {
        const tasaDetraccion = (c as any).tasaDetraccion || 12; // 12% servicios en general
        const montoDetraccion = Money.toNumber(Money.times(montoTotal, tasaDetraccion / 100));

        if (!(c as any).detraccionConstancia && !(c as any).detraccionNumeroConstancia) {
          montoTotalRiesgo = Money.add(montoTotalRiesgo, montoDetraccion);
          alertas.push({
            id: `alt-detr-${c.id}`,
            tipo: 'DETRACCION_PENDIENTE',
            nivelRiesgo: 'CRITICO',
            titulo: `Detracción SPOT Pendiente de Depósito (${c.serie}-${c.numero})`,
            descripcion: `Comprobante de compra sujeto al Sistema de Detracciones SPOT (${tasaDetraccion}%) no registra número de constancia de depósito en el Banco de la Nación.`,
            baseLegal: 'D. Leg. N° 940 y R.S. N° 183-2004/SUNAT',
            comprobanteRef: `${c.serie}-${c.numero}`,
            montoInvolucrado: montoDetraccion,
            recomendacion: 'Efectúe el depósito de la detracción antes del 5to día hábil del mes siguiente a la anotación para no perder el derecho al crédito fiscal del IGV en el período de registro.'
          });
        }
      }
    }

    // 3. REGLA: Comprobantes Duplicados
    const mapaUnicos = new Map<string, typeof comprasAnio[0]>();
    for (const c of comprasAnio) {
      const provRuc = (c as any).proveedorRuc || (c as any).emisorRuc || c.proveedorId;
      const key = `${provRuc}_${c.tipoComprobante}_${c.serie}_${c.numero}`;
      if (mapaUnicos.has(key)) {
        alertas.push({
          id: `alt-dup-${c.id}`,
          tipo: 'COMPROBANTE_DUPLICADO',
          nivelRiesgo: 'CRITICO',
          titulo: `Comprobante de Compra Duplicado (${c.serie}-${c.numero})`,
          descripcion: `Se detectó más de un registro contable para el mismo proveedor (${provRuc}), serie y número.`,
          baseLegal: 'Art. 19 del TUO de la Ley del IGV (Requisitos sustanciales y formales)',
          comprobanteRef: `${c.serie}-${c.numero}`,
          montoInvolucrado: Number(c.total) || 0,
          recomendacion: 'Anule o elimine el duplicado para evitar doble acreditación de crédito fiscal y contingencias sancionatorias bajo el Numeral 1 del Art. 178 del Código Tributario.'
        });
      } else {
        mapaUnicos.set(key, c);
      }
    }

    // 4. REGLA: Saltos de Correlativo en Ventas
    const ventasPorSerie = new Map<string, number[]>();
    for (const v of ventasAnio) {
      const serie = v.serie || 'F001';
      const num = parseInt(v.numero || '0', 10);
      if (!isNaN(num) && num > 0) {
        if (!ventasPorSerie.has(serie)) {
          ventasPorSerie.set(serie, []);
        }
        ventasPorSerie.get(serie)!.push(num);
      }
    }

    for (const [serie, nums] of ventasPorSerie.entries()) {
      if (nums.length > 1) {
        nums.sort((a, b) => a - b);
        for (let i = 0; i < nums.length - 1; i++) {
          const actual = nums[i];
          const siguiente = nums[i + 1];
          if (siguiente - actual > 1) {
            alertas.push({
              id: `alt-salt-${serie}-${actual}`,
              tipo: 'CORRELATIVO_SALTADO',
              nivelRiesgo: 'MEDIO',
              titulo: `Salto Correlativo Detectado en Serie de Ventas ${serie}`,
              descripcion: `Existe una discontinuidad correlativa entre el comprobante ${actual} y el comprobante ${siguiente}. Faltan ${siguiente - actual - 1} comprobante(s).`,
              baseLegal: 'Reglamento de Comprobantes de Pago (R.S. N° 007-99/SUNAT) Art. 9',
              comprobanteRef: `${serie}-${actual} a ${serie}-${siguiente}`,
              recomendacion: 'Verifique si los comprobantes intermedios fueron anulados en SUNAT o si se omitió su registro en el RVIE para evitar presunción de ingresos no declarados.'
            });
          }
        }
      }
    }

    // 5. REGLA: Ratios de Crédito Fiscal Atípico
    const totalBaseCompras = comprasAnio.reduce((acc, c) => acc + (Number((c as any).baseGravada || (c as any).baseImponible) || 0), 0);
    const totalBaseVentas = ventasAnio.reduce((acc, v) => acc + (Number((v as any).baseGravada || (v as any).baseImponible) || 0), 0);

    if (totalBaseCompras > totalBaseVentas * 1.5 && totalBaseVentas > 0) {
      alertas.push({
        id: `alt-ratio-cf`,
        tipo: 'RATIO_CREDITO_FISCAL',
        nivelRiesgo: 'INFORMATIVO',
        titulo: 'Ratio de Crédito Fiscal Atípico (Compras > 150% de Ventas)',
        descripcion: `Las compras acumuladas del ejercicio (S/ ${totalBaseCompras.toFixed(2)}) superan con creces las ventas declaradas (S/ ${totalBaseVentas.toFixed(2)}).`,
        baseLegal: 'Criterios de Selección y Fiscalización Preventiva SUNAT (Algoritmo de Riesgo RUC)',
        montoInvolucrado: totalBaseCompras - totalBaseVentas,
        recomendacion: 'Supervise el saldo a favor materia de beneficio o arrastre de crédito fiscal para contar con sustento de operaciones fehacientes ante eventual cruce de información.'
      });
    }

    // Cálculo del Score de Salud Fiscal (Base 100)
    let deduccionPuntaje = 0;
    const criticas = alertas.filter(a => a.nivelRiesgo === 'CRITICO').length;
    const medias = alertas.filter(a => a.nivelRiesgo === 'MEDIO').length;
    const informativas = alertas.filter(a => a.nivelRiesgo === 'INFORMATIVO').length;

    deduccionPuntaje += criticas * 15;
    deduccionPuntaje += medias * 8;
    deduccionPuntaje += informativas * 3;

    const scoreSaludFiscal = Math.max(0, Math.min(100, 100 - deduccionPuntaje));
    const nivelRiesgoGeneral: 'BAJO' | 'MEDIO' | 'ALTO' = 
      scoreSaludFiscal >= 80 ? 'BAJO' : scoreSaludFiscal >= 50 ? 'MEDIO' : 'ALTO';

    return {
      empresaId,
      anio,
      fechaDiagnostico: new Date().toISOString(),
      scoreSaludFiscal,
      nivelRiesgoGeneral,
      resumenMetricas: {
        totalComprobantesAnalizados: comprasAnio.length + ventasAnio.length,
        totalComprasAnalizadas: comprasAnio.length,
        totalVentasAnalizadas: ventasAnio.length,
        totalAlertasDetectadas: alertas.length,
        alertasCriticas: criticas,
        alertasMedias: medias,
        alertasInformativas: informativas,
        montoTotalEnRiesgo: Money.toNumber(montoTotalRiesgo)
      },
      alertas
    };
  }
};
