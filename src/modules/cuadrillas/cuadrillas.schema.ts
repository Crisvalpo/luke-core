import { z } from 'zod';

export const createSpecialtySchema = z.object({
  code: z.string().min(1).max(10),
  name: z.string().min(2).max(100),
  description: z.string().optional()
});

export const updateSpecialtySchema = z.object({
  name: z.string().min(2).max(100).optional(),
  description: z.string().optional(),
  is_active: z.boolean().optional()
});

export const createOperationalRoleSchema = z.object({
  code: z.string().min(1).max(10),
  name: z.string().min(2).max(100),
  can_lead_crew: z.boolean().default(false)
});

export const updateOperationalRoleSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  can_lead_crew: z.boolean().optional(),
  is_active: z.boolean().optional()
});

export const createCrewSchema = z.object({
  project_id: z.string().uuid().or(z.string().min(1)),
  specialty_id: z.string().uuid().optional().nullable(),
  name: z.string().min(2).max(100),
  leader_rut: z.string().min(3).max(20),
  leader_name: z.string().optional().nullable()
});

export const updateCrewSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  specialty_id: z.string().uuid().optional().nullable(),
  leader_rut: z.string().min(3).max(20).optional(),
  leader_name: z.string().optional().nullable(),
  is_active: z.boolean().optional()
});

export const addMemberSchema = z.object({
  worker_rut: z.string().min(3).max(20),
  worker_name: z.string().optional().nullable(),
  role_id: z.string().uuid().optional().nullable()
});

export const assignTasksSchema = z.object({
  crew_id: z.string().uuid(),
  project_id: z.string().uuid().or(z.string().min(1)),
  assignment_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato YYYY-MM-DD requerido'),
  assignments: z.array(
    z.object({
      task_code: z.string().min(1).max(50),
      task_name: z.string().min(1).max(200),
      worker_rut: z.string().min(3).max(20),
      worker_name: z.string().optional().nullable(),
      hours_allocated: z.number().min(0).max(24).default(8.0),
      hours_real: z.number().min(0).max(24).default(8.0),
      unit_progress: z.number().min(0).optional().default(0),
      notes: z.string().optional().nullable()
    })
  ).min(1, 'Debe incluir al menos una asignación de tarea')
});
