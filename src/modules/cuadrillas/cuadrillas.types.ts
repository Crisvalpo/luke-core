export interface CompanySpecialty {
  id: string;
  tenant_id: string;
  code: string;
  name: string;
  description?: string | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface CompanyOperationalRole {
  id: string;
  tenant_id: string;
  code: string;
  name: string;
  can_lead_crew: boolean;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Crew {
  id: string;
  tenant_id: string;
  project_id: string;
  specialty_id?: string | null;
  specialty_name?: string;
  name: string;
  leader_rut: string;
  leader_name?: string | null;
  is_active: boolean;
  members_count?: number;
  members?: CrewMember[];
  created_at?: string;
  updated_at?: string;
}

export interface CrewMember {
  id: string;
  crew_id: string;
  worker_rut: string;
  worker_name?: string | null;
  role_id?: string | null;
  role_name?: string | null;
  is_active: boolean;
  joined_at?: string;
}

export interface CrewTaskAssignment {
  id: string;
  tenant_id: string;
  crew_id: string;
  project_id: string;
  assignment_date: string;
  task_code: string;
  task_name: string;
  worker_rut: string;
  worker_name?: string | null;
  hours_allocated: number;
  hours_real: number;
  unit_progress?: number;
  notes?: string | null;
  created_at?: string;
}

export interface TaskHoursSummary {
  task_code: string;
  task_name: string;
  assignment_date: string;
  workers_count: number;
  total_hours_allocated: number;
  total_hours_real: number;
  total_unit_progress: number;
}
