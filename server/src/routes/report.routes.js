import { Router } from 'express';
import { getSalesReport, getProfitReport } from '../controllers/report.controller.js';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import { validateRequest } from '../middleware/validate.js';
import { reportQuerySchema } from '../validators/sale.validator.js';

const router = Router();

router.use(authenticate);

router.get('/sales', validateRequest(reportQuerySchema), getSalesReport);
router.get('/profit', requireRole('admin'), validateRequest(reportQuerySchema), getProfitReport);

export default router;
