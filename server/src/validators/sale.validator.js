import { z } from 'zod';

export const createSaleSchema = {
  body: z.object({
    items: z.array(
      z.object({
        productId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid product ID'),
        quantity: z.number().int('Quantity must be an integer').min(1, 'Quantity must be at least 1')
      })
    ).min(1, 'Sale must include at least one item'),
    discountType: z.enum(['none', 'percent', 'fixed']).default('none'),
    discountValue: z.number().min(0, 'Discount value cannot be negative').default(0),
    paymentMethod: z.enum(['Cash', 'UPI', 'Card']).default('Cash'),
    customerName: z.string().trim().max(100).optional().default('')
  })
};

export const getSalesQuerySchema = {
  query: z.object({
    from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'From date must be YYYY-MM-DD').optional(),
    to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'To date must be YYYY-MM-DD').optional(),
    invoiceNumber: z.string().trim().optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20)
  })
};

export const saleIdParamSchema = {
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid sale ID')
  })
};

export const reportQuerySchema = {
  query: z.object({
    from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'From date must be YYYY-MM-DD').optional(),
    to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'To date must be YYYY-MM-DD').optional()
  })
};
