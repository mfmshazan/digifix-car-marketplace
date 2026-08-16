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
import { resolveMediaUrl, ordersApi, productsApi, categoriesApi, deliveryRequestsApi, reviewsApi, vehicleApi } from '@/lib/api';
import type { Review } from '@/lib/api';
import { connectSocket, disconnectSocket, getSocket } from '@/lib/socket';
import { initOneSignal, loginOneSignalUser, logoutOneSignalUser, requestNotificationPermission } from '@/lib/onesignal';

// ─── Push Notification Hook ───────────────────────────────────────────────────

function useOneSignalPush() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const isReady = typeof window !== 'undefined' && 'Notification' in window;

  useEffect(() => {
    if (!isReady) return;
    const perm = window.Notification.permission;
    setPermission(perm);
    setSubscribed(perm === 'granted');
  }, [isReady]);

  const toggle = async () => {
    if (!isReady) {
      alert('Your browser does not support push notifications.');
      return;
    }
    setLoading(true);
    try {
      if (subscribed) {
        alert(
          'To disable notifications:\n' +
          'Click the 🔒 lock icon in the browser URL bar → Notifications → Block.'
        );
        setSubscribed(false);
      } else {
        const perm = await requestNotificationPermission();
        setPermission(perm);
        if (perm === 'granted') {
          setSubscribed(true);
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


type OrderStatus = 'PENDING' | 'CONFIRMED' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | 'REFUND_REQUESTED';

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
  cancellationReason?: string | null;
  isComplaint?: boolean;
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
  type: 'NEW_ORDER' | 'REFUND_APPROVED' | 'COMPLAINT';
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
  REFUND_REQUESTED: { label: 'Complaint', color: 'text-amber-700', bg: 'bg-amber-100', icon: AlertCircle },
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

// Rider delivery statuses that mean the package has physically left the shop —
// only then can the seller/manager mark the order SHIPPED.
const PICKED_UP_DELIVERY_STATES = ['picked_up', 'in_transit', 'arrived_at_dropoff', 'delivered'];

function StatusDropdown({ order, onUpdate, deliveryStatus }: { order: Order; onUpdate: (id: string, status: OrderStatus) => Promise<void>; deliveryStatus: string | null }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const currentIndex = STATUS_FLOW.indexOf(order.status as OrderStatus);
  const nextStatuses = STATUS_FLOW.slice(currentIndex + 1);
  const dropdownOptions = [...nextStatuses, 'CANCELLED' as OrderStatus];

  // SHIPPED is allowed only once a rider has picked the order up.
  const canShip = deliveryStatus ? PICKED_UP_DELIVERY_STATES.includes(deliveryStatus) : false;

  if (order.status === 'DELIVERED' || order.status === 'CANCELLED' || order.status === 'REFUND_REQUESTED') {
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
            const shipBlocked = s === 'SHIPPED' && !canShip;
            return (
              <button
                key={s}
                disabled={shipBlocked}
                title={shipBlocked ? 'Assign a rider and wait for pickup before shipping' : undefined}
                onClick={async () => {
                  setOpen(false);
                  setLoading(true);
                  try {
                    await onUpdate(order.id, s);
                  } finally {
                    setLoading(false);
                  }
                }}
                className={`w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-50 ${meta.color} ${shipBlocked ? 'opacity-40 cursor-not-allowed hover:bg-transparent' : ''}`}
              >
                <Icon className="w-4 h-4" />
                Mark as {meta.label}
                {shipBlocked && <span className="ml-auto text-[10px] text-gray-400">after pickup</span>}
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

function OrderCard({ order, onUpdate, onComplaint, isManager }: { order: Order; onUpdate: (id: string, status: OrderStatus) => Promise<void>; onComplaint: (id: string, action: 'accept' | 'reject') => Promise<void>; isManager: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [resolvingComplaint, setResolvingComplaint] = useState(false);
  const [deliveryStatus, setDeliveryStatus] = useState<string | null>(null);
  const [loadingDeliveryStatus, setLoadingDeliveryStatus] = useState(false);
  const [retryingDelivery, setRetryingDelivery] = useState(false);
  const [retryMessage, setRetryMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Load delivery status when the card mounts for PROCESSING / SHIPPED orders
  useEffect(() => {
    const eligible = ['PROCESSING', 'SHIPPED'];
    if (!eligible.includes(order.status)) return;
    let cancelled = false;
    const loadDeliveryStatus = async (showLoading = false) => {
      if (showLoading) {
        setLoadingDeliveryStatus(true);
      }
      try {
        const res = await deliveryRequestsApi.getDeliveryStatus(order.id);
        if (!cancelled && res.success && res.data?.hasDelivery) {
          setDeliveryStatus(res.data.deliveryStatus);
        }
      } catch { /* silently ignore */ } finally {
        if (!cancelled && showLoading) {
          setLoadingDeliveryStatus(false);
        }
      }
    };

    void loadDeliveryStatus(true);
    const intervalId = window.setInterval(() => {
      void loadDeliveryStatus(false);
    }, 5000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [order.id, order.status]);

  // Real-time: when the rider advances the delivery (e.g. picks up the package),
  // reflect it instantly instead of waiting for the 5s poll. The backend emits
  // the detailed `riderStep` on the shared `orderStatusUpdated` event to every
  // shop member (manager + salesmen).
  useEffect(() => {
    const socket = getSocket();
    const handleDeliveryUpdate = (payload: { orderId: string; riderStep?: string }) => {
      if (payload.orderId !== order.id || !payload.riderStep) return;
      setDeliveryStatus(payload.riderStep);
    };
    socket.on('orderStatusUpdated', handleDeliveryUpdate);
    return () => {
      socket.off('orderStatusUpdated', handleDeliveryUpdate);
    };
  }, [order.id]);

  const retryDelivery = async () => {
    setRetryingDelivery(true);
    setRetryMessage(null);
    try {
      const response = await deliveryRequestsApi.retry(order.id);
      setDeliveryStatus('available');
      setRetryMessage({
        type: 'success',
        text: response?.message || 'Request sent to another connected rider.',
      });
    } catch (error: any) {
      setRetryMessage({
        type: 'error',
        text: error?.response?.data?.message || error?.message || 'Failed to find another rider.',
      });
    } finally {
      setRetryingDelivery(false);
    }
  };

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
          <StatusDropdown order={order} onUpdate={onUpdate} deliveryStatus={deliveryStatus} />
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

      {/* Product Complaint Section — manager reviews & accepts/rejects the refund request */}
      {isManager && order.status === 'REFUND_REQUESTED' && order.isComplaint && (
        <div className="px-4 pb-4 border-t border-gray-50 pt-3">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
            <div className="flex items-center gap-1.5 mb-1">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              <span className="text-xs font-bold text-amber-800">Product Complaint</span>
            </div>
            <p className="text-sm text-amber-900">
              {order.cancellationReason || 'The customer reported an issue with this delivered order.'}
            </p>
            <p className="text-[11px] text-amber-600 mt-1">
              The customer should return the product to the warehouse. Accept to approve the refund, or reject to decline.
            </p>
            <div className="flex gap-2 mt-3">
              <button
                onClick={async () => {
                  setResolvingComplaint(true);
                  try { await onComplaint(order.id, 'accept'); } finally { setResolvingComplaint(false); }
                }}
                disabled={resolvingComplaint}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 disabled:opacity-60 transition-colors"
              >
                <CheckCircle2 className="w-4 h-4" />
                Accept Refund
              </button>
              <button
                onClick={async () => {
                  setResolvingComplaint(true);
                  try { await onComplaint(order.id, 'reject'); } finally { setResolvingComplaint(false); }
                }}
                disabled={resolvingComplaint}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-white border border-red-200 text-red-600 rounded-lg text-sm font-semibold hover:bg-red-50 disabled:opacity-60 transition-colors"
              >
                <X className="w-4 h-4" />
                Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delivery Dispatch Section */}
      {['PROCESSING', 'SHIPPED'].includes(order.status) && (
        <div className="px-4 pb-4 border-t border-gray-50 pt-3">
          {deliveryStatus ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500 font-medium">Delivery Status</span>
                <DeliveryStatusBadge status={deliveryStatus} />
              </div>
              {['pending', 'available'].includes(deliveryStatus) && (
                <>
                  <button
                    onClick={retryDelivery}
                    disabled={retryingDelivery}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-orange-600 text-white rounded-xl text-sm font-semibold hover:bg-orange-700 disabled:opacity-60 transition-colors"
                  >
                    <RefreshCw className={`w-4 h-4 ${retryingDelivery ? 'animate-spin' : ''}`} />
                    {retryingDelivery ? 'Searching...' : 'Find Another Rider'}
                  </button>
                  {retryMessage && (
                    <p className={`text-xs rounded-lg px-3 py-2 ${
                      retryMessage.type === 'success'
                        ? 'bg-green-50 text-green-700'
                        : 'bg-red-50 text-red-700'
                    }`}>
                      {retryMessage.text}
                    </p>
                  )}
                </>
              )}
              {/* Rider has collected the package → prompt the seller/manager to ship */}
              {PICKED_UP_DELIVERY_STATES.includes(deliveryStatus) && order.status !== 'SHIPPED' && (
                <div className="flex items-start gap-2 p-2.5 bg-green-50 border border-green-200 rounded-xl text-xs text-green-800 font-medium animate-pulse">
                  <Package className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>Rider has picked up the package — you can now mark this order as <span className="font-bold">Shipped</span> from the status menu above.</span>
                </div>
              )}
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
  const isManager = useAuthStore((s) => s.user?.role) === 'SHOP_MANAGER';
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [newOrderAlert, setNewOrderAlert] = useState<string | null>(null);
  const [complaintAlert, setComplaintAlert] = useState<string | null>(null);
  const [statusUpdateError, setStatusUpdateError] = useState<string | null>(null);

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
      console.log('🆕 [CurrentOrdersTab] newOrder event received:', payload);
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

    // Customer raised a post-delivery complaint — surfaced to the manager only.
    const handleComplaintRaised = (payload: { orderNumber: string }) => {
      if (!isManager) return;
      setComplaintAlert(`⚠️ New complaint on order ${payload.orderNumber}`);
      loadOrders();
      setTimeout(() => setComplaintAlert(null), 12000);
    };

    // A complaint was accepted/rejected (e.g. from another tab) → refresh
    const handleComplaintResolved = () => {
      loadOrders();
    };

    socket.on('newOrder', handleNewOrder);
    socket.on('orderStatusUpdated', handleStatusUpdate);
    socket.on('cancellationApproved', handleCancellationApproved);
    socket.on('complaintRaised', handleComplaintRaised);
    socket.on('complaintResolved', handleComplaintResolved);

    return () => {
      socket.off('newOrder', handleNewOrder);
      socket.off('orderStatusUpdated', handleStatusUpdate);
      socket.off('cancellationApproved', handleCancellationApproved);
      socket.off('complaintRaised', handleComplaintRaised);
      socket.off('complaintResolved', handleComplaintResolved);
    };
  }, [userId, loadOrders]);

  const handleUpdateStatus = async (id: string, status: OrderStatus) => {
    setStatusUpdateError(null);

    try {
      await ordersApi.updateOrderStatus(id, status);
      setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o));
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        'Failed to update order status. Please try again.';
      setStatusUpdateError(message);
      console.error('Failed to update order status', error);
    }
  };

  const handleComplaint = async (id: string, action: 'accept' | 'reject') => {
    setStatusUpdateError(null);
    try {
      if (action === 'accept') {
        await ordersApi.acceptComplaint(id);
      } else {
        await ordersApi.rejectComplaint(id);
      }
      await loadOrders();
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        'Failed to resolve complaint. Please try again.';
      setStatusUpdateError(message);
      console.error('Failed to resolve complaint', error);
    }
  };

  const activeOrders = orders.filter(o => o.status !== 'DELIVERED' && o.status !== 'CANCELLED');
  const displayOrders = filterStatus ? orders : activeOrders;

  const filterOptions = [
    { value: '', label: 'Active Orders' },
    { value: 'PENDING', label: 'Pending' },
    { value: 'PROCESSING', label: 'Processing' },
    { value: 'SHIPPED', label: 'Shipped' },
    { value: 'DELIVERED', label: 'Delivered' },
    ...(isManager ? [{ value: 'REFUND_REQUESTED', label: 'Complaints' }] : []),
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
      {complaintAlert && (
        <div className="mb-4 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2 text-amber-800 text-sm font-medium animate-pulse">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{complaintAlert}</span>
          <button
            type="button"
            onClick={() => { setFilterStatus('REFUND_REQUESTED'); setComplaintAlert(null); }}
            className="ml-auto text-amber-700 hover:text-amber-900 underline"
          >
            Review
          </button>
        </div>
      )}
      {statusUpdateError && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2 text-red-800 text-sm font-medium">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{statusUpdateError}</span>
          <button
            type="button"
            onClick={() => setStatusUpdateError(null)}
            className="ml-auto text-red-600 hover:text-red-800"
            aria-label="Dismiss error"
          >
            <X className="w-4 h-4" />
          </button>
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
            <OrderCard key={order.id} order={order} onUpdate={handleUpdateStatus} onComplaint={handleComplaint} isManager={isManager} />
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
  // Only managers can edit/delete catalog items; salesmen view only.
  const isManager = useAuthStore((s) => s.user?.role) === 'SHOP_MANAGER';

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
            {isManager ? 'No products found. Add your first product!' : 'No products found.'}
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
                    <Image src={resolveMediaUrl(product.images[0]) || product.images[0]} alt={product.name} fill className="object-cover" />
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
                  <p className="text-xs text-gray-500 line-clamp-2 mb-2">{product.description}</p>

                  {/* Show car part specific details if available */}
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {product.condition && (
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                        product.condition === 'NEW' ? 'bg-blue-50 text-blue-600' :
                        product.condition === 'USED' ? 'bg-amber-50 text-amber-600' :
                        'bg-purple-50 text-purple-600'
                      }`}>
                        {product.condition}
                      </span>
                    )}
                    {product.partNumber && (
                      <span className="text-[10px] font-mono bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                        #{product.partNumber}
                      </span>
                    )}
                    {product.category?.name && (
                      <span className="text-[10px] bg-indigo-50 text-indigo-600 font-semibold px-2 py-0.5 rounded-full">
                        {product.category.name}
                      </span>
                    )}
                  </div>

                  <div className="mt-auto flex items-center justify-between pt-4 border-t border-gray-50">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Status</span>
                      <span className={`text-xs font-semibold ${statusColor}`}>{statusLabel}</span>
                    </div>
                    {isManager && (
                      <div className="flex gap-1">
                        <button title="Edit product" className="p-2 hover:bg-gray-50 rounded-lg text-gray-400 hover:text-[#00002E] transition-colors">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button title="Delete product" className="p-2 hover:bg-gray-50 rounded-lg text-gray-400 hover:text-red-500 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
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

// ─── Reviews Tab ─────────────────────────────────────────────────────────────

function StarBar({ count, total }: { count: number; total: number }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full bg-[#FF6B35] rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-gray-500 w-8 text-right">{pct}%</span>
    </div>
  );
}

function ReviewCard({ review, onReplied }: { review: Review; onReplied: (reviewId: string, reply: any) => void }) {
  const [showReply, setShowReply] = React.useState(false);
  const [replyText, setReplyText] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const hasReply = review.replies && review.replies.length > 0;

  const handleSubmitReply = async () => {
    if (!replyText.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await reviewsApi.replyToReview(review.id, replyText.trim());
      onReplied(review.id, res.data);
      setShowReply(false);
      setReplyText('');
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to submit reply');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
      {/* Reviewer header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#00002E]/10 flex items-center justify-center shrink-0">
            {review.user?.avatar ? (
              <img src={review.user.avatar} alt={review.user.name} className="w-10 h-10 rounded-full object-cover" />
            ) : (
              <span className="text-sm font-bold text-[#00002E]">
                {(review.user?.name || 'A').charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">{review.user?.name || 'Anonymous'}</p>
            <p className="text-xs text-gray-400">
              {new Date(review.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
            </p>
          </div>
        </div>
        {/* Stars */}
        <div className="flex items-center gap-0.5 shrink-0">
          {[1, 2, 3, 4, 5].map(s => (
            <Star
              key={s}
              className={`w-4 h-4 ${s <= review.rating ? 'text-[#FF6B35] fill-[#FF6B35]' : 'text-gray-200 fill-gray-200'}`}
            />
          ))}
        </div>
      </div>

      {/* Comment */}
      {review.comment && (
        <p className="text-sm text-gray-700 leading-relaxed">{review.comment}</p>
      )}

      {/* Existing Reply */}
      {hasReply && (
        <div className="bg-[#00002E]/5 border border-[#00002E]/10 rounded-xl p-4">
          <p className="text-xs font-semibold text-[#00002E] mb-1">Your Reply</p>
          <p className="text-sm text-gray-700 leading-relaxed">{review.replies[0].replyText}</p>
          <p className="text-xs text-gray-400 mt-2">
            {new Date(review.replies[0].createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
      )}

      {/* Reply Form */}
      {!hasReply && (
        <div>
          {!showReply ? (
            <button
              onClick={() => setShowReply(true)}
              className="flex items-center gap-1.5 text-xs font-semibold text-[#00002E] hover:text-[#FF6B35] transition-colors"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Write a Reply
            </button>
          ) : (
            <div className="space-y-2">
              <textarea
                rows={3}
                value={replyText}
                onChange={e => setReplyText(e.target.value)}
                placeholder="Write a thoughtful response to this review..."
                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm text-gray-700 resize-none focus:outline-none focus:ring-2 focus:ring-[#00002E]/20"
              />
              {error && <p className="text-xs text-red-500">{error}</p>}
              <div className="flex gap-2">
                <button
                  onClick={handleSubmitReply}
                  disabled={submitting || !replyText.trim()}
                  className="flex items-center gap-1.5 px-4 py-2 bg-[#00002E] text-white text-xs font-semibold rounded-xl hover:bg-[#00002E]/90 disabled:opacity-50 transition-all"
                >
                  {submitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  {submitting ? 'Submitting…' : 'Submit Reply'}
                </button>
                <button
                  onClick={() => { setShowReply(false); setReplyText(''); setError(null); }}
                  className="px-4 py-2 border border-gray-200 text-gray-500 text-xs font-semibold rounded-xl hover:bg-gray-50 transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ReviewsTab({ salesmanId }: { salesmanId: string }) {
  const [reviews, setReviews] = React.useState<Review[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const fetchReviews = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await reviewsApi.getTargetReviews(salesmanId);
      setReviews(res.data || []);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to load reviews');
    } finally {
      setLoading(false);
    }
  }, [salesmanId]);

  React.useEffect(() => { fetchReviews(); }, [fetchReviews]);

  // Calculate aggregate stats
  const total = reviews.length;
  const avgRating = total > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / total : 0;
  const starCounts = [5, 4, 3, 2, 1].map(star => ({
    star,
    count: reviews.filter(r => r.rating === star).length,
  }));

  const handleReplied = (reviewId: string, newReply: any) => {
    setReviews(prev =>
      prev.map(r =>
        r.id === reviewId ? { ...r, replies: [newReply] } : r
      )
    );
  };

  return (
    <div className="space-y-6">
      {/* Stats Summary Card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
          {/* Average Rating */}
          <div className="flex flex-col items-center justify-center text-center min-w-[110px]">
            <span className="text-5xl font-black text-[#00002E]">{total > 0 ? avgRating.toFixed(1) : '—'}</span>
            <div className="flex items-center gap-0.5 mt-1">
              {[1, 2, 3, 4, 5].map(s => (
                <Star
                  key={s}
                  className={`w-4 h-4 ${s <= Math.round(avgRating) ? 'text-[#FF6B35] fill-[#FF6B35]' : 'text-gray-200 fill-gray-200'}`}
                />
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-1">{total} review{total !== 1 ? 's' : ''}</p>
          </div>

          <div className="h-px sm:h-16 w-full sm:w-px bg-gray-100" />

          {/* Star Breakdown */}
          <div className="flex-1 space-y-1.5 w-full">
            {starCounts.map(({ star, count }) => (
              <div key={star} className="flex items-center gap-2">
                <span className="text-xs text-gray-500 w-6 text-right">{star}</span>
                <Star className="w-3.5 h-3.5 text-[#FF6B35] fill-[#FF6B35] shrink-0" />
                <StarBar count={count} total={total} />
                <span className="text-xs text-gray-400 w-4">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Reviews Feed */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-700">
            {total > 0 ? `All Reviews (${total})` : 'No reviews yet'}
          </h3>
          <button
            onClick={fetchReviews}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>

        {loading && (
          <div className="flex justify-center py-16">
            <RefreshCw className="w-6 h-6 text-[#00002E] animate-spin" />
          </div>
        )}

        {!loading && error && (
          <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
            <AlertCircle className="w-5 h-5 shrink-0" />
            {error}
          </div>
        )}

        {!loading && !error && total === 0 && (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
            <Star className="w-12 h-12 text-gray-200 fill-gray-200 mx-auto mb-4" />
            <p className="text-gray-600 font-semibold">No reviews yet</p>
            <p className="text-gray-400 text-sm mt-1">Customer reviews will appear here after they rate their delivered orders.</p>
          </div>
        )}

        {!loading && !error && reviews.map(review => (
          <ReviewCard key={review.id} review={review} onReplied={handleReplied} />
        ))}
      </div>
    </div>
  );
}

// ─── Main Dashboard ──────────────────────────────────────────────────────────

type Tab = 'orders' | 'products' | 'history' | 'reviews';

export default function SellerDashboard({ expectedRole }: { expectedRole: 'SALESMAN' | 'SHOP_MANAGER' }) {
  const router = useRouter();
  const { user, logout, isAuthenticated, refreshProfile } = useAuthStore();

  const [activeTab, setActiveTab] = useState<Tab>('orders');
  const [showAddModal, setShowAddModal] = useState(false);

  // App Notifications (in-app messages)
  const [appNotifs, setAppNotifs] = useState<AppNotification[]>([]);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [toastNotif, setToastNotif] = useState<AppNotification | null>(null);

  // ── OneSignal push notifications ─────────────────────────────────────────────
  const { subscribed: pushEnabled, loading: pushLoading, isReady: pushReady, permission: pushPermission, toggle: togglePush } = useOneSignalPush();


  const [mounted, setMounted] = useState(false);
  useEffect(() => {
      setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    
    if (!isAuthenticated) {
        // Check localStorage directly as a fallback before kicking out
        const hasToken = typeof window !== 'undefined' && localStorage.getItem('digifix_token');
        if (!hasToken) {
            router.push('/login');
        }
    } else if (user?.role !== expectedRole) {
      // Wrong role for this page — send them to the dashboard that matches their role
      const dest =
        user?.role === 'SHOP_MANAGER' ? '/dashboard/manager'
        : user?.role === 'SALESMAN' ? '/dashboard/salesman'
        : user?.role === 'ADMIN' ? '/dashboard/admin'
        : '/login';
      router.push(dest);
    }
  }, [isAuthenticated, user, router, expectedRole]);

  // Sync profile data on mount to ensure mobile updates are reflected
  useEffect(() => {
    if (isAuthenticated) {
      refreshProfile();
    }
  }, [isAuthenticated, refreshProfile]);

  // ── OneSignal: init SDK once, then login with userId so backend can target by external_id ──
  useEffect(() => {
    if (!user?.id) return;
    initOneSignal().then((ok) => {
      if (ok) loginOneSignalUser(user.id);
    });
  }, [user?.id]);

  // ── Connect socket when user is available, disconnect on logout ──────────────
  useEffect(() => {
    if (!mounted) return;

    // Prefer Zustand store userId; fall back to decoding the JWT directly to handle
    // the Next.js SSR → client hydration window where the store hasn't rehydrated yet.
    let userId = user?.id;
    if (!userId) {
      try {
        const token = localStorage.getItem('digifix_token');
        if (token) {
          const payload = JSON.parse(atob(token.split('.')[1]));
          userId = payload.userId || payload.id || payload.sub;
        }
      } catch { /* ignore malformed token */ }
    }

    if (!userId) return;

    const socket = connectSocket(userId);

    // Refund and complaint messages are for the store owner (manager) only —
    // not the salesmen who operate under them.
    const isManager = user?.role === 'SHOP_MANAGER';

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
      setTimeout(() => {
        setToastNotif(current => current?.id === notif.id ? null : current);
      }, 10000);
    };

    const handleRefundApproved = (payload: { orderId: string; orderNumber: string; message?: string }) => {
      if (!isManager) return;
      const notif: AppNotification = {
        id: `refund-approved-${payload.orderId}`,
        orderNumber: payload.orderNumber,
        type: 'REFUND_APPROVED',
        message: payload.message || `Refund approved for Order ${payload.orderNumber}. Please refund the customer.`,
        time: new Date(),
        read: false,
      };
      setAppNotifs(prev => mergeNotification(prev, notif));
      setToastNotif(notif);
      setTimeout(() => {
        setToastNotif(current => current?.id === notif.id ? null : current);
      }, 10000);
    };

    // Customer raised a post-delivery product complaint → message the manager.
    const handleComplaintRaised = (payload: { orderId: string; orderNumber: string; customerName?: string; reason?: string }) => {
      if (!isManager) return;
      const notif: AppNotification = {
        id: `complaint-${payload.orderId}`,
        orderNumber: payload.orderNumber,
        type: 'COMPLAINT',
        message: payload.reason
          ? `Complaint on Order ${payload.orderNumber}: "${payload.reason}"`
          : `${payload.customerName || 'A customer'} raised a complaint on Order ${payload.orderNumber}.`,
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
    socket.on('complaintRaised', handleComplaintRaised);

    return () => {
      socket.off('newOrder', handleNewOrder);
      socket.off('cancellationApproved', handleRefundApproved);
      socket.off('complaintRaised', handleComplaintRaised);
    };
  }, [user?.id, user?.role, mounted]);

  // On login/reload, rebuild refund-related messages from existing refunded orders
  // so the manager still sees instructions even if they missed the live socket event.
  // Refund messages are for the manager (store owner) only — not salesmen.
  useEffect(() => {
    const loadRefundInstructionMessages = async () => {
      if (!user?.id || user?.role !== 'SHOP_MANAGER') return;

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
  }, [user?.id, user?.role]);



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
  // Managers own the catalog (can add/edit products); salesmen are view-only operators.
  const isManager = user.role === 'SHOP_MANAGER';

  const tabs = [
    { id: 'orders' as const, label: 'Current Orders', icon: ListOrdered },
    { id: 'products' as const, label: 'My Products', icon: Package },
    { id: 'history' as const, label: 'Sales History', icon: BarChart3 },
    { id: 'reviews' as const, label: 'Store Reviews', icon: Star },
  ];


  return (
    <div className="min-h-screen bg-[#f4f6fb]">
      <nav className="sticky top-0 z-30 bg-[#060618] shadow-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Brand / Store Info */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-[#1A1A3A] rounded-xl flex items-center justify-center border border-white/10 overflow-hidden">
                {avatarUrl ? (
                  <Image
                    src={avatarUrl}
                    alt={user.name || ''}
                    width={36}
                    height={36}
                    className="object-cover w-full h-full"
                    unoptimized
                  />
                ) : (
                  <Store className="w-5 h-5 text-blue-400" />
                )}
              </div>
              <div className="flex flex-col justify-center">
                <p className="text-white font-bold leading-none text-[13px] tracking-wide">
                  {user.store?.name ?? `${user.name}'s Store`}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[#8A8A9B] text-[11px] font-medium">
                    {isManager ? 'Manager Portal' : 'Salesman Portal'}
                  </span>
                  {user.phone && (
                    <span className="flex items-center gap-1 text-[#8A8A9B] text-[11px] font-medium">
                      <Phone className="w-2.5 h-2.5" />
                      {user.phone}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Tabs (Desktop) */}
            <div className="hidden lg:flex items-center bg-[#15152E] rounded-[14px] p-1 gap-0.5">
              {tabs.map(tab => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as Tab)}
                    className={`flex items-center gap-2 px-4 py-1.5 rounded-xl text-[13px] font-semibold transition-all duration-200 ${
                      isActive
                        ? 'bg-white text-[#060618] shadow-sm'
                        : 'text-[#8A8A9B] hover:text-white hover:bg-white/5'
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
              {/* Only managers own the catalog and can add products */}
              {isManager && (
                <button
                  onClick={() => setShowAddModal(true)}
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-[13px] font-semibold rounded-xl transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Product
                </button>
              )}

              {/* App Notifications Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowNotifDropdown(!showNotifDropdown)}
                  className="relative flex items-center justify-center p-2 rounded-xl hover:bg-white/5 text-[#8A8A9B] hover:text-white transition-colors"
                  title="Messages"
                >
                  <MessageSquare className="w-[18px] h-[18px]" />
                  {appNotifs.filter(n => !n.read).length > 0 && (
                    <span className="absolute top-1 right-1 min-w-[14px] h-[14px] px-0.5 rounded-full bg-[#FF6B6B] text-white text-[9px] font-bold flex items-center justify-center border-2 border-[#060618]">
                      {appNotifs.filter(n => !n.read).length}
                    </span>
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
                                  {notif.type === 'REFUND_APPROVED' ? 'Refund Approved'
                                    : notif.type === 'COMPLAINT' ? `Complaint · Order ${notif.orderNumber}`
                                    : `Order ${notif.orderNumber}`}
                                </span>
                                <span className="text-xs text-gray-400 shrink-0 ml-2">{timeAgo(notif.time.toISOString())}</span>
                              </div>
                              {notif.type === 'NEW_ORDER' ? (
                                <p className="text-xs text-gray-600">Total: Rs. {(notif.total || 0).toLocaleString()}</p>
                              ) : (
                                <p className="text-xs text-gray-600">{notif.message}</p>
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

              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-3 py-2 text-[#8A8A9B] hover:text-white text-[13px] font-semibold rounded-xl transition-all hover:bg-white/5"
              >
                <LogOut className="w-[18px] h-[18px]" />
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
            {activeTab === 'orders' && '📦 Current Orders'}
            {activeTab === 'products' && '🛒 My Products'}
            {activeTab === 'history' && '📊 Sales History'}
            {activeTab === 'reviews' && '⭐ Store Reviews'}
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {activeTab === 'orders' && 'Manage and update orders placed by your customers.'}
            {activeTab === 'products' && 'View and manage your listed products.'}
            {activeTab === 'history' && 'Track your revenue, completed orders, and top products.'}
            {activeTab === 'reviews' && 'See what customers are saying and reply to their reviews.'}
          </p>

        </div>

        {activeTab === 'orders' && <CurrentOrdersTab userId={user.id} />}
        {activeTab === 'products' && <ProductsTab />}
        {activeTab === 'history' && <SalesHistoryTab />}
        {/* Reviews target the shop owner (manager); a salesman scopes to their manager. */}
        {activeTab === 'reviews' && <ReviewsTab salesmanId={user.managerId || user.id} />}

      </main>

      {/* Add Product Modal */}
      {showAddModal && <AddProductModal onClose={() => setShowAddModal(false)} />}
      
      {/* Toast Notification */}
      {toastNotif && (
        <div className="fixed bottom-4 right-4 z-50 bg-white rounded-xl shadow-xl border border-gray-100 p-4 max-w-sm w-full animate-in slide-in-from-bottom-5">
          <div className="flex items-start justify-between">
            <div className="flex gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${toastNotif.type === 'REFUND_APPROVED' ? 'bg-emerald-100' : toastNotif.type === 'COMPLAINT' ? 'bg-amber-100' : 'bg-blue-100'}`}>
                {toastNotif.type === 'REFUND_APPROVED' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                ) : toastNotif.type === 'COMPLAINT' ? (
                  <AlertCircle className="w-5 h-5 text-amber-600" />
                ) : (
                  <ShoppingCart className="w-5 h-5 text-blue-600" />
                )}
              </div>
              <div>
                <h4 className="font-bold text-gray-900 text-sm">{toastNotif.type === 'REFUND_APPROVED' ? 'Refund Approved' : toastNotif.type === 'COMPLAINT' ? 'New Complaint' : 'New Order!'}</h4>
                {toastNotif.type === 'NEW_ORDER' ? (
                  <p className="text-xs text-gray-500 mt-0.5">Order {toastNotif.orderNumber} for Rs. {(toastNotif.total || 0).toLocaleString()}</p>
                ) : (
                  <p className="text-xs text-gray-500 mt-0.5">{toastNotif.message || `Order ${toastNotif.orderNumber}`}</p>
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

// ─── Multi-select dropdown (checkbox list + "All") ──────────────────────────
// Used for Vehicle Type / Brand / Model so a manager can tag one product as
// compatible with several vehicles instead of exactly one.

function MultiSelectDropdown({
  options,
  selectedIds,
  onChange,
  placeholder,
  disabled,
  loading,
}: {
  options: { id: string; name: string }[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  placeholder: string;
  disabled?: boolean;
  loading?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const allSelected = options.length > 0 && selectedIds.length === options.length;

  const toggleAll = () => {
    onChange(allSelected ? [] : options.map(o => o.id));
  };

  const toggleOne = (id: string) => {
    onChange(
      selectedIds.includes(id)
        ? selectedIds.filter(existing => existing !== id)
        : [...selectedIds, id]
    );
  };

  const summary = loading
    ? 'Loading...'
    : selectedIds.length === 0
    ? placeholder
    : allSelected
    ? `All (${options.length})`
    : `${selectedIds.length} selected`;

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(prev => !prev)}
        disabled={disabled}
        className="w-full px-4 py-3 border border-gray-300 rounded-xl text-left flex items-center justify-between focus:ring-2 focus:ring-[#00002E]/30 focus:border-[#00002E] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span className={selectedIds.length === 0 ? 'text-gray-400' : 'text-gray-900'}>
          {summary}
        </span>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && !disabled && (
        <div className="absolute z-20 mt-1 w-full max-h-64 overflow-y-auto bg-white border border-gray-200 rounded-xl shadow-lg py-1">
          {options.length === 0 ? (
            <div className="px-4 py-3 text-sm text-gray-400">No options available</div>
          ) : (
            <>
              <label className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100 font-medium">
                <input type="checkbox" checked={allSelected} onChange={toggleAll} className="rounded" />
                <span className="text-sm text-gray-900">All</span>
              </label>
              {options.map(opt => (
                <label key={opt.id} className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(opt.id)}
                    onChange={() => toggleOne(opt.id)}
                    className="rounded"
                  />
                  <span className="text-sm text-gray-700">{opt.name}</span>
                </label>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Add Product Modal (with Vehicle Types, Brands, Models) ─────────────────

function AddProductModal({ onClose }: { onClose: () => void }) {
  const [categories, setCategories] = useState<any[]>([]);
  const [vehicleTypes, setVehicleTypes] = useState<any[]>([]);
  const [vehicleBrands, setVehicleBrands] = useState<any[]>([]);
  const [vehicleModels, setVehicleModels] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [loadingBrands, setLoadingBrands] = useState(false);
  const [loadingModels, setLoadingModels] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    stock: '',
    condition: 'NEW',
    categoryId: '',
  });

  // Multi-select: a product can be tagged compatible with several vehicle
  // types/brands/models at once (each dropdown also offers an "All" option).
  const [selectedTypeIds, setSelectedTypeIds] = useState<string[]>([]);
  const [selectedBrandIds, setSelectedBrandIds] = useState<string[]>([]);
  const [selectedModelIds, setSelectedModelIds] = useState<string[]>([]);

  // Load vehicle types and categories on mount
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [categoriesRes, typesRes] = await Promise.all([
          categoriesApi.getAll(),
          vehicleApi.getVehicleTypes(),
        ]);
        if (categoriesRes.success) setCategories(categoriesRes.data);
        if (typesRes.success) setVehicleTypes(typesRes.data);
      } catch (err) {
        console.error('Failed to load initial data', err);
      }
    };
    loadInitialData();
  }, []);

  // Load vehicle brands for the union of all selected vehicle types
  useEffect(() => {
    if (selectedTypeIds.length === 0) {
      setVehicleBrands([]);
      setVehicleModels([]);
      setSelectedBrandIds([]);
      return;
    }

    const loadBrands = async () => {
      setLoadingBrands(true);
      try {
        const results = await Promise.all(
          selectedTypeIds.map(typeId => vehicleApi.getVehicleBrandsByType(typeId))
        );
        const brandMap = new Map<string, any>();
        results.forEach(res => {
          if (res.success) {
            res.data.forEach((brand: any) => brandMap.set(brand.id, brand));
          }
        });
        const merged = Array.from(brandMap.values()).sort((a, b) => a.name.localeCompare(b.name));
        setVehicleBrands(merged);
        // Drop any brand selections that no longer apply under the new type set
        setSelectedBrandIds(prev => prev.filter(id => merged.some(b => b.id === id)));
      } catch (err) {
        console.error('Failed to load vehicle brands', err);
      } finally {
        setLoadingBrands(false);
      }
    };

    loadBrands();
  }, [selectedTypeIds]);

  // Load vehicle models for the union of all selected vehicle brands
  useEffect(() => {
    if (selectedBrandIds.length === 0) {
      setVehicleModels([]);
      setSelectedModelIds([]);
      return;
    }

    const loadModels = async () => {
      setLoadingModels(true);
      try {
        const results = await Promise.all(
          selectedBrandIds.map(brandId => vehicleApi.getVehicleModelsByBrand(brandId))
        );
        const modelMap = new Map<string, any>();
        results.forEach(res => {
          if (res.success) {
            res.data.forEach((model: any) => modelMap.set(model.id, model));
          }
        });
        const merged = Array.from(modelMap.values()).sort((a, b) => a.name.localeCompare(b.name));
        setVehicleModels(merged);
        // Drop any model selections that no longer apply under the new brand set
        setSelectedModelIds(prev => prev.filter(id => merged.some(m => m.id === id)));
      } catch (err) {
        console.error('Failed to load vehicle models', err);
      } finally {
        setLoadingModels(false);
      }
    };

    loadModels();
  }, [selectedBrandIds]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = reader.result as string;
          setImages(prev => [...prev, base64].slice(0, 5));
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    if (selectedModelIds.length === 0) {
      alert('Please select at least one vehicle model');
      return;
    }

    setIsSubmitting(true);
    try {
      await productsApi.createProduct({
        ...formData,
        price: parseFloat(formData.price),
        stock: parseInt(formData.stock),
        images: images,
        vehicleModelIds: selectedModelIds,
      });
      alert('Product added successfully!');
      onClose();
      window.location.reload();
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

          {/* Vehicle Type Dropdown (multi-select) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Vehicle Type * (select one or more)</label>
            <MultiSelectDropdown
              options={vehicleTypes}
              selectedIds={selectedTypeIds}
              onChange={setSelectedTypeIds}
              placeholder="Select vehicle type(s)"
            />
          </div>

          {/* Vehicle Brand Dropdown (multi-select) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Vehicle Brand * (select one or more)</label>
            <MultiSelectDropdown
              options={vehicleBrands}
              selectedIds={selectedBrandIds}
              onChange={setSelectedBrandIds}
              placeholder="Select vehicle brand(s)"
              disabled={selectedTypeIds.length === 0}
              loading={loadingBrands}
            />
          </div>

          {/* Vehicle Model Dropdown (multi-select) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Vehicle Model * (select one or more)</label>
            <MultiSelectDropdown
              options={vehicleModels}
              selectedIds={selectedModelIds}
              onChange={setSelectedModelIds}
              placeholder="Select vehicle model(s)"
              disabled={selectedBrandIds.length === 0}
              loading={loadingModels}
            />
          </div>

          {/* Product Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Product Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#00002E]/30 focus:border-[#00002E]"
              placeholder="e.g., Premium Brake Pads"
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
              <label className="block text-sm font-medium text-gray-700 mb-2">Price (Rs.) *</label>
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
              <label className="block text-sm font-medium text-gray-700 mb-2">Stock (Qty) *</label>
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

          {/* Category (Optional) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Category (Optional)</label>
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
            <button type="submit" disabled={isSubmitting || selectedModelIds.length === 0} className="flex-1 px-4 py-2 bg-[#00002E] hover:bg-[#000050] text-white font-semibold rounded-xl transition-all disabled:opacity-50">
              {isSubmitting ? 'Adding...' : 'Add Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
