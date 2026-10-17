import { Product } from '../models/Product.js';
import { StockMovement } from '../models/StockMovement.js';
import { adjustInventory } from '../services/inventory.service.js';
import { apiSuccess } from '../utils/response.js';
import { ForbiddenError } from '../utils/errors.js';
import { parseLocalDateRange } from '../utils/dateUtils.js';

export const adjustStock = async (req, res, next) => {
  try {
    const { productId, type, quantity, reason } = req.body;

    // Access control: Staff can only record stock_received.
    // Admin can perform stock_received, adjustment_increase, and adjustment_decrease.
    if (req.user.role === 'staff' && type !== 'stock_received') {
      throw new ForbiddenError('Staff members are only authorized to record stock received. Manual adjustments require Admin role.');
    }

    const result = await adjustInventory({
      productId,
      type,
      quantity,
      reason,
      performedByUserId: req.user._id
    });

    return apiSuccess(res, result, 201);
  } catch (error) {
    next(error);
  }
};

export const getLowStockProducts = async (req, res, next) => {
  try {
    // A product is low-stock when stock <= reorderLevel and isActive is true
    const products = await Product.find({
      isActive: true,
      $expr: { $lte: ['$stock', '$reorderLevel'] }
    });

    // Sort by urgency: out of stock (stock === 0) first,
    // then lowest stock relative to reorderLevel (stock / reorderLevel)
    products.sort((a, b) => {
      if (a.stock === 0 && b.stock !== 0) return -1;
      if (b.stock === 0 && a.stock !== 0) return 1;
      const ratioA = a.reorderLevel > 0 ? a.stock / a.reorderLevel : 0;
      const ratioB = b.reorderLevel > 0 ? b.stock / b.reorderLevel : 0;
      if (ratioA !== ratioB) return ratioA - ratioB;
      return a.stock - b.stock;
    });

    const sanitized = products.map((prod) => {
      const p = prod.toObject();
      if (req.user.role !== 'admin') {
        delete p.purchasePrice;
      }
      p.urgency = p.stock === 0 ? 'out_of_stock' : 'low_stock';
      return p;
    });

    return apiSuccess(res, sanitized);
  } catch (error) {
    next(error);
  }
};

export const getStockMovements = async (req, res, next) => {
  try {
    const {
      productId,
      type,
      from,
      to,
      page = 1,
      limit = 20
    } = req.query;

    const query = {};

    if (productId) {
      query.productId = productId;
    }

    if (type && type !== 'all') {
      query.type = type;
    }

    if (from || to) {
      const { startDate, endDate } = parseLocalDateRange(from, to);
      query.createdAt = {
        $gte: startDate,
        $lte: endDate
      };
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [movements, totalCount] = await Promise.all([
      StockMovement.find(query)
        .populate('performedBy', 'name email role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      StockMovement.countDocuments(query)
    ]);

    return apiSuccess(res, movements, 200, {
      totalCount,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(totalCount / Number(limit)) || 1
    });
  } catch (error) {
    next(error);
  }
};
