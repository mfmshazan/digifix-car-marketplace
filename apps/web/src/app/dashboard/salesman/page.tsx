'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  MapPin,
  Navigation,
  Send,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { resolveMediaUrl, ordersApi, productsApi, categoriesApi, deliveryRequestsApi } from '@/lib/api';
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
  total?: number;
  type: 'NEW_ORDER' | 'REFUND_APPROVED';
  message?: string;
  time: Date;
  read: boolean;
}

function mergeNotification(prev: AppNotification[], next: AppNotification): AppNotification[] {
  if (prev.some((n) => n.id === next.id)) return prev;
  return [next, ...prev];
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

// ─── Delivery Status Badge ───────────────────────────────────────────────────

const DELIVERY_STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: 'Finding Rider', color: 'text-amber-700', bg: 'bg-amber-50' },
  available: { label: 'Awaiting Rider', color: 'text-orange-700', bg: 'bg-orange-50' },
  assigned: { label: 'Rider Assigned', color: 'text-blue-700', bg: 'bg-blue-50' },
  accepted: { label: 'Rider Confirmed', color: 'text-blue-700', bg: 'bg-blue-50' },
  arrived_at_pickup: { label: 'Rider at Shop', color: 'text-purple-700', bg: 'bg-purple-50' },
  picked_up: { label: 'Package Collected', color: 'text-indigo-700', bg: 'bg-indigo-50' },
  in_transit: { label: 'In Transit', color: 'text-cyan-700', bg: 'bg-cyan-50' },
  arrived_at_dropoff: { label: 'At Customer', color: 'text-teal-700', bg: 'bg-teal-50' },
  delivered: { label: 'Delivered', color: 'text-green-700', bg: 'bg-green-50' },
  failed: { label: 'Failed', color: 'text-red-700', bg: 'bg-red-50' },
};

function DeliveryStatusBadge({ status }: { status: string }) {
  const meta = DELIVERY_STATUS_META[status] ?? { label: status, color: 'text-gray-700', bg: 'bg-gray-50' };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${meta.bg} ${meta.color}`}>
      <Truck className="w-3 h-3" />
      {meta.label}
    </span>
  );
}

// ─── Leaflet Map Picker (Delivery Location) ──────────────────────────────────

function LeafletMapPicker({
  onSelect,
}: {
  onSelect: (lat: number, lng: number, address: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [status, setStatus] = useState<'idle' | 'selected' | 'geocoding'>('idle');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    // Inject Leaflet CSS once
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    const initMap = () => {
      if (!containerRef.current || mapRef.current) return;
      const L = (window as any).L;
      if (!L) return;

      const map = L.map(containerRef.current).setView([6.9271, 79.8612], 13);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);

      const handlePick = async (lat: number, lng: number) => {
        setCoords({ lat, lng });
        setStatus('geocoding');
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
            { headers: { 'Accept-Language': 'en' } }
          );
          const data = await res.json();
          onSelect(lat, lng, data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`);
        } catch {
          onSelect(lat, lng, `${lat.toFixed(5)}, ${lng.toFixed(5)}`);
        }
        setStatus('selected');
      };

      map.on('click', (e: any) => {
        const { lat, lng } = e.latlng;
        if (markerRef.current) {
          markerRef.current.setLatLng([lat, lng]);
        } else {
          markerRef.current = L.marker([lat, lng], { draggable: true }).addTo(map);
          markerRef.current.on('dragend', (de: any) => {
            const pos = de.target.getLatLng();
            handlePick(pos.lat, pos.lng);
          });
        }
        handlePick(lat, lng);
      });

      mapRef.current = map;
    };

    if ((window as any).L) {
      initMap();
    } else if (!document.getElementById('leaflet-js')) {
      const script = document.createElement('script');
      script.id = 'leaflet-js';
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = initMap;
      document.head.appendChild(script);
    } else {
      // Script tag exists but may still be loading — poll briefly
      const poll = setInterval(() => {
        if ((window as any).L) { clearInterval(poll); initMap(); }
      }, 100);
      return () => clearInterval(poll);
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
      }
    };
  }, []);

  return (
    <div className="space-y-2">
      <div
        ref={containerRef}
        className="w-full rounded-xl overflow-hidden border border-gray-200"
        style={{ height: 260 }}
      />
      {status === 'idle' && (
        <p className="text-xs text-gray-400 text-center">
          Click anywhere on the map to pin the delivery location
        </p>
      )}
      {status === 'geocoding' && (
        <p className="text-xs text-amber-600 text-center animate-pulse">
          Fetching address…
        </p>
      )}
      {status === 'selected' && coords && (
        <p className="text-xs text-green-700 font-medium text-center">
          📍 {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)} — You can drag the pin to adjust
        </p>
      )}
    </div>
  );
}

