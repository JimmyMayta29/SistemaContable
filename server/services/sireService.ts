import crypto from 'crypto';
import { db } from '../config/database';
import { cryptoService } from './cryptoService';
import { obtenerSunatGateway, CredencialesSunat, ComprobantePropuestaSire } from './sunatGateway';
import { auditoriaRepository } from '../repositories/auditoriaRepository';

export interface SunatConexionModel {
  empresaId: string;
  ruc: string;
  usuarioSolEncrypted: string;
  claveSolEncrypted: string;
  clientIdEncrypted?: string;
  clientSecretEncrypted?: string;
  keyVersion: number;
  estado: 'SIN_CONFIGURAR' | 'VALIDANDO' | 'CONECTADO' | 'ERROR' | 'CREDENCIALES_VENCIDAS' | 'MODO_SIMULADO';
  modoSimulado: boolean;
  ultimoChequeo?: string;
  ultimoError?: string;
  updatedAt: string;
}

export interface SirePropuestaModel {
  id: string;
  empresaId: string;
  tipo: 'COMPRAS' | 'VENTAS';
  periodo: string;
  fechaDescarga: string;
  hashArchivo: string;
  totalRegistros: number;
  totalBaseGravada: number;
  totalIgv: number;
  totalImporte: number;
  lineas: ComprobantePropuestaSire[];
}

export const CONEXIONES_SUNAT_MEMORIA: Record<string, SunatConexionModel> = {};
export const SIRE_PROPUESTAS_MEMORIA: SirePropuestaModel[] = [];

