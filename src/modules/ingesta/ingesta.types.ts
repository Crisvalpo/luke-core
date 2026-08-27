export interface PersonalIngestaRow {
  rut: string;
  nombre_completo: string;
  cargo: string;
  rol_organizacional?: string;
  telefono_whatsapp?: string;
  email?: string;
  turno?: string;
  codigo_proyecto?: string;
}

export interface EquipoIngestaRow {
  codigo_interno: string;
  patente?: string;
  descripcion: string;
  categoria?: string;
  tipo_medicion: 'horometro' | 'kilometraje';
  contador_inicial?: number;
  codigo_proyecto?: string;
}

export interface IngestaFilaError {
  fila: number;
  identificador: string;
  error: string;
}

export interface IngestaResumen {
  total_filas: number;
  insertados: number;
  actualizados: number;
  errores: IngestaFilaError[];
}
