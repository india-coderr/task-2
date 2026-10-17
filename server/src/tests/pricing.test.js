import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { calculateSaleTotals, toPaise, fromPaise } from '../utils/money.js';

describe('Pricing and Calculation Unit Tests (calculateSaleTotals)', () => {
  const sampleItems = [
    {
      productId: '60d5ec49f1b2c8b1f8e4e1a1',
      sku: 'BAS-001',
      name: 'Basmati Rice 5 kg',
      unitPrice: 640.00,
      costPrice: 500.00,
      quantity: 1
    },
    {
      productId: '60d5ec49f1b2c8b1f8e4e1a2',
      sku: 'BUT-002',
      name: 'Amul Butter 500 g',
      unitPrice: 285.00,
      costPrice: 240.00,
      quantity: 2
    },
    {
      productId: '60d5ec49f1b2c8b1f8e4e1a3',
      sku: 'TOM-003',
      name: 'Tomatoes 1 kg',
      unitPrice: 40.00,
      costPrice: 25.00,
      quantity: 3
    }
  ];

  test('Subtotal calculation without discount or tax', () => {
    // 640*1 + 285*2 + 40*3 = 640 + 570 + 120 = 1330.00
    const result = calculateSaleTotals({
      items: sampleItems,
      discountType: 'none',
      discountValue: 0,
      taxRate: 0
    });

    assert.equal(result.subtotal, 1330.00);
    assert.equal(result.discountAmount, 0.00);
    assert.equal(result.taxAmount, 0.00);
    assert.equal(result.total, 1330.00);
    assert.equal(result.items.length, 3);
    assert.equal(result.items[0].lineTotal, 640.00);
    assert.equal(result.items[1].lineTotal, 570.00);
    assert.equal(result.items[2].lineTotal, 120.00);
  });

  test('Percent discount calculation (5% discount on 1330)', () => {
    // Subtotal: 1330.00
    // 5% discount: 1330 * 0.05 = 66.50
    // Taxable: 1330 - 66.50 = 1263.50
    // 5% tax on taxable: 1263.50 * 0.05 = 63.175 -> round half-up: 63.18
    // Total: 1263.50 + 63.18 = 1326.68
    const result = calculateSaleTotals({
      items: sampleItems,
      discountType: 'percent',
      discountValue: 5,
      taxRate: 5
    });

    assert.equal(result.subtotal, 1330.00);
    assert.equal(result.discountAmount, 66.50);
    assert.equal(result.taxRate, 5);
    assert.equal(result.taxAmount, 63.18);
    assert.equal(result.total, 1326.68);
  });

  test('Fixed discount calculation (₹100 fixed discount)', () => {
    // Subtotal: 1330.00
    // Discount: 100.00
    // Taxable: 1330 - 100 = 1230.00
    // 5% tax: 1230 * 0.05 = 61.50
    // Total: 1230 + 61.50 = 1291.50
    const result = calculateSaleTotals({
      items: sampleItems,
      discountType: 'fixed',
      discountValue: 100,
      taxRate: 5
    });

    assert.equal(result.subtotal, 1330.00);
    assert.equal(result.discountAmount, 100.00);
    assert.equal(result.taxAmount, 61.50);
    assert.equal(result.total, 1291.50);
  });

  test('Tax applied strictly on (subtotal - discount), not subtotal', () => {
    // Subtotal: 100.00, Discount: 50.00
    // Taxable: 50.00
    // 10% tax on 50 = 5.00 (not 10.00 on 100)
    // Total: 55.00
    const singleItem = [
      {
        productId: '60d5ec49f1b2c8b1f8e4e1a1',
        sku: 'TEST-1',
        name: 'Item 1',
        unitPrice: 100.00,
        costPrice: 60.00,
        quantity: 1
      }
    ];

    const result = calculateSaleTotals({
      items: singleItem,
      discountType: 'fixed',
      discountValue: 50,
      taxRate: 10
    });

    assert.equal(result.subtotal, 100.00);
    assert.equal(result.discountAmount, 50.00);
    assert.equal(result.taxAmount, 5.00);
    assert.equal(result.total, 55.00);
  });

  test('Rounding half up with fractional paise', () => {
    // 1 item @ ₹33.33 * 3 = ₹99.99
    // 7% tax on 99.99: 99.99 * 0.07 = 6.9993 -> round to 7.00
    // Total: 99.99 + 7.00 = 106.99
    const item = [
      {
        productId: '60d5ec49f1b2c8b1f8e4e1a1',
        sku: 'TEST-R',
        name: 'Rounding Test Item',
        unitPrice: 33.33,
        costPrice: 20.00,
        quantity: 3
      }
    ];

    const result = calculateSaleTotals({
      items: item,
      discountType: 'none',
      discountValue: 0,
      taxRate: 7
    });

    assert.equal(result.subtotal, 99.99);
    assert.equal(result.taxAmount, 7.00);
    assert.equal(result.total, 106.99);
  });

  test('Discount capped at subtotal if discount > subtotal', () => {
    const item = [
      {
        productId: '60d5ec49f1b2c8b1f8e4e1a1',
        sku: 'TEST-CAP',
        name: 'Cap Item',
        unitPrice: 50.00,
        costPrice: 30.00,
        quantity: 1
      }
    ];

    const result = calculateSaleTotals({
      items: item,
      discountType: 'fixed',
      discountValue: 150.00,
      taxRate: 5
    });

    assert.equal(result.subtotal, 50.00);
    assert.equal(result.discountAmount, 50.00);
    assert.equal(result.taxAmount, 0.00);
    assert.equal(result.total, 0.00);
  });

  test('Warning generated when selling price is lower than purchase price', () => {
    const item = [
      {
        productId: '60d5ec49f1b2c8b1f8e4e1a1',
        sku: 'LOSS-01',
        name: 'Loss Leader Item',
        unitPrice: 40.00,
        costPrice: 60.00,
        quantity: 1
      }
    ];

    const result = calculateSaleTotals({
      items: item,
      discountType: 'none',
      discountValue: 0,
      taxRate: 0
    });

    assert.equal(result.warnings.length, 1);
    assert.match(result.warnings[0], /lower than purchase price/);
  });
});
