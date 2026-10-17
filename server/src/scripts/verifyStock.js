import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { connectDB } from '../config/db.js';
import { Product } from '../models/Product.js';
import { StockMovement } from '../models/StockMovement.js';

dotenv.config();

const verifyStockConsistency = async () => {
  await connectDB();
  console.log('\n[VERIFY STOCK] Starting stock audit consistency check for all products...\n');

  const products = await Product.find({});
  let totalChecked = 0;
  let passedCount = 0;
  let mismatchCount = 0;
  const discrepancies = [];

  for (const product of products) {
    totalChecked++;

    // Find the latest movement for this product
    const latestMovement = await StockMovement.findOne({ productId: product._id })
      .sort({ createdAt: -1, _id: -1 });

    if (!latestMovement) {
      if (product.stock === 0) {
        passedCount++;
      } else {
        mismatchCount++;
        discrepancies.push({
          sku: product.sku,
          name: product.name,
          currentStock: product.stock,
          latestBalanceAfter: 'None (No movements recorded)',
          status: 'FAIL: Stock > 0 but has no movements'
        });
      }
      continue;
    }

    if (latestMovement.balanceAfter === product.stock) {
      passedCount++;
    } else {
      mismatchCount++;
      discrepancies.push({
        sku: product.sku,
        name: product.name,
        currentStock: product.stock,
        latestBalanceAfter: latestMovement.balanceAfter,
        difference: product.stock - latestMovement.balanceAfter,
        status: 'FAIL: Product stock does not equal latest balanceAfter'
      });
    }
  }

  console.log('------------------------------------------------------------');
  console.log(`[VERIFY STOCK SUMMARY] Checked: ${totalChecked} products`);
  console.log(`[PASSED]: ${passedCount}`);
  console.log(`[FAILED]: ${mismatchCount}`);
  console.log('------------------------------------------------------------');

  if (mismatchCount > 0) {
    console.table(discrepancies);
    console.error('\n[VERIFY STOCK ERROR] Stock audit integrity check failed! Discrepancies detected.');
    process.exit(1);
  } else {
    console.log('\n[VERIFY STOCK SUCCESS] All products have 100% consistent stock balance audit logs.\n');
    process.exit(0);
  }
};

verifyStockConsistency().catch((err) => {
  console.error('[VERIFY STOCK ERROR]', err);
  process.exit(1);
});
