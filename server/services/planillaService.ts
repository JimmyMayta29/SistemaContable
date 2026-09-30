import { db } from '../config/database';
import { Money } from '../utils/decimal';
import { contabilizacionService } from './contabilizacionService';
import { asientoService } from './asientoService';
import { periodoService } from './periodoService';
import { parametroRepository } from '../repositories/parametroRepository';
import { auditoriaRepository } from '../repositories/auditoriaRepository';

export interface TrabajadorModel {
  id: string;
  empresaId: string;
  tipoDocumento: string; // 1: DNI, 4: CE
  numeroDocumento: string;
  nombres: string;
  apellidos: string;
  fechaNacimiento?: string;
  direccion?: string;
  telefono?: string;
  email?: string;
  fechaIngreso: string;
  fechaCese?: string;
  cargo: string;
  regimenLaboral: 'GENERAL' | 'MYPE_MICRO' | 'MYPE_PEQUENA';
  sueldoBase: number;
  tieneAsignacionFamiliar: boolean;
  sistemaPensiones: 'ONP' | 'AFP';
  afpAdministradora?: 'INTEGRA' | 'PRIMA' | 'PROFUTURO' | 'HABITAT';
  afpTipoComision?: 'FLUJO' | 'MIXTA';
  cuspp?: string;
  centroCosto: string;
  cuentaBancoSueldo?: string;
  bancoSueldo?: string;
  activo: boolean;
  version: number;
}

export interface PlanillaLineaModel {
  id: string;
  planillaId: string;
  trabajadorId: string;
  trabajadorNombre: string;
  trabajadorDocumento: string;
  diasLaborados: number;
  sueldoBasico: number;
  asignacionFamiliar: number;
  horasExtras: number;
  otrosIngresos: number;
  totalRemuneracion: number;
  aporteObligatorioPension: number;
  comisionAfp: number;
  primaSeguroAfp: number;
  retencionQuinta: number;
  otrosDescuentos: number;
  totalDescuentos: number;
  aporteEssalud: number;
  netoPagar: number;
  centroCosto: string;
}

export interface PlanillaModel {
  id: string;
  empresaId: string;
  periodoId: string;
  mes: string; // YYYY-MM
  fechaCalculo: string;
  fechaPago?: string;
  totalIngresos: number;
  totalDescuentos: number;
  totalAportesEmpleador: number;
  totalNeto: number;
  estado: 'BORRADOR' | 'CALCULADA' | 'CONTABILIZADA' | 'PAGADA';
  asientoId?: string;
  asientoPagoId?: string;
  version: number;
  lineas: PlanillaLineaModel[];
}

// Almacén en memoria
export const TRABAJADORES_MEMORIA: TrabajadorModel[] = [
  {
    id: 'trab-01',
    empresaId: '00000000-0000-0000-0000-000000000001',
    tipoDocumento: '1',
    numeroDocumento: '44556677',
    nombres: 'Carlos Alberto',
    apellidos: 'Mendoza Quispe',
    fechaNacimiento: '1990-05-14',
    direccion: 'Av. Arequipa 1420, Lince',
    telefono: '998877665',
    email: 'carlos.mendoza@empresa.com',
    fechaIngreso: '2023-01-15',
    cargo: 'Contador Senior',
    regimenLaboral: 'GENERAL',
    sueldoBase: 3500.00,
    tieneAsignacionFamiliar: true, // + 10% RMV
    sistemaPensiones: 'ONP',
    centroCosto: 'ADMINISTRACION',
    cuentaBancoSueldo: '193-9821827-0-12',
    bancoSueldo: 'BCP',
    activo: true,
    version: 1
  },
  {
    id: 'trab-02',
    empresaId: '00000000-0000-0000-0000-000000000001',
    tipoDocumento: '1',
    numeroDocumento: '48991122',
    nombres: 'Mariana Sofia',
    apellidos: 'Vargas Rosales',
    fechaNacimiento: '1995-10-22',
    direccion: 'Jr. Huancavelica 550, Lima',
    telefono: '912345678',
    email: 'mariana.vargas@empresa.com',
    fechaIngreso: '2024-03-01',
    cargo: 'Analista de Sistemas',
    regimenLaboral: 'GENERAL',
    sueldoBase: 2800.00,
    tieneAsignacionFamiliar: false,
    sistemaPensiones: 'AFP',
    afpAdministradora: 'INTEGRA',
    afpTipoComision: 'FLUJO',
    cuspp: '592819MVRO01',
    centroCosto: 'ADMINISTRACION',
    cuentaBancoSueldo: '0011-0482-99018273',
    bancoSueldo: 'BBVA',
    activo: true,
    version: 1
  }
];

