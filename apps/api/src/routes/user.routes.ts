import { Router } from 'express';
import * as userController from '../controllers/user.controller';
import { authenticate, requireRole } from '../middleware/auth.middleware';

const router = Router();

// SECURITY: Apply checks to ALL routes in this file
router.use(authenticate);
router.use(requireRole(['ADMIN'])); 

// Routes
router.get('/', userController.getAllUsers);
router.post('/', userController.createUser);
router.delete('/:id', userController.deleteUser);

export default router;