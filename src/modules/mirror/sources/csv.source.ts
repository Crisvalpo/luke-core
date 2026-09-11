import * as XLSX from 'xlsx';
import { HRSource, RawWorkerData, RawAttendanceData } from '../mirror.types.js';

export class CSVSource implements HRSource {
  public readonly sourceName = 'csv';
  private cachedWorkers: RawWorkerData[] = [];

  private normalizeKey(key: string): string {
    return key
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '_')
      .replace(/^_+|_+$/g, '');
  }

  public parseBuffer(buffer: Buffer): RawWorkerData[] {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) return [];

    const sheet = workbook.Sheets[firstSheetName];
    const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet);

    const workers: RawWorkerData[] = [];

    for (const row of rawRows) {
      const normalizedRow: Record<string, any> = {};
      Object.keys(row).forEach(k => {
        normalizedRow[this.normalizeKey(k)] = row[k];
      });

      const rawRut = String(normalizedRow.rut || normalizedRow.run || normalizedRow.dni || '').trim();
      if (!rawRut) continue;

      let fullName = String(normalizedRow.full_name || normalizedRow.nombre_completo || '').trim();
      if (!fullName) {
        const firstName = String(normalizedRow.first_name || normalizedRow.nombres || '').trim();
        const surname = String(normalizedRow.surname || normalizedRow.apellidos || '').trim();
        fullName = `${firstName} ${surname}`.trim();
      }

      const rawStatus = String(normalizedRow.status || normalizedRow.estado || 'active').trim().toLowerCase();
      const status: 'ACTIVE' | 'INACTIVE' = (rawStatus === 'active' || rawStatus === 'activo' || rawStatus === 'vigente')
        ? 'ACTIVE'
        : 'INACTIVE';

      workers.push({
        rut: rawRut,
        full_name: fullName || 'Sin Nombre',
        phone: String(normalizedRow.phone || normalizedRow.telefono || normalizedRow.celular || '').trim() || null,
        job_title: String(normalizedRow.role || normalizedRow.job_title || normalizedRow.cargo || '').trim() || null,
        area: String(normalizedRow.area || normalizedRow.departamento || '').trim() || null,
        cost_center: String(normalizedRow.cost_center || normalizedRow.centro_costo || normalizedRow.cc || '').trim() || null,
        status,
        metadata: {
          original_row: normalizedRow
        }
      });
    }

    this.cachedWorkers = workers;
    return workers;
  }

  async getUpdatedWorkers(_since?: Date, _tenantId?: string): Promise<RawWorkerData[]> {
    return this.cachedWorkers;
  }

  async getTodayAttendance(_date?: string, _tenantId?: string): Promise<RawAttendanceData[]> {
    return [];
  }

  async importFromBuffer(buffer: Buffer, _tenantId?: string): Promise<RawWorkerData[]> {
    return this.parseBuffer(buffer);
  }
}
