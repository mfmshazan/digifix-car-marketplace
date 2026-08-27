// Shared Prisma mock — all methods are vi.fn() stubs.
// Each test can override return values with .mockResolvedValueOnce() etc.
import { vi } from 'vitest';

const prisma = {
  product: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
  },
  carPart: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
  },
  cartItem: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
  },
  order: {
    create: vi.fn(),
    findMany: vi.fn(),
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    count: vi.fn(),
    update: vi.fn(),
  },
  orderTracking: {
    create: vi.fn(),
  },
  user: {
    findUnique: vi.fn().mockResolvedValue(undefined),
    findMany: vi.fn().mockResolvedValue([]),
  },
  address: {
    findFirst: vi.fn(),
  },
  store: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  review: {
    create: vi.fn(),
    findUnique: vi.fn(),
    aggregate: vi.fn(),
  },
  wallet: {
    findUnique: vi.fn(),
    update: vi.fn(),
    create: vi.fn(),
  },
  walletTransaction: {
    create: vi.fn(),
  },
  $transaction: vi.fn(),
};

export default prisma;
