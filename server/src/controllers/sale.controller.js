import { Sale } from '../models/Sale.js';
import { executeSale } from '../services/sale.service.js';
import { apiSuccess } from '../utils/response.js';
import { NotFoundError } from '../utils/errors.js';
import { parseLocalDateRange } from '../utils/dateUtils.js';

/**
 * Strips costPriceSnapshot for staff roles
 */
const sanitizeSaleForUser = (saleDoc, userRole) => {
  const sale = saleDoc.toObject ? saleDoc.toObject() : { ...saleDoc };
  if (userRole !== 'admin' && Array.isArray(sale.items)) {
    sale.items = sale.items.map((item) => {
      const sanitizedItem = { ...item };
      delete sanitizedItem.costPriceSnapshot;
      return sanitizedItem;
    });
  }
  return sale;
};

export const createSale = async (req, res, next) => {
  try {
    const { items, discountType, discountValue, paymentMethod, customerName } = req.body;

    const result = await executeSale({
      rawItems: items,
      discountType,
      discountValue,
      paymentMethod,
      customerName,
      currentUser: req.user
    });

    const sanitizedSale = sanitizeSaleForUser(result.sale, req.user.role);

    return apiSuccess(res, {
      sale: sanitizedSale,
      warnings: result.warnings || []
    }, 201);
  } catch (error) {
    next(error);
  }
};

export const getSales = async (req, res, next) => {
  try {
    const { from, to, invoiceNumber, page = 1, limit = 20 } = req.query;

    const query = {};

    if (invoiceNumber) {
      query.invoiceNumber = new RegExp(invoiceNumber.trim(), 'i');
    }

    if (from || to) {
      const { startDate, endDate } = parseLocalDateRange(from, to);
      query.createdAt = {
        $gte: startDate,
        $lte: endDate
      };
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [sales, totalCount] = await Promise.all([
      Sale.find(query)
        .populate('createdBy', 'name email role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Sale.countDocuments(query)
    ]);

    const sanitized = sales.map((s) => sanitizeSaleForUser(s, req.user.role));

    return apiSuccess(res, sanitized, 200, {
      totalCount,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(totalCount / Number(limit)) || 1
    });
  } catch (error) {
    next(error);
  }
};

export const getSaleById = async (req, res, next) => {
  try {
    const sale = await Sale.findById(req.params.id).populate('createdBy', 'name email role');
    if (!sale) {
      throw new NotFoundError('Invoice / Sale not found');
    }

    return apiSuccess(res, sanitizeSaleForUser(sale, req.user.role));
  } catch (error) {
    next(error);
  }
};
