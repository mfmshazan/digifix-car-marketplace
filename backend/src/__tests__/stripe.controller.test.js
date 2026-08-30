/**
 * Stripe Controller Unit Tests — split wallet + card checkout.
 *
 * Verifies:
 *  - createCheckoutSession bills Stripe only the remainder (grandTotal - walletAmount)
 *    and forwards walletAmount in the session metadata.
 *  - verifyPaymentAndSaveOrder prices the order with fees, decrements stock,
 *    debits the wallet slice (customer -> admin PURCHASE) and deposits the card
 *    slice (DEPOSIT), and is idempotent per session id.
 *
 * All external modules mocked — no real Stripe, DB, or network.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Stripe SDK mock (hoisted so vi.mock's factory can see it) ─────────────────
const stripeMock = vi.hoisted(() => ({
  checkout: { sessions: { create: vi.fn(), retrieve: vi.fn() } },
  balance: { retrieve: vi.fn() },
  accounts: { create: vi.fn() },
  accountLinks: { create: vi.fn() },
  account: { retrieve: vi.fn() },
  transfers: { create: vi.fn() },
}));
vi.mock('stripe', () => ({ default: function Stripe() { return stripeMock; } }));

vi.mock('../lib/prisma.js', () => import('./__mocks__/prisma.js'));
vi.mock('../lib/adminWallet.js', () => ({
  getAdminWallet: vi.fn().mockResolvedValue({ id: 'admin-wallet', balance: 0 }),
  ensureWallet: vi.fn().mockResolvedValue({ id: 'cust-wallet', balance: 100000 }),
}));

import prisma from '../lib/prisma.js';
import stripeController from '../controllers/stripe.controller.js';

const makeRes = () => ({
  _status: 200,
  _body: null,
  status(c) { this._status = c; return this; },
  json(b) { this._body = b; return this; },
});

const address = {
  id: 'addr-1', street: '1 A St', city: 'Colombo', state: 'W', postalCode: '1',
  country: 'LK', latitude: 6.9271, longitude: 79.8612,
};

const productRow = {
  id: 'p-1', name: 'Brake Pad', price: 1000, discountPrice: null, images: [], stock: 10,
  salesmanId: 'seller-1',
  salesman: { id: 'seller-1', name: 'Ali', managerId: null, store: null },
  deliveryVehicleType: null,
};

beforeEach(() => {
  prisma.product.findMany.mockResolvedValue([productRow]);
  prisma.carPart.findMany.mockResolvedValue([]);
  prisma.address.findFirst.mockResolvedValue(address);
  prisma.wallet.findUnique.mockResolvedValue({ id: 'cust-wallet', balance: 100000 });
  prisma.walletTransaction.findFirst.mockResolvedValue(null);
});

describe('createCheckoutSession', () => {
  it('bills Stripe only the remainder and passes walletAmount in metadata', async () => {
    stripeMock.checkout.sessions.create.mockResolvedValueOnce({ url: 'https://stripe.test/pay', metadata: {} });

    const req = {
      user: { id: 'cust-1', role: 'CUSTOMER' },
      body: {
        items: [{ productId: 'p-1', quantity: 1, name: 'Brake Pad', price: 1000, quantity: 1 }],
        addressId: 'addr-1',
        walletAmount: 200,
      },
    };
    const res = makeRes();
    await stripeController.createCheckoutSession(req, res);

    // grandTotal = 1000 (10% margin baked into price, not added); remainder =
    // 1000 - 200 wallet = 800 -> 80000 cents
    const arg = stripeMock.checkout.sessions.create.mock.calls[0][0];
    expect(arg.line_items).toHaveLength(1);
    expect(arg.line_items[0].price_data.unit_amount).toBe(80000);
    expect(arg.metadata.walletAmount).toBe('200');
    expect(res._body.url).toBe('https://stripe.test/pay');
  });

  it('rejects when the wallet slice covers the whole order', async () => {
    const req = {
      user: { id: 'cust-1', role: 'CUSTOMER' },
      body: {
        items: [{ productId: 'p-1', quantity: 1, name: 'Brake Pad', price: 1000 }],
        addressId: 'addr-1',
        walletAmount: 5000,
      },
    };
    const res = makeRes();
    await stripeController.createCheckoutSession(req, res);

    expect(res._status).toBe(400);
    expect(res._body.message).toMatch(/wallet payment option/i);
  });
});

describe('verifyPaymentAndSaveOrder', () => {
  const session = {
    payment_status: 'paid',
    metadata: {
      userID: 'cust-1',
      addressId: 'addr-1',
      walletAmount: '200',
      cartSummary: JSON.stringify([{ productId: 'p-1', itemType: 'PRODUCT', quantity: 1 }]),
    },
  };

  it('creates the order with fees, decrements stock, splits wallet vs card', async () => {
    stripeMock.checkout.sessions.retrieve.mockResolvedValueOnce(session);
    prisma.wallet.findUnique.mockResolvedValue({ id: 'cust-wallet', balance: 100000 });

    const txSpy = {
      order: { create: vi.fn().mockResolvedValue({ id: 'ord-1', orderNumber: 'ORD-X' }) },
      orderTracking: { create: vi.fn() },
      product: { update: vi.fn() },
      carPart: { update: vi.fn() },
      wallet: { update: vi.fn() },
      walletTransaction: { create: vi.fn() },
    };
    prisma.$transaction.mockImplementationOnce(async (fn) => fn(txSpy));

    const req = { params: { sessionId: 'sess_1' }, user: { id: 'cust-1' } };
    const res = makeRes();
    await stripeController.verifyPaymentAndSaveOrder(req, res);

    expect(res._body).toEqual({ success: true, status: 'paid', orderId: 'ord-1' });

    // order.total includes the 10% service charge
    const orderData = txSpy.order.create.mock.calls[0][0].data;
    expect(orderData.total).toBe(1100);
    expect(orderData.serviceCharge).toBe(100);
    expect(orderData.walletAmount).toBe(200);
    expect(orderData.paymentStatus).toBe('PAID');

    // stock decremented
    expect(txSpy.product.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'p-1' }, data: { stock: { decrement: 1 } },
    }));

    // wallet slice: customer -> admin PURCHASE (200); card slice: DEPOSIT (800)
    const txnTypes = txSpy.walletTransaction.create.mock.calls.map((c) => c[0].data);
    expect(txnTypes).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'PURCHASE', amount: 200 }),
      expect.objectContaining({ type: 'DEPOSIT', amount: 800, sourceRef: 'sess_1' }),
    ]));
  });

  it('is idempotent — a second call returns the existing order without re-creating', async () => {
    stripeMock.checkout.sessions.retrieve.mockResolvedValueOnce(session);
    prisma.walletTransaction.findFirst.mockResolvedValueOnce({ orderId: 'ord-1' });

    const req = { params: { sessionId: 'sess_1' }, user: { id: 'cust-1' } };
    const res = makeRes();
    await stripeController.verifyPaymentAndSaveOrder(req, res);

    expect(res._body).toEqual({ success: true, status: 'paid', orderId: 'ord-1' });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
