import { Router, Request, Response } from 'express';
import { activosFijosService, ACTIVOS_FIJOS_MEMORIA } from '../services/activosFijosService';
import { kardexService, PRODUCTOS_KARDEX_MEMORIA } from '../services/kardexService';
import { prorrataIgvService } from '../services/prorrataIgvService';
import { empresaRepository } from '../repositories/empresaRepository';

export const activosKardexRoutes = Router();

// ============================================================================
// ACTIVOS FIJOS (LIBRO 7.1)
// ============================================================================
activosKardexRoutes.get('/empresas/:empresaId/activos-fijos', async (req: Request, res: Response) => {
  try {
    const { empresaId } = req.params;
    const activos = ACTIVOS_FIJOS_MEMORIA.filter(a => a.empresaId === empresaId);
    res.json(activos);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

activosKardexRoutes.post('/empresas/:empresaId/activos-fijos', async (req: Request, res: Response) => {
  try {
    const { empresaId } = req.params;
    const activo = await activosFijosService.registrarActivo(empresaId, req.body);
    res.status(201).json(activo);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

activosKardexRoutes.get('/empresas/:empresaId/activos-fijos/depreciacion', async (req: Request, res: Response) => {
  try {
    const { empresaId } = req.params;
    const periodo = (req.query.periodo as string) || '2026-09';
    const resultado = await activosFijosService.calcularDepreciacionPeriodo(empresaId, periodo);
    res.json(resultado);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

activosKardexRoutes.post('/empresas/:empresaId/activos-fijos/depreciacion/asiento', async (req: Request, res: Response) => {
  try {
    const { empresaId } = req.params;
    const { periodo, userId } = req.body;
    const resultado = await activosFijosService.generarAsientoDepreciacion(empresaId, periodo || '2026-09', userId);
    res.json(resultado);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

activosKardexRoutes.get('/empresas/:empresaId/activos-fijos/ple-71', async (req: Request, res: Response) => {
  try {
    const { empresaId } = req.params;
    const anio = parseInt((req.query.anio as string) || '2026', 10);
    const empresa = await empresaRepository.obtenerPorId(empresaId);
    const ruc = empresa?.ruc || '20100000001';

    const ple = await activosFijosService.exportarPleLibro71(empresaId, anio, ruc);
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${ple.nombreArchivo}"`);
    res.send(ple.contenidoTxt);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// KARDEX VALORADO (LIBRO 13.1)
// ============================================================================
activosKardexRoutes.get('/empresas/:empresaId/kardex/productos', async (req: Request, res: Response) => {
  try {
    const { empresaId } = req.params;
    const productos = PRODUCTOS_KARDEX_MEMORIA.filter(p => p.empresaId === empresaId);
    res.json(productos);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

activosKardexRoutes.post('/empresas/:empresaId/kardex/productos', async (req: Request, res: Response) => {
  try {
    const { empresaId } = req.params;
    const producto = await kardexService.registrarProducto(empresaId, req.body);
    res.status(201).json(producto);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

activosKardexRoutes.post('/empresas/:empresaId/kardex/movimientos', async (req: Request, res: Response) => {
  try {
    const { empresaId } = req.params;
    const movimiento = await kardexService.registrarMovimiento(empresaId, req.body);
    res.status(201).json(movimiento);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

activosKardexRoutes.get('/empresas/:empresaId/kardex/productos/:productoId', async (req: Request, res: Response) => {
  try {
    const { empresaId, productoId } = req.params;
    const tarjeta = await kardexService.obtenerKardexProducto(empresaId, productoId);
    res.json(tarjeta);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

activosKardexRoutes.post('/empresas/:empresaId/kardex/costo-ventas/asiento', async (req: Request, res: Response) => {
  try {
    const { empresaId } = req.params;
    const { periodo } = req.body;
    const resultado = await kardexService.generarAsientoCostoVentas(empresaId, periodo || '2026-09');
    res.json(resultado);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

activosKardexRoutes.get('/empresas/:empresaId/kardex/ple-131', async (req: Request, res: Response) => {
  try {
    const { empresaId } = req.params;
    const periodo = (req.query.periodo as string) || '2026-09';
    const empresa = await empresaRepository.obtenerPorId(empresaId);
    const ruc = empresa?.ruc || '20100000001';

    const ple = await kardexService.exportarPleLibro131(empresaId, periodo, ruc);
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${ple.nombreArchivo}"`);
    res.send(ple.contenidoTxt);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// PRORRATA DEL CRÉDITO FISCAL IGV
// ============================================================================
activosKardexRoutes.get('/empresas/:empresaId/prorrata-igv', async (req: Request, res: Response) => {
  try {
    const { empresaId } = req.params;
    const periodo = (req.query.periodo as string) || '2026-09';
    const resultado = await prorrataIgvService.calcularProrrata(empresaId, periodo);
    res.json(resultado);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
