'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowDownCircle,
  ArrowUpCircle,
  CreditCard,
  DollarSign,
  FileText,
  Loader2,
  Receipt,
  Wallet,
} from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

interface WalletTransaction {
  id: string;
  amount: number;
  type?: string;
  description?: string | null;
  createdAt?: string;
  direction?: 'IN' | 'OUT';
  senderWallet?: { user?: { name?: string | null } } | null;
  receiverWallet?: { user?: { name?: string | null } } | null;
}

interface ReceiptItem {
  id: string;
  amount: number;
  status: string;
  createdAt?: string;
  note?: string | null;
  viewUrl?: string | null;
  fileType?: string | null;
}

interface WalletApiResponse {
  balance: number;
  walletId?: string;
  transactions?: WalletTransaction[];
}

export default function WalletDashboard({
  roleLabel = 'Salesman',
  onUploadReceiptClick,
}: {
  roleLabel?: string;
  /** When embedded in a tabbed dashboard, switch tabs in place instead of navigating away. */
  onUploadReceiptClick?: () => void;
}) {
  const router = useRouter();
  const { isAuthenticated, token, user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [wallet, setWallet] = useState<WalletApiResponse | null>(null);
  const [receipts, setReceipts] = useState<ReceiptItem[]>([]);
  const [stripeReady, setStripeReady] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const hasLoadedWallet = useRef(false);

  // Customers don't hold a payable wallet — only shop owners/salesmen withdraw funds,
  // so the Stripe connect/withdraw controls are scoped to them.
  const canPayout = user?.role === 'SALESMAN' || user?.role === 'SHOP_MANAGER';

  const loadWallet = async () => {
    try {
      setLoading(true);
      const requests = [api.get('/wallet/my'), api.get('/wallet/receipts/my')];
      if (canPayout) requests.push(api.get('/stripe/account-status'));

      const [walletRes, receiptRes, stripeRes] = await Promise.all(requests);

      setWallet(walletRes.data?.data ?? { balance: 0, transactions: [] });
      setReceipts(receiptRes.data?.data ?? []);
      if (canPayout && stripeRes?.data?.success) {
        setStripeReady(stripeRes.data.isReady);
      }
    } catch (err: any) {
      console.error('Failed to load wallet:', err);
      const msg = err?.response?.status === 401
        ? 'Your session expired. Please sign in again.'
        : err?.response?.data?.msg || 'Unable to load wallet details.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated || !token) {
      router.replace('/login');
      return;
    }

    if (hasLoadedWallet.current) return;
    hasLoadedWallet.current = true;

    loadWallet();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, token, router]);

  const handleOnboardStripe = async () => {
    try {
      setActionLoading(true);
      const res = await api.post('/stripe/onboard', {
        refreshUrl: window.location.href,
        returnUrl: window.location.href,
      });
      if (res.data?.success && res.data?.onboardingUrl) {
        window.open(res.data.onboardingUrl, '_blank', 'noopener,noreferrer');
      } else {
        setError('Failed to get Stripe setup link.');
      }
    } catch (err) {
      console.error('Failed to start Stripe onboarding:', err);
      setError('Network error. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const totals = useMemo(() => {
    const incoming = (wallet?.transactions ?? []).reduce((sum, tx) => {
      if (tx.direction === 'IN' || tx.amount >= 0) return sum + Math.abs(tx.amount || 0);
      return sum;
    }, 0);

    const outgoing = (wallet?.transactions ?? []).reduce((sum, tx) => {
      if (tx.direction === 'OUT' || tx.amount < 0) return sum + Math.abs(tx.amount || 0);
      return sum;
    }, 0);

    const pendingReceipts = receipts.filter((r) => r.status === 'PENDING').length;

    return { incoming, outgoing, pendingReceipts };
  }, [wallet, receipts]);

  const balance = wallet?.balance ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{roleLabel} wallet</p>
          <h1 className="text-2xl font-bold text-gray-900">Wallet & payment history</h1>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => onUploadReceiptClick ? onUploadReceiptClick() : router.push('/dashboard/salesman/receipts')}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:border-gray-300 hover:bg-gray-50"
          >
            <Receipt className="h-4 w-4" />
            Upload receipt
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex min-h-[240px] items-center justify-center rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center gap-3 text-gray-600">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading wallet...
          </div>
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-gray-200 bg-[#060618] p-5 text-white shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-300">Available balance</p>
                  <p className="mt-2 text-3xl font-bold">LKR {Number(balance).toLocaleString()}</p>
                </div>
                <div className="rounded-xl bg-white/10 p-3">
                  <Wallet className="h-6 w-6 text-[#8ec5ff]" />
                </div>
              </div>

              {canPayout && !stripeReady && (
                <button
                  onClick={handleOnboardStripe}
                  disabled={actionLoading}
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#6366F1] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#5457e0] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {actionLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <CreditCard className="h-4 w-4" />
                      Complete Stripe setup
                    </>
                  )}
                </button>
              )}
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Incoming</p>
                  <p className="mt-2 text-2xl font-bold text-emerald-600">LKR {totals.incoming.toLocaleString()}</p>
                </div>
                <div className="rounded-xl bg-emerald-50 p-3 text-emerald-600">
                  <ArrowDownCircle className="h-6 w-6" />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Outgoing</p>
                  <p className="mt-2 text-2xl font-bold text-amber-600">LKR {totals.outgoing.toLocaleString()}</p>
                </div>
                <div className="rounded-xl bg-amber-50 p-3 text-amber-600">
                  <ArrowUpCircle className="h-6 w-6" />
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
            <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900">Recent transactions</h2>
                <span className="text-xs font-medium uppercase tracking-wide text-gray-400">Last 30</span>
              </div>

              {(wallet?.transactions ?? []).length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-500">
                  No wallet activity yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {(wallet?.transactions ?? []).map((tx) => {
                    const isIncoming = tx.direction === 'IN' || tx.amount >= 0;
                    const label = tx.description || tx.type || 'Wallet activity';
                    const counterparty = isIncoming
                      ? tx.senderWallet?.user?.name || 'System'
                      : tx.receiverWallet?.user?.name || 'System';

                    return (
                      <div key={tx.id} className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                        <div className="flex items-start gap-3">
                          <div className={`rounded-full p-2 ${isIncoming ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                            {isIncoming ? <ArrowDownCircle className="h-4 w-4" /> : <ArrowUpCircle className="h-4 w-4" />}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">{label}</p>
                            <p className="text-xs text-gray-500">
                              {counterparty} · {tx.createdAt ? new Date(tx.createdAt).toLocaleString() : 'Recent'}
                            </p>
                          </div>
                        </div>
                        <p className={`text-sm font-bold ${isIncoming ? 'text-emerald-600' : 'text-amber-600'}`}>
                          {isIncoming ? '+' : '-'}LKR {Math.abs(Number(tx.amount || 0)).toLocaleString()}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            <aside className="space-y-5">
              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="mb-3 flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-[#060618]" />
                  <h3 className="text-lg font-bold text-gray-900">Quick summary</h3>
                </div>
                <div className="space-y-4 text-sm text-gray-600">
                  <div className="flex items-center justify-between">
                    <span>Pending receipts</span>
                    <strong className="text-gray-900">{totals.pendingReceipts}</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Wallet status</span>
                    <strong className={balance >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                      {balance >= 0 ? 'Healthy' : 'Needs settlement'}
                    </strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Payment method</span>
                    <strong className="text-gray-900">Bank transfer</strong>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="mb-3 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-[#060618]" />
                  <h3 className="text-lg font-bold text-gray-900">Recent receipts</h3>
                </div>

                {receipts.length === 0 ? (
                  <p className="text-sm text-gray-500">No receipt submissions yet.</p>
                ) : (
                  <div className="space-y-3">
                    {receipts.slice(0, 4).map((receipt) => (
                      <div key={receipt.id} className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-semibold text-gray-900">LKR {Number(receipt.amount || 0).toLocaleString()}</p>
                          <span className="rounded-full bg-gray-200 px-2 py-1 text-[10px] font-semibold uppercase text-gray-700">
                            {receipt.status}
                          </span>
                        </div>
                        <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                          <span>{receipt.createdAt ? new Date(receipt.createdAt).toLocaleDateString() : 'Recent'}</span>
                          {receipt.viewUrl ? (
                            <a href={receipt.viewUrl} target="_blank" rel="noreferrer" className="font-medium text-blue-600">
                              View
                            </a>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </aside>
          </div>
        </>
      )}
    </div>
  );
}
