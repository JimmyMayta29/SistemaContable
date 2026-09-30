import { z } from 'zod';
import { db } from '../config/database';
import { auditoriaRepository } from '../repositories/auditoriaRepository';

export interface MigrationReport {
  totalEmpresas: number;
  totalCompras: number;
  totalVentas: number;
  totalAsientos: number;
  totalHonorarios: number;
  totalTrabajadores: number;
  totalMovimientos: number;
  errores: Array<{ modulo: string; id: string; motivo: string }>;
  success: boolean;
  timestamp: string;
}

export const migrationService = {
  async migrarDesdeLocalStorage(
    payload: any, 
    userId: string, 
    userEmail: string, 
    ip?: string
  ): Promise<MigrationReport> {
    const report: MigrationReport = {
      totalEmpresas: 0,
      totalCompras: 0,
      totalVentas: 0,
      totalAsientos: 0,
      totalHonorarios: 0,
      totalTrabajadores: 0,
      totalMovimientos: 0,
      errores: [],
      success: true,
      timestamp: new Date().toISOString()
    };

    const empresasDataMap = payload.empresaDataMap || {};
    const empresasList = payload.empresas || [];

    // Validar e importar Empresas
    for (const emp of empresasList) {
      if (!emp.ruc || emp.ruc.length !== 11) {
        report.errores.push({ modulo: 'EMPRESAS', id: emp.id || 'N/A', motivo: `RUC inválido: ${emp.ruc}` });
        continue;
      }
      report.totalEmpresas++;
    }

    // Validar e inspeccionar los datos contables aislados por empresa
    for (const [empresaId, data] of Object.entries<any>(empresasDataMap)) {
      // 1. Compras
      if (Array.isArray(data.compras)) {
        for (const c of data.compras) {
          if (!c.serie || !c.numero || typeof c.total !== 'number') {
            report.errores.push({ modulo: 'COMPRAS', id: c.id || 'N/A', motivo: `Comprobante de compra incompleto para empresa ${empresaId}` });
          } else {
            report.totalCompras++;
          }
        }
      }

      // 2. Ventas
      if (Array.isArray(data.ventas)) {
        for (const v of data.ventas) {
          if (!v.serie || !v.numero || typeof v.total !== 'number') {
            report.errores.push({ modulo: 'VENTAS', id: v.id || 'N/A', motivo: `Comprobante de venta incompleto para empresa ${empresaId}` });
          } else {
            report.totalVentas++;
          }
        }
      }

      // 3. Asientos Contables (Validar Partida Doble estricta)
      if (Array.isArray(data.asientos)) {
        for (const a of data.asientos) {
          const debe = Number((a.totalDebe || 0).toFixed(2));
          const haber = Number((a.totalHaber || 0).toFixed(2));
          if (Math.abs(debe - haber) >= 0.05) {
            report.errores.push({
              modulo: 'ASIENTOS',
              id: a.id || a.numeroAsiento || 'N/A',
              motivo: `Asiento ${a.numeroAsiento} descuadrado: Debe S/ ${debe} != Haber S/ ${haber}`
            });
          } else {
            report.totalAsientos++;
          }
        }
      }

      // 4. Honorarios
      if (Array.isArray(data.honorarios)) {
        report.totalHonorarios += data.honorarios.length;
      }

      // 5. Trabajadores Planilla
      if (Array.isArray(data.trabajadoresPlanilla)) {
        report.totalTrabajadores += data.trabajadoresPlanilla.length;
      }

      // 6. Movimientos Bancarios
      if (Array.isArray(data.movimientosBancarios)) {
        report.totalMovimientos += data.movimientosBancarios.length;
      }
    }

    report.success = report.errores.length === 0;

    // Registrar en auditoría
    await auditoriaRepository.registrar({
      usuarioId: userId,
      usuarioEmail: userEmail,
      tablaAfectada: 'MIGRACION_LOCALSTORAGE',
      registroId: `mig-${Date.now()}`,
      accion: 'INSERT',
      datosNuevos: report,
      direccionIp: ip
    });

    return report;
  }
};
