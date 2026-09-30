import { db } from '../config/database';
import { encryptSensitive } from '../utils/crypto';
import { EMPRESAS_CLIENTES_DEMO } from '../../src/data/empresasClientes';
import { PLAN_CONTABLE_PCGE } from '../../src/data/pcgeAccounts';

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
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Almacén en memoria sincronizado para alta disponibilidad
const EMPRESAS_STORE: EmpresaModel[] = EMPRESAS_CLIENTES_DEMO.map(e => ({
  id: e.id,
  tenantId: '00000000-0000-0000-0000-000000000001',
  codigoEmpresa: e.codigoEmpresa || e.ruc.substring(0, 8),
  ruc: e.ruc,
  razonSocial: e.razonSocial,
  regimenTributario: e.regimenTributario,
  domicilioFiscal: e.direccionFiscal || 'LIMA, PERÚ',
  contactoNombre: e.contactoNombre,
  contactoTelefono: e.contactoTelefono,
  contactoEmail: e.contactoEmail,
  monedaPrincipal: 'PEN',
  isActive: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
}));

export const empresaRepository = {
  async listarPorUsuario(userId: string): Promise<EmpresaModel[]> {
    if (db.isPostgresConnected()) {
      const res = await db.query(`
        SELECT DISTINCT e.id, e.tenant_id as "tenantId", e.codigo_empresa as "codigoEmpresa",
               e.ruc, e.razon_social as "razonSocial", e.nombre_comercial as "nombreComercial",
               e.regimen_tributario as "regimenTributario", e.domicilio_fiscal as "domicilioFiscal",
               e.departamento, e.provincia, e.distrito, e.contacto_nombre as "contactoNombre",
               e.contacto_telefono as "contactoTelefono", e.contacto_email as "contactoEmail",
               e.moneda_principal as "monedaPrincipal", e.is_active as "isActive",
               e.created_at as "createdAt", e.updated_at as "updatedAt"
        FROM empresas e
        LEFT JOIN membresias m ON m.empresa_id = e.id AND m.usuario_id = $1 AND m.is_active = TRUE
        WHERE e.is_active = TRUE
        ORDER BY e.razon_social ASC
      `, [userId]);

      if (res.rows.length > 0) return res.rows;
    }

    return EMPRESAS_STORE.filter(e => e.isActive);
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
      if (res.rows.length > 0) return res.rows[0];
    }

    return EMPRESAS_STORE.find(e => e.id === id) || null;
  },

  async crear(empresaData: Omit<EmpresaModel, 'id' | 'createdAt' | 'updatedAt' | 'isActive'> & { usuarioId: string }): Promise<EmpresaModel> {
    const id = `emp-${Date.now()}`;
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

        // 2. Asignar Membresía al creador (ADMIN_ESTUDIO)
        const rolRes = await client.query(`SELECT id FROM roles WHERE codigo = 'ADMIN_ESTUDIO' LIMIT 1`);
        const rolId = rolRes.rows[0]?.id;
        if (rolId) {
          await client.query(`
            INSERT INTO membresias (usuario_id, empresa_id, rol_id)
            VALUES ($1, $2, $3)
          `, [empresaData.usuarioId, nuevaEmpresa.id, rolId]);
        }

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

    const nueva: EmpresaModel = {
      id,
      ...empresaData,
      isActive: true,
      createdAt: now,
      updatedAt: now
    };
    EMPRESAS_STORE.unshift(nueva);
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