export const sireService = {
  /**
   * Guarda o actualiza las credenciales SUNAT cifrando los secretos con AES-256-GCM.
   * Los valores en claro nunca se persisten ni se registran en logs.
   */
  async guardarConexion(
    empresaId: string,
    datos: {
      ruc: string;
      usuarioSol: string;
      claveSol: string;
      clientId?: string;
      clientSecret?: string;
      modoSimulado?: boolean;
    },
    userId: string
  ): Promise<{ success: boolean; mensaje: string }> {
    const keyVersion = cryptoService.CURRENT_KEY_VERSION;
    const usuarioSolEncrypted = cryptoService.cifrar(datos.usuarioSol, keyVersion);
    const claveSolEncrypted = cryptoService.cifrar(datos.claveSol, keyVersion);
    const clientIdEncrypted = datos.clientId ? cryptoService.cifrar(datos.clientId, keyVersion) : undefined;
    const clientSecretEncrypted = datos.clientSecret ? cryptoService.cifrar(datos.clientSecret, keyVersion) : undefined;

    const conexion: SunatConexionModel = {
      empresaId,
      ruc: datos.ruc,
      usuarioSolEncrypted,
      claveSolEncrypted,
      clientIdEncrypted,
      clientSecretEncrypted,
      keyVersion,
      estado: datos.modoSimulado !== false ? 'MODO_SIMULADO' : 'SIN_CONFIGURAR',
      modoSimulado: datos.modoSimulado !== false,
      updatedAt: new Date().toISOString()
    };

    if (db.isPostgresConnected()) {
      await db.query(`
        INSERT INTO sunat_conexiones (
          empresa_id, ruc, usuario_sol_encrypted, clave_sol_encrypted,
          client_id_encrypted, client_secret_encrypted, key_version, estado, modo_simulado
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (empresa_id) DO UPDATE SET
          ruc = EXCLUDED.ruc,
          usuario_sol_encrypted = EXCLUDED.usuario_sol_encrypted,
          clave_sol_encrypted = EXCLUDED.clave_sol_encrypted,
          client_id_encrypted = EXCLUDED.client_id_encrypted,
          client_secret_encrypted = EXCLUDED.client_secret_encrypted,
          key_version = EXCLUDED.key_version,
          estado = EXCLUDED.estado,
          modo_simulado = EXCLUDED.modo_simulado,
          updated_at = CURRENT_TIMESTAMP
      `, [
        empresaId, datos.ruc, usuarioSolEncrypted, claveSolEncrypted,
        clientIdEncrypted || null, clientSecretEncrypted || null, keyVersion,
        conexion.estado, conexion.modoSimulado
      ]);
    }

    CONEXIONES_SUNAT_MEMORIA[empresaId] = conexion;

    await auditoriaRepository.registrar({
      empresaId,
      usuarioId: userId,
      tablaAfectada: 'sunat_conexiones',
      registroId: empresaId,
      accion: 'ACTUALIZAR_CREDENCIALES',
      datosNuevos: { ruc: datos.ruc, modoSimulado: conexion.modoSimulado } // NUNCA valores de claves
    });

    return {
      success: true,
      mensaje: 'Credenciales cifradas con AES-256-GCM y almacenadas con seguridad.'
    };
  },

  /**
   * Obtiene el estado de conexión sin retornar NUNCA los secretos al frontend.
   */
  async obtenerEstadoConexion(empresaId: string): Promise<{
    configurado: boolean;
    ruc?: string;
    estado: string;
    modoSimulado: boolean;
    ultimoChequeo?: string;
    ultimoError?: string;
  }> {
    let conexion = CONEXIONES_SUNAT_MEMORIA[empresaId];

    if (!conexion && db.isPostgresConnected()) {
      const res = await db.query(`
        SELECT ruc, estado, modo_simulado as "modoSimulado",
               ultimo_chequeo as "ultimoChequeo", ultimo_error as "ultimoError"
        FROM sunat_conexiones
        WHERE empresa_id = $1
      `, [empresaId]);
      if (res.rows.length > 0) {
        conexion = res.rows[0];
      }
    }

    if (!conexion) {
      return {
        configurado: false,
        estado: 'SIN_CONFIGURAR',
        modoSimulado: true
      };
    }

    return {
      configurado: true,
      ruc: conexion.ruc,
      estado: conexion.estado,
      modoSimulado: conexion.modoSimulado,
      ultimoChequeo: conexion.ultimoChequeo,
      ultimoError: conexion.ultimoError
    };
  },

  /**
   * Valida la conexión real o simulada contra SUNAT.
   */
  async validarConexion(empresaId: string, userId: string) {
    const conexion = CONEXIONES_SUNAT_MEMORIA[empresaId];
    if (!conexion) {
      throw new Error('CREDENCIALES_NO_CONFIGURADAS: No hay credenciales configuradas para esta empresa.');
    }

    const gateway = obtenerSunatGateway(conexion.modoSimulado);
    const credenciales: CredencialesSunat = {
      ruc: conexion.ruc,
      usuarioSol: cryptoService.descifrar(conexion.usuarioSolEncrypted),
      claveSol: cryptoService.descifrar(conexion.claveSolEncrypted),
      clientId: conexion.clientIdEncrypted ? cryptoService.descifrar(conexion.clientIdEncrypted) : undefined,
      clientSecret: conexion.clientSecretEncrypted ? cryptoService.descifrar(conexion.clientSecretEncrypted) : undefined
    };

    const resultado = await gateway.validarCredenciales(credenciales);

    conexion.estado = resultado.estado as any;
    conexion.ultimoChequeo = new Date().toISOString();
    conexion.ultimoError = resultado.valido ? undefined : cryptoService.sanitizarError(resultado.mensaje);

    await auditoriaRepository.registrar({
      empresaId,
      usuarioId: userId,
      tablaAfectada: 'sunat_conexiones',
      registroId: empresaId,
      accion: 'VALIDAR_CONEXION',
      datosNuevos: { estado: conexion.estado, valido: resultado.valido }
    });

    return resultado;
  },

  /**
   * Descarga la propuesta de Compras o Ventas y la almacena con hash SHA-256 anti-duplicados.
   */
  async descargarPropuesta(
    empresaId: string,
    tipo: 'COMPRAS' | 'VENTAS',
    periodo: string,
    userId: string
  ): Promise<SirePropuestaModel> {
    const conexion = CONEXIONES_SUNAT_MEMORIA[empresaId] || {
      empresaId,
      ruc: '20601234567',
      modoSimulado: true
    };

    const gateway = obtenerSunatGateway(conexion.modoSimulado);
    const ruc = conexion.ruc || '20601234567';

    const propuestaData = tipo === 'COMPRAS'
      ? await gateway.descargarPropuestaCompras(ruc, periodo)
      : await gateway.descargarPropuestaVentas(ruc, periodo);

    const hash = crypto.createHash('sha256').update(JSON.stringify(propuestaData.comprobantes)).digest('hex');

    // Comprobar si ya existe con el mismo hash para evitar duplicados
    const existente = SIRE_PROPUESTAS_MEMORIA.find(
      p => p.empresaId === empresaId && p.tipo === tipo && p.periodo === periodo && p.hashArchivo === hash
    );
    if (existente) {
      return existente;
    }

    let totalBase = 0;
    let totalIgv = 0;
    let totalImporte = 0;

    for (const c of propuestaData.comprobantes) {
      totalBase += c.baseGravada;
      totalIgv += c.igv;
      totalImporte += c.total;
    }

    const nuevaPropuesta: SirePropuestaModel = {
      id: `propuesta-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      empresaId,
      tipo,
      periodo,
      fechaDescarga: new Date().toISOString(),
      hashArchivo: hash,
      totalRegistros: propuestaData.comprobantes.length,
      totalBaseGravada: Number(totalBase.toFixed(2)),
      totalIgv: Number(totalIgv.toFixed(2)),
      totalImporte: Number(totalImporte.toFixed(2)),
      lineas: propuestaData.comprobantes
    };

    SIRE_PROPUESTAS_MEMORIA.push(nuevaPropuesta);

    await auditoriaRepository.registrar({
      empresaId,
      usuarioId: userId,
      tablaAfectada: 'sire_propuestas',
      registroId: nuevaPropuesta.id,
      accion: 'DESCARGA_PROPUESTA_SIRE',
      datosNuevos: { tipo, periodo, totalRegistros: nuevaPropuesta.totalRegistros, hash }
    });

    return nuevaPropuesta;
  },

  async obtenerPropuesta(empresaId: string, tipo: 'COMPRAS' | 'VENTAS', periodo: string): Promise<SirePropuestaModel | null> {
    const found = SIRE_PROPUESTAS_MEMORIA.find(p => p.empresaId === empresaId && p.tipo === tipo && p.periodo === periodo);
    return found || null;
  }
};
