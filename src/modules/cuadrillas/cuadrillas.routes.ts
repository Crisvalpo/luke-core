import { Router } from 'express';
import { CuadrillasController } from './cuadrillas.controller.js';

const router = Router();

// Diccionarios de Empresa
router.get('/specialties', CuadrillasController.getSpecialties);
router.post('/specialties', CuadrillasController.upsertSpecialty);
router.patch('/specialties/:id', CuadrillasController.updateSpecialty);

router.get('/roles', CuadrillasController.getRoles);
router.post('/roles', CuadrillasController.upsertRole);
router.patch('/roles/:id', CuadrillasController.updateRole);

// Cuadrillas
router.get('/', CuadrillasController.getCrews);
router.post('/', CuadrillasController.createCrew);
router.get('/eligible-leaders', CuadrillasController.getEligibleLeaders);
router.get('/:id', CuadrillasController.getCrewById);

// Miembros de Cuadrilla
router.post('/:id/members', CuadrillasController.addMember);
router.delete('/:id/members/:rut', CuadrillasController.removeMember);

// Asignación Granular a Tareas y Reporte HH
router.post('/tasks/assign', CuadrillasController.assignTasks);
router.get('/tasks/hours-report', CuadrillasController.getHoursReport);

export default router;
