import AdmZip from 'adm-zip';
import fs from 'fs';
import path from 'path';
import { query } from '../../config/database.js';

export class PlantillaService {
  private static readonly RUTA_PLANTILLA_PIPING = path.resolve('public/templates/LukeAPP_Piping.xlsm');

  /**
   * Genera una copia personalizada de la plantilla LukeAPP Piping
   * inyectando los datos del proyecto seleccionado en la hoja _SISTEMA.
   */
  static async generarPlantillaPiping(proyectoId: string, tenantId: string, user?: any) {
    if (!fs.existsSync(this.RUTA_PLANTILLA_PIPING)) {
      throw new Error('La plantilla maestra LukeAPP_Piping.xlsm no se encuentra en el servidor.');
    }

    // 1. Obtener datos del proyecto
    const proyRes = await query(`
      SELECT p.id, p.codigo, p.nombre, p.estado, p.centro_costo, p.tenant_id, t.slug as tenant_slug
      FROM core.proyectos p
      JOIN core.tenants t ON t.id = p.tenant_id
      WHERE p.id = $1 AND p.tenant_id = $2 AND p.activo = TRUE
      LIMIT 1;
    `, [proyectoId, tenantId]);

    if (proyRes.rows.length === 0) {
      throw new Error('El proyecto solicitado no existe o no pertenece a tu empresa.');
    }

    const proyecto = proyRes.rows[0];

    // 2. Obtener datos del personal si están disponibles
    let personalId = '';
    let usuarioWindows = '';

    if (user?.email) {
      const perRes = await query(`
        SELECT id, usuario_windows 
        FROM core.personal 
        WHERE LOWER(email) = LOWER($1) AND tenant_id = $2
        LIMIT 1;
      `, [user.email, tenantId]);

      if (perRes.rows.length > 0) {
        personalId = perRes.rows[0].id || '';
        usuarioWindows = perRes.rows[0].usuario_windows || '';
      }
    }

    // 3. Abrir plantilla con AdmZip
    const zip = new AdmZip(this.RUTA_PLANTILLA_PIPING);
    let sheet1Xml = zip.readAsText('xl/worksheets/sheet1.xml');

    const escapeXml = (str: string) => (str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');

    const fechaNow = new Date().toISOString().replace('T', ' ').substring(0, 19);

    // 4. Construir fila 2 de tbl_sistema
    const fila2Xml = [
      `<row r="2" spans="1:9" x14ac:dyDescent="0.3">`,
      `<c r="A2" t="inlineStr"><is><t>${escapeXml(personalId)}</t></is></c>`,
      `<c r="B2" t="inlineStr"><is><t>${escapeXml(usuarioWindows)}</t></is></c>`,
      `<c r="C2" t="inlineStr"><is><t>${escapeXml(proyecto.id)}</t></is></c>`,
      `<c r="D2" t="inlineStr"><is><t>${escapeXml(proyecto.codigo)}</t></is></c>`,
      `<c r="E2" t="inlineStr"><is><t>${escapeXml(proyecto.nombre)}</t></is></c>`,
      `<c r="F2" t="inlineStr"><is><t>${escapeXml((proyecto.estado || 'ACTIVO').toUpperCase())}</t></is></c>`,
      `<c r="G2" t="inlineStr"><is><t>${escapeXml(proyecto.centro_costo || 'N/A')}</t></is></c>`,
      `<c r="H2" t="inlineStr"><is><t>${fechaNow}</t></is></c>`,
      `<c r="I2" t="inlineStr"><is><t>1.0</t></is></c>`,
      `</row>`
    ].join('');

    const regexFila2 = /<row r="2"[^>]*>[\s\S]*?<\/row>/;
    if (regexFila2.test(sheet1Xml)) {
      sheet1Xml = sheet1Xml.replace(regexFila2, fila2Xml);
      zip.updateFile('xl/worksheets/sheet1.xml', Buffer.from(sheet1Xml, 'utf-8'));
    }

    const buffer = zip.toBuffer();
    const filename = `LukeAPP_Piping_${proyecto.codigo}.xlsm`;

    return {
      filename,
      buffer,
      proyecto
    };
  }
}
