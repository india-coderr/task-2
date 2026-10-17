import mongoose from 'mongoose';
import { Product } from '../models/Product.js';
import { StockMovement } from '../models/StockMovement.js';
import { NotFoundError, BadRequestError } from '../utils/errors.js';
import { getIsReplicaSet } from '../config/db.js';

/**
 * Service to execute inventory adjustments atomically and log StockMovements.
 */
export const adjustInventory = async ({
  productId,
  type,
  quantity,
  reason = '',
  performedByUserId
}) => {
  const qty = parseInt(quantity, 10);
  if (!Number.isInteger(qty) || qty <= 0) {
    throw new BadRequestError('Quantity must be a positive integer');
  }

  const isReplica = getIsReplicaSet();
  const session = isReplica ? await mongoose.startSession() : null;

  try {
    const executeLogic = async (sess) => {
      const opts = sess ? { session: sess } : {};

      // 1. Fetch current product
      const product = await Product.findById(productId, null, opts);
      if (!product) {
        throw new NotFoundError('Product not found');
      }

      if (!product.isActive) {
        throw new BadRequestError('Cannot adjust stock for deactivated product');
      }

      const balanceBefore = product.stock;
      let quantityChange = 0;

      if (type === 'stock_received' || type === 'adjustment_increase') {
        quantityChange = qty;
      } else if (type === 'adjustment_decrease') {
        quantityChange = -qty;
        if (balanceBefore - qty < 0) {
          throw new BadRequestError(
            `Adjustment would reduce stock below zero. Current stock: ${balanceBefore}, Requested reduction: ${qty}`
          );
        }
      } else {
        throw new BadRequestError(`Invalid adjustment type: ${type}`);
      }

      // 2. Perform conditional atomic update
      const updateQuery = {
        _id: product._id,
        isActive: true
      };
      if (quantityChange < 0) {
        updateQuery.stock = { $gte: Math.abs(quantityChange) };
      }

      const updateResult = await Product.updateOne(
        updateQuery,
        { $inc: { stock: quantityChange } },
        opts
      );

      if (updateResult.matchedCount === 0 || updateResult.modifiedCount === 0) {
        throw new BadRequestError('Could not update product stock. Stock may have changed or product was deactivated.');
      }

      const balanceAfter = balanceBefore + quantityChange;

      // 3. Write StockMovement audit record
      const movement = new StockMovement({
        productId: product._id,
        skuSnapshot: product.sku,
        nameSnapshot: product.name,
        type,
        quantityChange,
        balanceBefore,
        balanceAfter,
        reason: reason || (type === 'stock_received' ? 'Stock received' : ''),
        reference: {
          kind: 'manual'
        },
        performedBy: performedByUserId,
        createdAt: new Date()
      });

      await movement.save(opts);

      return {
        product: {
          _id: product._id,
          sku: product.sku,
          name: product.name,
          stock: balanceAfter
        },
        movement
      };
    };

    if (session) {
      let result;
      await session.withTransaction(async () => {
        result = await executeLogic(session);
      });
      return result;
    } else {
      return await executeLogic(null);
    }
  } finally {
    if (session) {
      await session.endSession();
    }
  }
};
