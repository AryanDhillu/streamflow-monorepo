import { Router } from 'express';
import { login, registerAdmin } from '../controllers/auth.controller';

const router = Router();

router.post('/login', login);
router.post('/register-admin', registerAdmin); // Dev helper

export default router;