export const PLANILLAS_MEMORIA: PlanillaModel[] = [];

export interface ExportadorPlame {
  estado: string;
  versionLayout: string;
  mensaje: string;
  normativaReferencia: string;
  archivosPendientes: string[];
}

export const planillaService = {
  // --------------------------------------------------------------------------
  // GESTIÓN DE TRABAJADORES (CON CONTROL DE ACCESO A DATOS SENSIBLES)
  // --------------------------------------------------------------------------
  async listarTrabajadores(empresaId: string, tienePermisoDatosSensibles = false): Promise<TrabajadorModel[]> {
    const list = TRABAJADORES_MEMORIA.filter(t => t.empresaId === empresaId);

    if (tienePermisoDatosSensibles) {
      return list;
    }

    // Enmascarar datos personales confidenciales
    return list.map(t => ({
      ...t,
      numeroDocumento: t.numeroDocumento.length > 4 ? `****${t.numeroDocumento.slice(-4)}` : '****',
      direccion: '*** INFORMACIÓN CONFIDENCIAL ***',
      telefono: '*** PRIVADO ***',
      email: '***@***.***',
      cuentaBancoSueldo: '*** PROTEGIDO ***'
    }));
  },

  async obtenerTrabajadorPorId(empresaId: string, id: string, tienePermisoDatosSensibles = false) {
    const trab = TRABAJADORES_MEMORIA.find(t => t.id === id && t.empresaId === empresaId);
    if (!trab) return null;
    if (tienePermisoDatosSensibles) return trab;

    return {
      ...trab,
      numeroDocumento: trab.numeroDocumento.length > 4 ? `****${trab.numeroDocumento.slice(-4)}` : '****',
      direccion: '*** INFORMACIÓN CONFIDENCIAL ***',
      telefono: '*** PRIVADO ***',
      email: '***@***.***',
      cuentaBancoSueldo: '*** PROTEGIDO ***'
    };
  },

  async crearTrabajador(
    empresaId: string,
    datos: Omit<TrabajadorModel, 'id' | 'empresaId' | 'version'>,
    userId: string
  ): Promise<TrabajadorModel> {
    const duplicado = TRABAJADORES_MEMORIA.find(
      t => t.empresaId === empresaId && t.tipoDocumento === datos.tipoDocumento && t.numeroDocumento === datos.numeroDocumento
    );
    if (duplicado) {
      throw new Error('TRABAJADOR_DUPLICADO: Ya existe un trabajador con el mismo documento en esta empresa.');
    }

    const nuevo: TrabajadorModel = {
      id: `trab-${Date.now()}`,
      empresaId,
      ...datos,
      version: 1
    };

    TRABAJADORES_MEMORIA.push(nuevo);

    await auditoriaRepository.registrar({
      empresaId,
      usuarioId: userId,
      accion: 'CREAR_TRABAJADOR',
      tabla: 'trabajadores',
      registroId: nuevo.id,
      valoresNuevos: nuevo
    });

    return nuevo;
  },

  async actualizarTrabajador(
    empresaId: string,
    id: string,
    datos: Partial<TrabajadorModel>,
    userId: string
  ): Promise<TrabajadorModel> {
    const trab = TRABAJADORES_MEMORIA.find(t => t.id === id && t.empresaId === empresaId);
    if (!trab) throw new Error('TRABAJADOR_NO_ENCONTRADO');

    Object.assign(trab, datos);
    trab.version++;

    await auditoriaRepository.registrar({
      empresaId,
      usuarioId: userId,
      accion: 'ACTUALIZAR_TRABAJADOR',
      tabla: 'trabajadores',
      registroId: trab.id,
      valoresNuevos: trab
    });

    return trab;
  },

  // --------------------------------------------------------------------------
  // CÁLCULO DE PLANILLA DE REMUNERACIONES (SEGÚN PARÁMETROS VIGENTES)
  // --------------------------------------------------------------------------
  async calcularPlanilla(
    empresaId: string,
    periodoId: string,
    mes: string,
    userId: string
  ): Promise<PlanillaModel> {
    // 1. Validar Período Contable Abierto
    const estadoPeriodo = await periodoService.obtenerEstadoPeriodo(empresaId, mes);
    if (estadoPeriodo === 'CERRADO' || estadoPeriodo === 'BLOQUEADO') {
      throw new Error(`PERIODO_CERRADO: El período ${mes} se encuentra ${estadoPeriodo}. No se puede calcular planilla.`);
    }

    // 2. Comprobar si ya existe planilla y si está contabilizada
    const planillaExistente = PLANILLAS_MEMORIA.find(p => p.empresaId === empresaId && p.mes === mes);
    if (planillaExistente && (planillaExistente.estado === 'CONTABILIZADA' || planillaExistente.estado === 'PAGADA')) {
      throw new Error('PLANILLA_CONTABILIZADA: No se puede recalcular una planilla ya contabilizada. Debe anular el asiento contable primero.');
    }

    // 3. Obtener Parámetros Tributarios y Laborales vigentes para la fecha
    const fechaRef = `${mes}-28`;
    const paramRmv = await parametroRepository.obtenerParametroPorCodigo('RMV_2026', fechaRef);
    const paramEssalud = await parametroRepository.obtenerParametroPorCodigo('TASA_ESSALUD', fechaRef);
    const paramOnp = await parametroRepository.obtenerParametroPorCodigo('TASA_ONP', fechaRef);
    const paramAsigFam = await parametroRepository.obtenerParametroPorCodigo('TASA_ASIGNACION_FAMILIAR', fechaRef);

    const rmvMonto = paramRmv ? paramRmv.valorNumerico : 1025.00;
    const tasaEssalud = paramEssalud ? paramEssalud.valorNumerico : 0.09;
    const tasaOnp = paramOnp ? paramOnp.valorNumerico : 0.13;
    const tasaAsigFam = paramAsigFam ? paramAsigFam.valorNumerico : 0.10;
    const montoAsignacionFamiliarFijo = Money.toNumber(Money.round(Money.create(rmvMonto).times(tasaAsigFam))); // S/ 102.50

    // 4. Calcular para cada trabajador activo
    const trabajadoresActivos = TRABAJADORES_MEMORIA.filter(t => t.empresaId === empresaId && t.activo);
    if (trabajadoresActivos.length === 0) {
      throw new Error('SIN_TRABAJADORES: No hay trabajadores activos registrados en la empresa para procesar la planilla.');
    }

    const lineas: PlanillaLineaModel[] = [];
    let totIngresos = Money.create(0);
    let totDescuentos = Money.create(0);
    let totAportesPatronales = Money.create(0);
    let totNeto = Money.create(0);

    const planillaId = planillaExistente ? planillaExistente.id : `pla-${Date.now()}`;

    for (const trab of trabajadoresActivos) {
      const sueldoBasico = Money.create(trab.sueldoBase);
      const asigFamiliar = trab.tieneAsignacionFamiliar ? Money.create(montoAsignacionFamiliarFijo) : Money.create(0);
      const horasExtras = Money.create(0);
      const otrosIngresos = Money.create(0);

      // Base Imponible / Total Remuneración Afecta
      const totalRemun = Money.add(sueldoBasico, Money.add(asigFamiliar, Money.add(horasExtras, otrosIngresos)));

      // Descuentos Previsionales (ONP o AFP)
      let aportePension = Money.create(0);
      let comisionAfp = Money.create(0);
      let primaSeguroAfp = Money.create(0);

      if (trab.sistemaPensiones === 'ONP') {
        aportePension = Money.round(totalRemun.times(tasaOnp));
      } else {
        // AFP por Administradora
        const admin = trab.afpAdministradora || 'INTEGRA';
        const pFondo = await parametroRepository.obtenerParametroPorCodigo(`AFP_${admin}_APORTE`, fechaRef);
        const pComision = await parametroRepository.obtenerParametroPorCodigo(`AFP_${admin}_COMISION_FLUJO`, fechaRef);
        const pSeguro = await parametroRepository.obtenerParametroPorCodigo(`AFP_${admin}_PRIMA_SEGURO`, fechaRef);

        const tasaFondo = pFondo ? pFondo.valorNumerico : 0.10;
        const tasaComision = (trab.afpTipoComision === 'FLUJO' && pComision) ? pComision.valorNumerico : 0.00;
        const tasaSeguro = pSeguro ? pSeguro.valorNumerico : 0.0184;

        aportePension = Money.round(totalRemun.times(tasaFondo));
        comisionAfp = Money.round(totalRemun.times(tasaComision));
        primaSeguroAfp = Money.round(totalRemun.times(tasaSeguro));
      }

      // TODO: Renta de 5ta categoría - Estructura lista para proyección anual y deducción de 7 UIT (Art. 34 y 53 LIR)
      const retencionQuinta = Money.create(0);
      const otrosDescuentos = Money.create(0);

      const totalDescTrabajador = Money.add(
        aportePension,
        Money.add(comisionAfp, Money.add(primaSeguroAfp, Money.add(retencionQuinta, otrosDescuentos)))
      );

      // Aportes del Empleador (EsSalud 9%)
      const aporteEssalud = Money.round(totalRemun.times(tasaEssalud));

      // Neto a Pagar
      const netoPagar = Money.sub(totalRemun, totalDescTrabajador);

      totIngresos = Money.add(totIngresos, totalRemun);
      totDescuentos = Money.add(totDescuentos, totalDescTrabajador);
      totAportesPatronales = Money.add(totAportesPatronales, aporteEssalud);
      totNeto = Money.add(totNeto, netoPagar);

      lineas.push({
        id: `pln-${Date.now()}-${trab.id}`,
        planillaId,
        trabajadorId: trab.id,
        trabajadorNombre: `${trab.apellidos}, ${trab.nombres}`,
        trabajadorDocumento: trab.numeroDocumento,
        diasLaborados: 30,
        sueldoBasico: Money.toNumber(sueldoBasico),
        asignacionFamiliar: Money.toNumber(asigFamiliar),
        horasExtras: Money.toNumber(horasExtras),
        otrosIngresos: Money.toNumber(otrosIngresos),
        totalRemuneracion: Money.toNumber(totalRemun),
        aporteObligatorioPension: Money.toNumber(aportePension),
        comisionAfp: Money.toNumber(comisionAfp),
        primaSeguroAfp: Money.toNumber(primaSeguroAfp),
        retencionQuinta: Money.toNumber(retencionQuinta),
        otrosDescuentos: Money.toNumber(otrosDescuentos),
        totalDescuentos: Money.toNumber(totalDescTrabajador),
        aporteEssalud: Money.toNumber(aporteEssalud),
        netoPagar: Money.toNumber(netoPagar),
        centroCosto: trab.centroCosto
      });
    }

    const nuevaPlanilla: PlanillaModel = {
      id: planillaId,
      empresaId,
      periodoId: periodoId || `per-${mes}`,
      mes,
      fechaCalculo: new Date().toISOString().split('T')[0],
      fechaPago: `${mes}-30`,
      totalIngresos: Money.toNumber(totIngresos),
      totalDescuentos: Money.toNumber(totDescuentos),
      totalAportesEmpleador: Money.toNumber(totAportesPatronales),
      totalNeto: Money.toNumber(totNeto),
      estado: 'CALCULADA',
      version: (planillaExistente?.version || 0) + 1,
      lineas
    };

    if (planillaExistente) {
      const idx = PLANILLAS_MEMORIA.indexOf(planillaExistente);
      PLANILLAS_MEMORIA[idx] = nuevaPlanilla;
    } else {
      PLANILLAS_MEMORIA.push(nuevaPlanilla);
    }

    await auditoriaRepository.registrar({
      empresaId,
      usuarioId: userId,
      accion: 'CALCULAR_PLANILLA_MES',
      tabla: 'planillas',
      registroId: nuevaPlanilla.id,
      valoresNuevos: { mes, totalNeto: nuevaPlanilla.totalNeto, trabajadores: lineas.length }
    });

    return nuevaPlanilla;
  },

  // --------------------------------------------------------------------------
  // CONTABILIZAR PLANILLA (VÍA CONTABILIZACIONSERVICE & ASIENTOSERVICE)
  // --------------------------------------------------------------------------
  async contabilizarPlanilla(empresaId: string, planillaId: string, userId: string) {
    const planilla = PLANILLAS_MEMORIA.find(p => p.id === planillaId && p.empresaId === empresaId);
    if (!planilla) throw new Error('PLANILLA_NO_ENCONTRADA');
    if (planilla.estado === 'CONTABILIZADA' || planilla.estado === 'PAGADA') {
      throw new Error('PLANILLA_YA_CONTABILIZADA: La planilla ya se encuentra contabilizada.');
    }

    const estadoPeriodo = await periodoService.obtenerEstadoPeriodo(empresaId, planilla.mes);
    if (estadoPeriodo === 'CERRADO' || estadoPeriodo === 'BLOQUEADO') {
      throw new Error(`PERIODO_CERRADO: El período ${planilla.mes} se encuentra ${estadoPeriodo}. No se puede contabilizar.`);
    }

    // Totales agregados por concepto
    const totalSueldoBasico = planilla.lineas.reduce((acc, l) => acc + l.sueldoBasico, 0);
    const totalAsigFam = planilla.lineas.reduce((acc, l) => acc + l.asignacionFamiliar, 0);
    const totalHorasExtras = planilla.lineas.reduce((acc, l) => acc + l.horasExtras, 0);
    const totalAporteONP = planilla.lineas.reduce((acc, l) => acc + (TRABAJADORES_MEMORIA.find(t => t.id === l.trabajadorId)?.sistemaPensiones === 'ONP' ? l.aporteObligatorioPension : 0), 0);
    const totalAporteAFP = planilla.lineas.reduce((acc, l) => acc + (TRABAJADORES_MEMORIA.find(t => t.id === l.trabajadorId)?.sistemaPensiones === 'AFP' ? l.aporteObligatorioPension : 0), 0);
    const totalComisionAFP = planilla.lineas.reduce((acc, l) => acc + l.comisionAfp, 0);
    const totalSeguroAFP = planilla.lineas.reduce((acc, l) => acc + l.primaSeguroAfp, 0);
    const totalRetQuinta = planilla.lineas.reduce((acc, l) => acc + l.retencionQuinta, 0);
    const totalEsSalud = planilla.lineas.reduce((acc, l) => acc + l.aporteEssalud, 0);
    const totalNeto = planilla.lineas.reduce((acc, l) => acc + l.netoPagar, 0);

    // Generar propuesta de asiento
    const propuesta = await contabilizacionService.generar(empresaId, 'PLANILLA', {
      total: planilla.totalIngresos,
      sueldoBasico: totalSueldoBasico,
      asignacionFamiliar: totalAsigFam,
      horasExtras: totalHorasExtras,
      aporteONP: totalAporteONP,
      aporteAFP: totalAporteAFP,
      comisionAFP: totalComisionAFP,
      seguroAFP: totalSeguroAFP,
      retencionQuinta: totalRetQuinta,
      aporteEsSalud: totalEsSalud,
      netoPlanilla: totalNeto,
      glosa: `Planilla de remuneraciones correspondiente a ${planilla.mes}`
    });

    const asiento = await asientoService.crearAsiento(empresaId, {
      periodoId: planilla.periodoId || `per-${planilla.mes}`,
      subdiario: '04', // Planillas
      fecha: `${planilla.mes}-28`,
      moneda: 'PEN',
      tipoCambio: 1.0,
      glosa: `Planilla de sueldos y aportes patronales - ${planilla.mes}`,
      origenModulo: 'PLANILLA',
      lineas: propuesta.lineas.map(l => ({
        codigoCuenta: l.codigoCuenta,
        debe: l.debe,
        haber: l.haber,
        glosa: l.glosaLinea
      }))
    }, userId);

    planilla.estado = 'CONTABILIZADA';
    planilla.asientoId = asiento.id;

    await auditoriaRepository.registrar({
      empresaId,
      usuarioId: userId,
      accion: 'CONTABILIZAR_PLANILLA',
      tabla: 'planillas',
      registroId: planilla.id,
      valoresNuevos: { estado: 'CONTABILIZADA', asientoId: asiento.id }
    });

    return {
      success: true,
      message: 'Planilla contabilizada exitosamente',
      asientoId: asiento.id,
      asientoNumero: asiento.numeroAsiento
    };
  },

  // --------------------------------------------------------------------------
  // ANULAR PLANILLA CONTABILIZADA (EXTORNO Y DESBLOQUEO)
  // --------------------------------------------------------------------------
  async anularPlanilla(empresaId: string, planillaId: string, motivo: string, userId: string) {
    const planilla = PLANILLAS_MEMORIA.find(p => p.id === planillaId && p.empresaId === empresaId);
    if (!planilla) throw new Error('PLANILLA_NO_ENCONTRADA');

    const estadoPeriodo = await periodoService.obtenerEstadoPeriodo(empresaId, planilla.mes);
    if (estadoPeriodo === 'CERRADO' || estadoPeriodo === 'BLOQUEADO') {
      throw new Error(`PERIODO_CERRADO: El período ${planilla.mes} se encuentra ${estadoPeriodo}. No se puede anular la planilla.`);
    }

    if (planilla.asientoId) {
      await asientoService.anularAsiento(empresaId, planilla.asientoId, motivo, userId);
    }

    planilla.estado = 'BORRADOR';
    planilla.asientoId = undefined;

    await auditoriaRepository.registrar({
      empresaId,
      usuarioId: userId,
      accion: 'ANULAR_PLANILLA',
      tabla: 'planillas',
      registroId: planilla.id,
      valoresNuevos: { estado: 'BORRADOR', motivo }
    });

    return { success: true, message: 'Planilla anulada y asiento contable extornado' };
  },

  // --------------------------------------------------------------------------
  // EXPORTADOR PLAME / T-REGISTRO (CONTRATO FORMAL PARA FASE 6)
  // --------------------------------------------------------------------------
  exportarPlame(empresaId: string, planillaId: string): ExportadorPlame {
    return {
      estado: 'PENDIENTE_IMPLEMENTACION_FASE_6',
      versionLayout: 'PLAME v4.2 / T-Registro 2026',
      mensaje: 'La generación y empaquetado de archivos .rem, .jor, .snl y .des oficiales de SUNAT se habilita en la Fase 6.',
      normativaReferencia: 'Resolución de Superintendencia N° 183-2011/SUNAT y normas modificatorias',
      archivosPendientes: [
        'Estructura 01: Archivo de Remuneraciones (.rem)',
        'Estructura 02: Jornada Laboral y Horas Extras (.jor)',
        'Estructura 03: Detalle de Conceptos Ingresos y Descuentos (.snl)',
        'Estructura 04: Prestadores de Servicios 4ta Categoría (.des)'
      ]
    };
  }
};
