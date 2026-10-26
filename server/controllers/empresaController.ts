import { Request, Response } from 'express';
import { z } from 'zod';
import { empresaRepository } from '../repositories/empresaRepository';
import { parametroRepository } from '../repositories/parametroRepository';
import { auditoriaRepository } from '../repositories/auditoriaRepository';
import { empresaDemoService } from '../services/empresaDemoService';
import { setupService } from '../services/setupService';
import { successResponse, errorResponse } from '../utils/response';

export const crearEmpresaSchema = z.object({
  codigoEmpresa: z.string().min(2).max(20),
  ruc: z.string().length(11, 'El RUC debe tener exactamente 11 dígitos').refine(
    (ruc) => setupService.validarRucModulo11(ruc),
    { message: 'El RUC no cumple con el algoritmo Módulo 11 oficial de SUNAT.' }
  ),
  razonSocial: z.string().min(3).max(200),
  nombreComercial: z.string().max(200).optional(),
  regimenTributario: z.enum(['MYPE_TRIBUTARIO', 'REGIMEN_GENERAL', 'REGIMEN_ESPECIAL', 'NRUS']),
  domicilioFiscal: z.string().min(5),
  departamento: z.string().optional(),
  provincia: z.string().optional(),
  distrito: z.string().optional(),
  contactoNombre: z.string().optional(),
  contactoTelefono: z.string().optional(),
  contactoEmail: z.string().email('Email de contacto no válido').optional().or(z.literal('')),
  representanteLegal: z.string().min(3).optional(),
  contadorNombre: z.string().min(3).optional(),
  contadorColegiatura: z.string().min(3).optional(),
  ejercicio: z.number().int().min(2020).max(2035).default(2026),
  monedaPrincipal: z.enum(['PEN', 'USD']).default('PEN')
});

export const credencialesSunatSchema = z.object({
  usuarioSol: z.string().min(2),
  claveSol: z.string().min(4),
  clientIdSire: z.string().optional(),
  clientSecretSire: z.string().optional()
});

export const empresaController = {
  async listar(req: Request, res: Response) {
    try {
      if (!req.user) return errorResponse(res, 'AUTENTICACION_REQUERIDA', 401);
      const userId = req.user.id;
      const empresas = await empresaRepository.listarPorUsuario(userId);

      // Enriquecer cada empresa con cronograma de vencimientos oficial desde parametros_tributarios
      const periodoActual = '2026-09';
      const enriquecidas = await Promise.all(empresas.map(async (emp) => {
        const digito = emp.ruc.charAt(10);
        const cronograma = await parametroRepository.obtenerCronograma(periodoActual, digito);
        
        // Obtener tasa de renta según régimen
        let tasaRenta = 0.01; // default MYPE 1%
        if (emp.regimenTributario === 'REGIMEN_ESPECIAL') {
          tasaRenta = 0.015; // RER 1.5%
        } else if (emp.regimenTributario === 'REGIMEN_GENERAL') {
          tasaRenta = 0.015; // RG 1.5% o coeficiente
        }

        return {
          ...emp,
          direccionFiscal: emp.domicilioFiscal,
          tasaRentaMensual: tasaRenta,
          fechaVencimientoSire: cronograma?.fechaVencimientoSire || '2026-10-21',
          fechaVencimientoPdt: cronograma?.fechaVencimientoPdt621 || '2026-10-22',
          fechaVencimientoPlame: cronograma?.fechaVencimientoPlame || '2026-10-22'
        };
      }));

      return successResponse(res, enriquecidas);
    } catch (error) {
      console.error('Error listando empresas:', error);
      return errorResponse(res, 'Error al obtener la lista de empresas');
    }
  },

  async obtener(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const empresa = await empresaRepository.obtenerPorId(id);
      if (!empresa) {
        return errorResponse(res, 'Empresa no encontrada', 404);
      }
      return successResponse(res, empresa);
    } catch (error) {
      return errorResponse(res, 'Error al consultar empresa');
    }
  },

  async crear(req: Request, res: Response) {
    try {
      if (!req.user) return errorResponse(res, 'AUTENTICACION_REQUERIDA', 401);
      if (req.user.rolGlobal !== 'ADMINISTRADOR') return errorResponse(res, 'PERMISO_INSUFICIENTE', 403);
      const userId = req.user.id;
      const { estudio } = await setupService.obtenerEstadoSetup();
      if (!estudio?.tenantId) return errorResponse(res, 'ESTUDIO_NO_CONFIGURADO', 409);
      const tenantId = estudio.tenantId;

      const nueva = await empresaRepository.crear({
        tenantId,
        usuarioId: userId,
        codigoEmpresa: req.body.codigoEmpresa,
        ruc: req.body.ruc,
        razonSocial: req.body.razonSocial,
        nombreComercial: req.body.nombreComercial,
        regimenTributario: req.body.regimenTributario,
        domicilioFiscal: req.body.domicilioFiscal,
        departamento: req.body.departamento,
        provincia: req.body.provincia,
        distrito: req.body.distrito,
        contactoNombre: req.body.contactoNombre,
        contactoTelefono: req.body.contactoTelefono,
        contactoEmail: req.body.contactoEmail,
        monedaPrincipal: req.body.monedaPrincipal || 'PEN'
      });

      await auditoriaRepository.registrar({
        tenantId,
        empresaId: nueva.id,
        usuarioId: userId,
        usuarioEmail: req.user?.email || 'admin@sunaconta.pe',
        tablaAfectada: 'empresas',
        registroId: nueva.id,
        accion: 'INSERT',
        datosNuevos: nueva,
        direccionIp: req.ip
      });

      return successResponse(res, nueva, 'Empresa creada exitosamente con plan PCGE clonado', 201);
    } catch (error: any) {
      console.error('Error creando empresa:', error);
      return errorResponse(res, error.message || 'Error al registrar la empresa');
    }
  },

  async actualizarCredencialesSunat(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { usuarioSol, claveSol, clientIdSire, clientSecretSire } = req.body;

      // 2.3 Bloquear conexión SOL en la Empresa Demo
      empresaDemoService.validarOperacionOficialPermitida(id, 'SOL_CONEXION');

      await empresaRepository.actualizarCredencialesSunat(
        id, 
        usuarioSol, 
        claveSol, 
        clientIdSire, 
        clientSecretSire
      );

      await auditoriaRepository.registrar({
        empresaId: id,
        usuarioId: req.user?.id,
        usuarioEmail: req.user?.email,
        tablaAfectada: 'credenciales_sunat',
        registroId: id,
        accion: 'UPDATE',
        datosNuevos: { usuarioSol, tieneSireSecret: !!clientSecretSire },
        direccionIp: req.ip
      });

      return successResponse(res, { message: 'Credenciales SUNAT guardadas de forma segura (AES-256-GCM)' });
    } catch (error: any) {
      return errorResponse(res, error.message || 'Error al guardar credenciales SUNAT');
    }
  },

  async restablecerDemo(req: Request, res: Response) {
    try {
      if (req.user?.rolGlobal !== 'ADMINISTRADOR') {
        return errorResponse(res, 'Solo el rol ADMINISTRADOR tiene autorización para restablecer la Empresa Demo.', 403);
      }
      const resultado = await empresaDemoService.restablecerDemo(req.user.id);
      return successResponse(res, resultado, 'Empresa Demo S.A.C. restablecida con éxito.');
    } catch (error: any) {
      return errorResponse(res, error.message || 'Error al restablecer la empresa demo');
    }
  }
};
