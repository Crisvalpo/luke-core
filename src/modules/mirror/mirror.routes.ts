import { Router } from 'express';
import { MirrorController } from './mirror.controller.js';

export const mirrorRouter = Router();

// Operational Queries for Terreno App
mirrorRouter.get('/workers', MirrorController.getWorkers);
mirrorRouter.get('/foremen', MirrorController.getForemen);

// Push Ingest from Excel VBA Macro (Piping Style)
mirrorRouter.post('/sync/workers', MirrorController.syncFromVba);

// File Import (Buk Excel .xlsx / .csv export)
mirrorRouter.post('/import/csv', MirrorController.importFile);
mirrorRouter.post('/import/excel', MirrorController.importFile);

// Background Source Sync trigger (Excel / Buk API / Mock)
mirrorRouter.post('/sync', MirrorController.triggerSync);

// Equivalences & Project Mappings (Buk Cost Center -> Dynamics Project ID)
mirrorRouter.get('/mappings', MirrorController.getMappings);
mirrorRouter.post('/mappings', MirrorController.setMapping);
