import * as XLSX from 'xlsx';
import { query } from '../../config/database.js';
import { normalizarRut, validarRut } from '../../shared/utils/rut.js';
import { normalizarTelefonoChileno } from '../../shared/utils/phone.js';
import { IngestaResumen, IngestaFilaError } from './ingesta.types.js';

export class IngestaService {
  /**
   * Normaliza claves de un objeto plano eliminando tildes, mayúsculas y espacios
   */
  private static normalizarClave(clave: string): string {
    return clave
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '_')
      .replace(/^_+|_+$/g, '');
  }

  /**
   * Lee un archivo buffer/base64 y devuelve un array de objetos con claves normalizadas
   */
  private static parsearArchivo(base64OBuffer: string | Buffer): any[] {
    const buffer = typeof base64OBuffer === 'string'
      ? Buffer.from(base64OBuffer.replace(/^data:.*?;base64,/, ''), 'base64')
      : base64OBuffer;

    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) return [];

    const sheet = workbook.Sheets[firstSheetName];
    const rawData = XLSX.utils.sheet_to_json<Record<string, any>>(sheet);

    return rawData.map(row => {
      const normalizado: Record<string, any> = {};
      Object.keys(row).forEach(key => {
        normalizado[this.normalizarClave(key)] = row[key];
      });
      return normalizado;
    });
  }

  /**
   * Obtiene mapa de código de proyecto a UUID para un tenant
   */
  private static async obtenerMapaProyectos(tenantId: string): Promise<Map<string, string>> {
    const res = await query(`SELECT id, LOWER(codigo) AS codigo FROM core.proyectos WHERE tenant_id = $1`, [tenantId]);
    const mapa = new Map<string, string>();
    res.rows.forEach(p => mapa.set(p.codigo, p.id));
    return mapa;
  }

  /**
   * Procesa la ingesta masiva de personal
   */
  public static async procesarPersonal(
    tenantId: string,
    base64OBuffer: string | Buffer
  ): Promise<IngestaResumen> {
    const filas = this.parsearArchivo(base64OBuffer);
    const mapaProyectos = await this.obtenerMapaProyectos(tenantId);

    const resumen: IngestaResumen = {
      total_filas: filas.length,
      insertados: 0,
      actualizados: 0,
      errores: []
    };

    let filaNumero = 1;
    for (const fila of filas) {
      filaNumero++;
      const rawRut = String(fila.rut || fila.run || fila.rut_personal || '').trim();
      const nombre = String(fila.nombre_completo || fila.nombre || fila.nombres || '').trim();
      const cargo = String(fila.cargo || fila.posicion || fila.funcion || 'Operario').trim();
      const rolOrg = String(fila.rol || fila.rol_organizacional || 'operario').trim().toLowerCase();
      const rawTel = String(fila.telefono || fila.telefono_whatsapp || fila.celular || fila.whatsapp || '').trim();
      const email = String(fila.email || fila.correo || '').trim() || null;
      const turno = String(fila.turno || fila.jornada || '').trim() || null;
      const codProyecto = String(fila.codigo_proyecto || fila.proyecto || fila.faena || '').trim().toLowerCase();

      if (!rawRut) {
        resumen.errores.push({ fila: filaNumero, identificador: 'SIN RUT', error: 'El campo RUT es obligatorio' });
        continue;
      }

      const rutNormalizado = normalizarRut(rawRut);
      if (!validarRut(rutNormalizado)) {
        resumen.errores.push({ fila: filaNumero, identificador: rawRut, error: 'RUT chileno inválido (Fallo Módulo 11)' });
        continue;
      }

      if (!nombre) {
        resumen.errores.push({ fila: filaNumero, identificador: rutNormalizado, error: 'El Nombre Completo es obligatorio' });
        continue;
      }

      const telefonoNorm = rawTel ? normalizarTelefonoChileno(rawTel) : null;
      const proyectoId = codProyecto && mapaProyectos.has(codProyecto) ? mapaProyectos.get(codProyecto) : null;

      try {
        const res = await query(`
          INSERT INTO core.personal (
            tenant_id, proyecto_id, rut, nombre_completo, cargo, rol_organizacional, telefono_whatsapp, email, turno, activo
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, TRUE)
          ON CONFLICT (tenant_id, rut) DO UPDATE SET
            proyecto_id = COALESCE(EXCLUDED.proyecto_id, core.personal.proyecto_id),
            nombre_completo = EXCLUDED.nombre_completo,
            cargo = EXCLUDED.cargo,
            rol_organizacional = EXCLUDED.rol_organizacional,
            telefono_whatsapp = COALESCE(EXCLUDED.telefono_whatsapp, core.personal.telefono_whatsapp),
            email = COALESCE(EXCLUDED.email, core.personal.email),
            turno = COALESCE(EXCLUDED.turno, core.personal.turno),
            activo = TRUE,
            actualizado_en = NOW()
          RETURNING (xmax = 0) AS es_nuevo;
        `, [tenantId, proyectoId, rutNormalizado, nombre, cargo, rolOrg, telefonoNorm, email, turno]);

        if (res.rows[0]?.es_nuevo) {
          resumen.insertados++;
        } else {
          resumen.actualizados++;
        }
      } catch (err: any) {
        resumen.errores.push({ fila: filaNumero, identificador: rutNormalizado, error: err.message });
      }
    }

    return resumen;
  }

  /**
   * Procesa la ingesta masiva de flota / equipos
   */
  public static async procesarEquipos(
    tenantId: string,
    base64OBuffer: string | Buffer
  ): Promise<IngestaResumen> {
    const filas = this.parsearArchivo(base64OBuffer);
    const mapaProyectos = await this.obtenerMapaProyectos(tenantId);

    const resumen: IngestaResumen = {
      total_filas: filas.length,
      insertados: 0,
      actualizados: 0,
      errores: []
    };

    let filaNumero = 1;
    for (const fila of filas) {
      filaNumero++;
      const codigoInterno = String(fila.codigo_interno || fila.codigo || fila.patente_interna || fila.equipo || '').trim().toUpperCase();
      const patente = String(fila.patente || fila.placa || '').trim().toUpperCase() || null;
      const descripcion = String(fila.descripcion || fila.nombre || fila.tipo_equipo || '').trim();
      const categoria = String(fila.categoria || fila.tipo || 'maquinaria_pesada').trim().toLowerCase();
      let tipoMedicion = String(fila.tipo_medicion || fila.medicion || 'horometro').trim().toLowerCase();
      if (!['horometro', 'kilometraje'].includes(tipoMedicion)) {
        tipoMedicion = 'horometro';
      }
      const contadorInicial = Number(fila.contador_inicial || fila.ultimo_contador || fila.horometro || fila.kilometraje || 0);
      const codProyecto = String(fila.codigo_proyecto || fila.proyecto || fila.faena || '').trim().toLowerCase();

      if (!codigoInterno) {
        resumen.errores.push({ fila: filaNumero, identificador: 'SIN CÓDIGO', error: 'El Código Interno es obligatorio' });
        continue;
      }
      if (!descripcion) {
        resumen.errores.push({ fila: filaNumero, identificador: codigoInterno, error: 'La Descripción del equipo es obligatoria' });
        continue;
      }

      const proyectoId = codProyecto && mapaProyectos.has(codProyecto) ? mapaProyectos.get(codProyecto) : null;

      try {
        const res = await query(`
          INSERT INTO core.equipos (
            tenant_id, proyecto_id, codigo_interno, patente, descripcion, categoria, tipo_medicion, ultimo_contador, activo
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE)
          ON CONFLICT (tenant_id, codigo_interno) DO UPDATE SET
            proyecto_id = COALESCE(EXCLUDED.proyecto_id, core.equipos.proyecto_id),
            patente = COALESCE(EXCLUDED.patente, core.equipos.patente),
            descripcion = EXCLUDED.descripcion,
            categoria = EXCLUDED.categoria,
            tipo_medicion = EXCLUDED.tipo_medicion,
            ultimo_contador = GREATEST(core.equipos.ultimo_contador, EXCLUDED.ultimo_contador),
            activo = TRUE,
            actualizado_en = NOW()
          RETURNING (xmax = 0) AS es_nuevo;
        `, [tenantId, proyectoId, codigoInterno, patente, descripcion, categoria, tipoMedicion, isNaN(contadorInicial) ? 0 : contadorInicial]);

        if (res.rows[0]?.es_nuevo) {
          resumen.insertados++;
        } else {
          resumen.actualizados++;
        }
      } catch (err: any) {
        resumen.errores.push({ fila: filaNumero, identificador: codigoInterno, error: err.message });
      }
    }

    return resumen;
  }

  /**
   * Genera plantilla XLSX de ejemplo para descarga
   */
  public static generarPlantilla(tipo: 'personal' | 'equipos'): Buffer {
    const wb = XLSX.utils.book_new();
    let data: any[] = [];

    if (tipo === 'personal') {
      data = [
        {
          'RUT': '15.888.999-K',
          'Nombre Completo': 'Juan Pérez González',
          'Cargo': 'Supervisor Piping',
          'Rol': 'supervisor',
          'Telefono WhatsApp': '+56912345678',
          'Email': 'jperez@empresa.cl',
          'Turno': '7x7',
          'Codigo Proyecto': 'FAENA-01'
        },
        {
          'RUT': '18.765.432-1',
          'Nombre Completo': 'Carlos Silva M.',
          'Cargo': 'Soldador TIG Alta Presión',
          'Rol': 'operario',
          'Telefono WhatsApp': '+56987654321',
          'Email': 'csilva@empresa.cl',
          'Turno': '14x14',
          'Codigo Proyecto': 'FAENA-01'
        }
      ];
    } else {
      data = [
        {
          'Codigo Interno': 'GR-101',
          'Patente': 'GGAA10',
          'Descripcion': 'Grúa RT Grove 80 Toneladas',
          'Categoria': 'grua',
          'Tipo Medicion': 'horometro',
          'Contador Inicial': 3450.5,
          'Codigo Proyecto': 'FAENA-01'
        },
        {
          'Codigo Interno': 'CAM-05',
          'Patente': 'CJBB20',
          'Descripcion': 'Camioneta Toyota Hilux 4x4',
          'Categoria': 'camioneta',
          'Tipo Medicion': 'kilometraje',
          'Contador Inicial': 85200,
          'Codigo Proyecto': 'FAENA-01'
        }
      ];
    }

    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, tipo.toUpperCase());
    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  }
}
