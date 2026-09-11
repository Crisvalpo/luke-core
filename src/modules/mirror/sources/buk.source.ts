import { HRSource, RawWorkerData, RawAttendanceData } from '../mirror.types.js';

export class BukSource implements HRSource {
  public readonly sourceName = 'buk';
  private baseUrl: string;
  private apiKey: string;

  constructor() {
    const tenant = process.env.BUK_TENANT || 'demo';
    this.baseUrl = process.env.BUK_BASE_URL || `https://${tenant}.buk.cl/api/v1/chile`;
    this.apiKey = process.env.BUK_API_KEY || '';
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async getUpdatedWorkers(since?: Date, _tenantId?: string): Promise<RawWorkerData[]> {
    if (!this.apiKey) {
      console.warn('⚠️ [BukSource] BUK_API_KEY no está configurada. Operando en modo stand-by.');
      return [];
    }

    const workers: RawWorkerData[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore && page <= 50) {
      try {
        const url = new URL(`${this.baseUrl}/employees`);
        url.searchParams.set('page', String(page));
        if (since) {
          url.searchParams.set('updated_since', since.toISOString().split('T')[0]);
        }

        const response = await fetch(url.toString(), {
          headers: {
            'auth_token': this.apiKey,
            'Accept': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error(`Buk API respondió con HTTP ${response.status}: ${response.statusText}`);
        }

        const json = await response.json() as any;
        const items = json.data || json.employees || [];

        if (items.length === 0) {
          hasMore = false;
          break;
        }

        for (const emp of items) {
          const rawRut = emp.rut || emp.dni || '';
          if (!rawRut) continue;

          const currentJob = emp.current_job || {};
          const rawStatus = String(emp.status || 'active').toLowerCase();

          workers.push({
            rut: rawRut,
            full_name: emp.full_name || `${emp.first_name || ''} ${emp.surname || ''}`.trim(),
            phone: emp.phone || null,
            job_title: currentJob.role || currentJob.title || null,
            area: currentJob.area_name || currentJob.area || null,
            cost_center: currentJob.cost_center || null,
            status: rawStatus === 'active' ? 'ACTIVE' : 'INACTIVE',
            metadata: {
              buk_id: emp.id,
              current_job: currentJob
            }
          });
        }

        page++;
        // Rate limiting: 500ms delay between pages as required
        await this.sleep(500);

      } catch (err: any) {
        console.error(`❌ [BukSource] Error en página ${page}:`, err.message);
        break;
      }
    }

    return workers;
  }

  async getTodayAttendance(_date?: string, _tenantId?: string): Promise<RawAttendanceData[]> {
    if (!this.apiKey) return [];
    // Módulo de Asistencia de Buk (Swagger independiente a coordinar con SAC)
    return [];
  }
}
