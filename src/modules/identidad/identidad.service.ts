import { query } from '../../config/database.js';
import { normalizarTelefonoChileno } from '../../shared/utils/phone.js';

export interface IdentidadUsuarioResult {
  encontrado: boolean;
  personal_id?: string;
  rut?: string;
  nombre_completo?: string;
  cargo?: string;
  rol_organizacional?: string;
  telefono_whatsapp?: string;
  turno?: string;
  tenant_id?: string;
  tenant_slug?: string;
  tenant_razon_social?: string;
  proyecto_id?: string;
  proyecto_codigo?: string;
  proyecto_nombre?: string;
  proyecto_centro_costo?: string;
  frentes_disponibles?: Array<{
    id: string;
    codigo: string;
    nombre: string;
    disciplina: string;
  }>;
}

export class IdentidadService {
  /**
   * Resuelve el contexto completo de un usuario a partir de su número de WhatsApp
   */
  static async resolverPorWhatsApp(telefono: string): Promise<IdentidadUsuarioResult> {
    const telefonoNormalizado = normalizarTelefonoChileno(telefono);
    if (!telefonoNormalizado) {
      return { encontrado: false };
    }

    const res = await query<IdentidadUsuarioResult>(
      'SELECT * FROM core.resolver_identidad_whatsapp($1)',
      [telefonoNormalizado]
    );

    if (res.rows.length === 0 || !res.rows[0].encontrado) {
      return { encontrado: false };
    }

    return res.rows[0];
  }

  /**
   * Obtiene o crea la sesión de canal conversacional para el bot
   */
  static async obtenerOCrearSesionCanal(
    tenantId: string,
    canal: 'whatsapp' | 'telegram' | 'web',
    identificadorRemoto: string,
    personalId?: string,
    proyectoId?: string
  ) {
    const res = await query(
      `
      INSERT INTO core.sesiones_canal (
        tenant_id, canal, identificador_remoto, personal_id, proyecto_id, ultimo_mensaje_at
      )
      VALUES ($1, $2, $3, $4, $5, NOW())
      ON CONFLICT (tenant_id, canal, identificador_remoto) 
      DO UPDATE SET 
        ultimo_mensaje_at = NOW(),
        personal_id = COALESCE(EXCLUDED.personal_id, core.sesiones_canal.personal_id),
        proyecto_id = COALESCE(EXCLUDED.proyecto_id, core.sesiones_canal.proyecto_id)
      RETURNING *;
      `,
      [tenantId, canal, identificadorRemoto, personalId || null, proyectoId || null]
    );
    return res.rows[0];
  }
}
