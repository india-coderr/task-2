import { Router } from 'express';
import {
  adjustStock,
  getLowStockProducts,
  getStockMovements
} from '../controllers/inventory.controller.js';
import { authenticate } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validate.js';
import {
  adjustmentSchema,
  movementsQuerySchema
} from '../validators/inventory.validator.js';

const router = Router();

router.use(authenticate);

router.get('/low-stock', getLowStockProducts);
router.post('/adjustments', validateRequest(adjustmentSchema), adjustStock);
router.get('/movements', validateRequest(movementsQuerySchema), getStockMovements);

export default router;
