import { Router } from 'express';
import * as catalogController from '../controllers/catalog.controller';

const router = Router();

router.get('/programs', catalogController.getCatalogPrograms);
router.get('/programs/:id', catalogController.getCatalogProgramDetail);
router.get('/lessons/:id', catalogController.getCatalogLessonDetail);

export default router;