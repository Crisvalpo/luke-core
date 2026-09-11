import { query } from '../../config/database.js';
import { normalizarRut } from '../../shared/utils/rut.js';
import { normalizarTelefonoChileno } from '../../shared/utils/phone.js';
import { SourceFactory } from './sources/source.factory.js';
import {
  RawWorkerData,
  RawAttendanceData,
  SyncResult,
  ProjectMapping,
  WorkerFilter
} from './mirror.types.js';

export class MirrorService {
  private static async resolveProjectId(
    costCenter: string | null | undefined,
    area: string | null | undefined,
    tenantId: string
  ): Promise<string> {
    if (!costCenter) return 'UNASSIGNED';

    const ccNorm = costCenter.trim();
    const areaNorm = area ? area.trim() : null;

    // Rule 1: Match by cost_center AND area
    if (areaNorm) {
      const matchBoth = await query(
        `SELECT project_id FROM core.mirror_project_mappings 
         WHERE tenant_id = $1 AND UPPER(cost_center) = UPPER($2) AND UPPER(area) = UPPER($3) AND is_active = TRUE LIMIT 1`,
        [tenantId, ccNorm, areaNorm]
      );
      if (matchBoth.rows[0]) return matchBoth.rows[0].project_id;
    }

    // Rule 2: Match by cost_center only
    const matchCc = await query(
      `SELECT project_id FROM core.mirror_project_mappings 
       WHERE tenant_id = $1 AND UPPER(cost_center) = UPPER($2) AND (area IS NULL OR area = '__ANY__') AND is_active = TRUE LIMIT 1`,
      [tenantId, ccNorm]
    );
    if (matchCc.rows[0]) return matchCc.rows[0].project_id;

    // Rule 3: 1:1 Fallback against official core.proyectos code
    const fallbackDirect = await query(
      `SELECT codigo FROM core.proyectos 
       WHERE tenant_id = $1 AND (UPPER(codigo) = UPPER($2) OR UPPER(centro_costo) = UPPER($2)) AND activo = TRUE LIMIT 1`,
      [tenantId, ccNorm]
    );
    if (fallbackDirect.rows[0]) return fallbackDirect.rows[0].codigo;

    return 'UNASSIGNED';
  }

  static async syncWorkers(rawList: RawWorkerData[], tenantId: string = 'default'): Promise<SyncResult> {
    const result: SyncResult = {
      source: process.env.SOURCE || 'excel',
      total_processed: rawList.length,
      inserted: 0,
      updated: 0,
      unassigned: 0,
      errors: []
    };

    for (const raw of rawList) {
      try {
        if (!raw.rut) continue;

        const rutClean = normalizarRut(raw.rut);
        const fullName = raw.full_name?.trim() || 'Sin Nombre';
        const phone = raw.phone ? normalizarTelefonoChileno(raw.phone) : null;
        const jobTitle = raw.job_title?.trim() || null;
        const area = raw.area?.trim() || null;
        const costCenter = raw.cost_center?.trim() || null;
        const rawStatus = String(raw.status || 'ACTIVE').toUpperCase().trim();
        const status = (rawStatus === 'ACTIVE' || rawStatus === 'ACTIVO' || rawStatus === 'VIGENTE') ? 'ACTIVE' : 'INACTIVE';

        const projectId = await this.resolveProjectId(costCenter, area, tenantId);
        if (projectId === 'UNASSIGNED') result.unassigned++;

        const upsertRes = await query(`
          INSERT INTO core.mirror_workers (
            tenant_id, rut, full_name, phone, job_title, area, cost_center, status, project_id, metadata, updated_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
          ON CONFLICT (tenant_id, rut) DO UPDATE SET
            full_name = EXCLUDED.full_name,
            phone = COALESCE(EXCLUDED.phone, core.mirror_workers.phone),
            job_title = COALESCE(EXCLUDED.job_title, core.mirror_workers.job_title),
            area = COALESCE(EXCLUDED.area, core.mirror_workers.area),
            cost_center = COALESCE(EXCLUDED.cost_center, core.mirror_workers.cost_center),
            status = EXCLUDED.status,
            project_id = CASE 
              WHEN EXCLUDED.project_id <> 'UNASSIGNED' THEN EXCLUDED.project_id 
              ELSE core.mirror_workers.project_id 
            END,
            metadata = core.mirror_workers.metadata || EXCLUDED.metadata,
            updated_at = NOW()
          RETURNING (xmax = 0) AS is_new;
        `, [tenantId, rutClean, fullName, phone, jobTitle, area, costCenter, status, projectId, JSON.stringify(raw.metadata || {})]);

        if (upsertRes.rows[0]?.is_new) result.inserted++;
        else result.updated++;

      } catch (err: any) {
        result.errors.push({ identifier: raw.rut, error: err.message });
      }
    }

    return result;
  }

