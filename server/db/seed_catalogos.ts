import { db, type DatabaseService } from '../config/database';

export async function runCatalogosSeeds(client: Pick<DatabaseService, 'query'> = db) {
  if (!db.isPostgresConnected()) return;

  console.log('🌱 [Seeds] Insertando Catálogos Oficiales de SUNAT...');

  // 1. Tipos de Comprobante de Pago (Catálogo 01 SUNAT)
  // TODO: Validar vigencia con Anexo 8 Resolución de Superintendencia N° 000040-2022/SUNAT
  const comprobantes = [
    { cod: '01', desc: 'Factura Electrónica' },
    { cod: '03', desc: 'Boleta de Venta Electrónica' },
    { cod: '07', desc: 'Nota de Crédito Electrónica' },
    { cod: '08', desc: 'Nota de Débito Electrónica' },
    { cod: 'R1', desc: 'Recibo por Honorarios Electrónico' },
    { cod: '09', desc: 'Guía de Remisión Remitente' },
    { cod: '14', desc: 'Recibo por Servicios Públicos (Luz, Agua, Teléfono)' }
  ];

  for (const c of comprobantes) {
    await client.query(`
      INSERT INTO catalogos_sunat (tabla_sunat, codigo, descripcion, vigencia_desde)
      VALUES ('TIPO_COMPROBANTE', $1, $2, '2020-01-01')
      ON CONFLICT (tabla_sunat, codigo, vigencia_desde) DO NOTHING;
    `, [c.cod, c.desc]);
  }

  // 2. Bienes y Servicios Sujetos al Sistema de Detracciones (SPOT - Catálogo SUNAT)
  // TODO: Validar con Anexo 3 de la Resolución de Superintendencia N° 183-2004/SUNAT actualizada a 2026
  const detracciones = [
    { cod: '022', desc: 'Otros servicios empresariales', pct: 12.0 },
    { cod: '024', desc: 'Comisión mercantil', pct: 10.0 },
    { cod: '025', desc: 'Fabricación de bienes por encargo', pct: 10.0 },
    { cod: '020', desc: 'Mantenimiento y reparación de bienes muebles', pct: 12.0 },
    { cod: '037', desc: 'Demás servicios gravados con el IGV', pct: 12.0 },
    { cod: '019', desc: 'Arrendamiento de bienes muebles', pct: 10.0 },
    { cod: '030', desc: 'Contratos de construcción', pct: 4.0 },
    { cod: '021', desc: 'Movimiento de carga', pct: 10.0 }
  ];

  for (const d of detracciones) {
    await client.query(`
      INSERT INTO catalogos_sunat (tabla_sunat, codigo, descripcion, vigencia_desde, datos_extra)
      VALUES ('BIEN_DETRACCION', $1, $2, '2020-01-01', $3)
      ON CONFLICT (tabla_sunat, codigo, vigencia_desde) DO NOTHING;
    `, [d.cod, d.desc, JSON.stringify({ porcentaje: d.pct })]);
  }

  // 3. Motivos de Nota de Crédito (Catálogo 09 SUNAT)
  // TODO: Validar con Catálogo 09 vigente de Comprobantes de Pago Electrónicos
  const motivosNC = [
    { cod: '01', desc: 'Anulación de la operación' },
    { cod: '02', desc: 'Anulación por error en el RUC' },
    { cod: '03', desc: 'Corrección por error en la descripción' },
    { cod: '04', desc: 'Descuento global' },
    { cod: '05', desc: 'Descuento por ítem' },
    { cod: '06', desc: 'Devolución total' },
    { cod: '07', desc: 'Devolución por ítem' }
  ];

  for (const m of motivosNC) {
    await client.query(`
      INSERT INTO catalogos_sunat (tabla_sunat, codigo, descripcion, vigencia_desde)
      VALUES ('MOTIVO_NC', $1, $2, '2020-01-01')
      ON CONFLICT (tabla_sunat, codigo, vigencia_desde) DO NOTHING;
    `, [m.cod, m.desc]);
  }

  console.log('✅ [Seeds] Catálogos SUNAT cargados exitosamente.');
}
