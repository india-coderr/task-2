import { Router } from 'express';
import {
  getProducts,
  getCategories,
  getProductById,
  createProduct,
  updateProduct,
  deactivateProduct,
  activateProduct
} from '../controllers/product.controller.js';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import { validateRequest } from '../middleware/validate.js';
import {
  createProductSchema,
  updateProductSchema,
  getProductsQuerySchema,
  productIdParamSchema
} from '../validators/product.validator.js';

const router = Router();

// All product routes require authentication
router.use(authenticate);

router.get('/', validateRequest(getProductsQuerySchema), getProducts);
router.get('/categories', getCategories);
router.get('/:id', validateRequest(productIdParamSchema), getProductById);

// Admin-only mutations
router.post('/', requireRole('admin'), validateRequest(createProductSchema), createProduct);
router.put('/:id', requireRole('admin'), validateRequest(updateProductSchema), updateProduct);
router.patch('/:id/deactivate', requireRole('admin'), validateRequest(productIdParamSchema), deactivateProduct);
router.patch('/:id/activate', requireRole('admin'), validateRequest(productIdParamSchema), activateProduct);

export default router;
