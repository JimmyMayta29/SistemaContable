import express from 'express';
import cors from 'cors';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { apiRoutes } from './server/routes';
import { runMigrations } from './server/db/migrate';
import { env } from './server/config/env';

async function startServer() {
  if (env.NODE_ENV === 'production' && !env.DATABASE_URL) {
    console.error('❌ [Server] FATAL: NODE_ENV=production requiere DATABASE_URL configurada. El servidor no arrancará con motor en memoria.');
    process.exit(1);
  }

  const app = express();

  app.use(cors());
  app.use(express.json({ limit: '25mb' }));
  app.use(express.urlencoded({ extended: true, limit: '25mb' }));

  // Rutas de API Backend
  app.use('/api', apiRoutes);

  // Ejecutar migraciones si la BD está disponible
  await runMigrations();

  // Integración con Vite en desarrollo vs distribución estática en producción
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
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
  console.error('❌ [Server] Error crítico iniciando el servidor:', err);
});
