'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, User, Camera, Phone } from 'lucide-react';
import { authApi, uploadProfilePicture, resolveMediaUrl } from '@/lib/api';
import { useAuthStore, type User as AuthUser } from '@/store/authStore';

function mapApiUserToStore(data: Record<string, unknown>): AuthUser {
  return {
    id: String(data.id),
    email: String(data.email ?? ''),
    name: (data.name as string | null) ?? null,
    phone: (data.phone as string | null) ?? null,
    role: data.role === 'SALESMAN' ? 'SALESMAN' : 'CUSTOMER',
    avatar: (data.avatar as string | null) ?? null,
    store: data.store && typeof data.store === 'object'
      ? (data.store as AuthUser['store'])
      : null,
  };
}

export default function CustomerAccountSettings() {
  const router = useRouter();
  const { user, setUser, isAuthenticated } = useAuthStore();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setError(null);
      try {
        const res = await authApi.getProfile();
        if (cancelled) return;
        if (res.success && res.data) {
          const u = res.data as Record<string, unknown>;
          setName((u.name as string) || '');
          setPhone((u.phone as string) || '');
          setUser(mapApiUserToStore(u));
        }
      } catch {
        if (!cancelled) setError('Could not load profile. Try again.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    if (isAuthenticated) load();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, setUser]);

  const avatarSrc = resolveMediaUrl(user?.avatar ?? null);

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !file.type.startsWith('image/')) return;

    setUploading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await uploadProfilePicture(file);
      if (res.success && res.data?.avatar != null && user) {
        setUser({ ...user, avatar: res.data.avatar });
        setSuccess('Profile photo updated.');
      } else {
        const refreshed = await authApi.getProfile();
        if (refreshed.success && refreshed.data) {
          setUser(mapApiUserToStore(refreshed.data as Record<string, unknown>));
          setSuccess('Profile photo updated.');
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    setSaving(true);
    setError(null);
    setSuccess(null);
    // Phone formatting
    let formattedPhone = phone.trim();
    if (formattedPhone) {
      if (formattedPhone.startsWith('0')) {
        formattedPhone = '+94' + formattedPhone.substring(1);
      } else if (!formattedPhone.startsWith('+94')) {
        formattedPhone = '+94' + formattedPhone;
      }
    }

    try {
      const res = await authApi.updateProfile({
        name: name.trim(),
        phone: formattedPhone || null,
      });
      if (res.success && res.data) {
        setUser(mapApiUserToStore(res.data as Record<string, unknown>));
        setSuccess('Profile saved.');
      } else {
        setError((res as { message?: string }).message || 'Save failed');
      }
    } catch (err: unknown) {
      let msg = 'Could not save profile';
      if (err && typeof err === 'object' && 'response' in err) {
        const m = (err as { response?: { data?: { message?: string } } }).response?.data?.message;
        if (typeof m === 'string' && m) msg = m;
      }
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-[#00002E]" />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-[#00002E]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 pb-16 bg-gray-50">
      <div className="max-w-lg mx-auto px-4 sm:px-6">
        <Link
          href="/dashboard/customer"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-[#00002E] mb-6 text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to dashboard
        </Link>

        <div className="bg-white rounded-2xl shadow-sm p-6 sm:p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Account settings</h1>
          <p className="text-gray-500 text-sm mb-8">Update your profile and photo</p>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-xl text-sm">
              {success}
            </div>
          )}

          <div className="flex flex-col items-center mb-8">
            <div className="relative">
              <div className="w-28 h-28 rounded-full bg-[#00002E]/10 overflow-hidden flex items-center justify-center ring-4 ring-white shadow">
                {avatarSrc ? (
                  <Image
                    src={avatarSrc}
                    alt=""
                    width={112}
                    height={112}
                    className="w-full h-full object-cover"
                    unoptimized
                  />
                ) : (
                  <User className="w-14 h-14 text-[#00002E]" />
                )}
                {uploading && (
                  <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-[#00002E]" />
                  </div>
                )}
              </div>
              <button
                type="button"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 w-10 h-10 rounded-full bg-[#00002E] text-white flex items-center justify-center shadow-md hover:bg-[#000050] disabled:opacity-50"
                aria-label="Change profile photo"
              >
                <Camera className="w-5 h-5" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={handlePhotoChange}
              />
            </div>
            <p className="text-xs text-gray-500 mt-3 text-center">JPG, PNG, or WebP</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="account-name" className="block text-sm font-medium text-gray-700 mb-1.5">
                Full name
              </label>
              <input
                id="account-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#00002E]/20 focus:border-[#00002E] outline-none transition"
                autoComplete="name"
              />
            </div>
            <div className="relative">
              <label htmlFor="account-phone" className="block text-sm font-medium text-gray-700 mb-1.5">
                Phone
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                  <Phone className="w-5 h-5" />
                </div>
                <div className="absolute left-12 top-1/2 -translate-y-1/2 text-gray-500 font-medium border-r border-gray-200 pr-2">
                  +94
                </div>
                <input
                  id="account-phone"
                  type="tel"
                  value={phone.startsWith('+94') ? phone.slice(3) : (phone.startsWith('0') ? phone.slice(1) : phone)}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    if (val.length <= 9) setPhone(val);
                  }}
                  className="w-full pl-24 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#00002E]/20 focus:border-[#00002E] outline-none transition bg-gray-50"
                  autoComplete="tel"
                  placeholder="7xxxxxxxx"
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">Enter 9 digits after +94</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <p className="text-gray-600 text-sm py-1 px-4 bg-gray-50 rounded-lg">{user?.email}</p>
              <p className="text-xs text-gray-400 mt-1">Email cannot be changed here</p>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full py-3.5 rounded-xl bg-[#00002E] hover:bg-[#000050] text-white font-semibold transition flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
              Save changes
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
