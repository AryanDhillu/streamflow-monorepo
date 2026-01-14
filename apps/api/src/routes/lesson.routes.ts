// apps/api/src/routes/lesson.routes.ts

import { Router } from 'express';
import { 
  createLesson, 
  getLesson, 
  updateLesson, 
  deleteLesson 
} from '../controllers/lesson.controller';
import { authenticate, requireRole } from '../middleware/auth.middleware';

const router = Router();

// --- READ ACCESS (All Logged In Users) ---
router.get('/:id', authenticate, getLesson);

// --- WRITE ACCESS (Editors & Admins) ---
router.post('/', authenticate, requireRole(['ADMIN', 'EDITOR']), createLesson);
router.put('/:id', authenticate, requireRole(['ADMIN', 'EDITOR']), updateLesson);

// --- DELETE ACCESS (Admins Only) ---
router.delete('/:id', authenticate, requireRole(['ADMIN']), deleteLesson);

export default router;