import { db } from '../config/database';
import { env } from '../config/env';
import crypto from 'crypto';
import { USUARIOS_ESTUDIO_MEMORIA, USUARIOS_EMPRESA_MEMORIA } from '../services/authJwtService';
import { encryptSensitive } from '../utils/crypto';

export interface EmpresaModel {
  id: string;
  tenantId: string;
  codigoEmpresa: string;
  ruc: string;
  razonSocial: string;
  nombreComercial?: string;
  regimenTributario: 'MYPE_TRIBUTARIO' | 'REGIMEN_GENERAL' | 'REGIMEN_ESPECIAL' | 'NRUS';
  domicilioFiscal: string;
  departamento?: string;
  provincia?: string;
  distrito?: string;
  contactoNombre?: string;
  contactoTelefono?: string;
  contactoEmail?: string;
  monedaPrincipal: 'PEN' | 'USD';
  esDemo?: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export const DATOS_EMPRESA_DEMO: EmpresaModel = {
  id: 'emp-demo-sac',
  tenantId: '00000000-0000-0000-0000-000000000001',
  codigoEmpresa: 'DEMO2026',
  ruc: '20000000001',
  razonSocial: 'EMPRESA DEMO S.A.C.',
  nombreComercial: 'EMPRESA DEMO CONTABLE',
  regimenTributario: 'MYPE_TRIBUTARIO',
  domicilioFiscal: 'AV. DE LA PRUEBA 123, SAN ISIDRO, LIMA',
  contactoNombre: 'CARLOS ALBERTO DEMO PEREZ',
  contactoTelefono: '+51 900 000 000',
  contactoEmail: 'contacto@empresademo.pe',
  monedaPrincipal: 'PEN',
  esDemo: true,
  isActive: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z'
};

// Almacén en memoria exclusivo: Solo contiene la Empresa Demo única al arranque normal
export const EMPRESAS_STORE: EmpresaModel[] = [DATOS_EMPRESA_DEMO];

export const empresaRepository = {
  async listarPorUsuario(userId: string): Promise<EmpresaModel[]> {
    if (db.isPostgresConnected()) {
      const res = await db.query(`
        SELECT e.id, e.tenant_id as "tenantId", e.codigo_empresa as "codigoEmpresa",
               e.ruc, e.razon_social as "razonSocial", e.nombre_comercial as "nombreComercial",
               e.regimen_tributario as "regimenTributario", e.domicilio_fiscal as "domicilioFiscal",
               e.departamento, e.provincia, e.distrito, e.contacto_nombre as "contactoNombre",
               e.contacto_telefono as "contactoTelefono", e.contacto_email as "contactoEmail",
               e.moneda_principal as "monedaPrincipal", e.is_active as "isActive",
               e.created_at as "createdAt", e.updated_at as "updatedAt"
        FROM empresas e
        JOIN usuarios_estudio u ON u.id = $1 AND u.is_active = TRUE
        WHERE e.is_active = TRUE AND ((u.rol_global = 'ADMINISTRADOR' AND e.tenant_id = (
          SELECT tenant_id FROM estudio_configuracion WHERE id = TRUE
        )) OR EXISTS (
          SELECT 1 FROM usuario_empresa m WHERE m.empresa_id = e.id AND m.usuario_id = u.id AND m.estado = 'ACTIVO'
        ))
        ORDER BY e.razon_social ASC
      `, [userId]);

      return res.rows;
    }

    if (env.NODE_ENV !== 'test' || env.DATABASE_URL) throw new Error('DATABASE_NO_DISPONIBLE');
    const usuario = USUARIOS_ESTUDIO_MEMORIA.find(u => u.id === userId && u.isActive);
    if (!usuario) return [];
    const permitidas = USUARIOS_EMPRESA_MEMORIA.filter(m => m.usuarioId === userId && m.estado === 'ACTIVO').map(m => m.empresaId);
    const estudio = usuario.rolGlobal === 'ADMINISTRADOR'
      ? (await (await import('../services/setupService')).setupService.obtenerEstadoSetup()).estudio : null;
    return EMPRESAS_STORE.filter(e => e.isActive && (e.tenantId === estudio?.tenantId || permitidas.includes(e.id)));
  },

  async obtenerPorId(id: string): Promise<EmpresaModel | null> {
    if (db.isPostgresConnected()) {
      const res = await db.query(`
        SELECT id, tenant_id as "tenantId", codigo_empresa as "codigoEmpresa",
               ruc, razon_social as "razonSocial", nombre_comercial as "nombreComercial",
               regimen_tributario as "regimenTributario", domicilio_fiscal as "domicilioFiscal",
               departamento, provincia, distrito, contacto_nombre as "contactoNombre",
               contacto_telefono as "contactoTelefono", contacto_email as "contactoEmail",
               moneda_principal as "monedaPrincipal", is_active as "isActive",
               created_at as "createdAt", updated_at as "updatedAt"
        FROM empresas
        WHERE id = $1
      `, [id]);
      return res.rows[0] || null;
    }

    if (env.NODE_ENV !== 'test' || env.DATABASE_URL) throw new Error('DATABASE_NO_DISPONIBLE');
    return EMPRESAS_STORE.find(e => e.id === id) || null;
  },

  async crear(empresaData: Omit<EmpresaModel, 'id' | 'createdAt' | 'updatedAt' | 'isActive'> & { usuarioId: string }): Promise<EmpresaModel> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    if (db.isPostgresConnected()) {
      const client = await db.getClient();
      try {
        await client.query('BEGIN');
        
        // 1. Insertar Empresa
        const insertRes = await client.query(`
          INSERT INTO empresas (
            tenant_id, codigo_empresa, ruc, razon_social, nombre_comercial,
            regimen_tributario, domicilio_fiscal, departamento, provincia, distrito,
            contacto_nombre, contacto_telefono, contacto_email, moneda_principal
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
          RETURNING id, tenant_id as "tenantId", codigo_empresa as "codigoEmpresa",
                    ruc, razon_social as "razonSocial", nombre_comercial as "nombreComercial",
                    regimen_tributario as "regimenTributario", domicilio_fiscal as "domicilioFiscal",
                    contacto_nombre as "contactoNombre", contacto_telefono as "contactoTelefono",
                    contacto_email as "contactoEmail", moneda_principal as "monedaPrincipal",
                    is_active as "isActive", created_at as "createdAt", updated_at as "updatedAt"
        `, [
          empresaData.tenantId,
          empresaData.codigoEmpresa,
          empresaData.ruc,
          empresaData.razonSocial,
          empresaData.nombreComercial || null,
          empresaData.regimenTributario,
          empresaData.domicilioFiscal,
          empresaData.departamento || null,
          empresaData.provincia || null,
          empresaData.distrito || null,
          empresaData.contactoNombre || null,
          empresaData.contactoTelefono || null,
          empresaData.contactoEmail || null,
          empresaData.monedaPrincipal || 'PEN'
        ]);

        const nuevaEmpresa = insertRes.rows[0];

        // 2. Asignar Membresía al creador (ADMINISTRADOR)
        await client.query(`
          INSERT INTO usuario_empresa (id, usuario_id, empresa_id, rol_en_empresa, estado)
          VALUES ($1, $2, $3, 'ADMINISTRADOR', 'ACTIVO')
        `, [crypto.randomUUID(), empresaData.usuarioId, nuevaEmpresa.id]);

        // 3. Clonar Plan de Cuentas desde plantilla_pcge
        await client.query(`
          INSERT INTO plan_cuentas (empresa_id, codigo, nombre, nivel, tipo_cuenta, permite_movimiento)
          SELECT $1, codigo, nombre, nivel, tipo_cuenta, permite_movimiento
          FROM plantilla_pcge
        `, [nuevaEmpresa.id]);

        // 4. Crear Subdiarios Oficiales por defecto (00 al 09)
        const subdiarios = [
          ['00', 'Asiento de Apertura', 'APERTURA'],
          ['01', 'Registro de Compras (RCE)', 'COMPRAS'],
          ['02', 'Registro de Ventas (RVIE)', 'VENTAS'],
          ['03', 'Cobranzas a Clientes', 'COBRANZAS'],
          ['04', 'Pagos a Proveedores', 'PAGOS'],
          ['05', 'Cuentas Corrientes y SPOT', 'BANCOS'],
          ['06', 'Recibos por Honorarios', 'HONORARIOS'],
          ['07', 'Planilla de Remuneraciones', 'PLANILLA'],
          ['08', 'Destinos Automáticos', 'DESTINO'],
          ['09', 'Cierre y Ajuste por TC', 'CIERRE']
        ];

        for (const [cod, desc, tipo] of subdiarios) {
          await client.query(`
            INSERT INTO subdiarios (empresa_id, codigo, descripcion, tipo)
            VALUES ($1, $2, $3, $4)
          `, [nuevaEmpresa.id, cod, desc, tipo]);
        }

        await client.query('COMMIT');
        return nuevaEmpresa;
      } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error creando empresa en PostgreSQL:', err);
        throw err;
      } finally {
        client.release();
      }
    }

