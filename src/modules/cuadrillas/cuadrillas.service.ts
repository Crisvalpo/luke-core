import { query } from '../../config/database.js';
import { DictionariesService } from './dictionaries.service.js';
import { normalizarRut } from '../../shared/utils/rut.js';
import { Crew, CrewMember, CrewTaskAssignment, TaskHoursSummary } from './cuadrillas.types.js';

export class CuadrillasService {
  private static async resolveProjectId(rawProject: string, tenantId: string): Promise<string> {
    const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(rawProject);
    if (isUuid) return rawProject;

    const res = await query(
      `SELECT id FROM core.projects WHERE tenant_id = $1 AND UPPER(code) = UPPER($2) LIMIT 1`,
      [tenantId, rawProject.trim()]
    );
    return res.rows[0]?.id || rawProject;
  }

  static async getCrewsByProject(rawProject: string, rawTenant: string): Promise<Crew[]> {
    const tenantId = await DictionariesService.resolveTenantId(rawTenant);
    const projectId = await this.resolveProjectId(rawProject, tenantId);

    const crewsRes = await query(
      `SELECT c.id, c.tenant_id, c.project_id, c.specialty_id, s.name as specialty_name,
              c.name, c.leader_rut, c.leader_name, c.is_active, c.created_at, c.updated_at,
              COUNT(m.id)::int as members_count
       FROM core.crews c
       LEFT JOIN core.company_specialties s ON c.specialty_id = s.id
       LEFT JOIN core.crew_members m ON c.id = m.crew_id AND m.is_active = TRUE
       WHERE c.tenant_id = $1 AND c.project_id = $2
       GROUP BY c.id, s.name
       ORDER BY c.created_at DESC`,
      [tenantId, projectId]
    );
    return crewsRes.rows;
  }

  static async getCrewById(crewId: string, rawTenant: string): Promise<Crew | null> {
    const tenantId = await DictionariesService.resolveTenantId(rawTenant);
    const crewRes = await query(
      `SELECT c.*, s.name as specialty_name
       FROM core.crews c
       LEFT JOIN core.company_specialties s ON c.specialty_id = s.id
       WHERE c.id = $1 AND c.tenant_id = $2`,
      [crewId, tenantId]
    );
    if (!crewRes.rows[0]) return null;
    const crew = crewRes.rows[0];

    const membersRes = await query(
      `SELECT m.id, m.crew_id, m.worker_rut, m.worker_name, m.role_id, r.name as role_name, m.is_active, m.joined_at
       FROM core.crew_members m
       LEFT JOIN core.company_operational_roles r ON m.role_id = r.id
       WHERE m.crew_id = $1 AND m.is_active = TRUE
       ORDER BY m.worker_name ASC`,
      [crewId]
    );
    crew.members = membersRes.rows;
    return crew;
  }

  static async createCrew(rawTenant: string, data: {
    project_id: string; specialty_id?: string | null; name: string; leader_rut: string; leader_name?: string | null;
  }): Promise<Crew> {
    const tenantId = await DictionariesService.resolveTenantId(rawTenant);
    const projectId = await this.resolveProjectId(data.project_id, tenantId);
    const leaderRut = normalizarRut(data.leader_rut);

    const res = await query(
      `INSERT INTO core.crews (tenant_id, project_id, specialty_id, name, leader_rut, leader_name, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       RETURNING *`,
      [tenantId, projectId, data.specialty_id || null, data.name.trim(), leaderRut, data.leader_name || null]
    );
    return res.rows[0];
  }

  static async addMemberToCrew(crewId: string, memberData: {
    worker_rut: string; worker_name?: string | null; role_id?: string | null;
  }): Promise<CrewMember> {
    const rut = normalizarRut(memberData.worker_rut);
    const res = await query(
      `INSERT INTO core.crew_members (crew_id, worker_rut, worker_name, role_id, is_active, updated_at)
       VALUES ($1, $2, $3, $4, TRUE, NOW())
       ON CONFLICT (crew_id, worker_rut) DO UPDATE
       SET worker_name = EXCLUDED.worker_name, role_id = EXCLUDED.role_id, is_active = TRUE
       RETURNING *`,
      [crewId, rut, memberData.worker_name || null, memberData.role_id || null]
    );
    return res.rows[0];
  }

