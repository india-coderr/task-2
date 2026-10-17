import { Sale } from '../models/Sale.js';
import { Product } from '../models/Product.js';
import { apiSuccess } from '../utils/response.js';
import { parseLocalDateRange } from '../utils/dateUtils.js';
import { fromPaise, toPaise } from '../utils/money.js';

export const getSalesReport = async (req, res, next) => {
  try {
    const { from, to } = req.query;
    const { startDate, endDate, startStr, endStr } = parseLocalDateRange(from, to);

    // Sales within the date range
    const sales = await Sale.find({
      createdAt: { $gte: startDate, $lte: endDate },
      status: 'completed'
    }).sort({ createdAt: -1 });

    let totalSalesPaise = 0;
    const transactionsCount = sales.length;
    const productSalesMap = new Map();
    const dailyBreakdownMap = new Map();

    for (const sale of sales) {
      totalSalesPaise += toPaise(sale.total);

      // Local date grouping for daily breakdown
      const saleDate = new Date(sale.createdAt);
      const dayKey = `${saleDate.getFullYear()}-${String(saleDate.getMonth() + 1).padStart(2, '0')}-${String(saleDate.getDate()).padStart(2, '0')}`;

      if (!dailyBreakdownMap.has(dayKey)) {
        dailyBreakdownMap.set(dayKey, {
          date: dayKey,
          transactions: 0,
          totalSalesPaise: 0,
          itemsCount: 0
        });
      }
      const dayStats = dailyBreakdownMap.get(dayKey);
      dayStats.transactions += 1;
      dayStats.totalSalesPaise += toPaise(sale.total);

      // Aggregate products sold
      for (const item of sale.items) {
        dayStats.itemsCount += item.quantity;

        const prodKey = String(item.productId);
        if (!productSalesMap.has(prodKey)) {
          productSalesMap.set(prodKey, {
            productId: item.productId,
            name: item.nameSnapshot,
            sku: item.skuSnapshot,
            quantitySold: 0,
            revenuePaise: 0
          });
        }
        const prodStats = productSalesMap.get(prodKey);
        prodStats.quantitySold += item.quantity;
        prodStats.revenuePaise += toPaise(item.lineTotal);
      }
    }

    const totalSales = fromPaise(totalSalesPaise);
    const averageSale = transactionsCount > 0 ? fromPaise(Math.round(totalSalesPaise / transactionsCount)) : 0;

    // Top selling products sorted by quantity sold descending
    const topProducts = Array.from(productSalesMap.values())
      .map((p) => ({
        ...p,
        revenue: fromPaise(p.revenuePaise)
      }))
      .sort((a, b) => b.quantitySold - a.quantitySold)
      .slice(0, 10);

    // Daily breakdown array sorted descending by date
    const dailyBreakdown = Array.from(dailyBreakdownMap.values())
      .map((d) => ({
        date: d.date,
        transactions: d.transactions,
        itemsCount: d.itemsCount,
        totalSales: fromPaise(d.totalSalesPaise)
      }))
      .sort((a, b) => b.date.localeCompare(a.date));

    // Also fetch low-stock count and top 5 low stock products for dashboard usage
    const lowStockProducts = await Product.find({
      isActive: true,
      $expr: { $lte: ['$stock', '$reorderLevel'] }
    });

    lowStockProducts.sort((a, b) => {
      if (a.stock === 0 && b.stock !== 0) return -1;
      if (b.stock === 0 && a.stock !== 0) return 1;
      return a.stock - b.stock;
    });

    const lowStockCount = lowStockProducts.length;
    const top5LowStock = lowStockProducts.slice(0, 5).map((p) => {
      const obj = p.toObject();
      if (req.user.role !== 'admin') delete obj.purchasePrice;
      return obj;
    });

    // Recent 10 sales
    const recentSales = sales.slice(0, 10).map((s) => {
      const obj = s.toObject();
      if (req.user.role !== 'admin' && Array.isArray(obj.items)) {
        obj.items = obj.items.map((i) => {
          const itemClean = { ...i };
          delete itemClean.costPriceSnapshot;
          return itemClean;
        });
      }
      return obj;
    });

    return apiSuccess(res, {
      dateRange: { from: startStr, to: endStr },
      summary: {
        totalSales,
        transactionsCount,
        averageSale,
        lowStockCount
      },
      topProducts,
      dailyBreakdown,
      topLowStock: top5LowStock,
      recentSales
    });
  } catch (error) {
    next(error);
  }
};

