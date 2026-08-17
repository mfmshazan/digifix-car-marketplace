'use client';

// Shop location onboarding — shown right after a manager signs up, before they
// reach the dashboard. The saved pickup coordinates are what delivery fees are
// calculated from, so a manager must set this once before operating.

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MapPin, Navigation, Loader2, Store } from 'lucide-react';
import { deliveryRequestsApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

export default function ManagerLocationSetupPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();

  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [address, setAddress] = useState('');
  const [gettingLocation, setGettingLocation] = useState(false);
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // Only managers belong here. Send everyone else to where they should be.
  useEffect(() => {
    if (!mounted) return;
    if (!isAuthenticated) {
      const hasToken = typeof window !== 'undefined' && localStorage.getItem('digifix_token');
      if (!hasToken) {
        router.replace('/login');
      }
      return;
    }
    if (user && user.role !== 'SHOP_MANAGER') {
      const dest =
        user.role === 'SALESMAN' ? '/dashboard/salesman'
        : user.role === 'ADMIN' ? '/dashboard/admin'
        : '/login';
      router.replace(dest);
    }
  }, [mounted, isAuthenticated, user, router]);

  // If the location was already saved (e.g. manager revisits the page), skip
  // straight to the dashboard so we never make them redo it.
  useEffect(() => {
    if (!mounted) return;
    let active = true;
    deliveryRequestsApi.getShopLocation()
      .then((response) => {
        if (!active) return;
        const loc = response.data;
        if (loc.configured && loc.latitude !== null && loc.longitude !== null) {
          router.replace('/dashboard/manager');
        } else {
          setChecking(false);
        }
      })
      .catch(() => {
        if (active) setChecking(false);
      });
    return () => {
      active = false;
    };
  }, [mounted, router]);

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser. Enter coordinates manually.');
      return;
    }
    setError(null);
    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude.toFixed(6));
        setLongitude(pos.coords.longitude.toFixed(6));
        setGettingLocation(false);
      },
      () => {
        setError('Could not get your location. Please enter coordinates manually.');
        setGettingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSave = async () => {
    setError(null);
    const lat = Number(latitude);
    const lng = Number(longitude);
    if (!Number.isFinite(lat) || lat < -90 || lat > 90 ||
        !Number.isFinite(lng) || lng < -180 || lng > 180) {
      setError('Enter a valid latitude (-90 to 90) and longitude (-180 to 180).');
      return;
    }

    setSaving(true);
    try {
      await deliveryRequestsApi.updateShopLocation({
        latitude: lat,
        longitude: lng,
        address: address.trim() || undefined,
      });
      router.replace('/dashboard/manager');
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to save the shop location.');
      setSaving(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f4f6fb]">
        <Loader2 className="w-6 h-6 animate-spin text-[#00002E]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f6fb] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-11 h-11 rounded-xl bg-[#00002E] flex items-center justify-center">
            <Store className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Set your shop location</h1>
            <p className="text-sm text-gray-500">One last step before your dashboard</p>
          </div>
        </div>

        <p className="text-sm text-gray-600 mt-4">
          We use your shop&apos;s location to calculate delivery fees for every order. Pin it once —
          you can change it later from your dashboard.
        </p>

        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm">
            {error}
          </div>
        )}

        <button
          onClick={useCurrentLocation}
          disabled={gettingLocation}
          className="mt-5 w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-[#00002E] text-[#00002E] font-semibold hover:bg-[#00002E]/5 transition-all disabled:opacity-50"
        >
          {gettingLocation ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
          {gettingLocation ? 'Getting location…' : 'Use my current location'}
        </button>

        <div className="grid grid-cols-2 gap-3 mt-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Latitude</label>
            <input
              type="text"
              inputMode="decimal"
              value={latitude}
              onChange={(e) => setLatitude(e.target.value)}
              placeholder="6.927079"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00002E]/20 focus:border-[#00002E] transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Longitude</label>
            <input
              type="text"
              inputMode="decimal"
              value={longitude}
              onChange={(e) => setLongitude(e.target.value)}
              placeholder="79.861244"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00002E]/20 focus:border-[#00002E] transition-all"
            />
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Shop address <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <div className="relative">
            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Street, city"
              className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00002E]/20 focus:border-[#00002E] transition-all"
            />
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving || !latitude || !longitude}
          className="mt-6 w-full py-3 bg-[#00002E] hover:bg-[#000050] text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Save & continue to dashboard'}
        </button>
      </div>
    </div>
  );
}
