'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Shield, Users, ShoppingBag, TrendingUp, ArrowRight, LogOut, Store } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

export default function AdminDashboard() {
  const router = useRouter();
  const { user, logout, isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    } else if (user?.role === 'SALESMAN') {
      router.push('/dashboard/salesman');
    }
  }, [isAuthenticated, user, router]);

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
    { label: 'Total Users', value: '1,245', icon: Users, color: 'bg-blue-100 text-blue-700' },
    { label: 'Total Orders', value: '382', icon: ShoppingBag, color: 'bg-green-100 text-green-700' },
    { label: 'Active Sellers', value: '96', icon: Store, color: 'bg-purple-100 text-purple-700' },
    { label: 'Revenue', value: 'Rs. 2.4M', icon: TrendingUp, color: 'bg-orange-100 text-orange-700' },
  ];

  return (
    <div className="min-h-screen pt-20 pb-16 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-[#00002E]/10 rounded-full flex items-center justify-center">
                <Shield className="w-7 h-7 text-[#00002E]" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
                <p className="text-gray-600">Welcome back, {user.name || 'Admin'}!</p>
              </div>
            </div>
            <button onClick={handleLogout} className="px-4 py-2 border border-gray-200 hover:border-red-300 text-red-600 hover:text-red-700 font-medium rounded-xl transition-all flex items-center gap-2">
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>

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

        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Navigation</h2>
          <div className="grid md:grid-cols-3 gap-3">
            <Link href="/dashboard/salesman" className="flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors">
              <span className="font-medium text-gray-900">Salesman Dashboard</span>
              <ArrowRight className="w-4 h-4 text-gray-500" />
            </Link>
            <Link href="/parts" className="flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors">
              <span className="font-medium text-gray-900">Parts Catalog</span>
              <ArrowRight className="w-4 h-4 text-gray-500" />
            </Link>
            <Link href="/categories" className="flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors">
              <span className="font-medium text-gray-900">Categories</span>
              <ArrowRight className="w-4 h-4 text-gray-500" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
