import { z } from 'zod';

export const createProductSchema = {
  body: z.object({
    sku: z.string().min(1, 'SKU is required').trim().toUpperCase(),
    name: z.string().min(1, 'Product name is required').trim(),
    category: z.string().min(1, 'Category is required').trim(),
    purchasePrice: z.number().min(0, 'Purchase price must be non-negative'),
    sellingPrice: z.number().min(0, 'Selling price must be non-negative'),
    stock: z.number().int('Stock must be an integer').min(0, 'Stock cannot be negative').default(0),
    reorderLevel: z.number().int('Reorder level must be an integer').min(0, 'Reorder level cannot be negative').default(5)
  })
};

export const updateProductSchema = {
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid product ID')
  }),
  body: z.object({
    sku: z.string().min(1, 'SKU is required').trim().toUpperCase().optional(),
    name: z.string().min(1, 'Product name is required').trim().optional(),
    category: z.string().min(1, 'Category is required').trim().optional(),
    purchasePrice: z.number().min(0, 'Purchase price must be non-negative').optional(),
    sellingPrice: z.number().min(0, 'Selling price must be non-negative').optional(),
    reorderLevel: z.number().int('Reorder level must be an integer').min(0).optional(),
    // Strictly forbid updating stock directly through edit
    stock: z.undefined({
      invalid_type_error: 'Stock cannot be modified via product edit. Use inventory adjustments instead.'
    }).optional()
  })
};

export const getProductsQuerySchema = {
  query: z.object({
    search: z.string().trim().optional(),
    category: z.string().trim().optional(),
    stockStatus: z.enum(['all', 'in_stock', 'low_stock', 'out_of_stock']).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    includeInactive: z.coerce.boolean().optional()
  })
};

export const productIdParamSchema = {
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid product ID')
  })
};
