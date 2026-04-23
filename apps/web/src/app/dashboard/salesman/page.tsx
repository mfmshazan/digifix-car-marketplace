'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  Package,
  Plus,
  DollarSign,
  ShoppingCart,
  TrendingUp,
  LogOut,
  Eye,
  Edit,
  Trash2,
  Store,
  X,
  Camera,
  Phone,
  Clock,
  CheckCircle2,
  Truck,
  AlertCircle,
  RefreshCw,
  ChevronDown,
  BarChart3,
  ListOrdered,
  Star,
  CalendarDays,
  Receipt,
  Users,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { resolveMediaUrl, ordersApi } from '@/lib/api';
import { connectSocket, disconnectSocket } from '@/lib/socket';

// ─── Types ────────────────────────────────────────────────────────────────────

type OrderStatus = 'PENDING' | 'CONFIRMED' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';

interface OrderItem {
  id: string;
  product: { id: string; name: string; images: string[] };
  itemName?: string;
  quantity: number;
  price: number;
  total: number;
}

interface Order {
  id: string;
  orderNumber: string;
  customer: { id: string; name: string; email: string };
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  status: OrderStatus;
  paymentStatus: string;
  createdAt: string;
}

interface SalesSummary {
  today: {
    date: string;
    totalOrders: number;
    totalRevenue: number;
    pendingOrders: number;
    completedOrders: number;
    totalItems: number;
    orders: Order[];
  };
  weekly: { totalRevenue: number; totalOrders: number };
  monthly: { totalRevenue: number; totalOrders: number };
  topSellingProducts: {
    uniqueId: string;
    id: string;
    name: string;
    images: string[];
    price: number;
    totalSold: number;
    totalRevenue: number;
  }[];
}

// ─── Status Helpers ─────────────────────────────────────────────────────────

const STATUS_FLOW: OrderStatus[] = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'];

const STATUS_META: Record<OrderStatus, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  PENDING: { label: 'Pending', color: 'text-amber-700', bg: 'bg-amber-100', icon: Clock },
  CONFIRMED: { label: 'Confirmed', color: 'text-sky-700', bg: 'bg-sky-100', icon: CheckCircle2 },
  PROCESSING: { label: 'Processing', color: 'text-blue-700', bg: 'bg-blue-100', icon: RefreshCw },
  SHIPPED: { label: 'Shipped', color: 'text-purple-700', bg: 'bg-purple-100', icon: Truck },
  DELIVERED: { label: 'Delivered', color: 'text-green-700', bg: 'bg-green-100', icon: CheckCircle2 },
  CANCELLED: { label: 'Cancelled', color: 'text-red-700', bg: 'bg-red-100', icon: AlertCircle },
};

