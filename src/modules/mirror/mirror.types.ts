export interface RawWorkerData {
  rut: string;
  full_name: string;
  phone?: string | null;
  job_title?: string | null;
  area?: string | null;
  cost_center?: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  project_id?: string | null;
  metadata?: Record<string, any>;
}

export interface RawAttendanceData {
  rut: string;
  buk_attendance_id: string;
  check_date?: string;
  check_in?: string | null;
  check_out?: string | null;
  status?: string;
  metadata?: Record<string, any>;
}

export interface SyncResult {
  source: string;
  total_processed: number;
  inserted: number;
  updated: number;
  unassigned: number;
  errors: Array<{ identifier: string; error: string }>;
}

export interface ProjectMapping {
  id?: string;
  tenant_id?: string;
  cost_center: string;
  area?: string | null;
  project_id: string;
  is_active?: boolean;
}

export interface WorkerFilter {
  tenant_id?: string;
  project_id?: string;
  available_today?: boolean;
  job_title?: string;
  search?: string;
  status?: 'ACTIVE' | 'INACTIVE' | 'ALL';
}

export interface VbaSyncPayload {
  tenant_id?: string;
  workers: RawWorkerData[];
  created_by?: string;
}

/**
 * Common Adapter Interface for HR Data Sources
 * (ExcelSource, BukSource, MockSource)
 */
export interface HRSource {
  readonly sourceName: string;
  getUpdatedWorkers(since?: Date, tenantId?: string): Promise<RawWorkerData[]>;
  getTodayAttendance(date?: string, tenantId?: string): Promise<RawAttendanceData[]>;
  parseBuffer?(buffer: Buffer, tenantId?: string): RawWorkerData[];
}
