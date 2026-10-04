import { Router } from 'express';
import { setupController } from '../controllers/setupController';

export const setupRoutes = Router();

// Endpoints públicos del asistente de primer arranque
setupRoutes.get('/status', setupController.obtenerEstado);
setupRoutes.get('/mfa-secret', setupController.generarMfa);
setupRoutes.post('/inicializar', setupController.inicializar);
