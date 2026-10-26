import { db, type DatabaseService } from '../config/database';
import { PLAN_CONTABLE_PCGE } from '../../src/data/pcgeAccounts';

export async function runSeeds(client: Pick<DatabaseService, 'query'> = db) {
  if (!db.isPostgresConnected()) {
    console.log('ℹ️ [Seeds] PostgreSQL no conectado. Omitiendo seeds directos.');
    return;
  }

  console.log('🌱 [Seeds] Ejecutando inserción de semillas iniciales...');

    // Roles y catálogos compartidos; la identidad inicial se crea exclusivamente en setup.
    await client.query(`
      INSERT INTO roles (codigo, nombre, descripcion) VALUES
      ('ADMINISTRADOR', 'Administrador del Estudio', 'Control total de empresas, membresías, auditoría y configuración'),
      ('CONTADOR', 'Contador General', 'Creación y aprobación de vouchers, cierres de periodo y libros'),
      ('ASISTENTE', 'Asistente Contable', 'Ingreso de comprobantes, compras, ventas y conciliación'),
      ('AUDITOR', 'Auditor / Consulta', 'Acceso de solo lectura a libros y reportes')
      ON CONFLICT (codigo) DO NOTHING;
    `);

    // 4. Parámetros Tributarios Oficiales (Cero hardcoding)
    const parametros = [
      { codigo: 'TASA_IGV', desc: 'Tasa General del Impuesto General a las Ventas (18%)', valor: 0.18, cat: 'IGV', desde: '2020-01-01' },
      { codigo: 'TASA_ESSALUD', desc: 'Aporte Patronal al Seguro Social de Salud EsSalud (9%)', valor: 0.09, cat: 'LABORAL', desde: '2020-01-01' },
      { codigo: 'TASA_RETENCION_4TA', desc: 'Tasa de Retención del Impuesto a la Renta de 4ta Categoría (8%)', valor: 0.08, cat: 'RENTA', desde: '2020-01-01' },
      { codigo: 'TOPE_RETENCION_4TA', desc: 'Monto a partir del cual aplica retención de 4ta categoría (S/ 1,500)', valor: 1500.00, cat: 'RENTA', desde: '2020-01-01' },
      { codigo: 'TASA_RENTA_MYPE_SUB300', desc: 'Pago a cuenta mensual Régimen MYPE Tributario hasta 300 UIT (1%)', valor: 0.01, cat: 'RENTA', desde: '2020-01-01' },
      { codigo: 'TASA_RENTA_RER', desc: 'Pago definitivo Régimen Especial de Renta (1.5%)', valor: 0.015, cat: 'RENTA', desde: '2020-01-01' },
      { codigo: 'VALOR_UIT_2026', desc: 'Valor oficial de la Unidad Impositiva Tributaria 2026', valor: 5350.00, cat: 'UIT', desde: '2026-01-01' },
    ];

    for (const p of parametros) {
      await client.query(`
        INSERT INTO parametros_tributarios (codigo_parametro, descripcion, valor_numerico, vigente_desde, categoria)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (codigo_parametro, vigente_desde) DO NOTHING;
      `, [p.codigo, p.desc, p.valor, p.desde, p.cat]);
    }

    // 5. Cronograma de Vencimientos SUNAT para 2026-09
    const cronograma = [
      { digito: '0', pdt: '2026-10-15', sire: '2026-10-14', plame: '2026-10-15' },
      { digito: '1', pdt: '2026-10-16', sire: '2026-10-15', plame: '2026-10-16' },
      { digito: '2', pdt: '2026-10-19', sire: '2026-10-16', plame: '2026-10-19' },
      { digito: '3', pdt: '2026-10-20', sire: '2026-10-19', plame: '2026-10-20' },
      { digito: '4', pdt: '2026-10-21', sire: '2026-10-20', plame: '2026-10-21' },
      { digito: '5', pdt: '2026-10-22', sire: '2026-10-21', plame: '2026-10-22' },
      { digito: '6', pdt: '2026-10-23', sire: '2026-10-22', plame: '2026-10-23' },
      { digito: '7', pdt: '2026-10-26', sire: '2026-10-23', plame: '2026-10-26' },
      { digito: '8', pdt: '2026-10-27', sire: '2026-10-26', plame: '2026-10-27' },
      { digito: '9', pdt: '2026-10-28', sire: '2026-10-27', plame: '2026-10-28' },
      { digito: 'B', pdt: '2026-10-29', sire: '2026-10-28', plame: '2026-10-29' },
    ];

    for (const c of cronograma) {
      await client.query(`
        INSERT INTO cronograma_vencimientos (periodo, ultimo_digito_ruc, fecha_vencimiento_pdt621, fecha_vencimiento_sire, fecha_vencimiento_plame)
        VALUES ('2026-09', $1, $2, $3, $4)
        ON CONFLICT (periodo, ultimo_digito_ruc) DO NOTHING;
      `, [c.digito, c.pdt, c.sire, c.plame]);
    }

    // 6. Plantilla PCGE Base
    for (const cta of PLAN_CONTABLE_PCGE) {
      const nivel = cta.codigo.length <= 2 ? 1 : cta.codigo.length <= 3 ? 2 : cta.codigo.length <= 4 ? 3 : 4;
      const permiteMovimiento = cta.codigo.length >= 3;
      const tipoCuenta = cta.tipo === 'BALANCE' 
        ? (cta.elemento <= 3 ? 'ACTIVO' : cta.elemento === 4 ? 'PASIVO' : 'PATRIMONIO')
        : (cta.elemento === 6 ? 'GASTO' : cta.elemento === 7 ? 'INGRESO' : 'FUNCION');

      await client.query(`
        INSERT INTO plantilla_pcge (codigo, nombre, nivel, tipo_cuenta, permite_movimiento)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (codigo) DO NOTHING;
      `, [cta.codigo, cta.nombre, nivel, tipoCuenta, permiteMovimiento]);
    }

    console.log('✅ [Seeds] Semillas completadas exitosamente.');
}
