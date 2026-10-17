import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { connectDB } from '../config/db.js';
import { User } from '../models/User.js';
import { Product } from '../models/Product.js';
import { StockMovement } from '../models/StockMovement.js';
import { Sale } from '../models/Sale.js';
import { Settings } from '../models/Settings.js';
import { Counter } from '../models/Counter.js';
import { executeSale } from '../services/sale.service.js';

dotenv.config();

const seedDatabase = async () => {
  await connectDB();
  console.log('\n[SEED] Connected to DB. Clearing existing data for isolated environment...');

  const db = mongoose.connection.db;
  const collections = ['users', 'products', 'stockmovements', 'sales', 'settings', 'counters'];
  for (const colName of collections) {
    try {
      await db.collection(colName).deleteMany({});
    } catch (err) {
      // Collection might not exist yet
    }
  }

  console.log('[SEED] Cleared existing collections.');

  // 1. Create Default Settings
  const settings = await Settings.create({
    storeName: 'Greenfield Grocers',
    taxRate: 5,
    currencySymbol: '₹',
    staffMaxDiscountPercent: 10
  });
  console.log(`[SEED] Settings initialized: ${settings.storeName}, taxRate: ${settings.taxRate}%`);

  // 2. Create Users
  const salt = await bcrypt.genSalt(10);
  const adminPasswordHash = await bcrypt.hash('Admin@123', salt);
  const staffPasswordHash = await bcrypt.hash('Staff@123', salt);

  const adminUser = await User.create({
    name: 'Sarah Connor',
    email: 'admin@store.com',
    passwordHash: adminPasswordHash,
    role: 'admin',
    isActive: true
  });

  const staffUser = await User.create({
    name: 'Priya Nair',
    email: 'staff@store.com',
    passwordHash: staffPasswordHash,
    role: 'staff',
    isActive: true
  });

  console.log(`[SEED] Users created:\n - Admin: admin@store.com (Admin@123)\n - Staff: staff@store.com (Staff@123)`);

  // 3. Create ~20 Products across 5 categories
  // Note: Opening stock will have initial movements. Some will be sold down via executeSale.
  const initialProductsData = [
    { sku: 'RIC-005', name: 'Basmati rice 5 kg', category: 'Staples', purchasePrice: 500, sellingPrice: 640, initialStock: 35, reorderLevel: 10 },
    { sku: 'BUT-500', name: 'Amul butter 500 g', category: 'Dairy', purchasePrice: 240, sellingPrice: 285, initialStock: 45, reorderLevel: 15 },
    { sku: 'TOM-001', name: 'Tomatoes 1 kg', category: 'Produce', purchasePrice: 25, sellingPrice: 40, initialStock: 32, reorderLevel: 10 },
    { sku: 'DAL-001', name: 'Toor dal 1 kg', category: 'Staples', purchasePrice: 130, sellingPrice: 165, initialStock: 9, reorderLevel: 10 },
    { sku: 'OIL-001', name: 'Sunflower oil 1 L', category: 'Staples', purchasePrice: 120, sellingPrice: 150, initialStock: 4, reorderLevel: 10 },
    { sku: 'TEA-250', name: 'Tea leaves 250 g', category: 'Beverages', purchasePrice: 90, sellingPrice: 120, initialStock: 7, reorderLevel: 8 },
    { sku: 'SUG-001', name: 'Sugar 1 kg', category: 'Staples', purchasePrice: 36, sellingPrice: 46, initialStock: 12, reorderLevel: 15 },
    { sku: 'MLK-001', name: 'Toned milk 1 L', category: 'Dairy', purchasePrice: 48, sellingPrice: 60, initialStock: 80, reorderLevel: 20 },
    { sku: 'BAN-012', name: 'Bananas, 1 dozen', category: 'Produce', purchasePrice: 35, sellingPrice: 55, initialStock: 60, reorderLevel: 15 },
    { sku: 'ATT-010', name: 'Whole wheat flour 10 kg', category: 'Staples', purchasePrice: 380, sellingPrice: 450, initialStock: 20, reorderLevel: 10 },
    { sku: 'PAN-200', name: 'Fresh Paneer 200 g', category: 'Dairy', purchasePrice: 80, sellingPrice: 105, initialStock: 6, reorderLevel: 10 },
    { sku: 'BRD-400', name: 'Whole wheat brown bread 400 g', category: 'Bakery', purchasePrice: 32, sellingPrice: 45, initialStock: 14, reorderLevel: 12 },
    { sku: 'COF-100', name: 'Instant coffee powder 100 g', category: 'Beverages', purchasePrice: 140, sellingPrice: 185, initialStock: 22, reorderLevel: 8 },
    { sku: 'APP-001', name: 'Green apples 1 kg', category: 'Produce', purchasePrice: 140, sellingPrice: 190, initialStock: 18, reorderLevel: 8 },
    { sku: 'POT-002', name: 'Potato 2 kg', category: 'Produce', purchasePrice: 35, sellingPrice: 50, initialStock: 30, reorderLevel: 15 },
    { sku: 'ONI-002', name: 'Onion 2 kg', category: 'Produce', purchasePrice: 40, sellingPrice: 60, initialStock: 3, reorderLevel: 15 },
    { sku: 'YOG-400', name: 'Greek yogurt 400 g', category: 'Dairy', purchasePrice: 70, sellingPrice: 95, initialStock: 9, reorderLevel: 10 },
    { sku: 'ALM-500', name: 'California almonds 500 g', category: 'Snacks', purchasePrice: 380, sellingPrice: 480, initialStock: 20, reorderLevel: 8 },
    { sku: 'CHO-100', name: 'Dark chocolate 70% 100 g', category: 'Snacks', purchasePrice: 85, sellingPrice: 120, initialStock: 28, reorderLevel: 10 },
    { sku: 'GTE-025', name: 'Organic green tea 25 bags', category: 'Beverages', purchasePrice: 130, sellingPrice: 175, initialStock: 25, reorderLevel: 10 }
  ];

  const createdProducts = [];
  for (const prodData of initialProductsData) {
    const product = await Product.create({
      sku: prodData.sku,
      name: prodData.name,
      category: prodData.category,
      purchasePrice: prodData.purchasePrice,
      sellingPrice: prodData.sellingPrice,
      stock: prodData.initialStock,
      reorderLevel: prodData.reorderLevel,
      isActive: true
    });

    // Write initial StockMovement
    if (prodData.initialStock > 0) {
      await StockMovement.create({
        productId: product._id,
        skuSnapshot: product.sku,
        nameSnapshot: product.name,
        type: 'initial',
        quantityChange: prodData.initialStock,
        balanceBefore: 0,
        balanceAfter: prodData.initialStock,
        reason: 'Opening stock on store initialization',
        reference: { kind: 'manual' },
        performedBy: adminUser._id,
        createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000) // 8 days ago
      });
    }

    createdProducts.push(product);
  }

  console.log(`[SEED] Created ${createdProducts.length} products across 5 categories.`);

  // 4. Create ~10 realistic sales from the last 7 days through executeSale service
  // This guarantees invoice counter consistency, exact pricing, atomic stock deductions, and StockMovements!
  const getProductBySku = (sku) => createdProducts.find((p) => p.sku === sku);

  const saleScenarios = [
    {
      daysAgo: 6,
      customerName: 'Rohan Sharma',
      paymentMethod: 'Cash',
      discountType: 'none',
      discountValue: 0,
      user: staffUser,
      items: [
        { sku: 'RIC-005', qty: 2 },
        { sku: 'OIL-001', qty: 2 },
        { sku: 'SUG-001', qty: 3 }
      ]
    },
    {
      daysAgo: 5,
      customerName: 'Ananya Verma',
      paymentMethod: 'UPI',
      discountType: 'percent',
      discountValue: 5,
      user: staffUser,
      items: [
        { sku: 'MLK-001', qty: 4 },
        { sku: 'BRD-400', qty: 2 },
        { sku: 'BUT-500', qty: 1 }
      ]
    },
    {
      daysAgo: 5,
      customerName: 'Vikram Joshi',
      paymentMethod: 'Card',
      discountType: 'fixed',
      discountValue: 50,
      user: adminUser,
      items: [
        { sku: 'ALM-500', qty: 2 },
        { sku: 'CHO-100', qty: 3 }
      ]
    },
    {
      daysAgo: 4,
      customerName: 'Meera Iyer',
      paymentMethod: 'UPI',
      discountType: 'none',
      discountValue: 0,
      user: staffUser,
      items: [
        { sku: 'TEA-250', qty: 2 },
        { sku: 'SUG-001', qty: 2 },
        { sku: 'MLK-001', qty: 3 }
      ]
    },
    {
      daysAgo: 3,
      customerName: 'Karan Patel',
      paymentMethod: 'Cash',
      discountType: 'percent',
      discountValue: 10,
      user: staffUser,
      items: [
        { sku: 'ATT-010', qty: 1 },
        { sku: 'DAL-001', qty: 3 },
        { sku: 'TOM-001', qty: 4 }
      ]
    },
    {
      daysAgo: 3,
      customerName: 'Pooja Reddy',
      paymentMethod: 'Card',
      discountType: 'none',
      discountValue: 0,
      user: adminUser,
      items: [
        { sku: 'BAN-012', qty: 3 },
        { sku: 'APP-001', qty: 2 },
        { sku: 'PAN-200', qty: 2 }
      ]
    },
    {
      daysAgo: 2,
      customerName: 'Suresh Kumar',
      paymentMethod: 'UPI',
      discountType: 'none',
      discountValue: 0,
      user: staffUser,
      items: [
        { sku: 'COF-100', qty: 2 },
        { sku: 'GTE-025', qty: 2 },
        { sku: 'MLK-001', qty: 5 }
      ]
    },
    {
      daysAgo: 2,
      customerName: 'Dev Malhotra',
      paymentMethod: 'Cash',
      discountType: 'none',
      discountValue: 0,
      user: staffUser,
      items: [
        { sku: 'ONI-002', qty: 3 }, // Reduces ONI-002 to 0 (Out of stock)
        { sku: 'POT-002', qty: 2 },
        { sku: 'TOM-001', qty: 5 }
      ]
    },
    {
      daysAgo: 1,
      customerName: 'Neha Gupta',
      paymentMethod: 'UPI',
      discountType: 'percent',
      discountValue: 5,
      user: staffUser,
      items: [
        { sku: 'OIL-001', qty: 2 }, // Reduces OIL-001 to 0 (Out of stock)
        { sku: 'DAL-001', qty: 2 },
        { sku: 'PAN-200', qty: 2 }
      ]
    },
    {
      daysAgo: 0,
      customerName: 'Rajesh Khanna',
      paymentMethod: 'Cash',
      discountType: 'none',
      discountValue: 0,
      user: staffUser,
      items: [
        { sku: 'RIC-005', qty: 1 },
        { sku: 'BUT-500', qty: 2 },
        { sku: 'TOM-001', qty: 3 }
      ]
    }
  ];

  console.log('[SEED] Executing sales via executeSale service...');

  for (const scen of saleScenarios) {
    const rawItems = scen.items.map((i) => {
      const prod = getProductBySku(i.sku);
      return {
        productId: String(prod._id),
        quantity: i.qty
      };
    });

    const result = await executeSale({
      rawItems,
      discountType: scen.discountType,
      discountValue: scen.discountValue,
      paymentMethod: scen.paymentMethod,
      customerName: scen.customerName,
      currentUser: scen.user
    });

    // Set realistic backdated timestamp for reporting across the 7-day range
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() - scen.daysAgo);
    targetDate.setHours(10 + Math.floor(Math.random() * 8), Math.floor(Math.random() * 59));

    await db.collection('sales').updateOne(
      { _id: result.sale._id },
      { $set: { createdAt: targetDate, updatedAt: targetDate } }
    );
    await db.collection('stockmovements').updateMany(
      { 'reference.saleId': result.sale._id },
      { $set: { createdAt: targetDate } }
    );
  }

  console.log(`[SEED] Created ${saleScenarios.length} sales across the last 7 days.`);
  console.log('[SEED] Database seeding completed successfully!\n');
  process.exit(0);
};

seedDatabase().catch((err) => {
  console.error('[SEED ERROR]', err);
  process.exit(1);
});
