import crypto from 'crypto';
import { db } from '../config/database';
import { setupService } from './setupService';
import { ANEXOS_MEMORIA, AnexoModel } from './anexoService';
import { TRABAJADORES_MEMORIA, TrabajadorModel } from './planillaService';
import { ARTICULOS_MEMORIA, ArticuloKardexModel } from './kardexService';
import { ASIENTOS_MEMORIA, AsientoContableModel, AsientoDetalleModel } from './asientoService';
import { CATALOGO_PCGE_BASE, CuentaCatalogo } from '../data/catalogos/pcgeCatalogo';
import { Money } from '../utils/decimal';

export type TipoMaestroImportacion = 
  | 'PROVEEDORES' 
  | 'CLIENTES' 
  | 'PLAN_CUENTAS' 
  | 'SALDOS_INICIALES' 
  | 'TRABAJADORES' 
  | 'ARTICULOS';

export interface ErrorFilaImportacion {
  fila: number;
  campo: string;
  valor: any;
  mensaje: string;
}

export interface ResultadoAnalisisImportacion {
  loteId: string;
  tipoMaestro: TipoMaestroImportacion;
  totalFilas: number;
  filasValidas: number;
  filasInvalidas: number;
  filasDuplicadas: number;
  cuadraBalance?: boolean;
  totalDebe?: number;
  totalHaber?: number;
  diferencia?: number;
  errores: ErrorFilaImportacion[];
  filasParaImportar: any[];
}

export interface LoteImportadoRegistro {
  loteId: string;
  empresaId: string;
  tipoMaestro: TipoMaestroImportacion;
  totalRegistros: number;
  idsRegistros: string[];
  fechaImportacion: string;
  usuarioId: string;
  activo: boolean;
}

// Historial en memoria de lotes para soporte de deshacer (rollback de lote)
export const LOTES_HISTORIAL_MEMORIA: LoteImportadoRegistro[] = [];
const LOTES_TEMPORALES_PENDIENTES = new Map<string, ResultadoAnalisisImportacion & { empresaId: string }>();

// Plan de cuentas editable en memoria por empresa
export const PLAN_CUENTAS_EMPRESA_MEMORIA = new Map<string, CuentaCatalogo[]>();

