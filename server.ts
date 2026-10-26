import express from 'express';
import cors from 'cors';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { apiRoutes } from './server/routes';
import { runMigrations } from './server/db/migrate';
import { env } from './server/config/env';
import { initializeDatabase, closeDatabase } from './server/config/database';
import { fileURLToPath } from 'node:url';

async function startServer() {
  await initializeDatabase();
  await runMigrations();

  const app = express();

  app.use(cors());
  app.use(express.json({ limit: '25mb' }));
  app.use(express.urlencoded({ extended: true, limit: '25mb' }));

  // Rutas de API Backend
  app.use('/api', apiRoutes);

  // Integración con Vite en desarrollo vs distribución estática en producción
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = fileURLToPath(new URL('./dist', import.meta.url));
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const port = env.PORT || 3000;
  app.listen(port, '0.0.0.0', () => {
    console.log(`🚀 [Server] SUNAConta PRO corriendo en http://0.0.0.0:${port}`);
  });
}

startServer().catch((err) => {
  console.error('❌ [Server] Error crítico iniciando el servidor:', err.message);
  process.exitCode = 1;
  void closeDatabase();
});
