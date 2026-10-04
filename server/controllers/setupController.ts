import { Request, Response } from 'express';
import { setupService, SetupInicialInput } from '../services/setupService';

export const setupController = {
  async obtenerEstado(req: Request, res: Response) {
    try {
      const estado = await setupService.obtenerEstadoSetup();
      return res.json({
        success: true,
        ...estado
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: 'ERROR_ESTADO_SETUP',
        mensaje: err.message
      });
    }
  },

  async generarMfa(req: Request, res: Response) {
    try {
      const email = (req.query.email as string) || 'admin@estudio.pe';
      const mfa = setupService.generarMfaSecret(email);
      return res.json({
        success: true,
        ...mfa
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: 'ERROR_GENERACION_MFA',
        mensaje: err.message
      });
    }
  },

  async inicializar(req: Request, res: Response) {
    try {
      const body = req.body as SetupInicialInput;
      if (!body.nombreEstudio || !body.rucEstudio || !body.adminEmail || !body.adminPassword) {
        return res.status(400).json({
          success: false,
          error: 'DATOS_INCOMPLETOS',
          mensaje: 'Se requieren nombre del estudio, RUC, correo del administrador y contraseña.'
        });
      }

      const resultado = await setupService.inicializarEstudio(body);
      return res.status(201).json({
        success: true,
        ...resultado
      });
    } catch (err: any) {
      const status = err.message.includes('SISTEMA_YA_CONFIGURADO') ? 409 : 400;
      return res.status(status).json({
        success: false,
        error: 'ERROR_INICIALIZACION_ESTUDIO',
        mensaje: err.message
      });
    }
  }
};
