import { Router } from 'express';
import { createSale, getSales, getSaleById } from '../controllers/sale.controller.js';
import { authenticate } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validate.js';
import {
  createSaleSchema,
  getSalesQuerySchema,
  saleIdParamSchema
} from '../validators/sale.validator.js';

const router = Router();

router.use(authenticate);

router.post('/', validateRequest(createSaleSchema), createSale);
router.get('/', validateRequest(getSalesQuerySchema), getSales);
router.get('/:id', validateRequest(saleIdParamSchema), getSaleById);

export default router;
