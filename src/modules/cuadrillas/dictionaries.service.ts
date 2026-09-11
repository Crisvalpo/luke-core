import { query } from '../../config/database.js';
import { CompanySpecialty, CompanyOperationalRole } from './cuadrillas.types.js';

export class DictionariesService {
  static async resolveTenantId(rawTenant: string): Promise<string> {
    if (!rawTenant || rawTenant === 'default') {
      const res = await query(`SELECT id FROM core.tenants ORDER BY created_at ASC LIMIT 1`);
      return res.rows[0]?.id;
    }
    const res = await query(
      `SELECT id FROM core.tenants WHERE id::text = $1 OR slug = $1 OR tax_id = $1 LIMIT 1`,
      [rawTenant]
    );
    return res.rows[0]?.id || rawTenant;
  }

  static async getSpecialties(rawTenant: string): Promise<CompanySpecialty[]> {
    const tenantId = await this.resolveTenantId(rawTenant);
    // Asegurar que existan las 17 semillas si es primera vez
    await query(`SELECT core.seed_tenant_default_dictionaries($1)`, [tenantId]);
    const res = await query(
      `SELECT id, tenant_id, code, name, description, is_active, created_at, updated_at
       FROM core.company_specialties
       WHERE tenant_id = $1
       ORDER BY code ASC`,
      [tenantId]
    );
    return res.rows;
  }

  static async upsertSpecialty(rawTenant: string, data: { code: string; name: string; description?: string }): Promise<CompanySpecialty> {
    const tenantId = await this.resolveTenantId(rawTenant);
    const res = await query(
      `INSERT INTO core.company_specialties (tenant_id, code, name, description, updated_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (tenant_id, code) DO UPDATE
       SET name = EXCLUDED.name, description = COALESCE(EXCLUDED.description, core.company_specialties.description), updated_at = NOW()
       RETURNING *`,
      [tenantId, data.code.trim(), data.name.trim(), data.description || null]
    );
    return res.rows[0];
  }

  static async updateSpecialty(id: string, rawTenant: string, data: Partial<CompanySpecialty>): Promise<CompanySpecialty | null> {
    const tenantId = await this.resolveTenantId(rawTenant);
    const fields: string[] = [];
    const values: any[] = [id, tenantId];
    let idx = 3;

    if (data.name !== undefined) { fields.push(`name = $${idx++}`); values.push(data.name.trim()); }
    if (data.description !== undefined) { fields.push(`description = $${idx++}`); values.push(data.description); }
    if (data.is_active !== undefined) { fields.push(`is_active = $${idx++}`); values.push(data.is_active); }

    if (fields.length === 0) return null;
    fields.push(`updated_at = NOW()`);

    const res = await query(
      `UPDATE core.company_specialties SET ${fields.join(', ')} WHERE id = $1 AND tenant_id = $2 RETURNING *`,
      values
    );
    return res.rows[0] || null;
  }

  static async getOperationalRoles(rawTenant: string): Promise<CompanyOperationalRole[]> {
    const tenantId = await this.resolveTenantId(rawTenant);
    await query(`SELECT core.seed_tenant_default_dictionaries($1)`, [tenantId]);
    const res = await query(
      `SELECT id, tenant_id, code, name, can_lead_crew, is_active, created_at, updated_at
       FROM core.company_operational_roles
       WHERE tenant_id = $1
       ORDER BY code ASC`,
      [tenantId]
    );
    return res.rows;
  }

  static async upsertOperationalRole(rawTenant: string, data: { code: string; name: string; can_lead_crew?: boolean }): Promise<CompanyOperationalRole> {
    const tenantId = await this.resolveTenantId(rawTenant);
    const res = await query(
      `INSERT INTO core.company_operational_roles (tenant_id, code, name, can_lead_crew, updated_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (tenant_id, code) DO UPDATE
       SET name = EXCLUDED.name, can_lead_crew = EXCLUDED.can_lead_crew, updated_at = NOW()
       RETURNING *`,
      [tenantId, data.code.trim(), data.name.trim(), data.can_lead_crew ?? false]
    );
    return res.rows[0];
  }

  static async updateOperationalRole(id: string, rawTenant: string, data: Partial<CompanyOperationalRole>): Promise<CompanyOperationalRole | null> {
    const tenantId = await this.resolveTenantId(rawTenant);
    const fields: string[] = [];
    const values: any[] = [id, tenantId];
    let idx = 3;

    if (data.name !== undefined) { fields.push(`name = $${idx++}`); values.push(data.name.trim()); }
    if (data.can_lead_crew !== undefined) { fields.push(`can_lead_crew = $${idx++}`); values.push(data.can_lead_crew); }
    if (data.is_active !== undefined) { fields.push(`is_active = $${idx++}`); values.push(data.is_active); }

    if (fields.length === 0) return null;
    fields.push(`updated_at = NOW()`);

    const res = await query(
      `UPDATE core.company_operational_roles SET ${fields.join(', ')} WHERE id = $1 AND tenant_id = $2 RETURNING *`,
      values
    );
    return res.rows[0] || null;
  }
}
