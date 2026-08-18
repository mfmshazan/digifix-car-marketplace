import prisma from '../lib/prisma.js';
import { generateUniqueJoinCode } from '../lib/joinCode.js';

/**
 * Return the shop join code the manager shares with salesmen so they can
 * self-register into this shop. Backfills a code for older stores that were
 * created before join codes existed.
 */
const getJoinCode = async (req, res) => {
  try {
    const managerId = req.user.userId;
    let store = await prisma.store.findUnique({
      where: { ownerId: managerId },
      select: { id: true, joinCode: true },
    });

    if (!store) {
      return res.status(404).json({
        success: false,
        message: 'No store found for this manager',
      });
    }

    if (!store.joinCode) {
      const joinCode = await generateUniqueJoinCode();
      store = await prisma.store.update({
        where: { id: store.id },
        data: { joinCode },
        select: { id: true, joinCode: true },
      });
    }

    res.json({ success: true, data: { joinCode: store.joinCode } });
  } catch (error) {
    console.error('Get join code error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch join code' });
  }
};

/**
 * List every salesman working under the authenticated manager, newest first,
 * so the dashboard can show both pending requests and active staff.
 */
const listSalesmen = async (req, res) => {
  try {
    const managerId = req.user.userId;
    const salesmen = await prisma.user.findMany({
      where: { managerId, role: 'SALESMAN' },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        avatar: true,
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: salesmen });
  } catch (error) {
    console.error('List salesmen error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch salesmen' });
  }
};

/**
 * Resolve a salesman that belongs to the authenticated manager, or null.
 * Guards every mutation so a manager can only act on their own staff.
 */
const findOwnSalesman = async (managerId, salesmanId) => {
  const salesman = await prisma.user.findUnique({
    where: { id: salesmanId },
    select: { id: true, role: true, managerId: true, status: true },
  });
  if (!salesman || salesman.role !== 'SALESMAN' || salesman.managerId !== managerId) {
    return null;
  }
  return salesman;
};

/** Approve a pending salesman so they can log in and operate. */
const approveSalesman = async (req, res) => {
  try {
    const managerId = req.user.userId;
    const salesman = await findOwnSalesman(managerId, req.params.id);
    if (!salesman) {
      return res.status(404).json({ success: false, message: 'Salesman not found' });
    }

    await prisma.user.update({
      where: { id: salesman.id },
      data: { status: 'ACTIVE' },
    });

    res.json({ success: true, message: 'Salesman approved' });
  } catch (error) {
    console.error('Approve salesman error:', error);
    res.status(500).json({ success: false, message: 'Failed to approve salesman' });
  }
};

/**
 * Reject / remove a salesman from the shop. Deletes the account so a rejected
 * applicant can retry with the same email; the SetNull relation would otherwise
 * leave an orphaned login.
 */
const rejectSalesman = async (req, res) => {
  try {
    const managerId = req.user.userId;
    const salesman = await findOwnSalesman(managerId, req.params.id);
    if (!salesman) {
      return res.status(404).json({ success: false, message: 'Salesman not found' });
    }

    // Only allow deleting staff still awaiting approval — an active salesman may
    // already own orders/products and should be deactivated via admin instead.
    if (salesman.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        message: 'Only pending salesmen can be rejected',
      });
    }

    await prisma.user.delete({ where: { id: salesman.id } });

    res.json({ success: true, message: 'Salesman request rejected' });
  } catch (error) {
    console.error('Reject salesman error:', error);
    res.status(500).json({ success: false, message: 'Failed to reject salesman' });
  }
};

export { getJoinCode, listSalesmen, approveSalesman, rejectSalesman };
