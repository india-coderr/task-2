import { Product } from '../models/Product.js';
import { StockMovement } from '../models/StockMovement.js';
import { apiSuccess } from '../utils/response.js';
import { NotFoundError, ConflictError } from '../utils/errors.js';

/**
 * Helper to strip purchasePrice for staff users
 */
const sanitizeProductForUser = (productDoc, userRole) => {
  const p = productDoc.toObject ? productDoc.toObject() : { ...productDoc };
  if (userRole !== 'admin') {
    delete p.purchasePrice;
  }
  return p;
};

export const getProducts = async (req, res, next) => {
  try {
    const {
      search,
      category,
      stockStatus,
      page = 1,
      limit = 20,
      includeInactive
    } = req.query;

    const query = {};

    // Inactive filter handling: only admin can view inactive products if explicitly requested
    if (req.user.role === 'admin' && includeInactive === true) {
      // no filter on isActive
    } else {
      query.isActive = true;
    }

    if (category) {
      query.category = category;
    }

    if (search) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { name: searchRegex },
        { sku: searchRegex },
        { category: searchRegex }
      ];
    }

    if (stockStatus) {
      if (stockStatus === 'out_of_stock') {
        query.stock = 0;
      } else if (stockStatus === 'low_stock') {
        query.$expr = {
          $and: [
            { $gt: ['$stock', 0] },
            { $lte: ['$stock', '$reorderLevel'] }
          ]
        };
      } else if (stockStatus === 'in_stock') {
        query.$expr = {
          $gt: ['$stock', '$reorderLevel']
        };
      }
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [products, totalCount] = await Promise.all([
      Product.find(query)
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Product.countDocuments(query)
    ]);

    const sanitized = products.map((p) => sanitizeProductForUser(p, req.user.role));

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

export const getCategories = async (req, res, next) => {
  try {
    const categories = await Product.distinct('category', { isActive: true });
    return apiSuccess(res, categories.sort());
  } catch (error) {
    next(error);
  }
};

export const getProductById = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      throw new NotFoundError('Product not found');
    }

    return apiSuccess(res, sanitizeProductForUser(product, req.user.role));
  } catch (error) {
    next(error);
  }
};

export const createProduct = async (req, res, next) => {
  try {
    const {
      sku,
      name,
      category,
      purchasePrice,
      sellingPrice,
      stock = 0,
      reorderLevel = 5
    } = req.body;

    const existing = await Product.findOne({ sku: sku.toUpperCase().trim() });
    if (existing) {
      throw new ConflictError(
        `Product with SKU "${sku.toUpperCase().trim()}" already exists`,
        'DUPLICATE_SKU',
        [{ field: 'sku', value: sku }]
      );
    }

    const warnings = [];
    if (sellingPrice < purchasePrice) {
      warnings.push(`Selling price (₹${sellingPrice}) is lower than purchase price (₹${purchasePrice}).`);
    }

    const product = new Product({
      sku: sku.toUpperCase().trim(),
      name: name.trim(),
      category: category.trim(),
      purchasePrice,
      sellingPrice,
      stock,
      reorderLevel,
      isActive: true
    });

    await product.save();

    // If opening stock > 0, write an initial StockMovement
    if (stock > 0) {
      await StockMovement.create({
        productId: product._id,
        skuSnapshot: product.sku,
        nameSnapshot: product.name,
        type: 'initial',
        quantityChange: stock,
        balanceBefore: 0,
        balanceAfter: stock,
        reason: 'Opening stock on product creation',
        reference: { kind: 'manual' },
        performedBy: req.user._id,
        createdAt: new Date()
      });
    }

    const data = sanitizeProductForUser(product, req.user.role);
    if (warnings.length > 0) {
      data.warnings = warnings;
    }

    return apiSuccess(res, data, 201);
  } catch (error) {
    next(error);
  }
};

export const updateProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      throw new NotFoundError('Product not found');
    }

    const { sku, name, category, purchasePrice, sellingPrice, reorderLevel } = req.body;

    if (sku && sku.toUpperCase().trim() !== product.sku) {
      const existing = await Product.findOne({ sku: sku.toUpperCase().trim() });
      if (existing) {
        throw new ConflictError(
          `Product with SKU "${sku.toUpperCase().trim()}" already exists`,
          'DUPLICATE_SKU',
          [{ field: 'sku', value: sku }]
        );
      }
      product.sku = sku.toUpperCase().trim();
    }

    if (name !== undefined) product.name = name.trim();
    if (category !== undefined) product.category = category.trim();
    if (purchasePrice !== undefined) product.purchasePrice = purchasePrice;
    if (sellingPrice !== undefined) product.sellingPrice = sellingPrice;
    if (reorderLevel !== undefined) product.reorderLevel = reorderLevel;

    await product.save();

    const warnings = [];
    if (product.sellingPrice < product.purchasePrice) {
      warnings.push(`Selling price (₹${product.sellingPrice}) is lower than purchase price (₹${product.purchasePrice}).`);
    }

    const data = sanitizeProductForUser(product, req.user.role);
    if (warnings.length > 0) {
      data.warnings = warnings;
    }

    return apiSuccess(res, data, 200);
  } catch (error) {
    next(error);
  }
};

export const deactivateProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      throw new NotFoundError('Product not found');
    }

    product.isActive = false;
    await product.save();

    return apiSuccess(res, {
      message: `Product ${product.name} (${product.sku}) deactivated successfully`,
      product: sanitizeProductForUser(product, req.user.role)
    });
  } catch (error) {
    next(error);
  }
};

export const activateProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      throw new NotFoundError('Product not found');
    }

    product.isActive = true;
    await product.save();

    return apiSuccess(res, {
      message: `Product ${product.name} (${product.sku}) reactivated successfully`,
      product: sanitizeProductForUser(product, req.user.role)
    });
  } catch (error) {
    next(error);
  }
};
