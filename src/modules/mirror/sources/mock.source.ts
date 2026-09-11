import { HRSource, RawWorkerData, RawAttendanceData } from '../mirror.types.js';

export class MockSource implements HRSource {
  public readonly sourceName = 'mock';

  async getUpdatedWorkers(_since?: Date, _tenantId?: string): Promise<RawWorkerData[]> {
    return [
      {
        rut: '168901234',
        full_name: 'Carlos Mendoza Silva',
        phone: '+56987654321',
        job_title: 'Capataz Piping',
        area: 'Montaje Industrial',
        cost_center: 'CC-8104',
        status: 'ACTIVE'
      },
      {
        rut: '15432198K',
        full_name: 'Esteban Paredes Ruiz',
        phone: '+56991122334',
        job_title: 'Soldador TIG 6G',
        area: 'Talleres Centrales',
        cost_center: 'CC-8104',
        status: 'ACTIVE'
      },
      {
        rut: '123456785',
        full_name: 'Roberto Gomez Bolaños',
        phone: '+56977889900',
        job_title: 'Supervisor General',
        area: 'Oficina Tecnica',
        cost_center: 'CC-9000',
        status: 'ACTIVE'
      },
      {
        rut: '178904561',
        full_name: 'Jorge Valdivia Toro',
        phone: '+56966554433',
        job_title: 'Rigger Alta Montaña',
        area: 'Operaciones Mina',
        cost_center: 'CC-8104',
        status: 'INACTIVE'
      }
    ];
  }

  async getTodayAttendance(_date?: string, _tenantId?: string): Promise<RawAttendanceData[]> {
    const today = new Date().toISOString().split('T')[0];
    return [
      {
        rut: '168901234',
        buk_attendance_id: `MOCK-${today}-168901234`,
        check_date: today,
        check_in: `${today}T07:45:00Z`,
        check_out: null,
        status: 'PRESENT'
      },
      {
        rut: '15432198K',
        buk_attendance_id: `MOCK-${today}-15432198K`,
        check_date: today,
        check_in: `${today}T08:02:10Z`,
        check_out: null,
        status: 'PRESENT'
      }
    ];
  }

  async importFromBuffer(buffer: Buffer, tenantId?: string): Promise<RawWorkerData[]> {
    return this.getUpdatedWorkers(undefined, tenantId);
  }
}