  static async syncAttendance(rawList: RawAttendanceData[], tenantId: string = 'default'): Promise<number> {
    let saved = 0;
    for (const att of rawList) {
      if (!att.rut || !att.buk_attendance_id) continue;
      const rutClean = normalizarRut(att.rut);
      const checkDate = att.check_date || new Date().toISOString().split('T')[0];

      await query(`
        INSERT INTO core.mirror_attendance (
          tenant_id, rut, buk_attendance_id, check_date, check_in, check_out, status, metadata
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (buk_attendance_id) DO UPDATE SET
          check_out = COALESCE(EXCLUDED.check_out, core.mirror_attendance.check_out),
          status = EXCLUDED.status;
      `, [tenantId, rutClean, att.buk_attendance_id, checkDate, att.check_in || null, att.check_out || null, att.status || 'PRESENT', JSON.stringify(att.metadata || {})]);
      saved++;
    }
    return saved;
  }

  static async getWorkers(filters: WorkerFilter) {
    const tenantId = filters.tenant_id || 'default';
    let sql = `
      SELECT 
        w.id, w.tenant_id, w.rut, w.full_name, w.phone, w.job_title, w.area,
        w.cost_center, w.status, w.project_id, w.updated_at,
        CASE WHEN a.id IS NOT NULL THEN TRUE ELSE FALSE END AS available_today,
        a.check_in AS today_check_in
      FROM core.mirror_workers w
      LEFT JOIN core.mirror_attendance a ON a.rut = w.rut AND a.check_date = CURRENT_DATE
      WHERE w.tenant_id = $1
    `;
    const params: any[] = [tenantId];

    if (filters.status && filters.status !== 'ALL') {
      params.push(filters.status);
      sql += ` AND w.status = $${params.length}`;
    } else if (!filters.status) {
      sql += ` AND w.status = 'ACTIVE'`;
    }

    if (filters.project_id) {
      params.push(filters.project_id);
      sql += ` AND w.project_id = $${params.length}`;
    }

    if (filters.job_title) {
      params.push(`%${filters.job_title}%`);
      sql += ` AND UPPER(w.job_title) LIKE UPPER($${params.length})`;
    }

    if (filters.search) {
      params.push(`%${filters.search}%`);
      sql += ` AND (UPPER(w.full_name) LIKE UPPER($${params.length}) OR w.rut LIKE $${params.length})`;
    }

    if (filters.available_today) {
      sql += ` AND a.id IS NOT NULL`;
    }

    sql += ` ORDER BY w.full_name ASC LIMIT 500;`;
    const res = await query(sql, params);
    return res.rows;
  }

  static async getForemen(projectId: string, tenantId: string = 'default') {
    const sql = `
      SELECT w.*, CASE WHEN a.id IS NOT NULL THEN TRUE ELSE FALSE END AS available_today
      FROM core.mirror_workers w
      LEFT JOIN core.mirror_attendance a ON a.rut = w.rut AND a.check_date = CURRENT_DATE
      WHERE w.tenant_id = $1 AND w.project_id = $2 AND w.status = 'ACTIVE'
        AND (
          UPPER(w.job_title) LIKE '%CAPATAZ%' 
          OR UPPER(w.job_title) LIKE '%SUPERVISOR%' 
          OR UPPER(w.job_title) LIKE '%JEFE%' 
          OR UPPER(w.job_title) LIKE '%FOREMAN%'
        )
      ORDER BY w.full_name ASC;
    `;
    const res = await query(sql, [tenantId, projectId]);
    return res.rows;
  }

  static async getMappings(tenantId: string = 'default'): Promise<ProjectMapping[]> {
    const res = await query(
      `SELECT id, tenant_id, cost_center, area, project_id, is_active, created_at 
       FROM core.mirror_project_mappings WHERE tenant_id = $1 ORDER BY cost_center ASC`,
      [tenantId]
    );
    return res.rows;
  }

  static async setMapping(mapping: ProjectMapping, tenantId: string = 'default') {
    const res = await query(`
      INSERT INTO core.mirror_project_mappings (tenant_id, cost_center, area, project_id, is_active)
      VALUES ($1, $2, $3, $4, TRUE)
      ON CONFLICT (tenant_id, cost_center, (COALESCE(area, '__ANY__'))) 
      DO UPDATE SET project_id = EXCLUDED.project_id, is_active = TRUE, updated_at = NOW()
      RETURNING *;
    `, [tenantId, mapping.cost_center.trim(), mapping.area ? mapping.area.trim() : null, mapping.project_id.trim()]);
    return res.rows[0];
  }

  static async triggerSourceSync(tenantId: string = 'default'): Promise<SyncResult> {
    const source = SourceFactory.getSource();
    const workers = await source.getUpdatedWorkers(undefined, tenantId);
    const syncRes = await this.syncWorkers(workers, tenantId);

    const attendance = await source.getTodayAttendance(undefined, tenantId);
    if (attendance.length > 0) {
      await this.syncAttendance(attendance, tenantId);
    }

    return syncRes;
  }
}