    if (env.NODE_ENV !== 'test' || env.DATABASE_URL) throw new Error('DATABASE_NO_DISPONIBLE');
    if (EMPRESAS_STORE.some(e => e.tenantId === empresaData.tenantId && e.ruc === empresaData.ruc)) {
      throw new Error('EMPRESA_DUPLICADA: El RUC ya existe en este estudio.');
    }
    const nueva: EmpresaModel = {
      id,
      ...empresaData,
      isActive: true,
      createdAt: now,
      updatedAt: now
    };
    EMPRESAS_STORE.unshift(nueva);
    USUARIOS_EMPRESA_MEMORIA.push({
      id: crypto.randomUUID(), usuarioId: empresaData.usuarioId, empresaId: nueva.id,
      rolEnEmpresa: 'ADMINISTRADOR', estado: 'ACTIVO', createdAt: now
    });
    return nueva;
  },

  async actualizarCredencialesSunat(
    empresaId: string, 
    usuarioSol: string, 
    claveSol: string,
    clientIdSire?: string,
    clientSecretSire?: string
  ): Promise<void> {
    const claveCifrada = encryptSensitive(claveSol);
    const secretCifrado = clientSecretSire ? encryptSensitive(clientSecretSire) : null;

    if (db.isPostgresConnected()) {
      await db.query(`
        INSERT INTO credenciales_sunat (
          empresa_id, usuario_sol, clave_sol_encrypted, clave_sol_iv, clave_sol_tag,
          client_id_sire, client_secret_encrypted, client_secret_iv, client_secret_tag
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (empresa_id) DO UPDATE SET
          usuario_sol = EXCLUDED.usuario_sol,
          clave_sol_encrypted = EXCLUDED.clave_sol_encrypted,
          clave_sol_iv = EXCLUDED.clave_sol_iv,
          clave_sol_tag = EXCLUDED.clave_sol_tag,
          client_id_sire = EXCLUDED.client_id_sire,
          client_secret_encrypted = EXCLUDED.client_secret_encrypted,
          client_secret_iv = EXCLUDED.client_secret_iv,
          client_secret_tag = EXCLUDED.client_secret_tag,
          updated_at = CURRENT_TIMESTAMP
      `, [
        empresaId,
        usuarioSol,
        claveCifrada.ciphertext,
        claveCifrada.iv,
        claveCifrada.tag,
        clientIdSire || null,
        secretCifrado?.ciphertext || null,
        secretCifrado?.iv || null,
        secretCifrado?.tag || null
      ]);
    }
  }
};
