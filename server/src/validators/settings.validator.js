import { z } from 'zod';

export const updateSettingsSchema = {
  body: z.object({
    storeName: z.string().min(1, 'Store name cannot be empty').trim().optional(),
    taxRate: z.number().min(0, 'Tax rate cannot be negative').max(100, 'Tax rate cannot exceed 100%').optional(),
    currencySymbol: z.string().min(1).trim().optional(),
    staffMaxDiscountPercent: z.number().min(0).max(100, 'Staff discount limit cannot exceed 100%').optional()
  })
};