// ─── Create Delivery Request Modal ───────────────────────────────────────────

interface DeliveryFormState {
  pickupLatitude: string;
  pickupLongitude: string;
  pickupAddress: string;
  deliveryLatitude: string;
  deliveryLongitude: string;
  deliveryAddress: string;
  paymentType: 'PREPAID' | 'COD';
  packageNotes: string;
  estimatedEarnings: string;
}

interface AvailableRider {
  id: number;
  fullName: string;
  phone: string;
  vehicleType?: string;
  vehicleNumber?: string;
  rating?: number | null;
  totalDeliveries: number;
  distanceToPickupKm: number | null;
}

function CreateDeliveryRequestModal({
  order,
  onClose,
  onSuccess,
}: {
  order: Order;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState<DeliveryFormState>({
    pickupLatitude: '',
    pickupLongitude: '',
    pickupAddress: '',
    deliveryLatitude: '',
    deliveryLongitude: '',
    deliveryAddress: '',
    paymentType: 'COD',
    packageNotes: '',
    estimatedEarnings: '',
  });
  const [gettingLocation, setGettingLocation] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loadingRiders, setLoadingRiders] = useState(false);
  const [availableRiders, setAvailableRiders] = useState<AvailableRider[]>([]);
  const [selectedRiderId, setSelectedRiderId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      return;
    }
    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((f) => ({
          ...f,
          pickupLatitude: pos.coords.latitude.toFixed(6),
          pickupLongitude: pos.coords.longitude.toFixed(6),
        }));
        setGettingLocation(false);
      },
      () => {
        setError('Could not get your location. Please enter coordinates manually.');
        setGettingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const loadAvailableRiders = async () => {
    setError(null);
    setSelectedRiderId(null);

    if (!form.pickupLatitude || !form.pickupLongitude) {
      setError('Pickup coordinates are required before loading available riders.');
      return;
    }

    setLoadingRiders(true);
    try {
      const res = await deliveryRequestsApi.getAvailableRiders(
        parseFloat(form.pickupLatitude),
        parseFloat(form.pickupLongitude)
      );
      setAvailableRiders(res.data || []);
      if (!res.data?.length) {
        setError('No online riders are available near this pickup location right now.');
      }
    } catch (err: any) {
      setAvailableRiders([]);
      setError(err?.response?.data?.message || err?.message || 'Failed to load available riders.');
    } finally {
      setLoadingRiders(false);
    }
  };

  const handleSubmit = async () => {
    setError(null);
    const { pickupLatitude, pickupLongitude, deliveryLatitude, deliveryLongitude, deliveryAddress } = form;

    if (!pickupLatitude || !pickupLongitude) {
      setError('Pickup coordinates are required. Use "Get Current Location" or enter manually.');
      return;
    }
    if (!deliveryLatitude || !deliveryLongitude || !deliveryAddress) {
      setError('Please pin the customer delivery location on the map.');
      return;
    }
    if (!selectedRiderId) {
      setError('Select an available rider before sending the request.');
      return;
    }

    setSubmitting(true);
    try {
      await deliveryRequestsApi.create({
        orderId: order.id,
        pickupLatitude: parseFloat(pickupLatitude),
        pickupLongitude: parseFloat(pickupLongitude),
        pickupAddress: form.pickupAddress || undefined,
        deliveryLatitude: parseFloat(deliveryLatitude),
        deliveryLongitude: parseFloat(deliveryLongitude),
        deliveryAddress,
        packageNotes: form.packageNotes || undefined,
        paymentType: form.paymentType,
        estimatedEarnings: form.estimatedEarnings ? parseFloat(form.estimatedEarnings) : undefined,
        customerName: order.customer?.name,
        partnerId: selectedRiderId,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to create delivery request.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <h3 className="text-base font-bold text-gray-900">Assign Delivery</h3>
            <p className="text-xs text-gray-500 mt-0.5">Order {order.orderNumber} · {order.customer?.name}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          {/* Pickup Location */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-2">
              <MapPin className="w-3.5 h-3.5 inline mr-1" />
              Pickup Location (Your Shop)
            </label>
            <button
              onClick={useCurrentLocation}
              disabled={gettingLocation}
              className="w-full mb-2 flex items-center justify-center gap-2 px-3 py-2 bg-[#00002E] text-white rounded-xl text-sm font-medium hover:bg-[#00002E]/90 disabled:opacity-60 transition-colors"
            >
              {gettingLocation ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
              {gettingLocation ? 'Getting Location…' : 'Use My Current Location'}
            </button>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                step="any"
                placeholder="Latitude"
                value={form.pickupLatitude}
                onChange={(e) => setForm((f) => ({ ...f, pickupLatitude: e.target.value }))}
                className="px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#00002E]/20"
              />
              <input
                type="number"
                step="any"
                placeholder="Longitude"
                value={form.pickupLongitude}
                onChange={(e) => setForm((f) => ({ ...f, pickupLongitude: e.target.value }))}
                className="px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#00002E]/20"
              />
            </div>
            <input
              type="text"
              placeholder="Shop address (optional)"
              value={form.pickupAddress}
              onChange={(e) => setForm((f) => ({ ...f, pickupAddress: e.target.value }))}
              className="mt-2 w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#00002E]/20"
            />
          </div>

          {/* Delivery Location — map picker */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-2">
              <MapPin className="w-3.5 h-3.5 inline mr-1" />
              Customer Delivery Location
            </label>

            {/* Selected location summary */}
            {form.deliveryLatitude && form.deliveryLongitude && (
              <div className="flex items-start gap-2 p-3 mb-2 bg-indigo-50 border border-indigo-200 rounded-xl">
                <MapPin className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-indigo-900 truncate">
                    {form.deliveryAddress || 'Location pinned'}
                  </p>
                  <p className="text-xs text-indigo-500 mt-0.5">
                    {parseFloat(form.deliveryLatitude).toFixed(5)}, {parseFloat(form.deliveryLongitude).toFixed(5)}
                  </p>
                </div>
              </div>
            )}

            {/* Leaflet map */}
            <LeafletMapPicker
              onSelect={(lat, lng, address) => {
                setForm((f) => ({
                  ...f,
                  deliveryLatitude: lat.toFixed(6),
                  deliveryLongitude: lng.toFixed(6),
                  deliveryAddress: address,
                }));
              }}
            />

            {/* Editable address label after pin */}
            {form.deliveryLatitude && form.deliveryLongitude && (
              <input
                type="text"
                placeholder="Edit address label (optional)"
                value={form.deliveryAddress}
                onChange={(e) => setForm((f) => ({ ...f, deliveryAddress: e.target.value }))}
                className="mt-2 w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#00002E]/20"
              />
            )}
          </div>

          {/* Payment Type */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-2">Payment Type</label>
            <div className="flex gap-2">
              {(['COD', 'PREPAID'] as const).map((pt) => (
                <button
                  key={pt}
                  onClick={() => setForm((f) => ({ ...f, paymentType: pt }))}
                  className={`flex-1 py-2 rounded-xl text-sm font-semibold border transition-all ${
                    form.paymentType === pt
                      ? 'bg-[#00002E] text-white border-[#00002E]'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-[#00002E]/40'
                  }`}
                >
                  {pt === 'COD' ? 'Cash on Delivery' : 'Prepaid'}
                </button>
              ))}
            </div>
          </div>

          {/* Extras */}
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              step="any"
              placeholder="Rider earnings (Rs)"
              value={form.estimatedEarnings}
              onChange={(e) => setForm((f) => ({ ...f, estimatedEarnings: e.target.value }))}
              className="px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#00002E]/20"
            />
            <input
              type="text"
              placeholder="Package notes (optional)"
              value={form.packageNotes}
              onChange={(e) => setForm((f) => ({ ...f, packageNotes: e.target.value }))}
              className="px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#00002E]/20"
            />
          </div>

          {/* Available Riders */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <label className="block text-xs font-semibold text-gray-700">
                <Truck className="w-3.5 h-3.5 inline mr-1" />
                Available Delivery Persons
              </label>
              <button
                type="button"
                onClick={loadAvailableRiders}
                disabled={loadingRiders}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
              >
                {loadingRiders ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                {loadingRiders ? 'Loading' : 'Load Riders'}
              </button>
            </div>

            {availableRiders.length > 0 && (
              <div className="space-y-2">
                {availableRiders.map((rider) => {
                  const selected = selectedRiderId === rider.id;
                  return (
                    <button
                      key={rider.id}
                      type="button"
                      onClick={() => setSelectedRiderId(rider.id)}
                      className={`w-full text-left p-3 rounded-xl border transition-all ${
                        selected
                          ? 'border-[#00002E] bg-[#00002E]/5 ring-2 ring-[#00002E]/10'
                          : 'border-gray-200 hover:border-[#00002E]/30 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-gray-900 truncate">{rider.fullName}</span>
                            {selected && <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />}
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {rider.vehicleType || 'Vehicle'} {rider.vehicleNumber ? `- ${rider.vehicleNumber}` : ''}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">{rider.phone}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs font-semibold text-gray-900">
                            {rider.distanceToPickupKm !== null ? `${rider.distanceToPickupKm.toFixed(1)} km` : 'Location pending'}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {rider.rating ? `${rider.rating.toFixed(1)} stars` : 'New'} - {rider.totalDeliveries} trips
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-5 border-t border-gray-100 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-1 py-2.5 rounded-xl bg-[#00002E] text-white text-sm font-semibold hover:bg-[#00002E]/90 disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
          >
            {submitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {submitting ? 'Sending Request...' : 'Send Request'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Order Card ──────────────────────────────────────────────────────────────

function OrderCard({ order, onUpdate }: { order: Order; onUpdate: (id: string, status: OrderStatus) => Promise<void> }) {
  const [expanded, setExpanded] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [deliveryStatus, setDeliveryStatus] = useState<string | null>(null);
  const [loadingDeliveryStatus, setLoadingDeliveryStatus] = useState(false);

  // Load delivery status when the card mounts for PROCESSING / SHIPPED orders
  useEffect(() => {
    const eligible = ['PROCESSING', 'SHIPPED', 'CONFIRMED'];
    if (!eligible.includes(order.status)) return;
    let cancelled = false;
    (async () => {
      setLoadingDeliveryStatus(true);
      try {
        const res = await deliveryRequestsApi.getDeliveryStatus(order.id);
        if (!cancelled && res.success && res.data?.hasDelivery) {
          setDeliveryStatus(res.data.deliveryStatus);
        }
      } catch { /* silently ignore */ } finally {
        if (!cancelled) setLoadingDeliveryStatus(false);
      }
    })();
    return () => { cancelled = true; };
  }, [order.id, order.status]);

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

      {/* Delivery Dispatch Section */}
      {['CONFIRMED', 'PROCESSING', 'SHIPPED'].includes(order.status) && (
        <div className="px-4 pb-4 border-t border-gray-50 pt-3">
          {deliveryStatus ? (
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500 font-medium">Delivery Status</span>
              <DeliveryStatusBadge status={deliveryStatus} />
            </div>
          ) : (
            <button
              onClick={() => setShowDispatchModal(true)}
              disabled={loadingDeliveryStatus}
              className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-[#00002E] text-white rounded-xl text-sm font-semibold hover:bg-[#00002E]/90 disabled:opacity-60 transition-colors"
            >
              {loadingDeliveryStatus ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Truck className="w-4 h-4" />
              )}
              {loadingDeliveryStatus ? 'Checking...' : 'Assign Delivery'}
            </button>
          )}
        </div>
      )}

      {/* Dispatch Modal */}
      {showDispatchModal && (
        <CreateDeliveryRequestModal
          order={order}
          onClose={() => setShowDispatchModal(false)}
          onSuccess={() => {
            setDeliveryStatus('pending');
          }}
        />
      )}

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

    // Admin approved customer cancellation/refund request
    const handleCancellationApproved = (payload: { orderId: string; status: OrderStatus }) => {
      setOrders(prev =>
        prev.map(o => o.id === payload.orderId ? { ...o, status: payload.status } : o)
      );
      setLastRefresh(new Date());
    };

    socket.on('newOrder', handleNewOrder);
    socket.on('orderStatusUpdated', handleStatusUpdate);
    socket.on('cancellationApproved', handleCancellationApproved);

    return () => {
      socket.off('newOrder', handleNewOrder);
      socket.off('orderStatusUpdated', handleStatusUpdate);
      socket.off('cancellationApproved', handleCancellationApproved);
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

// ─── Products Tab ────────────────────────────────────────────────────────────

function ProductsTab() {
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await productsApi.getSalesmanProducts();
        if (res.success) {
          const nextProducts = Array.isArray(res.data)
            ? res.data
            : Array.isArray(res.data?.products)
              ? res.data.products
              : [];
          setProducts(nextProducts);
        }
      } catch (err) {
        console.error('Failed to load products', err);
        setProducts([]);
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
        <p className="text-gray-500 text-sm">Loading products…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {products.length === 0 ? (
          <div className="col-span-full py-20 text-center text-gray-400">
            No products found. Add your first product!
          </div>
        ) : (
          products.map(product => {
            const status = product.computedStatus || 'IN_STORE';
            const statusLabel = status === 'IN_STORE' ? 'In Store' : (STATUS_META[status as OrderStatus]?.label || status);
            const statusBg = status === 'IN_STORE' ? 'bg-emerald-100' : (STATUS_META[status as OrderStatus]?.bg || 'bg-gray-100');
            const statusColor = status === 'IN_STORE' ? 'text-emerald-700' : (STATUS_META[status as OrderStatus]?.color || 'text-gray-700');

            return (
              <div key={product.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-shadow">
                <div className="h-48 bg-gray-100 relative">
                  {product.images?.[0] ? (
                    <Image src={product.images[0]} alt={product.name} fill className="object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-10 h-10 text-gray-300" />
                    </div>
                  )}
                  <div className="absolute top-3 right-3">
                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase shadow-sm ${product.stock > 0 ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                      }`}>
                      {product.stock > 0 ? `Stock: ${product.stock}` : 'Out of Stock'}
                    </span>
                  </div>
                </div>
                <div className="p-4 flex-1 flex flex-col">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-gray-900 text-sm line-clamp-1 flex-1">{product.name}</h3>
                    <span className="text-sm font-bold text-[#00002E] ml-2">{formatRs(product.price)}</span>
                  </div>
                  <p className="text-xs text-gray-500 line-clamp-2 mb-4">{product.description}</p>

                  <div className="mt-auto flex items-center justify-between pt-4 border-t border-gray-50">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Status</span>
                      <span className={`text-xs font-semibold ${statusColor}`}>{statusLabel}</span>
                    </div>
                    <div className="flex gap-1">
                      <button title="Edit product" className="p-2 hover:bg-gray-50 rounded-lg text-gray-400 hover:text-[#00002E] transition-colors">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button title="Delete product" className="p-2 hover:bg-gray-50 rounded-lg text-gray-400 hover:text-red-500 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
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
          id: `new-order-${orderData.orderId}`,
          orderNumber: orderData.orderNumber,
          total: orderData.total,
          type: 'NEW_ORDER',
          time: new Date(),
          read: false
        };
        
        setAppNotifs(prev => mergeNotification(prev, notif));
        setToastNotif(notif);
        
        // Auto hide toast after 10 seconds without deleting from messages
        setTimeout(() => {
          setToastNotif(current => current?.id === notif.id ? null : current);
        }, 10000);
      };

      const handleRefundApproved = (payload: { orderId: string; orderNumber: string; message?: string }) => {
        const notif: AppNotification = {
          id: `refund-approved-${payload.orderId}`,
          orderNumber: payload.orderNumber,
          type: 'REFUND_APPROVED',
          message: payload.message || `Refund approved for Order ${payload.orderNumber}. Please refund the customer.` ,
          time: new Date(),
          read: false,
        };

        setAppNotifs(prev => mergeNotification(prev, notif));
        setToastNotif(notif);

        setTimeout(() => {
          setToastNotif(current => current?.id === notif.id ? null : current);
        }, 10000);
      };
      
      socket.on('newOrder', handleNewOrder);
      socket.on('cancellationApproved', handleRefundApproved);
      
      return () => {
        socket.off('newOrder', handleNewOrder);
        socket.off('cancellationApproved', handleRefundApproved);
        disconnectSocket();
      };
    }
  }, [user?.id]);

  // On login/reload, rebuild refund-related messages from existing refunded orders
  // so salesmen still see instructions even if they missed the live socket event.
  useEffect(() => {
    const loadRefundInstructionMessages = async () => {
      if (!user?.id) return;

      try {
        const response = await ordersApi.getSalesmanOrders({ status: 'CANCELLED', limit: 50 });
        const cancelledOrders = response?.data?.orders || [];

        const refundInstructionNotifs: AppNotification[] = cancelledOrders
          .filter((order: any) => order?.paymentStatus === 'REFUNDED')
          .map((order: any) => ({
            id: `refund-approved-${order.id}`,
            orderNumber: order.orderNumber,
            type: 'REFUND_APPROVED' as const,
            message: `Refund approved for Order ${order.orderNumber}. Please refund the customer.`,
            time: new Date(order.updatedAt || order.createdAt || Date.now()),
            read: false,
          }));

        if (refundInstructionNotifs.length > 0) {
          setAppNotifs((prev) => {
            let next = prev;
            for (const notif of refundInstructionNotifs) {
              next = mergeNotification(next, notif);
            }
            return next;
          });
        }
      } catch (err) {
        console.warn('Failed to load refunded orders for notifications:', err);
      }
    };

    loadRefundInstructionMessages();
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
                                  {notif.type === 'REFUND_APPROVED' ? 'Refund Approved' : `Order ${notif.orderNumber}`}
                                </span>
                                <span className="text-xs text-gray-400 shrink-0 ml-2">{timeAgo(notif.time.toISOString())}</span>
                              </div>
                              {notif.type === 'REFUND_APPROVED' ? (
                                <p className="text-xs text-gray-600">{notif.message}</p>
                              ) : (
                                <p className="text-xs text-gray-600">Total: Rs. {(notif.total || 0).toLocaleString()}</p>
                              )}
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
            {activeTab === 'orders' ? '📦 Current Orders' : '📊 Sales History'}
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {activeTab === 'orders'
              ? 'Manage and update orders placed by your customers.'
              : 'Track your revenue, completed orders, and top products.'}
          </p>

        </div>

        {activeTab === 'orders' && <CurrentOrdersTab userId={user.id} />}
        {activeTab === 'products' && <ProductsTab />}
        {activeTab === 'history' && <SalesHistoryTab />}

      </main>

      {/* Add Product Modal */}
      {showAddModal && <AddProductModal onClose={() => setShowAddModal(false)} />}
      
      {/* Toast Notification */}
      {toastNotif && (
        <div className="fixed bottom-4 right-4 z-50 bg-white rounded-xl shadow-xl border border-gray-100 p-4 max-w-sm w-full animate-in slide-in-from-bottom-5">
          <div className="flex items-start justify-between">
            <div className="flex gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${toastNotif.type === 'REFUND_APPROVED' ? 'bg-emerald-100' : 'bg-blue-100'}`}>
                {toastNotif.type === 'REFUND_APPROVED' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                ) : (
                  <ShoppingCart className="w-5 h-5 text-blue-600" />
                )}
              </div>
              <div>
                <h4 className="font-bold text-gray-900 text-sm">{toastNotif.type === 'REFUND_APPROVED' ? 'Refund Approved' : 'New Order!'}</h4>
                {toastNotif.type === 'REFUND_APPROVED' ? (
                  <p className="text-xs text-gray-500 mt-0.5">{toastNotif.message || `Order ${toastNotif.orderNumber} refund was approved.`}</p>
                ) : (
                  <p className="text-xs text-gray-500 mt-0.5">Order {toastNotif.orderNumber} for Rs. {(toastNotif.total || 0).toLocaleString()}</p>
                )}
              </div>
            </div>
            <button 
              title="Close toast"
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

// ─── Add Product Modal (unchanged) ──────────────────────────────────────────

function AddProductModal({ onClose }: { onClose: () => void }) {
  const [categories, setCategories] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [images, setImages] = useState<string[]>([]);
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
      const newImages = Array.from(files).map(file => URL.createObjectURL(file));
      setImages(prev => [...prev, ...newImages].slice(0, 5));
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Category is now optional
    setIsSubmitting(true);
    try {
      // In a real app, you'd upload images first and get URLs.
      // For now, we'll send the dummy local URLs if any, or empty array.
      await productsApi.createProduct({
        ...formData,
        price: parseFloat(formData.price),
        stock: parseInt(formData.stock),
        images: [], // Assuming backend handles image upload separately or we use placeholders
      });
      alert('Product added successfully!');
      onClose();
      window.location.reload(); // Quick refresh to show new product
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
              title="Select product category"
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
