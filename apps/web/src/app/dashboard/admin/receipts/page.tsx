'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, XCircle, FileText, Image as ImageIcon, Truck, Store } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';

type UserType = 'SALESPERSON' | 'DELIVERY_PERSON' | 'OTHER';
type TabKey = 'NEED_TO_PAY' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'ALL';

interface ReceiptUser {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  role: string;
  stripeAccountId: string | null;
}

interface AdminReceipt {
  id: string;
  amount: number;
  fileType: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  note: string | null;
  rejectionReason: string | null;
  createdAt: string;
  viewUrl: string | null;
  userType: UserType;
  wallet: { id: string; balance: number; user: ReceiptUser };
}

interface WalletDebtor {
  walletId: string;
  balance: number;
  dueAmount: number;
  userType: UserType;
  user: ReceiptUser;
  pendingReceiptCount: number;
  pendingReceiptAmount: number;
  updatedAt: string;
}

const TABS: { key: TabKey; label: string }[] = [
  { key: 'NEED_TO_PAY', label: 'Need to pay' },
  { key: 'PENDING', label: 'Pending' },
  { key: 'APPROVED', label: 'Approved' },
  { key: 'REJECTED', label: 'Rejected' },
  { key: 'ALL', label: 'All' },
];

const money = (value: number) => `LKR ${Number(value || 0).toFixed(2)}`;