  static async removeMemberFromCrew(crewId: string, workerRut: string): Promise<boolean> {
    const rut = normalizarRut(workerRut);
    const res = await query(
      `UPDATE core.crew_members SET is_active = FALSE WHERE crew_id = $1 AND worker_rut = $2`,
      [crewId, rut]
    );
    return (res.rowCount || 0) > 0;
  }

  static async getEligibleLeaders(rawTenant: string, rawProject: string): Promise<any[]> {
    const tenantId = await DictionariesService.resolveTenantId(rawTenant);
    const projectId = await this.resolveProjectId(rawProject, tenantId);

    // Trabajadores con rol de Capataz o Maestro en mirror_workers
    const res = await query(
      `SELECT rut, full_name, job_title, area
       FROM core.mirror_workers
       WHERE (tenant_id = $1 OR tenant_id = 'default')
         AND (project_id = $2 OR project_id = $3)
         AND (
           UPPER(job_title) LIKE '%CAPATAZ%' OR
           UPPER(job_title) LIKE '%MAESTRO%' OR
           UPPER(job_title) LIKE '%SUPERVISOR%'
         )
         AND status = 'ACTIVE'
       ORDER BY full_name ASC`,
      [tenantId, projectId, rawProject]
    );
    return res.rows;
  }

  static async assignTasks(rawTenant: string, payload: {
    crew_id: string; project_id: string; assignment_date: string;
    assignments: Array<{
      task_code: string; task_name: string; worker_rut: string; worker_name?: string | null;
      hours_allocated: number; hours_real: number; unit_progress?: number; notes?: string | null;
    }>
  }): Promise<{ inserted: number }> {
    const tenantId = await DictionariesService.resolveTenantId(rawTenant);
    const projectId = await this.resolveProjectId(payload.project_id, tenantId);

    let count = 0;
    for (const item of payload.assignments) {
      const rut = normalizarRut(item.worker_rut);
      await query(
        `INSERT INTO core.crew_task_assignments (
          tenant_id, crew_id, project_id, assignment_date,
          task_code, task_name, worker_rut, worker_name,
          hours_allocated, hours_real, unit_progress, notes, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())`,
        [
          tenantId, payload.crew_id, projectId, payload.assignment_date,
          item.task_code.trim(), item.task_name.trim(), rut, item.worker_name || null,
          item.hours_allocated, item.hours_real, item.unit_progress || 0, item.notes || null
        ]
      );
      count++;
    }
    return { inserted: count };
  }

  static async getTaskHoursReport(rawTenant: string, rawProject: string, dateFrom?: string, dateTo?: string): Promise<TaskHoursSummary[]> {
    const tenantId = await DictionariesService.resolveTenantId(rawTenant);
    const projectId = await this.resolveProjectId(rawProject, tenantId);

    let dateClause = '';
    const params: any[] = [tenantId, projectId];

    if (dateFrom && dateTo) {
      dateClause = 'AND assignment_date BETWEEN $3 AND $4';
      params.push(dateFrom, dateTo);
    } else if (dateFrom) {
      dateClause = 'AND assignment_date = $3';
      params.push(dateFrom);
    }

    const res = await query(
      `SELECT task_code, task_name, assignment_date,
              COUNT(DISTINCT worker_rut)::int as workers_count,
              SUM(hours_allocated)::numeric as total_hours_allocated,
              SUM(hours_real)::numeric as total_hours_real,
              SUM(unit_progress)::numeric as total_unit_progress
       FROM core.crew_task_assignments
       WHERE tenant_id = $1 AND project_id = $2 ${dateClause}
       GROUP BY task_code, task_name, assignment_date
       ORDER BY assignment_date DESC, task_code ASC`,
      params
    );
    return res.rows;
  }
}
