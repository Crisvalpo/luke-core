import { Request, Response } from 'express';
import { CuadrillasService } from './cuadrillas.service.js';
import { DictionariesService } from './dictionaries.service.js';
import {
  createSpecialtySchema, updateSpecialtySchema,
  createOperationalRoleSchema, updateOperationalRoleSchema,
  createCrewSchema, updateCrewSchema, addMemberSchema, assignTasksSchema
} from './cuadrillas.schema.js';
import { sendSuccess, sendError } from '../../shared/utils/response.js';

export class CuadrillasController {
  private static getTenant(req: Request): string {
    return (req.headers['x-tenant-id'] as string) || (req.query.tenant_id as string) || 'default';
  }

  // --- Diccionarios: Especialidades ---
  static async getSpecialties(req: Request, res: Response) {
    try {
      const tenant = CuadrillasController.getTenant(req);
      const list = await DictionariesService.getSpecialties(tenant);
      return sendSuccess(res, list, 200, { total: list.length });
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  }

  static async upsertSpecialty(req: Request, res: Response) {
    try {
      const tenant = CuadrillasController.getTenant(req);
      const parsed = createSpecialtySchema.parse(req.body);
      const item = await DictionariesService.upsertSpecialty(tenant, parsed);
      return sendSuccess(res, item, 201, { mensaje: 'Especialidad guardada con éxito.' });
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }

  static async updateSpecialty(req: Request, res: Response) {
    try {
      const tenant = CuadrillasController.getTenant(req);
      const id = req.params.id as string;
      const parsed = updateSpecialtySchema.parse(req.body);
      const item = await DictionariesService.updateSpecialty(id, tenant, parsed);
      if (!item) return sendError(res, 'Especialidad no encontrada', 404);
      return sendSuccess(res, item, 200);
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }

  // --- Diccionarios: Roles Operativos ---
  static async getRoles(req: Request, res: Response) {
    try {
      const tenant = CuadrillasController.getTenant(req);
      const list = await DictionariesService.getOperationalRoles(tenant);
      return sendSuccess(res, list, 200, { total: list.length });
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  }

  static async upsertRole(req: Request, res: Response) {
    try {
      const tenant = CuadrillasController.getTenant(req);
      const parsed = createOperationalRoleSchema.parse(req.body);
      const item = await DictionariesService.upsertOperationalRole(tenant, parsed);
      return sendSuccess(res, item, 201, { mensaje: 'Rol operativo guardado con éxito.' });
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }

  static async updateRole(req: Request, res: Response) {
    try {
      const tenant = CuadrillasController.getTenant(req);
      const id = req.params.id as string;
      const parsed = updateOperationalRoleSchema.parse(req.body);
      const item = await DictionariesService.updateOperationalRole(id, tenant, parsed);
      if (!item) return sendError(res, 'Rol operativo no encontrado', 404);
      return sendSuccess(res, item, 200);
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }

  // --- Cuadrillas (Crews) ---
  static async getCrews(req: Request, res: Response) {
    try {
      const tenant = CuadrillasController.getTenant(req);
      const projectId = req.query.project_id as string;
      if (!projectId) return sendError(res, 'Parámetro project_id es obligatorio', 400);

      const list = await CuadrillasService.getCrewsByProject(projectId, tenant);
      return sendSuccess(res, list, 200, { total: list.length });
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  }

  static async getCrewById(req: Request, res: Response) {
    try {
      const tenant = CuadrillasController.getTenant(req);
      const id = req.params.id as string;
      const crew = await CuadrillasService.getCrewById(id, tenant);
      if (!crew) return sendError(res, 'Cuadrilla no encontrada', 404);
      return sendSuccess(res, crew, 200);
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  }

  static async createCrew(req: Request, res: Response) {
    try {
      const tenant = CuadrillasController.getTenant(req);
      const parsed = createCrewSchema.parse(req.body);
      const crew = await CuadrillasService.createCrew(tenant, parsed);
      return sendSuccess(res, crew, 201, { mensaje: 'Cuadrilla creada exitosamente.' });
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }

  static async addMember(req: Request, res: Response) {
    try {
      const crewId = req.params.id as string;
      const parsed = addMemberSchema.parse(req.body);
      const member = await CuadrillasService.addMemberToCrew(crewId, parsed);
      return sendSuccess(res, member, 201, { mensaje: 'Trabajador agregado a la cuadrilla.' });
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }

  static async removeMember(req: Request, res: Response) {
    try {
      const crewId = req.params.id as string;
      const workerRut = req.params.rut as string;
      const ok = await CuadrillasService.removeMemberFromCrew(crewId, workerRut);
      return sendSuccess(res, { removed: ok }, 200);
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  }

  static async getEligibleLeaders(req: Request, res: Response) {
    try {
      const tenant = CuadrillasController.getTenant(req);
      const projectId = req.query.project_id as string;
      if (!projectId) return sendError(res, 'Parámetro project_id es obligatorio', 400);

      const leaders = await CuadrillasService.getEligibleLeaders(tenant, projectId);
      return sendSuccess(res, leaders, 200, { total: leaders.length });
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  }

  // --- Asignación a Tareas & Reporte HH ---
  static async assignTasks(req: Request, res: Response) {
    try {
      const tenant = CuadrillasController.getTenant(req);
      const parsed = assignTasksSchema.parse(req.body);
      const result = await CuadrillasService.assignTasks(tenant, parsed);
      return sendSuccess(res, result, 201, { mensaje: `${result.inserted} asignaciones registradas.` });
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }

  static async getHoursReport(req: Request, res: Response) {
    try {
      const tenant = CuadrillasController.getTenant(req);
      const projectId = req.query.project_id as string;
      const dateFrom = req.query.date_from as string;
      const dateTo = req.query.date_to as string;

      if (!projectId) return sendError(res, 'Parámetro project_id es obligatorio', 400);

      const report = await CuadrillasService.getTaskHoursReport(tenant, projectId, dateFrom, dateTo);
      return sendSuccess(res, report, 200, { total_records: report.length });
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  }
}
