import { db } from '../config/database';

export interface AnexoModel {
  id: string;
  empresaId: string;
  tipoDocumento: '6' | '1' | '4' | '7' | '0'; // 6: RUC, 1: DNI, etc.
  numeroDocumento: string;
  razonSocial: string;
  direccion?: string;
  tipoEntidad: 'CLIENTE' | 'PROVEEDOR' | 'EMPLEADO' | 'AMBOS';
  condicionSunat: 'HABIDO' | 'NO_HABIDO';
  estadoSunat: 'ACTIVO' | 'SUSPENDIDO' | 'BAJA';
  isActive: boolean;
  createdAt: string;
}

export const ANEXOS_MEMORIA: AnexoModel[] = [
  {
    id: 'anx-01',
    empresaId: 'emp-01',
    tipoDocumento: '6',
    numeroDocumento: '20100070970',
    razonSocial: 'SUPERMERCADOS PERUANOS S.A.',
    direccion: 'CAL. MORELLI NRO. 181 SAN BORJA, LIMA',
    tipoEntidad: 'PROVEEDOR',
    condicionSunat: 'HABIDO',
    estadoSunat: 'ACTIVO',
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'anx-02',
    empresaId: 'emp-01',
    tipoDocumento: '6',
    numeroDocumento: '20504914434',
    razonSocial: 'SERVICIOS LOGISTICOS GLOBALES S.A.C.',
    direccion: 'AV. EL DERBY 254 SANTIAGO DE SURCO, LIMA',
    tipoEntidad: 'PROVEEDOR',
    condicionSunat: 'HABIDO',
    estadoSunat: 'ACTIVO',
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'anx-03',
    empresaId: 'emp-01',
    tipoDocumento: '6',
    numeroDocumento: '20601234567',
    razonSocial: 'CONSTRUCTORA E INMOBILIARIA ANDINA S.A.C.',
    direccion: 'AV. JAVIER PRADO ESTE 4500, SAN ISIDRO',
    tipoEntidad: 'CLIENTE',
    condicionSunat: 'HABIDO',
    estadoSunat: 'ACTIVO',
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'anx-no-habido',
    empresaId: 'emp-01',
    tipoDocumento: '6',
    numeroDocumento: '20999999999',
    razonSocial: 'COMERCIAL INFORMATICA FANTASMA S.R.L.',
    direccion: 'JR. SIN NUMERO S/N, LIMA',
    tipoEntidad: 'PROVEEDOR',
    condicionSunat: 'NO_HABIDO',
    estadoSunat: 'ACTIVO',
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z'
  }
];

