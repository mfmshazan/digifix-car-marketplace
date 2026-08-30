/**
 * Unit tests for the shared order pricing helper.
 * Pure logic — a hand-rolled fake prisma, no mocks framework needed for the DB.
 */

import { describe, it, expect } from 'vitest';
import {
  buildOrderPlan,
  assertStock,
  splitWalletAmount,
  SERVICE_CHARGE_RATE,
} from '../lib/orderPricing.js';

const address = { latitude: 6.9271, longitude: 79.8612 };

/** Fake prisma returning fixed product/carPart rows. */
const makePrisma = ({ products = [], carParts = [] }) => ({
  product: { findMany: async () => products },
  carPart: { findMany: async () => carParts },
});

const product = (over = {}) => ({
  id: 'p-1',
  name: 'Brake Pad',
  price: 1000,
  discountPrice: null,
  images: [],
  stock: 10,
  salesmanId: 'seller-1',
  salesman: { id: 'seller-1', name: 'Ali', managerId: null, store: null },
  deliveryVehicle: null,
  ...over,
});

describe('buildOrderPlan', () => {
  it('records a 10% service charge but does not add it to the customer total', async () => {
    const prisma = makePrisma({ products: [product()] });
    const plan = await buildOrderPlan({
      prisma,
      items: [{ productId: 'p-1', quantity: 2 }],
      address,
    });
    // The 10% margin is baked into the product price, so the total is just the
    // subtotal (+ delivery); serviceCharge is recorded for settlement only.
    expect(plan.grandTotal).toBe(2000);
    expect(plan.deliveryFee).toBe(0); // no pickup coords on the store
    const group = Object.values(plan.groupedBySeller)[0];
    expect(group.subtotal).toBe(2000);
    expect(group.serviceCharge).toBe(181.82); // 2000 − 2000/1.1 markup, reported only
  });

  it('prefers discountPrice when present', async () => {
    const prisma = makePrisma({ products: [product({ discountPrice: 800 })] });
    const plan = await buildOrderPlan({
      prisma,
      items: [{ productId: 'p-1', quantity: 1 }],
      address,
    });
    expect(plan.grandTotal).toBe(800); // discountPrice used; 10% margin not added
  });

  it('adds a distance-based delivery fee when the store has pickup coords', async () => {
    const withStore = product({
      salesman: {
        id: 'seller-1', name: 'Ali', managerId: null,
        store: { name: 'Ali', pickupLatitude: 6.90, pickupLongitude: 79.85 },
      },
      deliveryVehicle: 'CAR',
    });
    const prisma = makePrisma({ products: [withStore] });
    const plan = await buildOrderPlan({
      prisma,
      items: [{ productId: 'p-1', quantity: 1 }],
      address,
    });
    expect(plan.deliveryFee).toBeGreaterThan(0);
    expect(plan.grandTotal).toBe(1000 + plan.deliveryFee); // margin not added
  });

  it('throws {status:400} when an item id is not found', async () => {
    const prisma = makePrisma({ products: [] });
    await expect(
      buildOrderPlan({ prisma, items: [{ productId: 'ghost', quantity: 1 }], address })
    ).rejects.toMatchObject({ status: 400 });
  });

  it('throws {status:400} when the address has no coordinates', async () => {
    const prisma = makePrisma({ products: [product()] });
    await expect(
      buildOrderPlan({ prisma, items: [{ productId: 'p-1', quantity: 1 }], address: {} })
    ).rejects.toMatchObject({ status: 400 });
  });
});

describe('assertStock', () => {
  it('throws when an ordered quantity exceeds stock', () => {
    expect(() =>
      assertStock([{ productId: 'p-1', quantity: 5 }], [{ id: 'p-1', name: 'X', stock: 2 }], [])
    ).toThrow(/Only 2 left/);
  });
  it('passes when stock is sufficient', () => {
    expect(() =>
      assertStock([{ productId: 'p-1', quantity: 2 }], [{ id: 'p-1', name: 'X', stock: 2 }], [])
    ).not.toThrow();
  });
});

describe('splitWalletAmount', () => {
  it('returns all zeros when walletAmount is 0', () => {
    expect(splitWalletAmount(0, [100, 200])).toEqual([0, 0]);
  });
  it('gives the whole amount to a single order', () => {
    expect(splitWalletAmount(50, [120])).toEqual([50]);
  });
  it('splits proportionally and the parts sum back exactly', () => {
    const parts = splitWalletAmount(100, [100, 200, 300]); // ratios 1:2:3 of 600
    expect(parts.reduce((s, p) => s + p, 0)).toBe(100);
    expect(parts).toEqual([17, 33, 50]); // 16.67/33.33/50 -> rounded, drift on last
  });
});
