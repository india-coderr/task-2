import { z } from 'zod';

export const adjustmentSchema = {
  body: z.object({
    productId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid product ID'),
    type: z.enum(['stock_received', 'adjustment_increase', 'adjustment_decrease'], {
      required_error: 'Adjustment type is required'
    }),
    quantity: z.number().int('Quantity must be an integer').min(1, 'Quantity must be at least 1'),
    reason: z.string().trim().optional()
  }).refine((data) => {
    // If manual adjustment, reason is strictly required
    if (['adjustment_increase', 'adjustment_decrease'].includes(data.type)) {
      return Boolean(data.reason && data.reason.trim().length > 0);
    }
    return true;
  }, {
    message: 'Reason is required for manual adjustments (adjustment_increase / adjustment_decrease)',
    path: ['reason']
  })
};

export const movementsQuerySchema = {
  query: z.object({
    productId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid product ID').optional(),
    type: z.enum(['initial', 'stock_received', 'adjustment_increase', 'adjustment_decrease', 'sale', 'all']).optional(),
    from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'From date must be YYYY-MM-DD').optional(),
    to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'To date must be YYYY-MM-DD').optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20)
  })
};