export const anexoService = {
  async listar(empresaId: string, filtro?: { query?: string; tipoEntidad?: string }) {
    if (db.isPostgresConnected()) {
      let sql = `
        SELECT id, empresa_id as "empresaId", tipo_documento as "tipoDocumento",
               numero_documento as "numeroDocumento", razon_social as "razonSocial",
               direccion, tipo_entidad as "tipoEntidad", condicion_sunat as "condicionSunat",
               estado_sunat as "estadoSunat", is_active as "isActive", created_at as "createdAt"
        FROM anexos
        WHERE empresa_id = $1 AND is_active = TRUE
      `;
      const params: any[] = [empresaId];

      if (filtro?.query) {
        params.push(`%${filtro.query.toLowerCase()}%`);
        sql += ` AND (LOWER(razon_social) LIKE $${params.length} OR numero_documento LIKE $${params.length})`;
      }

      if (filtro?.tipoEntidad && filtro.tipoEntidad !== 'TODOS') {
        params.push(filtro.tipoEntidad);
        sql += ` AND (tipo_entidad = $${params.length} OR tipo_entidad = 'AMBOS')`;
      }

      sql += ` ORDER BY razon_social ASC LIMIT 50`;
      const res = await db.query(sql, params);
      return res.rows;
    }

    return ANEXOS_MEMORIA.filter(a => {
      if (a.empresaId !== empresaId) return false;
      if (!a.isActive) return false;
      if (filtro?.query) {
        const q = filtro.query.toLowerCase();
        if (!a.razonSocial.toLowerCase().includes(q) && !a.numeroDocumento.includes(q)) {
          return false;
        }
      }
      if (filtro?.tipoEntidad && filtro.tipoEntidad !== 'TODOS') {
        if (a.tipoEntidad !== filtro.tipoEntidad && a.tipoEntidad !== 'AMBOS') {
          return false;
        }
      }
      return true;
    });
  },

  async obtenerPorId(empresaId: string, id: string): Promise<AnexoModel | null> {
    if (db.isPostgresConnected()) {
      const res = await db.query(`
        SELECT id, empresa_id as "empresaId", tipo_documento as "tipoDocumento",
               numero_documento as "numeroDocumento", razon_social as "razonSocial",
               direccion, tipo_entidad as "tipoEntidad", condicion_sunat as "condicionSunat",
               estado_sunat as "estadoSunat", is_active as "isActive", created_at as "createdAt"
        FROM anexos
        WHERE empresa_id = $1 AND id = $2
      `, [empresaId, id]);
      return res.rows[0] || null;
    }
    return ANEXOS_MEMORIA.find(a => a.empresaId === empresaId && a.id === id) || null;
  },

  async obtenerPorDocumento(empresaId: string, numeroDocumento: string): Promise<AnexoModel | null> {
    if (db.isPostgresConnected()) {
      const res = await db.query(`
        SELECT id, empresa_id as "empresaId", tipo_documento as "tipoDocumento",
               numero_documento as "numeroDocumento", razon_social as "razonSocial",
               direccion, tipo_entidad as "tipoEntidad", condicion_sunat as "condicionSunat",
               estado_sunat as "estadoSunat", is_active as "isActive", created_at as "createdAt"
        FROM anexos
        WHERE empresa_id = $1 AND numero_documento = $2
      `, [empresaId, numeroDocumento]);
      return res.rows[0] || null;
    }
    return ANEXOS_MEMORIA.find(a => a.empresaId === empresaId && a.numeroDocumento === numeroDocumento) || null;
  },

  async crear(empresaId: string, input: {
    tipoDocumento: '6' | '1' | '4' | '7' | '0';
    numeroDocumento: string;
    razonSocial: string;
    direccion?: string;
    tipoEntidad: 'CLIENTE' | 'PROVEEDOR' | 'EMPLEADO' | 'AMBOS';
    condicionSunat?: 'HABIDO' | 'NO_HABIDO';
    estadoSunat?: 'ACTIVO' | 'SUSPENDIDO' | 'BAJA';
  }): Promise<AnexoModel> {
    // Verificar si ya existe
    const existente = await this.obtenerPorDocumento(empresaId, input.numeroDocumento);
    if (existente) {
      return existente;
    }

    const id = `anx-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const nuevo: AnexoModel = {
      id,
      empresaId,
      tipoDocumento: input.tipoDocumento,
      numeroDocumento: input.numeroDocumento,
      razonSocial: input.razonSocial.trim().toUpperCase(),
      direccion: input.direccion || '',
      tipoEntidad: input.tipoEntidad,
      condicionSunat: input.condicionSunat || 'HABIDO',
      estadoSunat: input.estadoSunat || 'ACTIVO',
      isActive: true,
      createdAt: new Date().toISOString()
    };

    if (db.isPostgresConnected()) {
      await db.query(`
        INSERT INTO anexos (
          id, empresa_id, tipo_documento, numero_documento, razon_social,
          direccion, tipo_entidad, condicion_sunat, estado_sunat, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, TRUE)
      `, [
        nuevo.id, nuevo.empresaId, nuevo.tipoDocumento, nuevo.numeroDocumento,
        nuevo.razonSocial, nuevo.direccion, nuevo.tipoEntidad, nuevo.condicionSunat, nuevo.estadoSunat
      ]);
    } else {
      ANEXOS_MEMORIA.push(nuevo);
    }

    return nuevo;
  }
};
