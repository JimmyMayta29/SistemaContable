import { db } from '../config/database';
import { auditoriaChainService } from '../services/auditoriaChainService';

export interface RegistroAuditoria {
  tenantId?: string;
  empresaId?: string;
  usuarioId?: string;
  usuarioEmail?: string;
  tablaAfectada?: string;
  tabla?: string;
  registroId: string;
  accion: 'INSERT' | 'UPDATE' | 'DELETE' | 'ANULAR' | 'CIERRE_PERIODO' | 'LOGIN' | string;
  datosAnteriores?: any;
  valoresAnteriores?: any;
  datosNuevos?: any;
  valoresNuevos?: any;
  direccionIp?: string;
  userAgent?: string;
}

const AUDITORIA_IN_MEMORY: (RegistroAuditoria & { id: string; createdAt: string })[] = [];

export const auditoriaRepository = {
  async registrar(registro: RegistroAuditoria): Promise<void> {
    if (db.isPostgresConnected()) {
      try {
        await db.query(`
          INSERT INTO auditoria (
            tenant_id, empresa_id, usuario_id, usuario_email, tabla_afectada,
            registro_id, accion, datos_anteriores, datos_nuevos, direccion_ip, user_agent
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        `, [
          registro.tenantId || null,
          registro.empresaId || null,
          registro.usuarioId || null,
          registro.usuarioEmail || null,
          registro.tablaAfectada || registro.tabla || 'general',
          registro.registroId,
          registro.accion,
          (registro.datosAnteriores || registro.valoresAnteriores) ? JSON.stringify(registro.datosAnteriores || registro.valoresAnteriores) : null,
          (registro.datosNuevos || registro.valoresNuevos) ? JSON.stringify(registro.datosNuevos || registro.valoresNuevos) : null,
          registro.direccionIp || null,
          registro.userAgent || null
        ]);
        return;
      } catch (err) {
        console.error('Error registrando auditoría en PostgreSQL:', err);
      }
    }

    AUDITORIA_IN_MEMORY.unshift({
      id: `aud-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      createdAt: new Date().toISOString(),
      ...registro
    });

    if (registro.empresaId) {
      await auditoriaChainService.registrar({
        empresaId: registro.empresaId,
        usuarioId: registro.usuarioId || 'usr-sistema',
        tablaAfectada: registro.tablaAfectada || registro.tabla || 'general',
        registroId: registro.registroId,
        accion: registro.accion,
        datosAnteriores: registro.datosAnteriores || registro.valoresAnteriores,
        datosNuevos: registro.datosNuevos || registro.valoresNuevos
      });
    }
  },

  async listarPorEmpresa(empresaId: string, limit = 50) {
    if (db.isPostgresConnected()) {
      const res = await db.query(`
        SELECT id, tenant_id as "tenantId", empresa_id as "empresaId", usuario_id as "usuarioId",
               usuario_email as "usuarioEmail", tabla_afectada as "tablaAfectada", registro_id as "registroId",
               accion, datos_anteriores as "datosAnteriores", datos_nuevos as "datosNuevos",
               direccion_ip as "direccionIp", user_agent as "userAgent", created_at as "createdAt"
        FROM auditoria
        WHERE empresa_id = $1
        ORDER BY created_at DESC
        LIMIT $2
      `, [empresaId, limit]);
      return res.rows;
    }
    return AUDITORIA_IN_MEMORY.filter(a => a.empresaId === empresaId).slice(0, limit);
  }
};