export const importacionService = {
  /**
   * Neutraliza inyección de fórmulas CSV para prevenir ejecución de macros en Excel
   */
  neutralizarInyeccionCsv(valor: string): string {
    if (!valor || typeof valor !== 'string') return valor;
    const trimmed = valor.trim();
    if (/^[=+\-@\t\r]/.test(trimmed)) {
      return `'${trimmed}`;
    }
    return trimmed;
  },

  /**
   * Genera el contenido de plantilla descargable para cada maestro en formato CSV con cabeceras normativas
   */
  obtenerPlantillaCsv(tipo: TipoMaestroImportacion): { nombreArchivo: string; contenidoCsv: string } {
    switch (tipo) {
      case 'PROVEEDORES':
        return {
          nombreArchivo: 'plantilla_proveedores.csv',
          contenidoCsv: 'tipo_doc,numero_doc,razon_social,direccion,telefono,email\n' +
                        '6,20100000017,"DISTRIBUIDORA EJEMPLO S.A.C.","AV. PRINCIPAL 123",987654321,contacto@ejemplo.pe\n' +
                        '1,45678912,"JUAN PEREZ LOPEZ","CALLE LOS PINOS 456",999888777,juan.perez@gmail.com\n'
        };
      case 'CLIENTES':
        return {
          nombreArchivo: 'plantilla_clientes.csv',
          contenidoCsv: 'tipo_doc,numero_doc,razon_social,direccion,telefono,email\n' +
                        '6,20200000014,"CLIENTE EJEMPLO S.A.C.","AV. COMERCIAL 456",912345678,ventas@cliente.pe\n' +
                        '1,41239876,"MARIA ELENA ROJAS","JR. UNION 789",955443322,maria.rojas@gmail.com\n'
        };
      case 'PLAN_CUENTAS':
        return {
          nombreArchivo: 'plantilla_plan_cuentas.csv',
          contenidoCsv: 'codigo,nombre,nivel,tipo,permite_movimiento,naturaleza\n' +
                        '104101,"BCP CUENTA CORRIENTE SOLES",5,ACTIVO,SI,DEUDORA\n' +
                        '121201,"FACTURAS POR COBRAR - LIMA",5,ACTIVO,SI,DEUDORA\n' +
                        '421201,"FACTURAS POR PAGAR - PROVEEDORES NACIONALES",5,PASIVO,SI,ACREEDORA\n'
        };
      case 'SALDOS_INICIALES':
        return {
          nombreArchivo: 'plantilla_saldos_iniciales_apertura.csv',
          contenidoCsv: 'cuenta_codigo,cuenta_nombre,debe,haber,referencia\n' +
                        '1041,"Cuentas corrientes operativas",50000.00,0.00,"Saldo inicial BCP"\n' +
                        '1011,"Caja central",10000.00,0.00,"Efectivo en caja"\n' +
                        '5011,"Acciones - Capital Social",0.00,50000.00,"Aporte de socios"\n' +
                        '5911,"Utilidades no distribuidas",0.00,10000.00,"Resultados acumulados"\n'
        };
      case 'TRABAJADORES':
        return {
          nombreArchivo: 'plantilla_trabajadores.csv',
          contenidoCsv: 'tipo_doc,numero_doc,nombres,apellido_paterno,apellido_materno,cargo,regimen_pensionario,sueldo_basico,asignacion_familiar\n' +
                        '1,45678901,"CARLOS","MENDOZA","QUISPE","CONTADOR GENERAL",AFP_INTEGRA,3500.00,SI\n' +
                        '1,41239876,"MARIA","FLORES","ROCA","ASISTENTE CONTABLE",ONP,2200.00,NO\n'
        };
      case 'ARTICULOS':
        return {
          nombreArchivo: 'plantilla_articulos_kardex.csv',
          contenidoCsv: 'codigo,descripcion,unidad_medida,tipo_existencia,metodo_valuacion,cuenta_inventario,cuenta_costo_venta\n' +
                        'ART-001,"RESMA PAPEL BOND A4 75G",NIU,MERCADERIA,PROMEDIO_PONDERADO,20111,69111\n' +
                        'ART-002,"TONER HP LASERJET M404",NIU,MERCADERIA,PROMEDIO_PONDERADO,20111,69111\n'
        };
    }
  },

  /**
   * Parser inteligente de CSV/TXT con soporte UTF-8/ANSI, detección de delimitador (, o ;) y neutralización
   */
  parsearCsv(contenido: string): string[][] {
    const lineas = contenido.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
    const filas: string[][] = [];

    for (const linea of lineas) {
      if (!linea.trim()) continue;
      // Detección de delimitador (coma o punto y coma)
      const delimitador = (linea.split(';').length > linea.split(',').length) ? ';' : ',';
      
      const valores: string[] = [];
      let dentroComillas = false;
      let buffer = '';

      for (let i = 0; i < linea.length; i++) {
        const c = linea[i];
        if (c === '"') {
          if (dentroComillas && linea[i + 1] === '"') {
            buffer += '"';
            i++;
          } else {
            dentroComillas = !dentroComillas;
          }
        } else if (c === delimitador && !dentroComillas) {
          valores.push(this.neutralizarInyeccionCsv(buffer.trim()));
          buffer = '';
        } else {
          buffer += c;
        }
      }
      valores.push(this.neutralizarInyeccionCsv(buffer.trim()));
      filas.push(valores);
    }
    return filas;
  },

  /**
   * Analiza y valida el archivo cargado sin persistir
   */
  async analizarArchivo(
    empresaId: string,
    tipoMaestro: TipoMaestroImportacion,
    contenidoTexto: string
  ): Promise<ResultadoAnalisisImportacion> {
    const loteId = `lote-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    const matriz = this.parsearCsv(contenidoTexto);

    if (matriz.length < 2) {
      throw new Error('ARCHIVO_VACIO: El archivo no contiene filas de datos o carece de cabecera.');
    }

    const cabecera = matriz[0].map(c => c.toLowerCase().replace(/[\s_]/g, ''));
    const filasDatos = matriz.slice(1);

    const errores: ErrorFilaImportacion[] = [];
    const filasParaImportar: any[] = [];
    let filasDuplicadas = 0;

    let totalDebe = 0;
    let totalHaber = 0;

    for (let idx = 0; idx < filasDatos.length; idx++) {
      const numeroFila = idx + 2;
      const fila = filasDatos[idx];
      if (fila.length === 0 || fila.every(v => v === '')) continue;

      const objFila: any = {};
      cabecera.forEach((campo, cIdx) => {
        objFila[campo] = fila[cIdx] !== undefined ? fila[cIdx] : '';
      });

      let tieneError = false;

      // ======================================================================
      // VALIDACIONES ESPECÍFICAS POR MAESTRO
      // ======================================================================
      if (tipoMaestro === 'PROVEEDORES' || tipoMaestro === 'CLIENTES') {
        const tipoDoc = objFila.tipodoc || '6';
        const numDoc = objFila.numerodoc;
        const razonSocial = objFila.razonsocial;

        if (!numDoc) {
          errores.push({ fila: numeroFila, campo: 'numero_doc', valor: numDoc, mensaje: 'El número de documento es obligatorio.' });
          tieneError = true;
        } else if (tipoDoc === '6') {
          if (!setupService.validarRucModulo11(numDoc)) {
            errores.push({ fila: numeroFila, campo: 'numero_doc', valor: numDoc, mensaje: 'El RUC no cumple con el algoritmo Módulo 11 oficial.' });
            tieneError = true;
          }
        } else if (tipoDoc === '1') {
          if (!/^\d{8}$/.test(numDoc)) {
            errores.push({ fila: numeroFila, campo: 'numero_doc', valor: numDoc, mensaje: 'El DNI debe tener exactamente 8 dígitos numéricos.' });
            tieneError = true;
          }
        }

        if (!razonSocial || razonSocial.length < 3) {
          errores.push({ fila: numeroFila, campo: 'razon_social', valor: razonSocial, mensaje: 'La razón social o nombre debe tener al menos 3 caracteres.' });
          tieneError = true;
        }

        // Detección de duplicados
        const yaExiste = ANEXOS_MEMORIA.some(a => a.empresaId === empresaId && a.numeroDocumento === numDoc);
        if (yaExiste) filasDuplicadas++;

        objFila._esDuplicado = yaExiste;
        objFila._id = `anx-imp-${Date.now()}-${idx}`;
      } 
      else if (tipoMaestro === 'SALDOS_INICIALES') {
        const ctaCodigo = objFila.cuentacodigo;
        const debe = parseFloat(objFila.debe || '0');
        const haber = parseFloat(objFila.haber || '0');

        if (!ctaCodigo) {
          errores.push({ fila: numeroFila, campo: 'cuenta_codigo', valor: ctaCodigo, mensaje: 'El código de cuenta es obligatorio.' });
          tieneError = true;
        }
        if (isNaN(debe) || isNaN(haber)) {
          errores.push({ fila: numeroFila, campo: 'montos', valor: `${objFila.debe}/${objFila.haber}`, mensaje: 'Los importes Debe y Haber deben ser números válidos.' });
          tieneError = true;
        }

        totalDebe = Money.toNumber(Money.add(totalDebe, isNaN(debe) ? 0 : debe));
        totalHaber = Money.toNumber(Money.add(totalHaber, isNaN(haber) ? 0 : haber));
      }
      else if (tipoMaestro === 'TRABAJADORES') {
        const numDoc = objFila.numerodoc;
        const nombres = objFila.nombres;
        const sueldo = parseFloat(objFila.sueldobasico || '0');

        if (!numDoc || !/^\d{8}$/.test(numDoc)) {
          errores.push({ fila: numeroFila, campo: 'numero_doc', valor: numDoc, mensaje: 'DNI inválido (requiere 8 dígitos).' });
          tieneError = true;
        }
        if (!nombres) {
          errores.push({ fila: numeroFila, campo: 'nombres', valor: nombres, mensaje: 'Los nombres del colaborador son obligatorios.' });
          tieneError = true;
        }
        if (isNaN(sueldo) || sueldo <= 0) {
          errores.push({ fila: numeroFila, campo: 'sueldo_basico', valor: objFila.sueldobasico, mensaje: 'El sueldo básico debe ser mayor a 0.' });
          tieneError = true;
        }

        const yaExiste = TRABAJADORES_MEMORIA.some(t => t.empresaId === empresaId && t.numeroDocumento === numDoc);
        if (yaExiste) filasDuplicadas++;
        objFila._esDuplicado = yaExiste;
      }
      else if (tipoMaestro === 'ARTICULOS') {
        const codigo = objFila.codigo;
        const desc = objFila.descripcion;
        if (!codigo) {
          errores.push({ fila: numeroFila, campo: 'codigo', valor: codigo, mensaje: 'El código del artículo es obligatorio.' });
          tieneError = true;
        }
        if (!desc) {
          errores.push({ fila: numeroFila, campo: 'descripcion', valor: desc, mensaje: 'La descripción es obligatoria.' });
          tieneError = true;
        }
        const yaExiste = ARTICULOS_MEMORIA.some(a => a.empresaId === empresaId && a.codigoArticulo === codigo);
        if (yaExiste) filasDuplicadas++;
        objFila._esDuplicado = yaExiste;
      }

      if (!tieneError) {
        filasParaImportar.push(objFila);
      }
    }

    let cuadraBalance = true;
    let diferencia = 0;
    if (tipoMaestro === 'SALDOS_INICIALES') {
      diferencia = Money.toNumber(Money.subtract(totalDebe, totalHaber));
      cuadraBalance = Math.abs(diferencia) < 0.01;
      if (!cuadraBalance) {
        errores.push({
          fila: 0,
          campo: 'BALANCE_CUADRE',
          valor: diferencia,
          mensaje: `El asiento de apertura inicial no cuadra. Suma Debe: S/ ${totalDebe.toFixed(2)}, Suma Haber: S/ ${totalHaber.toFixed(2)}, Descuadre: S/ ${diferencia.toFixed(2)}`
        });
      }
    }

    const resultado: ResultadoAnalisisImportacion = {
      loteId,
      tipoMaestro,
      totalFilas: filasDatos.length,
      filasValidas: filasParaImportar.length,
      filasInvalidas: errores.length,
      filasDuplicadas,
      cuadraBalance: tipoMaestro === 'SALDOS_INICIALES' ? cuadraBalance : undefined,
      totalDebe: tipoMaestro === 'SALDOS_INICIALES' ? totalDebe : undefined,
      totalHaber: tipoMaestro === 'SALDOS_INICIALES' ? totalHaber : undefined,
      diferencia: tipoMaestro === 'SALDOS_INICIALES' ? diferencia : undefined,
      errores,
      filasParaImportar
    };

    // Guardar temporalmente en espera de confirmación
    LOTES_TEMPORALES_PENDIENTES.set(loteId, { ...resultado, empresaId });

    return resultado;
  },

  /**
   * Confirma la inserción del lote analizado de forma atómica (TODO_O_NADA o con resolución de duplicados)
   */
  async confirmarImportacion(
    empresaId: string,
    loteId: string,
    opciones: {
      modo: 'TODO_O_NADA' | 'OMITIR_ERRORES';
      duplicados: 'OMITIR' | 'ACTUALIZAR';
    },
    userId: string
  ): Promise<{
    loteId: string;
    insertados: number;
    actualizados: number;
    omitidos: number;
    mensaje: string;
  }> {
    const pendiente = LOTES_TEMPORALES_PENDIENTES.get(loteId);
    if (!pendiente || pendiente.empresaId !== empresaId) {
      throw new Error('LOTE_NO_ENCONTRADO: El lote especificado expiró o no corresponde a la empresa activa.');
    }

    const tipo = pendiente.tipoMaestro;

    if (tipo === 'SALDOS_INICIALES' && !pendiente.cuadraBalance) {
      throw new Error(`BALANCE_DESCUADRADO: No se puede confirmar la importación de Saldos Iniciales porque el Debe y Haber no cuadran (Diferencia: S/ ${pendiente.diferencia?.toFixed(2)}).`);
    }

    if (opciones.modo === 'TODO_O_NADA' && pendiente.errores.length > 0) {
      throw new Error(`TRANSACCION_ABORTADA: El lote contiene ${pendiente.errores.length} errores. En modo TODO O NADA no se insertaron registros.`);
    }

    let insertados = 0;
    let actualizados = 0;
    let omitidos = 0;
    const idsInsertados: string[] = [];

    for (const fila of pendiente.filasParaImportar) {
      if (tipo === 'PROVEEDORES' || tipo === 'CLIENTES') {
        const esProveedor = tipo === 'PROVEEDORES';
        const numDoc = fila.numerodoc;
        const existenteIdx = ANEXOS_MEMORIA.findIndex(a => a.empresaId === empresaId && a.numeroDocumento === numDoc);

        if (existenteIdx >= 0) {
          if (opciones.duplicados === 'ACTUALIZAR') {
            ANEXOS_MEMORIA[existenteIdx].razonSocial = fila.razonsocial;
            ANEXOS_MEMORIA[existenteIdx].direccion = fila.direccion || ANEXOS_MEMORIA[existenteIdx].direccion;
            actualizados++;
          } else {
            omitidos++;
          }
        } else {
          const nuevoAnexo: AnexoModel = {
            id: `anx-${Date.now()}-${insertados}`,
            empresaId,
            tipoAnexo: esProveedor ? 'PROVEEDOR' : 'CLIENTE',
            tipoDocumento: fila.tipodoc || (numDoc.length === 11 ? '6' : '1'),
            numeroDocumento: numDoc,
            razonSocial: fila.razonsocial,
            direccion: fila.direccion || 'LIMA, PERÚ',
            telefono: fila.telefono,
            email: fila.email,
            condicionSunat: 'HABIDO',
            estadoSunat: 'ACTIVO'
          };
          ANEXOS_MEMORIA.push(nuevoAnexo);
          idsInsertados.push(nuevoAnexo.id);
          insertados++;
        }
      }
      else if (tipo === 'SALDOS_INICIALES') {
        // En saldos iniciales se genera un Asiento de Apertura oficial cuadrado (Subdiario 00)
        // La validación de cuadre ya se realizó en el análisis
      }
      else if (tipo === 'TRABAJADORES') {
        const numDoc = fila.numerodoc;
        const existente = TRABAJADORES_MEMORIA.find(t => t.empresaId === empresaId && t.numeroDocumento === numDoc);
        if (existente) {
          if (opciones.duplicados === 'ACTUALIZAR') {
            existente.nombres = fila.nombres;
            existente.sueldoBasico = parseFloat(fila.sueldobasico || '0');
            actualizados++;
          } else {
            omitidos++;
          }
        } else {
          const nuevoTrabajador: TrabajadorModel = {
            id: `tra-imp-${Date.now()}-${insertados}`,
            empresaId,
            tipoDocumento: fila.tipodoc || '1',
            numeroDocumento: numDoc,
            nombres: fila.nombres,
            apellidoPaterno: fila.apellidopaterno || '',
            apellidoMaterno: fila.apellidomaterno || '',
            cargo: fila.cargo || 'EMPLEADO',
            regimenPensionario: fila.regimenpensionario || 'ONP',
            sueldoBasico: parseFloat(fila.sueldobasico || '1025.00'),
            asignacionFamiliar: String(fila.asignacionfamiliar).toUpperCase() === 'SI',
            estado: 'ACTIVO',
            fechaIngreso: new Date().toISOString().split('T')[0]
          };
          TRABAJADORES_MEMORIA.push(nuevoTrabajador);
          idsInsertados.push(nuevoTrabajador.id);
          insertados++;
        }
      }
      else if (tipo === 'ARTICULOS') {
        const codigo = fila.codigo;
        const existente = ARTICULOS_MEMORIA.find(a => a.empresaId === empresaId && a.codigoArticulo === codigo);
        if (existente) {
          if (opciones.duplicados === 'ACTUALIZAR') {
            existente.descripcion = fila.descripcion;
            actualizados++;
          } else {
            omitidos++;
          }
        } else {
          const nuevoArticulo: ArticuloKardexModel = {
            id: `art-imp-${Date.now()}-${insertados}`,
            empresaId,
            codigoArticulo: codigo,
            descripcion: fila.descripcion,
            unidadMedida: fila.unidadmedida || 'NIU',
            tipoExistencia: fila.tipoexistencia || 'MERCADERIA',
            metodoValuacion: 'PROMEDIO_PONDERADO',
            cuentaInventarioCodigo: fila.cuentainventario || '20111',
            cuentaCostoVentaCodigo: fila.cuentacostoventa || '69111',
            saldoFisicoActual: 0,
            costoPromedioActual: 0,
            saldoValoradoActual: 0
          };
          ARTICULOS_MEMORIA.push(nuevoArticulo);
          idsInsertados.push(nuevoArticulo.id);
          insertados++;
        }
      }
    }

    // Si es Saldos Iniciales, generar el asiento de apertura
    if (tipo === 'SALDOS_INICIALES') {
      const items: AsientoDetalleModel[] = pendiente.filasParaImportar.map((f, i) => ({
        id: `det-ape-imp-${i}`,
        asientoId: `ast-ape-${empresaId}`,
        linea: i + 1,
        cuentaId: f.cuentacodigo,
        cuentaCodigo: f.cuentacodigo,
        cuentaNombre: f.cuentanombre || 'Cuenta de Apertura',
        debe: parseFloat(f.debe || '0'),
        haber: parseFloat(f.haber || '0')
      }));

      const totalD = items.reduce((s, it) => s + (it.debe || 0), 0);
      const totalH = items.reduce((s, it) => s + (it.haber || 0), 0);

      const asientoApertura: AsientoContableModel = {
        id: `ast-ape-${empresaId}`,
        empresaId,
        periodoId: 'per-2026-01',
        subdiarioId: '00',
        tipoAsiento: 'APERTURA',
        numero: '00010001',
        fecha: '2026-01-01',
        glosa: 'ASIENTO DE APERTURA POR SALDOS INICIALES IMPORTADOS',
        moneda: 'PEN',
        tipoCambio: 1.0,
        totalDebe: totalD,
        totalHaber: totalH,
        estado: 'CONTABILIZADO',
        version: 1,
        items,
        createdAt: new Date().toISOString()
      };
      ASIENTOS_MEMORIA.push(asientoApertura);
      idsInsertados.push(asientoApertura.id);
      insertados = items.length;
    }

    // Registrar en el historial de lotes importados para posibilitar DESHACER
    const loteRegistro: LoteImportadoRegistro = {
      loteId,
      empresaId,
      tipoMaestro: tipo,
      totalRegistros: idsInsertados.length,
      idsRegistros: idsInsertados,
      fechaImportacion: new Date().toISOString(),
      usuarioId: userId,
      activo: true
    };
    LOTES_HISTORIAL_MEMORIA.unshift(loteRegistro);

    // Limpiar lote temporal
    LOTES_TEMPORALES_PENDIENTES.delete(loteId);

    return {
      loteId,
      insertados,
      actualizados,
      omitidos,
      mensaje: `Lote ${loteId} procesado exitosamente: ${insertados} insertados, ${actualizados} actualizados, ${omitidos} omitidos.`
    };
  },

  /**
   * Deshace de manera atómica un lote importado eliminando sus registros asociados
   */
  async deshacerLote(empresaId: string, loteId: string, userId: string): Promise<{ exito: boolean; mensaje: string }> {
    const idx = LOTES_HISTORIAL_MEMORIA.findIndex(l => l.loteId === loteId && l.empresaId === empresaId);
    if (idx === -1) {
      throw new Error('LOTE_NO_ENCONTRADO: El lote no existe o no pertenece a esta empresa.');
    }

    const lote = LOTES_HISTORIAL_MEMORIA[idx];
    if (!lote.activo) {
      throw new Error('LOTE_YA_DESHECHO: Este lote ya fue revertido con anterioridad.');
    }

    const idsSet = new Set(lote.idsRegistros);

    if (lote.tipoMaestro === 'PROVEEDORES' || lote.tipoMaestro === 'CLIENTES') {
      const antes = ANEXOS_MEMORIA.length;
      const filtrados = ANEXOS_MEMORIA.filter(a => !(a.empresaId === empresaId && idsSet.has(a.id)));
      ANEXOS_MEMORIA.splice(0, ANEXOS_MEMORIA.length, ...filtrados);
    } else if (lote.tipoMaestro === 'TRABAJADORES') {
      const filtrados = TRABAJADORES_MEMORIA.filter(t => !(t.empresaId === empresaId && idsSet.has(t.id)));
      TRABAJADORES_MEMORIA.splice(0, TRABAJADORES_MEMORIA.length, ...filtrados);
    } else if (lote.tipoMaestro === 'ARTICULOS') {
      const filtrados = ARTICULOS_MEMORIA.filter(a => !(a.empresaId === empresaId && idsSet.has(a.id)));
      ARTICULOS_MEMORIA.splice(0, ARTICULOS_MEMORIA.length, ...filtrados);
    } else if (lote.tipoMaestro === 'SALDOS_INICIALES') {
      const filtrados = ASIENTOS_MEMORIA.filter(a => !(a.empresaId === empresaId && idsSet.has(a.id)));
      ASIENTOS_MEMORIA.splice(0, ASIENTOS_MEMORIA.length, ...filtrados);
    }

    lote.activo = false;

    return {
      exito: true,
      mensaje: `Lote ${loteId} revertido exitosamente. Se eliminaron ${lote.idsRegistros.length} registros.`
    };
  }
};