export const getProfitReport = async (req, res, next) => {
  try {
    const { from, to } = req.query;
    const { startDate, endDate, startStr, endStr } = parseLocalDateRange(from, to);

    const sales = await Sale.find({
      createdAt: { $gte: startDate, $lte: endDate },
      status: 'completed'
    }).sort({ createdAt: -1 });

    let totalRevenuePaise = 0; // Revenue after discount, excluding tax: subtotal - discountAmount
    let totalCogsPaise = 0;
    let totalTaxPaise = 0;
    const dailyProfitMap = new Map();

    for (const sale of sales) {
      // Net sale revenue without tax
      const saleSubtotalPaise = toPaise(sale.subtotal);
      const saleDiscountPaise = toPaise(sale.discountAmount);
      const saleNetRevenuePaise = Math.max(0, saleSubtotalPaise - saleDiscountPaise);
      totalRevenuePaise += saleNetRevenuePaise;
      totalTaxPaise += toPaise(sale.taxAmount);

      let saleCogsPaise = 0;
      for (const item of sale.items) {
        const itemCostPaise = toPaise(item.costPriceSnapshot);
        saleCogsPaise += itemCostPaise * item.quantity;
      }
      totalCogsPaise += saleCogsPaise;

      const saleDate = new Date(sale.createdAt);
      const dayKey = `${saleDate.getFullYear()}-${String(saleDate.getMonth() + 1).padStart(2, '0')}-${String(saleDate.getDate()).padStart(2, '0')}`;

      if (!dailyProfitMap.has(dayKey)) {
        dailyProfitMap.set(dayKey, {
          date: dayKey,
          revenuePaise: 0,
          cogsPaise: 0,
          transactions: 0
        });
      }

      const dayStats = dailyProfitMap.get(dayKey);
      dayStats.revenuePaise += saleNetRevenuePaise;
      dayStats.cogsPaise += saleCogsPaise;
      dayStats.transactions += 1;
    }

    const totalRevenue = fromPaise(totalRevenuePaise);
    const totalCogs = fromPaise(totalCogsPaise);
    const grossProfit = fromPaise(totalRevenuePaise - totalCogsPaise);
    const marginPercent = totalRevenuePaise > 0 
      ? Number((((totalRevenuePaise - totalCogsPaise) / totalRevenuePaise) * 100).toFixed(2)) 
      : 0;

    const dailyBreakdown = Array.from(dailyProfitMap.values())
      .map((d) => {
        const rev = fromPaise(d.revenuePaise);
        const cogs = fromPaise(d.cogsPaise);
        const profit = fromPaise(d.revenuePaise - d.cogsPaise);
        const margin = d.revenuePaise > 0 ? Number(((profit / rev) * 100).toFixed(2)) : 0;
        return {
          date: d.date,
          transactions: d.transactions,
          revenue: rev,
          cogs,
          grossProfit: profit,
          marginPercent: margin
        };
      })
      .sort((a, b) => b.date.localeCompare(a.date));

    return apiSuccess(res, {
      dateRange: { from: startStr, to: endStr },
      summary: {
        revenue: totalRevenue,
        cogs: totalCogs,
        grossProfit,
        marginPercent,
        totalTaxCollected: fromPaise(totalTaxPaise)
      },
      dailyBreakdown
    });
  } catch (error) {
    next(error);
  }
};