function UserTypeBadge({ userType, role }: { userType: UserType; role: string }) {
  const style =
    userType === 'DELIVERY_PERSON' ? 'bg-indigo-50 text-indigo-700'
      : userType === 'SALESPERSON' ? 'bg-amber-50 text-amber-700'
        : 'bg-gray-100 text-gray-600';
  const label =
    userType === 'DELIVERY_PERSON' ? 'Delivery person'
      : userType === 'SALESPERSON' ? 'Salesperson'
        : role;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${style}`}>
      {userType === 'DELIVERY_PERSON' ? <Truck size={12} /> : <Store size={12} />}
      {label}
    </span>
  );
}

export default function AdminReceiptsPage() {
  const { user, isAuthenticated } = useAuthStore();
  const router = useRouter();
  const [tab, setTab] = useState<TabKey>('NEED_TO_PAY');
  const [receipts, setReceipts] = useState<AdminReceipt[]>([]);
  const [debtors, setDebtors] = useState<WalletDebtor[]>([]);
  const [totalDue, setTotalDue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    if (!isAuthenticated) { router.replace('/login'); return; }
    if (user && user.role !== 'ADMIN') { router.replace('/'); }
  }, [isAuthenticated, user, router]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (tab === 'NEED_TO_PAY') {
        const res = await api.get('/wallet/receipts/admin/debtors');
        setDebtors(res.data.data);
        setTotalDue(res.data.summary?.totalDue ?? 0);
      } else {
        const res = await api.get('/wallet/receipts/admin', {
          params: tab === 'ALL' ? {} : { status: tab },
        });
        setReceipts(res.data.data);
      }
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => { load(); }, [load]);

  const approve = async (id: string) => {
    if (!confirm('Approve this receipt and credit the wallet?')) return;
    await api.post(`/wallet/receipts/${id}/review`, { decision: 'APPROVE' });
    load();
  };

  const reject = async (id: string) => {
    await api.post(`/wallet/receipts/${id}/review`, { decision: 'REJECT', rejectionReason });
    setRejectingId(null);
    setRejectionReason('');
    load();
  };

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold">Debt Repayment Receipts</h1>

      <div className="flex gap-2 flex-wrap">
        {TABS.map((t) => (
          <button
            key={t.key} onClick={() => setTab(t.key)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium ${tab === t.key ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : tab === 'NEED_TO_PAY' ? (
        debtors.length === 0 ? (
          <p className="text-gray-500">No salesperson or delivery person currently owes money.</p>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              {debtors.length} account{debtors.length === 1 ? '' : 's'} with a negative wallet balance ·
              total owed <span className="font-semibold text-red-600">{money(totalDue)}</span>
            </p>
            {debtors.map((d) => (
              <div key={d.walletId} className="bg-white rounded-xl shadow p-5">
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">{d.user.name || d.user.email}</p>
                      <UserTypeBadge userType={d.userType} role={d.user.role} />
                    </div>
                    <p className="text-sm text-gray-500">{d.user.email} · {d.user.phone || 'no phone'}</p>
                    <p className="text-sm text-gray-500">Stripe account: {d.user.stripeAccountId ? 'Connected' : 'Not connected'}</p>
                    {d.pendingReceiptCount > 0 && (
                      <p className="text-sm text-blue-600 mt-1">
                        {d.pendingReceiptCount} receipt{d.pendingReceiptCount === 1 ? '' : 's'} awaiting review ({money(d.pendingReceiptAmount)})
                      </p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-gray-400 uppercase tracking-wide">Needs to pay</p>
                    <p className="text-xl font-bold text-red-600">{money(d.dueAmount)}</p>
                    <p className="text-xs text-gray-400">Balance {money(d.balance)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      ) : receipts.length === 0 ? (
        <p className="text-gray-500">No receipts found.</p>
      ) : (
        <div className="space-y-4">
          {receipts.map((r) => (
            <div key={r.id} className="bg-white rounded-xl shadow p-5">
              <div className="flex justify-between items-start gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">{r.wallet.user.name || r.wallet.user.email}</p>
                    <UserTypeBadge userType={r.userType} role={r.wallet.user.role} />
                  </div>
                  <p className="text-sm text-gray-500">{r.wallet.user.email} · {r.wallet.user.phone || 'no phone'} · {r.wallet.user.role}</p>
                  <p className="text-sm text-gray-500">Current wallet balance: <span className={r.wallet.balance < 0 ? 'text-red-600 font-medium' : ''}>{money(r.wallet.balance)}</span></p>
                  <p className="text-sm text-gray-500">Stripe account: {r.wallet.user.stripeAccountId ? 'Connected' : 'Not connected'}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xl font-bold">{money(r.amount)}</p>
                  <p className="text-xs text-gray-400">{new Date(r.createdAt).toLocaleString()}</p>
                </div>
              </div>

              {r.note && <p className="mt-2 text-sm bg-gray-50 rounded p-2">{r.note}</p>}

              {r.viewUrl ? (
                <a href={r.viewUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-sm text-blue-600 underline">
                  {r.fileType === 'pdf' ? <FileText size={14} /> : <ImageIcon size={14} />} View receipt
                </a>
              ) : (
                <p className="mt-3 text-sm text-gray-400">No receipt uploaded yet</p>
              )}

              {r.status === 'PENDING' && (
                <div className="mt-4 flex gap-2 items-start">
                  <button onClick={() => approve(r.id)} className="flex items-center gap-1 bg-green-600 text-white px-3 py-1.5 rounded-lg text-sm">
                    <CheckCircle2 size={14} /> Approve
                  </button>
                  {rejectingId === r.id ? (
                    <div className="flex gap-2 flex-1">
                      <input
                        value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)}
                        placeholder="Reason for rejection" className="border rounded-lg px-2 py-1 text-sm flex-1"
                      />
                      <button onClick={() => reject(r.id)} className="bg-red-600 text-white px-3 py-1.5 rounded-lg text-sm">Confirm</button>
                    </div>
                  ) : (
                    <button onClick={() => setRejectingId(r.id)} className="flex items-center gap-1 bg-red-50 text-red-700 px-3 py-1.5 rounded-lg text-sm">
                      <XCircle size={14} /> Reject
                    </button>
                  )}
                </div>
              )}
              {r.status !== 'PENDING' && (
                <p className={`mt-3 text-sm font-medium ${r.status === 'APPROVED' ? 'text-green-600' : 'text-red-600'}`}>
                  {r.status}
                  {r.status === 'REJECTED' && r.rejectionReason && (
                    <span className="font-normal text-gray-500"> · {r.rejectionReason}</span>
                  )}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
