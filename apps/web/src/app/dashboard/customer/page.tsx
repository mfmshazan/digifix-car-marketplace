'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { 
  ShoppingBag, 
  Heart, 
  MapPin, 
  User, 
  Settings, 
  LogOut, 
  Package,
  Clock,
  CheckCircle,
  Truck,
  ArrowRight,
  ShoppingCart,
  Phone
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useCartStore } from '@/store/cartStore';
import { resolveMediaUrl } from '@/lib/api';

export default function CustomerDashboard() {
  const router = useRouter();
  const { user, logout, isAuthenticated, refreshProfile } = useAuthStore();
  const cartItems = useCartStore((state) => state.items);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  // Sync profile data on mount to ensure mobile updates are reflected
  useEffect(() => {
    if (isAuthenticated) {
      refreshProfile();
    }
  }, [isAuthenticated, refreshProfile]);

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  if (!user) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-[#00002E] border-t-transparent rounded-full"></div>
      </div>
    );
  }

  const stats = [
    { label: 'Orders', value: '5', icon: Package, color: 'bg-blue-100 text-blue-600' },
    { label: 'In Cart', value: cartItems.length.toString(), icon: ShoppingCart, color: 'bg-green-100 text-green-600' },
    { label: 'Wishlist', value: '12', icon: Heart, color: 'bg-red-100 text-red-600' },
    { label: 'Addresses', value: '2', icon: MapPin, color: 'bg-purple-100 text-purple-600' },
  ];

  const recentOrders = [
    { id: 'ORD-001', date: '2024-01-15', status: 'Delivered', total: 15500, items: 3 },
    { id: 'ORD-002', date: '2024-01-10', status: 'Shipped', total: 8200, items: 2 },
    { id: 'ORD-003', date: '2024-01-05', status: 'Processing', total: 22000, items: 5 },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Delivered': return 'bg-green-100 text-green-700';
      case 'Shipped': return 'bg-blue-100 text-blue-700';
      case 'Processing': return 'bg-yellow-100 text-yellow-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Delivered': return CheckCircle;
      case 'Shipped': return Truck;
      case 'Processing': return Clock;
      default: return Package;
    }
  };

  const avatarUrl = resolveMediaUrl(user.avatar);

  return (
    <div className="min-h-screen pt-20 pb-16 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-[#00002E]/10 rounded-full overflow-hidden flex items-center justify-center shrink-0">
                {avatarUrl ? (
                  <Image
                    src={avatarUrl}
                    alt=""
                    width={64}
                    height={64}
                    className="rounded-full object-cover w-full h-full"
                    unoptimized
                  />
                ) : (
                  <User className="w-8 h-8 text-[#00002E]" />
                )}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Welcome, {user.name || 'Customer'}!</h1>
                <div className="flex flex-col text-gray-600 gap-0.5">
                  <p>{user.email}</p>
                  {user.phone && <p className="text-sm flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" />{user.phone}</p>}
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <Link href="/cart" className="px-4 py-2 border border-gray-200 hover:bg-gray-50 text-gray-700 font-medium rounded-xl transition-all flex items-center gap-2">
                <ShoppingCart className="w-4 h-4" />
                View Cart ({cartItems.length})
              </Link>
              <button onClick={handleLogout} className="px-4 py-2 border border-gray-200 hover:border-red-300 text-red-600 hover:text-red-700 font-medium rounded-xl transition-all flex items-center gap-2">
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {stats.map((stat) => (
            <div key={stat.label} className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                </div>
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${stat.color}`}>
                  <stat.icon className="w-6 h-6" />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Recent Orders */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Recent Orders</h2>
              <Link href="/dashboard/customer/orders" className="text-[#00002E] hover:text-[#000050] text-sm font-medium flex items-center gap-1">
                View All <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="space-y-4">
              {recentOrders.map((order) => {
                const StatusIcon = getStatusIcon(order.status);
                return (
                  <div key={order.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-[#00002E]/10 rounded-lg flex items-center justify-center">
                        <Package className="w-5 h-5 text-[#00002E]" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{order.id}</p>
                        <p className="text-sm text-gray-500">{order.items} items • {order.date}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">Rs. {order.total.toLocaleString()}</p>
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                        <StatusIcon className="w-3 h-3" />
                        {order.status}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Quick Actions</h2>
            <div className="space-y-3">
              <Link href="/parts" className="flex items-center gap-3 p-3 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors">
                <div className="w-10 h-10 bg-[#00002E]/10 rounded-lg flex items-center justify-center">
                  <ShoppingBag className="w-5 h-5 text-[#00002E]" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Browse Parts</p>
                  <p className="text-sm text-gray-500">Find car parts</p>
                </div>
              </Link>
              <Link href="/cart" className="flex items-center gap-3 p-3 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <ShoppingCart className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">My Cart</p>
                  <p className="text-sm text-gray-500">{cartItems.length} items in cart</p>
                </div>
              </Link>
              <Link href="/dashboard/customer/wishlist" className="flex items-center gap-3 p-3 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors">
                <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                  <Heart className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Wishlist</p>
                  <p className="text-sm text-gray-500">Saved items</p>
                </div>
              </Link>
              <Link href="/settings" className="flex items-center gap-3 p-3 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Settings className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Settings</p>
                  <p className="text-sm text-gray-500">Account settings</p>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
