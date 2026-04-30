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
  Bell,
  BellOff,
  MessageSquare,
  Settings,
  Lock,
  ChevronRight,
  ToggleLeft,
  ToggleRight,
  Save,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { resolveMediaUrl, ordersApi, productsApi, categoriesApi } from '@/lib/api';
import { connectSocket, disconnectSocket } from '@/lib/socket';
// OneSignal helpers kept for backend-side push (logoutOneSignalUser used on logout)
import { logoutOneSignalUser } from '@/lib/onesignal';

// ─── Push Notification Hook ───────────────────────────────────────────────────

function useOneSignalPush(_userId: string | undefined) {
  const getPermission = (): NotificationPermission => {
    if (typeof window === 'undefined' || !('Notification' in window)) return 'denied';
    return window.Notification.permission;
  };

  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const isReady = typeof window !== 'undefined' && 'Notification' in window;

  // Sync state from browser on mount
  useEffect(() => {
    const perm = getPermission();
    setPermission(perm);
    setSubscribed(perm === 'granted');
  }, []);

  const toggle = async () => {
    if (!isReady) {
      alert('Your browser does not support push notifications.');
      return;
    }

    setLoading(true);
    try {
      if (subscribed) {
        // Can't programmatically revoke permission — guide user
        alert(
          'To disable notifications:\n' +
          'Click the 🔒 lock icon in the browser URL bar → Notifications → Block.'
        );
        setSubscribed(false);
      } else {
        // Register service worker first so background delivery works
        if ('serviceWorker' in navigator) {
          try {
            await navigator.serviceWorker.register('/OneSignalSDKWorker.js', { scope: '/' });
          } catch { /* ignore */ }
        }

        const perm = await window.Notification.requestPermission();
        setPermission(perm);
        if (perm === 'granted') {
          setSubscribed(true);
          // Show a test notification
          new window.Notification('✅ Notifications enabled!', {
            body: 'You will now receive alerts when customers place orders.',
            icon: '/favicon.ico',
          });
        } else if (perm === 'denied') {
          alert(
            'Notifications were blocked.\n\n' +
            'To fix: Click the 🔒 lock icon in the URL bar → Notifications → Allow.'
          );
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return { subscribed, loading, isReady, permission, toggle };
}

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

interface AppNotification {
  id: string;
  orderNumber: string;
  total: number;
  time: Date;
  read: boolean;
}

// Product types
type ProductStatus = 'IN_STORE' | 'PENDING' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'SOLD' | 'INACTIVE';

interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  discountPrice?: number;
  stock: number;
  images: string[];
  isActive: boolean;
  computedStatus: ProductStatus;
  category?: { id: string; name: string };
  createdAt: string;
}

const PRODUCT_STATUS_META: Record<ProductStatus, { label: string; color: string; bg: string }> = {
  IN_STORE:   { label: 'In Store',   color: 'text-emerald-700', bg: 'bg-emerald-100' },
  PENDING:    { label: 'Pending',    color: 'text-amber-700',   bg: 'bg-amber-100'   },
  PROCESSING: { label: 'Processing', color: 'text-blue-700',    bg: 'bg-blue-100'    },
  SHIPPED:    { label: 'Shipped',    color: 'text-purple-700',  bg: 'bg-purple-100'  },
  DELIVERED:  { label: 'Delivered',  color: 'text-green-700',   bg: 'bg-green-100'   },
  SOLD:       { label: 'Sold',       color: 'text-gray-700',    bg: 'bg-gray-200'    },
  INACTIVE:   { label: 'Inactive',   color: 'text-red-700',     bg: 'bg-red-100'     },
};

function ProductStatusBadge({ status }: { status: ProductStatus }) {
  const meta = PRODUCT_STATUS_META[status] ?? PRODUCT_STATUS_META.IN_STORE;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${meta.bg} ${meta.color}`}>
      {meta.label}
    </span>
  );
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
                    <button
                      onClick={() => setPreviewImage(item.product.images[0])}
                      className="w-full h-full p-0 border-0 bg-transparent rounded-lg hover:opacity-80 transition-opacity"
                      aria-label="Preview product image"
                      title="Preview product image"
                    >
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
              aria-label="Close image preview"
              title="Close image preview"
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

    // A customer placed a new order → refresh list and flash an alert banner
    // (OneSignal push notification is sent server-side by the backend)
    const handleNewOrder = (payload: { orderNumber: string; total?: number }) => {
      setNewOrderAlert(`🆕 New order received: ${payload.orderNumber}`);
      loadOrders();
      setTimeout(() => setNewOrderAlert(null), 10000);
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

// ─── Edit Product Modal ──────────────────────────────────────────────────────

function EditProductModal({ product, onClose, onSaved }: {
  product: Product;
  onClose: () => void;
  onSaved: (updated: Product) => void;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: product.name,
    description: product.description ?? '',
    price: String(product.price),
    stock: String(product.stock),
    isActive: product.isActive,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await productsApi.updateProduct(product.id, {
        ...formData,
        price: parseFloat(formData.price),
        stock: parseInt(formData.stock),
      });
      if (res.success) onSaved({ ...product, ...res.data });
      onClose();
    } catch (err) {
      console.error('Failed to update product', err);
      alert('Failed to update product');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">Edit Product</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors" aria-label="Close">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Product Name</label>
            <input type="text" required value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#00002E]/30 focus:border-[#00002E] text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
            <textarea value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#00002E]/30 focus:border-[#00002E] h-20 resize-none text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Price (Rs.)</label>
              <input type="number" required value={formData.price}
                onChange={e => setFormData({ ...formData, price: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#00002E]/30 focus:border-[#00002E] text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Stock</label>
              <input type="number" required value={formData.stock}
                onChange={e => setFormData({ ...formData, stock: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#00002E]/30 focus:border-[#00002E] text-sm" />
            </div>
          </div>
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <div
              onClick={() => setFormData(f => ({ ...f, isActive: !f.isActive }))}
              className={`w-10 h-6 rounded-full transition-colors ${formData.isActive ? 'bg-emerald-500' : 'bg-gray-300'} flex items-center px-0.5`}
            >
              <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${formData.isActive ? 'translate-x-4' : 'translate-x-0'}`} />
            </div>
            <span className="text-sm font-medium text-gray-700">Product is active (visible to customers)</span>
          </label>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-200 hover:bg-gray-50 text-gray-700 font-medium rounded-xl text-sm transition-all">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#00002E] hover:bg-[#000050] text-white font-semibold rounded-xl text-sm transition-all disabled:opacity-50">
              <Save className="w-4 h-4" />
              {isSubmitting ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Products Tab ────────────────────────────────────────────────────────────

function ProductsTab({ refreshTrigger }: { refreshTrigger: number }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [statusMenuId, setStatusMenuId] = useState<string | null>(null);

  const loadProducts = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await productsApi.getSalesmanProducts();
      if (res.success) setProducts(res.data.products ?? res.data);
    } catch (err) {
      console.error('Failed to load products', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadProducts(); }, [loadProducts, refreshTrigger]);

  const handleDelete = async (productId: string) => {
    if (!confirm('Are you sure you want to delete this product? This cannot be undone.')) return;
    setDeletingId(productId);
    try {
      await productsApi.deleteProduct(productId);
      setProducts(prev => prev.filter(p => p.id !== productId));
    } catch (err) {
      console.error('Failed to delete product', err);
      alert('Failed to delete product');
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggleStatus = async (product: Product) => {
    const newIsActive = !product.isActive;
    // Optimistic update
    setProducts(prev => prev.map(p => p.id === product.id ? { ...p, isActive: newIsActive } : p));
    try {
      await productsApi.toggleProductStatus(product.id, newIsActive);
    } catch (err) {
      // Revert on failure
      setProducts(prev => prev.map(p => p.id === product.id ? { ...p, isActive: product.isActive } : p));
      alert('Failed to update status');
    }
    setStatusMenuId(null);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="w-10 h-10 border-2 border-[#00002E] border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-500 text-sm">Loading products…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {products.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <Package className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-gray-700 font-semibold text-lg mb-1">No products yet</h3>
          <p className="text-gray-500 text-sm">Click "Add Product" in the nav bar to list your first item.</p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {products.map(product => {
            const computedStatus = (product.isActive ? (product.computedStatus ?? 'IN_STORE') : 'INACTIVE') as ProductStatus;
            const imageUrl = product.images?.[0] ? resolveMediaUrl(product.images[0]) : null;

            return (
              <div key={product.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-shadow">
                {/* Image */}
                <div className="h-44 bg-gray-100 relative shrink-0">
                  {imageUrl ? (
                    <Image src={imageUrl} alt={product.name} fill className="object-cover" unoptimized />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-10 h-10 text-gray-300" />
                    </div>
                  )}
                  {/* Stock badge */}
                  <div className="absolute top-2.5 right-2.5">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase shadow-sm ${product.stock > 0 ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                      {product.stock > 0 ? `Stock: ${product.stock}` : 'Out of Stock'}
                    </span>
                  </div>
                </div>

                {/* Body */}
                <div className="p-4 flex-1 flex flex-col gap-3">
                  <div>
                    <h3 className="font-bold text-gray-900 text-sm leading-snug line-clamp-2">{product.name}</h3>
                    {product.description && (
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">{product.description}</p>
                    )}
                  </div>

                  {/* Price + Status */}
                  <div className="flex items-center justify-between">
                    <span className="text-base font-bold text-[#00002E]">{formatRs(product.price)}</span>
                    <ProductStatusBadge status={computedStatus} />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-1.5 pt-1 border-t border-gray-50">
                    {/* Edit */}
                    <button
                      onClick={() => setEditingProduct(product)}
                      title="Edit Product"
                      className="flex-1 flex items-center justify-center gap-1.5 px-2 py-2 text-xs font-semibold text-gray-600 hover:text-[#00002E] hover:bg-gray-50 rounded-lg transition-colors border border-gray-200"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      Edit
                    </button>

                    {/* Change Status (Active/Inactive toggle) */}
                    <div className="relative">
                      <button
                        onClick={() => setStatusMenuId(prev => prev === product.id ? null : product.id)}
                        title="Change Status"
                        className="flex items-center justify-center gap-1 px-2 py-2 text-xs font-semibold text-gray-600 hover:text-[#00002E] hover:bg-gray-50 rounded-lg transition-colors border border-gray-200"
                      >
                        <ToggleLeft className="w-3.5 h-3.5" />
                        <ChevronDown className="w-3 h-3" />
                      </button>
                      {statusMenuId === product.id && (
                        <div className="absolute bottom-full mb-1 right-0 z-20 bg-white border border-gray-200 rounded-xl shadow-lg py-1 min-w-[160px]">
                          <div className="px-3 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Change Status</div>
                          <button
                            onClick={() => handleToggleStatus(product)}
                            className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 transition-colors ${product.isActive ? 'text-red-600' : 'text-emerald-700'}`}
                          >
                            {product.isActive ? <ToggleLeft className="w-4 h-4" /> : <ToggleRight className="w-4 h-4" />}
                            {product.isActive ? 'Set as Inactive' : 'Set as Active'}
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Delete */}
                    <button
                      onClick={() => handleDelete(product.id)}
                      disabled={deletingId === product.id}
                      title="Delete Product"
                      className="flex items-center justify-center p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors border border-gray-200"
                    >
                      {deletingId === product.id
                        ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        : <Trash2 className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Modal */}
      {editingProduct && (
        <EditProductModal
          product={editingProduct}
          onClose={() => setEditingProduct(null)}
          onSaved={(updated) => {
            setProducts(prev => prev.map(p => p.id === updated.id ? { ...p, ...updated } : p));
            setEditingProduct(null);
          }}
        />
      )}
    </div>
  );
}

// ─── Store Settings Modal ────────────────────────────────────────────────────

function StoreSettingsModal({ user, onClose, onSaved }: { user: any; onClose: () => void; onSaved: () => void }) {
  const { refreshProfile } = useAuthStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: user.name ?? '',
    phone: user.phone ?? '',
    storeName: user.store?.name ?? '',
    storePhone: user.store?.phone ?? '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const { authApi } = await import('@/lib/api');
      await authApi.updateProfile({ name: formData.name, phone: formData.phone || null });
      await refreshProfile();
      onSaved();
      onClose();
    } catch (err) {
      console.error('Failed to update settings', err);
      alert('Failed to save settings');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="p-5 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-[#00002E]/10 rounded-xl flex items-center justify-center">
              <Settings className="w-4.5 h-4.5 text-[#00002E]" />
            </div>
            <h2 className="text-lg font-bold text-gray-900">Store Settings</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full" aria-label="Close">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Your Name</label>
            <input type="text" value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#00002E]/30 focus:border-[#00002E] text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Contact Phone</label>
            <input type="tel" value={formData.phone}
              onChange={e => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+94 77 123 4567"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#00002E]/30 focus:border-[#00002E] text-sm" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-200 hover:bg-gray-50 text-gray-700 font-medium rounded-xl text-sm transition-all">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#00002E] hover:bg-[#000050] text-white font-semibold rounded-xl text-sm transition-all disabled:opacity-50">
              <Save className="w-4 h-4" />
              {isSubmitting ? 'Saving…' : 'Save Settings'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Account Security Modal ─────────────────────────────────────────────────

function AccountSecurityModal({ onClose }: { onClose: () => void }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (formData.newPassword !== formData.confirmPassword) {
      setError('New passwords do not match');
      return;
    }
    if (formData.newPassword.length < 8) {
      setError('New password must be at least 8 characters');
      return;
    }
    setIsSubmitting(true);
    try {
      const api = (await import('@/lib/api')).default;
      await api.put('/auth/change-password', {
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword,
      });
      setSuccess(true);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to update password');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="p-5 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-[#00002E]/10 rounded-xl flex items-center justify-center">
              <Lock className="w-4.5 h-4.5 text-[#00002E]" />
            </div>
            <h2 className="text-lg font-bold text-gray-900">Account Security</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full" aria-label="Close">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        {success ? (
          <div className="p-8 text-center">
            <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-7 h-7 text-green-600" />
            </div>
            <h3 className="font-bold text-gray-900 mb-1">Password Updated</h3>
            <p className="text-sm text-gray-500 mb-5">Your password has been changed successfully.</p>
            <button onClick={onClose} className="px-6 py-2.5 bg-[#00002E] text-white font-semibold rounded-xl text-sm">
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {error && <p className="text-sm text-red-600 bg-red-50 px-4 py-2.5 rounded-xl">{error}</p>}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Current Password</label>
              <input type="password" required value={formData.currentPassword}
                onChange={e => setFormData({ ...formData, currentPassword: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#00002E]/30 focus:border-[#00002E] text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">New Password</label>
              <input type="password" required value={formData.newPassword}
                onChange={e => setFormData({ ...formData, newPassword: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#00002E]/30 focus:border-[#00002E] text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm New Password</label>
              <input type="password" required value={formData.confirmPassword}
                onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#00002E]/30 focus:border-[#00002E] text-sm" />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={onClose}
                className="flex-1 px-4 py-2.5 border border-gray-200 hover:bg-gray-50 text-gray-700 font-medium rounded-xl text-sm transition-all">
                Cancel
              </button>
              <button type="submit" disabled={isSubmitting}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#00002E] hover:bg-[#000050] text-white font-semibold rounded-xl text-sm transition-all disabled:opacity-50">
                <Lock className="w-4 h-4" />
                {isSubmitting ? 'Updating…' : 'Update Password'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// ─── Main Dashboard ──────────────────────────────────────────────────────────

type Tab = 'orders' | 'products' | 'history';

export default function SalesmanDashboard() {
  const router = useRouter();
  const { user, logout, isAuthenticated, refreshProfile } = useAuthStore();

  const [activeTab, setActiveTab] = useState<Tab>('orders');
  const [showAddModal, setShowAddModal] = useState(false);
  const [productRefreshTrigger, setProductRefreshTrigger] = useState(0);

  // Store profile / account modals
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showStoreSettings, setShowStoreSettings] = useState(false);
  const [showAccountSecurity, setShowAccountSecurity] = useState(false);

  // App Notifications (in-app messages)
  const [appNotifs, setAppNotifs] = useState<AppNotification[]>([]);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [toastNotif, setToastNotif] = useState<AppNotification | null>(null);

  // ── OneSignal push notifications ─────────────────────────────────────────────
  const { subscribed: pushEnabled, loading: pushLoading, isReady: pushReady, permission: pushPermission, toggle: togglePush } = useOneSignalPush(user?.id);


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
      const socket = connectSocket(user.id);
      
      const handleNewOrder = (orderData: any) => {
        const notif: AppNotification = {
          id: orderData.orderId,
          orderNumber: orderData.orderNumber,
          total: orderData.total,
          time: new Date(),
          read: false
        };
        
        setAppNotifs(prev => [notif, ...prev]);
        setToastNotif(notif);
        
        // Auto hide toast after 10 seconds without deleting from messages
        setTimeout(() => {
          setToastNotif(current => current?.id === notif.id ? null : current);
        }, 10000);
      };
      
      socket.on('newOrder', handleNewOrder);
      
      return () => {
        socket.off('newOrder', handleNewOrder);
        disconnectSocket();
      };
    }
  }, [user?.id]);



  const handleLogout = async () => {
    await logoutOneSignalUser();
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
    { id: 'products' as const, label: 'My Products', icon: Package },
    { id: 'history' as const, label: 'Sales History', icon: BarChart3 },
  ];


  return (
    <div className="min-h-screen bg-[#f4f6fb]">
      <nav className="sticky top-0 z-30 bg-[#00002E] shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Brand — clickable profile menu */}
            <div className="relative flex items-center gap-4">
              <button
                onClick={() => setShowProfileMenu(v => !v)}
                className="flex items-center gap-3 group"
                aria-label="Store profile menu"
              >
                <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center border border-white/20 group-hover:border-white/40 transition-colors">
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
                <div className="text-left">
                  <div className="flex items-center gap-1.5">
                    <p className="text-white font-bold leading-tight text-lg group-hover:text-white/90 transition-colors">
                      {user.store?.name ?? `${user.name}'s Store`}
                    </p>
                    <ChevronDown className={`w-4 h-4 text-white/60 transition-transform ${showProfileMenu ? 'rotate-180' : ''}`} />
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-white/50 text-xs">
                    <span>Salesman Dashboard</span>
                    {user.phone && <span className="hidden sm:inline">·</span>}
                    {user.phone && (
                      <span className="flex items-center gap-1 text-white/70 font-medium">
                        <Phone className="w-3 h-3" />
                        {user.phone}
                      </span>
                    )}
                  </div>
                </div>
              </button>

              {/* Profile Dropdown */}
              {showProfileMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowProfileMenu(false)} />
                  <div className="absolute top-full left-0 mt-3 z-50 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 py-1.5 overflow-hidden">
                    <button
                      onClick={() => { setShowProfileMenu(false); setShowStoreSettings(true); }}
                      className="w-full flex items-center justify-between px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-[#00002E]/8 rounded-lg flex items-center justify-center">
                          <Settings className="w-4 h-4 text-[#00002E]" />
                        </div>
                        <span className="font-medium">Store Settings</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
                    </button>
                    <button
                      onClick={() => { setShowProfileMenu(false); setShowAccountSecurity(true); }}
                      className="w-full flex items-center justify-between px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-[#00002E]/8 rounded-lg flex items-center justify-center">
                          <Lock className="w-4 h-4 text-[#00002E]" />
                        </div>
                        <span className="font-medium">Account Security</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
                    </button>
                    <div className="my-1 border-t border-gray-100" />
                    <button
                      onClick={() => { setShowProfileMenu(false); handleLogout(); }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <div className="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center">
                        <LogOut className="w-4 h-4 text-red-500" />
                      </div>
                      <span className="font-medium">Logout</span>
                    </button>
                  </div>
                </>
              )}
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

              {/* App Notifications Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowNotifDropdown(!showNotifDropdown)}
                  className="relative flex items-center justify-center w-9 h-9 rounded-xl hover:bg-white/10 text-white/70 hover:text-white transition-colors"
                  title="Messages"
                >
                  <MessageSquare className="w-5 h-5" />
                  {appNotifs.filter(n => !n.read).length > 0 && (
                    <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-red-500 border-2 border-[#00002E]" />
                  )}
                </button>

                {showNotifDropdown && (
                  <div className="absolute top-full mt-2 right-0 w-80 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50">
                    {/* Header */}
                    <div className="px-4 py-2 border-b border-gray-50 flex justify-between items-center gap-2">
                      <h3 className="font-bold text-gray-900 text-sm">Messages</h3>
                      <div className="flex items-center gap-2">
                        {appNotifs.filter(n => !n.read).length > 0 && (
                          <button
                            onClick={() => setAppNotifs(prev => prev.map(n => ({ ...n, read: true })))}
                            className="text-xs text-blue-600 hover:underline whitespace-nowrap"
                          >
                            Mark all read
                          </button>
                        )}
                        {appNotifs.length > 0 && (
                          <button
                            onClick={() => setAppNotifs([])}
                            className="text-xs text-red-500 hover:text-red-700 hover:underline whitespace-nowrap font-medium"
                          >
                            Delete all
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Message list */}
                    <div className="max-h-80 overflow-y-auto">
                      {appNotifs.length === 0 ? (
                        <div className="px-4 py-8 text-center text-sm text-gray-400">
                          No messages yet
                        </div>
                      ) : (
                        appNotifs.map(notif => (
                          <div
                            key={notif.id}
                            className={`flex items-start gap-2 px-4 py-3 border-b border-gray-50 last:border-0 transition-colors group ${!notif.read ? 'bg-blue-50/50' : 'hover:bg-gray-50'}`}
                          >
                            {/* Main clickable area — marks as read */}
                            <div
                              className="flex-1 cursor-pointer"
                              onClick={() => setAppNotifs(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n))}
                            >
                              <div className="flex justify-between items-start mb-0.5">
                                <span className="font-semibold text-sm text-gray-900 flex items-center gap-1.5">
                                  {!notif.read && <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />}
                                  Order {notif.orderNumber}
                                </span>
                                <span className="text-xs text-gray-400 shrink-0 ml-2">{timeAgo(notif.time.toISOString())}</span>
                              </div>
                              <p className="text-xs text-gray-600">Total: Rs. {notif.total.toLocaleString()}</p>
                            </div>

                            {/* Individual delete button */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setAppNotifs(prev => prev.filter(n => n.id !== notif.id));
                              }}
                              className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-all shrink-0"
                              title="Delete this message"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Push Notification Toggle */}
              <button
                id="push-toggle-btn"
                onClick={togglePush}
                disabled={pushLoading}
                title={
                  !pushReady
                    ? 'Push not configured — click for setup instructions'
                    : pushPermission === 'denied'
                    ? 'Notifications blocked — click the lock icon in URL bar to allow'
                    : pushEnabled
                    ? 'Click to disable order notifications'
                    : 'Click to enable push notifications for new orders'
                }
                className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-xl transition-all ${
                  pushLoading
                    ? 'opacity-60 cursor-wait text-white/40'
                    : !pushReady
                    ? 'text-yellow-400/70 hover:text-yellow-400 hover:bg-yellow-500/10 border border-yellow-500/20'
                    : pushEnabled
                    ? 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/30'
                    : pushPermission === 'denied'
                    ? 'text-red-400/70 hover:text-red-400 hover:bg-red-500/10'
                    : 'text-white/50 hover:text-white/80 hover:bg-white/10'
                }`}
              >
                {pushLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : pushEnabled ? (
                  <Bell className="w-4 h-4" />
                ) : (
                  <BellOff className="w-4 h-4" />
                )}
                <span className="hidden sm:inline">
                  {pushLoading
                    ? 'Enabling…'
                    : !pushReady
                    ? 'Setup Needed'
                    : pushEnabled
                    ? 'Notifs On'
                    : 'Notifs Off'}
                </span>
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
            {activeTab === 'orders' ? '📦 Current Orders' : activeTab === 'products' ? '🛍️ My Products' : '📊 Sales History'}
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {activeTab === 'orders'
              ? 'Manage and update orders placed by your customers.'
              : activeTab === 'products'
              ? 'Manage your listed products — edit, set status, or remove them.'
              : 'Track your revenue, completed orders, and top products.'}
          </p>
        </div>

        {activeTab === 'orders' && <CurrentOrdersTab userId={user.id} />}
        {activeTab === 'products' && <ProductsTab refreshTrigger={productRefreshTrigger} />}
        {activeTab === 'history' && <SalesHistoryTab />}

      </main>

      {/* Add Product Modal */}
      {showAddModal && (
        <AddProductModal
          onClose={() => setShowAddModal(false)}
          onProductAdded={() => {
            setProductRefreshTrigger(t => t + 1);
            setActiveTab('products');
          }}
        />
      )}

      {/* Store Settings Modal */}
      {showStoreSettings && (
        <StoreSettingsModal
          user={user}
          onClose={() => setShowStoreSettings(false)}
          onSaved={() => setShowStoreSettings(false)}
        />
      )}

      {/* Account Security Modal */}
      {showAccountSecurity && (
        <AccountSecurityModal onClose={() => setShowAccountSecurity(false)} />
      )}
      
      {/* Toast Notification */}
      {toastNotif && (
        <div className="fixed bottom-4 right-4 z-50 bg-white rounded-xl shadow-xl border border-gray-100 p-4 max-w-sm w-full animate-in slide-in-from-bottom-5">
          <div className="flex items-start justify-between">
            <div className="flex gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <ShoppingCart className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h4 className="font-bold text-gray-900 text-sm">New Order!</h4>
                <p className="text-xs text-gray-500 mt-0.5">Order {toastNotif.orderNumber} for Rs. {toastNotif.total.toLocaleString()}</p>
              </div>
            </div>
            <button 
              onClick={() => {
                // Clicking X removes it from the messages list entirely
                setAppNotifs(prev => prev.filter(n => n.id !== toastNotif.id));
                setToastNotif(null);
              }}
              className="text-gray-400 hover:bg-gray-100 p-1 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <button 
            onClick={() => {
              // Clicking to view marks it as read and keeps it in messages
              setAppNotifs(prev => prev.map(n => n.id === toastNotif.id ? { ...n, read: true } : n));
              setToastNotif(null);
              setActiveTab('orders'); // Jump to orders tab
            }}
            className="mt-3 w-full py-2 bg-blue-50 text-blue-700 text-xs font-semibold rounded-lg hover:bg-blue-100 transition-colors"
          >
            Mark as read & View
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Add Product Modal ──────────────────────────────────────────────────────

function AddProductModal({ onClose, onProductAdded }: { onClose: () => void; onProductAdded: () => void }) {
  const [categories, setCategories] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [images, setImages] = useState<string[]>([]); // blob preview URLs
  const [imageFiles, setImageFiles] = useState<File[]>([]); // actual File objects
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    stock: '',
    condition: 'NEW',
    categoryId: '',
  });


  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await categoriesApi.getAll();
        if (res.success) setCategories(res.data);
      } catch (err) {
        console.error('Failed to load categories', err);
      }
    };
    fetchCategories();
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const newFiles = Array.from(files);
      const available = 5 - images.length;
      const toAdd = newFiles.slice(0, available);
      const newPreviews = toAdd.map(file => URL.createObjectURL(file));
      setImages(prev => [...prev, ...newPreviews]);
      setImageFiles(prev => [...prev, ...toAdd]);
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
    setImageFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Category is now optional
    setIsSubmitting(true);
    try {
      // Upload images first if any were selected
      let imageUrls: string[] = [];
      if (imageFiles.length > 0) {
        const uploadRes = await productsApi.uploadProductImages(imageFiles);
        if (uploadRes.success) {
          imageUrls = uploadRes.data.urls;
        }
      }
      await productsApi.createProduct({
        ...formData,
        price: parseFloat(formData.price),
        stock: parseInt(formData.stock),
        images: imageUrls,
      });
      onProductAdded();
      onClose();
    } catch (err) {
      console.error('Failed to add product', err);
      alert('Failed to add product');
    } finally {
      setIsSubmitting(false);
    }
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
              {images && images.map((image, index) => (
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

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
            <select
              value={formData.categoryId}
              onChange={e => setFormData({ ...formData, categoryId: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#00002E]/30 focus:border-[#00002E]"
            >
              <option value="">Select a category</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>


          {/* Submit */}
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border border-gray-200 hover:bg-gray-50 text-gray-700 font-medium rounded-xl transition-all">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} className="flex-1 px-4 py-2 bg-[#00002E] hover:bg-[#000050] text-white font-semibold rounded-xl transition-all disabled:opacity-50">
              {isSubmitting ? 'Adding...' : 'Add Product'}
            </button>

          </div>
        </form>
      </div>
    </div>
  );
}