function StatusBadge({ status }: { status: OrderStatus }) {
  const meta = STATUS_META[status as OrderStatus] ?? { label: status, color: 'text-gray-700', bg: 'bg-gray-100', icon: Clock };
  const Icon = meta.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${meta.bg} ${meta.color}`}>
      <Icon className="w-3.5 h-3.5" />
      {meta.label}
    </span>
  );
}

function formatRs(amount: number) {
  return `Rs. ${amount.toLocaleString()}`;
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ─── Status Update Dropdown ──────────────────────────────────────────────────

function StatusDropdown({ order, onUpdate }: { order: Order; onUpdate: (id: string, status: OrderStatus) => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const currentIndex = STATUS_FLOW.indexOf(order.status as OrderStatus);
  const nextStatuses = STATUS_FLOW.slice(currentIndex + 1);
  const dropdownOptions = [...nextStatuses, 'CANCELLED' as OrderStatus];

  if (order.status === 'DELIVERED' || order.status === 'CANCELLED') {
    const meta = STATUS_META[order.status as OrderStatus] ?? { label: order.status, color: 'text-gray-700', bg: 'bg-gray-100', icon: Clock };
    const Icon = meta.icon;
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${meta.bg} ${meta.color}`}>
        <Icon className="w-3.5 h-3.5" />
        {meta.label}
      </span>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        disabled={loading}
        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${STATUS_META[order.status as OrderStatus]?.bg || 'bg-gray-100'} ${STATUS_META[order.status as OrderStatus]?.color || 'text-gray-700'} hover:opacity-80 transition-colors`}
      >
        {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Clock className="w-3.5 h-3.5" />}
        {STATUS_META[order.status as OrderStatus]?.label ?? order.status}
        <ChevronDown className="w-3 h-3" />
      </button>
      {open && (
        <div className="absolute top-full mt-1 right-0 z-20 bg-white border border-gray-200 rounded-xl shadow-lg py-1 min-w-[140px]">
          {dropdownOptions.map(s => {
            const meta = STATUS_META[s];
            const Icon = meta.icon;
            return (
              <button
                key={s}
                onClick={async () => {
                  setOpen(false);
                  setLoading(true);
                  await onUpdate(order.id, s);
                  setLoading(false);
                }}
                className={`w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-50 ${meta.color}`}
              >
                <Icon className="w-4 h-4" />
                Mark as {meta.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Order Card ──────────────────────────────────────────────────────────────

function OrderCard({ order, onUpdate }: { order: Order; onUpdate: (id: string, status: OrderStatus) => Promise<void> }) {
  const [expanded, setExpanded] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="p-4 flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-bold text-gray-900 text-sm">{order.orderNumber}</span>
            <span className="text-gray-400 text-xs">·</span>
            <span className="text-gray-500 text-xs">{timeAgo(order.createdAt)}</span>
          </div>
          <div className="flex items-center gap-1.5 text-gray-600 text-sm">
            <Users className="w-3.5 h-3.5" />
            <span className="truncate">{order.customer?.name ?? 'Unknown Customer'}</span>
          </div>
          <div className="mt-1 text-xs text-gray-400">{order.customer?.email}</div>
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <StatusDropdown order={order} onUpdate={onUpdate} />
          <span className="font-bold text-gray-900 text-sm">{formatRs(order.total)}</span>
        </div>
      </div>

      {/* Items Preview */}
      <div className="px-4 pb-3 border-t border-gray-50">
        <div className="pt-3 flex items-center justify-between">
          <span className="text-xs text-gray-500">{order.items.length} item{order.items.length !== 1 ? 's' : ''}</span>
          <button
            onClick={() => setExpanded(v => !v)}
            className="text-xs text-[#00002E] font-medium hover:underline flex items-center gap-1"
          >
            {expanded ? 'Hide' : 'View'} items
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {expanded && (
          <div className="mt-3 space-y-2">
            {order.items.map(item => (
              <div key={item.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
                  {item.product?.images?.[0] ? (
                    <button onClick={() => setPreviewImage(item.product.images[0])} className="w-full h-full p-0 border-0 bg-transparent rounded-lg hover:opacity-80 transition-opacity">
                      <Image src={item.product.images[0]} alt={item.product?.name ?? ''} width={40} height={40} className="object-cover w-full h-full rounded-lg" />
                    </button>
                  ) : (
                    <Package className="w-5 h-5 text-gray-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{item.product?.name ?? item.itemName ?? 'Item'}</p>
                  <p className="text-xs text-gray-500">Qty: {item.quantity} × {formatRs(item.price)}</p>
                </div>
                <span className="text-sm font-semibold text-gray-900 shrink-0">{formatRs(item.total)}</span>
              </div>
            ))}
            {/* Totals */}
            <div className="pt-2 space-y-1">
              <div className="flex justify-between text-xs text-gray-500">
                <span>Subtotal</span><span>{formatRs(order.subtotal)}</span>
              </div>
              {order.deliveryFee > 0 && (
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Delivery</span><span>{formatRs(order.deliveryFee)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-bold text-gray-900 border-t border-gray-100 pt-1 mt-1">
                <span>Total</span><span>{formatRs(order.total)}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Image Preview Modal */}
      {previewImage && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setPreviewImage(null)}>
          <div className="relative w-full max-w-2xl max-h-[90vh] flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
            <Image src={previewImage} alt="Product Preview" width={800} height={800} className="object-contain rounded-xl max-h-[85vh]" />
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute -top-4 -right-4 md:-top-10 md:-right-10 p-2 bg-white/20 hover:bg-white/40 text-white rounded-full transition-colors backdrop-blur-md"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Current Orders Tab ──────────────────────────────────────────────────────

function CurrentOrdersTab({ userId }: { userId: string }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [newOrderAlert, setNewOrderAlert] = useState<string | null>(null);

  const loadOrders = useCallback(async () => {
    try {
      const params: { status?: string; limit: number } = { limit: 50 };
      if (filterStatus) params.status = filterStatus;
      const res = await ordersApi.getSalesmanOrders(params);
      if (res.success) {
        setOrders(res.data.orders);
        setLastRefresh(new Date());
      }
    } catch (err) {
      console.error('Failed to load orders', err);
    } finally {
      setIsLoading(false);
    }
  }, [filterStatus]);

  useEffect(() => {
    setIsLoading(true);
    loadOrders();
  }, [loadOrders]);

  // ── Real-time socket listeners ──────────────────────────────────────────────
  useEffect(() => {
    if (!userId) return;
    const socket = connectSocket(userId);

    // A customer placed a new order → pull fresh list and flash an alert
    const handleNewOrder = (payload: { orderNumber: string }) => {
      setNewOrderAlert(`🆕 New order received: ${payload.orderNumber}`);
      loadOrders();
      setTimeout(() => setNewOrderAlert(null), 6000);
    };

    // Salesman updated status elsewhere (e.g., another tab) → update in-place
    const handleStatusUpdate = (payload: { orderId: string; status: OrderStatus }) => {
      setOrders(prev =>
        prev.map(o => o.id === payload.orderId ? { ...o, status: payload.status } : o)
      );
      setLastRefresh(new Date());
    };

    socket.on('newOrder', handleNewOrder);
    socket.on('orderStatusUpdated', handleStatusUpdate);

    return () => {
      socket.off('newOrder', handleNewOrder);
      socket.off('orderStatusUpdated', handleStatusUpdate);
    };
  }, [userId, loadOrders]);

  const handleUpdateStatus = async (id: string, status: OrderStatus) => {
    await ordersApi.updateOrderStatus(id, status);
    // Optimistically update UI immediately — socket will confirm shortly too
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o));
  };

  const activeOrders = orders.filter(o => o.status !== 'DELIVERED' && o.status !== 'CANCELLED');
  const displayOrders = filterStatus ? orders : activeOrders;

  const filterOptions = [
    { value: '', label: 'Active Orders' },
    { value: 'PENDING', label: 'Pending' },
    { value: 'PROCESSING', label: 'Processing' },
    { value: 'SHIPPED', label: 'Shipped' },
    { value: 'DELIVERED', label: 'Delivered' },
    { value: 'CANCELLED', label: 'Cancelled' },
  ];

  return (
    <div>
      {/* New Order Alert Banner */}
      {newOrderAlert && (
        <div className="mb-4 px-4 py-3 bg-green-50 border border-green-200 rounded-xl flex items-center gap-2 text-green-800 text-sm font-medium animate-pulse">
          <span className="text-lg">🔔</span>
          {newOrderAlert}
        </div>
      )}
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          {filterOptions.map(opt => (
            <button
              key={opt.value}
              onClick={() => setFilterStatus(opt.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${filterStatus === opt.value
                  ? 'bg-[#00002E] text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:border-[#00002E]/40'
                }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => { setIsLoading(true); loadOrders(); }}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-[#00002E] transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Updated {timeAgo(lastRefresh.toISOString())}</span>
        </button>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="w-10 h-10 border-2 border-[#00002E] border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 text-sm">Loading orders…</p>
        </div>
      ) : displayOrders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <ShoppingCart className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-gray-700 font-semibold text-lg mb-1">No orders yet</h3>
          <p className="text-gray-500 text-sm">New orders from customers will appear here.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {displayOrders.map(order => (
            <OrderCard key={order.id} order={order} onUpdate={handleUpdateStatus} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Sales History Tab ───────────────────────────────────────────────────────

function SalesHistoryTab() {
  const [summary, setSummary] = useState<SalesSummary | null>(null);
  const [completedOrders, setCompletedOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [sumRes, ordersRes] = await Promise.all([
          ordersApi.getSalesmanSummary(),
          ordersApi.getSalesmanOrders({ status: 'DELIVERED', limit: 50 }),
        ]);
        if (sumRes.success) setSummary(sumRes.data);
        if (ordersRes.success) setCompletedOrders(ordersRes.data.orders);
      } catch (err) {
        console.error('Failed to load summary', err);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="w-10 h-10 border-2 border-[#00002E] border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-500 text-sm">Loading sales history…</p>
      </div>
    );
  }

  const statsCards = [
    {
      label: "Today's Revenue",
      value: formatRs(summary?.today.totalRevenue ?? 0),
      sub: `${summary?.today.totalOrders ?? 0} orders today`,
      icon: DollarSign,
      color: 'from-emerald-500 to-teal-500',
    },
    {
      label: 'Weekly Revenue',
      value: formatRs(summary?.weekly.totalRevenue ?? 0),
      sub: `${summary?.weekly.totalOrders ?? 0} orders this week`,
      icon: TrendingUp,
      color: 'from-blue-500 to-indigo-500',
    },
    {
      label: 'Monthly Revenue',
      value: formatRs(summary?.monthly.totalRevenue ?? 0),
      sub: `${summary?.monthly.totalOrders ?? 0} orders this month`,
      icon: BarChart3,
      color: 'from-violet-500 to-purple-500',
    },
    {
      label: 'Completed Orders',
      value: String(completedOrders.length),
      sub: 'Total delivered',
      icon: CheckCircle2,
      color: 'from-rose-500 to-pink-500',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statsCards.map(card => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="bg-white rounded-2xl shadow-sm p-5 border border-gray-100">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center mb-3`}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              <p className="text-2xl font-bold text-gray-900 mb-0.5">{card.value}</p>
              <p className="text-xs text-gray-500">{card.label}</p>
              <p className="text-xs text-gray-400 mt-0.5">{card.sub}</p>
            </div>
          );
        })}
      </div>

      {/* Top Selling Products */}
      {(summary?.topSellingProducts?.length ?? 0) > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-5">
            <Star className="w-5 h-5 text-amber-500" />
            <h2 className="text-base font-bold text-gray-900">Top Selling Products (This Month)</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {summary!.topSellingProducts.map((product, idx) => (
              <div key={product.uniqueId} className="flex items-center gap-4 py-3 first:pt-0 last:pb-0">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${idx === 0 ? 'bg-amber-100 text-amber-700' :
                    idx === 1 ? 'bg-gray-100 text-gray-600' :
                      idx === 2 ? 'bg-orange-100 text-orange-700' :
                        'bg-gray-50 text-gray-500'
                  }`}>{idx + 1}</span>
                <div className="w-10 h-10 bg-gray-100 rounded-lg shrink-0 flex items-center justify-center overflow-hidden">
                  {product.images?.[0] ? (
                    <Image src={product.images[0]} alt={product.name} width={40} height={40} className="object-cover" />
                  ) : <Package className="w-5 h-5 text-gray-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{product.name}</p>
                  <p className="text-xs text-gray-500">{product.totalSold} units sold</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-gray-900">{formatRs(product.totalRevenue ?? 0)}</p>
                  <p className="text-xs text-gray-400">{formatRs(product.price)} each</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Completed Orders List */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center gap-2 mb-5">
          <Receipt className="w-5 h-5 text-green-600" />
          <h2 className="text-base font-bold text-gray-900">Delivered Orders</h2>
          <span className="ml-auto text-xs bg-green-100 text-green-700 font-semibold px-2.5 py-1 rounded-full">{completedOrders.length}</span>
        </div>
        {completedOrders.length === 0 ? (
          <div className="text-center py-10 text-gray-400 text-sm">No delivered orders yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                  <th className="pb-3 font-semibold">Order #</th>
                  <th className="pb-3 font-semibold">Customer</th>
                  <th className="pb-3 font-semibold">Items</th>
                  <th className="pb-3 font-semibold">Total</th>
                  <th className="pb-3 font-semibold">Date</th>
                  <th className="pb-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {completedOrders.map(order => (
                  <tr key={order.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-3 font-mono text-xs text-gray-700">{order.orderNumber}</td>
                    <td className="py-3">
                      <div className="font-medium text-gray-900">{order.customer?.name ?? '—'}</div>
                      <div className="text-xs text-gray-400">{order.customer?.email}</div>
                    </td>
                    <td className="py-3 text-gray-600">{order.items.length} item{order.items.length !== 1 ? 's' : ''}</td>
                    <td className="py-3 font-semibold text-gray-900">{formatRs(order.total)}</td>
                    <td className="py-3 text-gray-500 text-xs">{new Date(order.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                    <td className="py-3"><StatusBadge status={order.status as OrderStatus} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Dashboard ──────────────────────────────────────────────────────────

type Tab = 'orders' | 'history';

export default function SalesmanDashboard() {
  const router = useRouter();
  const { user, logout, isAuthenticated, refreshProfile } = useAuthStore();

  const [activeTab, setActiveTab] = useState<Tab>('orders');

  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    } else if (user?.role !== 'SALESMAN') {
      router.push('/dashboard/admin');
    }
  }, [isAuthenticated, user, router]);

  // Sync profile data on mount to ensure mobile updates are reflected
  useEffect(() => {
    if (isAuthenticated) {
      refreshProfile();
    }
  }, [isAuthenticated, refreshProfile]);

  // ── Connect socket when user is available, disconnect on logout ──────────────
  useEffect(() => {
    if (user?.id) {
      connectSocket(user.id);
    }
    return () => {
      disconnectSocket();
    };
  }, [user?.id]);

  const handleLogout = () => {
    disconnectSocket();
    logout();
    router.push('/login');
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin w-8 h-8 border-2 border-[#00002E] border-t-transparent rounded-full" />
      </div>
    );
  }

  const avatarUrl = resolveMediaUrl(user.avatar);

  const tabs = [
    { id: 'orders' as const, label: 'Current Orders', icon: ListOrdered },
    { id: 'history' as const, label: 'Sales History', icon: BarChart3 },
  ];

  return (
    <div className="min-h-screen bg-[#f4f6fb]">
      <nav className="sticky top-0 z-30 bg-[#00002E] shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Brand */}
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center border border-white/20">
                {avatarUrl ? (
                  <Image
                    src={avatarUrl}
                    alt={user.name || ''}
                    width={48}
                    height={48}
                    className="rounded-xl object-cover"
                    unoptimized
                  />
                ) : (
                  <Store className="w-6 h-6 text-white" />
                )}
              </div>
              <div>
                <p className="text-white font-bold leading-tight text-lg">{user.store?.name ?? `${user.name}'s Store`}</p>
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-white/50 text-xs">
                  <span>Salesman Dashboard</span>
                  {user.phone && (
                    <span className="hidden sm:inline">·</span>
                  )}
                  {user.phone && (
                    <span className="flex items-center gap-1 text-white/70 font-medium">
                      <Phone className="w-3 h-3" />
                      {user.phone}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Tabs (Desktop) */}
            <div className="hidden sm:flex items-center bg-white/10 rounded-xl p-1 gap-1">
              {tabs.map(tab => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as Tab)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === tab.id
                        ? 'bg-white text-[#00002E] shadow'
                        : 'text-white/70 hover:text-white hover:bg-white/10'
                      }`}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowAddModal(true)}
                className="hidden sm:flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-sm font-semibold rounded-xl transition-all"
              >
                <Plus className="w-4 h-4" />
                Add Product
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 py-2 text-white/70 hover:text-red-400 text-sm font-medium rounded-xl transition-all hover:bg-white/10"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* ── Mobile Tab Bar ──────────────────────────────────────────────── */}
      <div className="sm:hidden bg-white border-b border-gray-100 px-4">
        <div className="flex gap-1">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold border-b-2 transition-all ${activeTab === tab.id
                    ? 'border-[#00002E] text-[#00002E]'
                    : 'border-transparent text-gray-500'
                  }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Page Content ────────────────────────────────────────────────── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Greeting */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            {activeTab === 'orders' ? '📦 Current Orders' : '📊 Sales History'}
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {activeTab === 'orders'
              ? 'Manage and update orders placed by your customers.'
              : 'Track your revenue, completed orders, and top products.'}
          </p>
        </div>

        {activeTab === 'orders' && <CurrentOrdersTab userId={user.id} />}
        {activeTab === 'history' && <SalesHistoryTab />}
      </main>

      {/* Add Product Modal */}
      {showAddModal && <AddProductModal onClose={() => setShowAddModal(false)} />}
    </div>
  );
}

// ─── Add Product Modal (unchanged) ──────────────────────────────────────────

function AddProductModal({ onClose }: { onClose: () => void }) {
  const [images, setImages] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    stock: '',
    condition: 'NEW',
    categoryId: '',
    carNumberPlate: '',
  });

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const newImages = Array.from(files).map(file => URL.createObjectURL(file));
      setImages(prev => [...prev, ...newImages].slice(0, 5));
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Creating product:', { ...formData, images });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Add New Product</h2>
          <button onClick={onClose} aria-label="Close modal" className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Images */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Product Images (Up to 5)</label>
            <div className="flex flex-wrap gap-3">
              {images.map((image, index) => (
                <div key={index} className="relative w-24 h-24 rounded-xl overflow-hidden border border-gray-200">
                  <Image src={image} alt={`Product ${index + 1}`} fill className="object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    aria-label={`Remove image ${index + 1}`}
                    className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {images.length < 5 && (
                <label className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-[#00002E] transition-colors">
                  <Camera className="w-6 h-6 text-gray-400" />
                  <span className="text-xs text-gray-500 mt-1">Add Photo</span>
                  <input type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" />
                </label>
              )}
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Product Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#00002E]/30 focus:border-[#00002E]"
              placeholder="e.g., Front Brake Pad Set"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
            <textarea
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#00002E]/30 focus:border-[#00002E] h-24 resize-none"
              placeholder="Describe your product…"
            />
          </div>

          {/* Price & Stock */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Price (Rs.)</label>
              <input
                type="number"
                value={formData.price}
                onChange={e => setFormData({ ...formData, price: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#00002E]/30 focus:border-[#00002E]"
                placeholder="0.00"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Stock</label>
              <input
                type="number"
                value={formData.stock}
                onChange={e => setFormData({ ...formData, stock: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#00002E]/30 focus:border-[#00002E]"
                placeholder="0"
                required
              />
            </div>
          </div>

          {/* Condition */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Condition</label>
            <div className="flex gap-3">
              {['NEW', 'USED', 'RECONDITIONED'].map(condition => (
                <button
                  key={condition}
                  type="button"
                  onClick={() => setFormData({ ...formData, condition })}
                  className={`px-4 py-2 rounded-xl font-medium transition-colors ${formData.condition === condition
                      ? 'bg-[#00002E] text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                >
                  {condition}
                </button>
              ))}
            </div>
          </div>

          {/* Car Number Plate */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Car Number Plate</label>
            <input
              type="text"
              value={formData.carNumberPlate}
              onChange={e => setFormData({ ...formData, carNumberPlate: e.target.value.toUpperCase() })}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#00002E]/30 focus:border-[#00002E] uppercase"
              placeholder="e.g., CAB-1234"
              required
            />
          </div>

          {/* Submit */}
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border border-gray-200 hover:bg-gray-50 text-gray-700 font-medium rounded-xl transition-all">
              Cancel
            </button>
            <button type="submit" className="flex-1 px-4 py-2 bg-[#00002E] hover:bg-[#000050] text-white font-semibold rounded-xl transition-all">
              Add Product
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
