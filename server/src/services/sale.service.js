import mongoose from 'mongoose';
import { Product } from '../models/Product.js';
import { Sale } from '../models/Sale.js';
import { StockMovement } from '../models/StockMovement.js';
import { Settings } from '../models/Settings.js';
import { InsufficientStockError, BadRequestError, ForbiddenError } from '../utils/errors.js';
import { calculateSaleTotals } from '../utils/money.js';
import { getNextInvoiceNumber } from './counter.service.js';
import { getIsReplicaSet } from '../config/db.js';

/**
 * Executes a complete sale with atomic stock deduction and audit movements.
 * Everything runs inside a MongoDB transaction (session.withTransaction).
 * 
 * @param {Object} params
 * @param {Array<{productId: string, quantity: number}>} params.rawItems
 * @param {'none'|'percent'|'fixed'} params.discountType
 * @param {number} params.discountValue
 * @param {'Cash'|'UPI'|'Card'} params.paymentMethod
 * @param {string} [params.customerName]
 * @param {Object} params.currentUser
 */
export const executeSale = async ({
  rawItems,
  discountType = 'none',
  discountValue = 0,
  paymentMethod = 'Cash',
  customerName = '',
  currentUser
}) => {
  // 1. Merge duplicate product lines in request
  const mergedItemsMap = new Map();
  for (const item of rawItems) {
    const pId = String(item.productId);
    const qty = parseInt(item.quantity, 10);
    if (!Number.isInteger(qty) || qty <= 0) {
      throw new BadRequestError('Each product quantity must be a positive integer');
    }
    mergedItemsMap.set(pId, (mergedItemsMap.get(pId) || 0) + qty);
  }

  const requestedItems = Array.from(mergedItemsMap.entries()).map(([productId, quantity]) => ({
    productId,
    quantity
  }));

  if (requestedItems.length === 0) {
    throw new BadRequestError('A sale must include at least one valid product');
  }

  // 2. Fetch current settings for tax rate and staff discount limit
  let settings = await Settings.findOne();
  if (!settings) {
    settings = await Settings.create({
      storeName: 'Greenfield Grocers',
      taxRate: 5,
      currencySymbol: '₹',
      staffMaxDiscountPercent: 10
    });
  }

  // 3. Enforce staff discount ceiling
  if (currentUser.role === 'staff') {
    if (discountType === 'percent' && discountValue > settings.staffMaxDiscountPercent) {
      throw new ForbiddenError(
        `Staff discount exceeds the allowed maximum of ${settings.staffMaxDiscountPercent}%. Admin authorization required.`
      );
    }
    // For fixed discount, we validate after calculating subtotal
  }

  // 4. Pre-fetch products to validate existence and active status
  const productIds = requestedItems.map((i) => i.productId);
  const products = await Product.find({ _id: { $in: productIds } });

  if (products.length !== requestedItems.length) {
    throw new BadRequestError('One or more requested products were not found in the database');
  }

  const productMap = new Map();
  for (const p of products) {
    productMap.set(String(p._id), p);
  }

  // Initial stock pre-check
  const stockErrors = [];
  for (const reqItem of requestedItems) {
    const prod = productMap.get(reqItem.productId);
    if (!prod.isActive) {
      throw new BadRequestError(
        `Product "${prod.name}" (SKU: ${prod.sku}) is deactivated and cannot be sold`
      );
    }

    if (prod.stock < reqItem.quantity) {
      stockErrors.push({
        productId: String(prod._id),
        sku: prod.sku,
        name: prod.name,
        requested: reqItem.quantity,
        available: prod.stock
      });
    }
  }

  if (stockErrors.length > 0) {
    throw new InsufficientStockError(stockErrors);
  }

  // Prepare items for calculation
  const itemsForPricing = requestedItems.map((reqItem) => {
    const prod = productMap.get(reqItem.productId);
    return {
      productId: prod._id,
      sku: prod.sku,
      name: prod.name,
      unitPrice: prod.sellingPrice,
      costPrice: prod.purchasePrice,
      quantity: reqItem.quantity
    };
  });

  // Calculate pricing pure function
  const pricing = calculateSaleTotals({
    items: itemsForPricing,
    discountType,
    discountValue,
    taxRate: settings.taxRate
  });

  // Staff discount fixed amount validation
  if (currentUser.role === 'staff' && discountType === 'fixed') {
    const effectivePercent = pricing.subtotal > 0 ? (pricing.discountAmount / pricing.subtotal) * 100 : 0;
    if (effectivePercent > settings.staffMaxDiscountPercent) {
      throw new ForbiddenError(
        `Staff discount (₹${pricing.discountAmount}) equals ${effectivePercent.toFixed(1)}%, which exceeds the staff limit of ${settings.staffMaxDiscountPercent}%.`
      );
    }
  }

  if (pricing.discountAmount > pricing.subtotal) {
    throw new BadRequestError('Discount cannot exceed the subtotal');
  }

  const isReplica = getIsReplicaSet();
  const session = isReplica ? await mongoose.startSession() : null;

  try {
    const executeTransaction = async (sess) => {
      const opts = sess ? { session: sess } : {};

      // 5. Atomic conditional stock deduction for every item
      // Product.findOneAndUpdate({ _id, isActive: true, stock: { $gte: qty } }, { $inc: { stock: -qty } }, { new: false })
      const stockDeductionResults = [];

      for (const item of requestedItems) {
        const prod = productMap.get(item.productId);
        const updateResult = await Product.findOneAndUpdate(
          {
            _id: prod._id,
            isActive: true,
            stock: { $gte: item.quantity }
          },
          {
            $inc: { stock: -item.quantity }
          },
          {
            new: false, // returns state BEFORE modification
            ...opts
          }
        );

        if (!updateResult) {
          // Re-fetch current available to return precise details
          const currentProd = await Product.findById(prod._id, null, opts);
          throw new InsufficientStockError([
            {
              productId: String(prod._id),
              sku: prod.sku,
              name: prod.name,
              requested: item.quantity,
              available: currentProd ? currentProd.stock : 0
            }
          ]);
        }

        stockDeductionResults.push({
          productId: prod._id,
          sku: prod.sku,
          name: prod.name,
          quantity: item.quantity,
          balanceBefore: updateResult.stock,
          balanceAfter: updateResult.stock - item.quantity
        });
      }

      // 6. Generate sequential invoice number atomically within session
      const invoiceNumber = await getNextInvoiceNumber(sess);

      // 7. Create immutable Sale record
      const sale = new Sale({
        invoiceNumber,
        items: pricing.items,
        subtotal: pricing.subtotal,
        discountType: pricing.discountType,
        discountValue: pricing.discountValue,
        discountAmount: pricing.discountAmount,
        taxRate: pricing.taxRate,
        taxAmount: pricing.taxAmount,
        total: pricing.total,
        paymentMethod,
        customerName: customerName.trim(),
        status: 'completed',
        createdBy: currentUser._id
      });

      await sale.save(opts);

      // 8. Write StockMovement audit log entries for each item
      const movements = stockDeductionResults.map((deduction) => ({
        productId: deduction.productId,
        skuSnapshot: deduction.sku,
        nameSnapshot: deduction.name,
        type: 'sale',
        quantityChange: -deduction.quantity,
        balanceBefore: deduction.balanceBefore,
        balanceAfter: deduction.balanceAfter,
        reason: 'Customer sale',
        reference: {
          kind: 'sale',
          saleId: sale._id,
          invoiceNumber: sale.invoiceNumber
        },
        performedBy: currentUser._id,
        createdAt: new Date()
      }));

      await StockMovement.insertMany(movements, opts);

      return {
        sale,
        warnings: pricing.warnings
      };
    };

    if (session) {
      let finalResult;
      await session.withTransaction(async () => {
        finalResult = await executeTransaction(session);
      });
      return finalResult;
    } else {
      return await executeTransaction(null);
    }
  } finally {
    if (session) {
      await session.endSession();
    }
  }
};
