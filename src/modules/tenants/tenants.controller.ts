import { Request, Response, NextFunction } from 'express';
import { TenantsService } from './tenants.service.js';
import { onboardTenantSchema } from './tenants.schema.js';
import { sendSuccess, sendError } from '../../shared/utils/response.js';

export class TenantsController {
  /**
   * Endpoint de Onboarding: Da de alta la empresa, su faena inicial, su administrador y su canal WhatsApp
   */
  static async onboard(req: Request, res: Response, next: NextFunction) {
    try {
      const validatedInput = onboardTenantSchema.parse(req.body);
      const resultado = await TenantsService.onboardTenant(validatedInput);

      return sendSuccess(
        res,
        resultado,
        201,
        { mensaje: `Empresa '${resultado.tenant.razon_social}' dada de alta con éxito en Luke Core` }
      );
    } catch (error: any) {
      if (error.message && error.message.includes('Ya existe')) {
        return sendError(res, error.message, 409);
      }
      next(error);
    }
  }

  /**
   * Listar empresas activas (todas para super_admin, o solo la propia para admin)
   */
  static async listar(req: Request, res: Response, next: NextFunction) {
    try {
      const user = (req as any).user;
      const tenantId = user?.rol === 'super_admin' ? null : (user?.tenant_id || null);
      const tenants = await TenantsService.listarTenants(tenantId);
      return sendSuccess(res, tenants);
    } catch (error) {
      next(error);
    }
  }
}
