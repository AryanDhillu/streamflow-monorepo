import { Router } from 'express';
import { getPrograms, getProgram, createProgram, updateProgram, deleteProgram } from '../controllers/program.controller';
import { authenticate, requireRole } from '../middleware/auth.middleware';

const router = Router();

// PUBLIC or VIEWER Routes (Read Only)
// If you want even Viewers to login, add `authenticate` here too.
router.get('/', authenticate, getPrograms); 
router.get('/:id', authenticate, getProgram);

// EDITOR / ADMIN Routes (Write Access)
router.post('/', authenticate, requireRole(['ADMIN', 'EDITOR']), createProgram);
router.put('/:id', authenticate, requireRole(['ADMIN', 'EDITOR']), updateProgram);

// ADMIN ONLY (Delete)
router.delete('/:id', authenticate, requireRole(['ADMIN']), deleteProgram);

export default router;