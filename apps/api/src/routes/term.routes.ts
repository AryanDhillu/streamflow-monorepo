import { Router } from 'express';
import { createTerm } from '../controllers/term.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// POST /terms -> Create a new term
router.post('/', authenticate, createTerm);

export default router;