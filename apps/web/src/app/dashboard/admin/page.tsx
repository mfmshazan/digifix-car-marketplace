'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    Shield,
    Users,
    ShoppingBag,
    TrendingUp,
    ArrowRight,
    LogOut,
    Store
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { adminApi } from '@/lib/api';

export default function AdminDashboard() {
    const router = useRouter();
    const { user, logout, isAuthenticated } = useAuthStore();

    const [dashboardStats, setDashboardStats] = useState({
        totalUsers: 0,
        totalOrders: 0,
        activeSellers: 0,
        revenue: 0
    });

    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!isAuthenticated) {
            router.push('/login');
        } else if (user?.role === 'SALESMAN') {
            router.push('/dashboard/salesman');
        } else {
            const fetchStats = async () => {
                try {
                    const res = await adminApi.getStats();
                    if (res.success) {
                        setDashboardStats(res.data);
                    }
                } catch (err) {
                    console.error(err);
                } finally {
                    setIsLoading(false);
                }
            };
            fetchStats();
        }
    }, [isAuthenticated, user, router]);

    const handleLogout = () => {
        logout();
        router.push('/');
    };

    if (!user || isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#0B0F2F]">
                <div className="animate-spin w-8 h-8 border-2 border-white border-t-transparent rounded-full"></div>
            </div>
        );
    }

    const stats = [
        {
            label: 'Total Users',
            value: dashboardStats.totalUsers,
            icon: Users
        },
        {
            label: 'Total Orders',
            value: dashboardStats.totalOrders,
            icon: ShoppingBag
        },
        {
            label: 'Active Sellers',
            value: dashboardStats.activeSellers,
            icon: Store
        },
        {
            label: 'Revenue',
            value: `Rs. ${dashboardStats.revenue}`,
            icon: TrendingUp
        }
    ];

    // MOCK DATA (for UI feel)
    const recentOrders = [
        { id: '#1001', name: 'Nimal', amount: 'Rs. 12,000', status: 'Pending' },
        { id: '#1002', name: 'Kasun', amount: 'Rs. 8,500', status: 'Completed' },
        { id: '#1003', name: 'Amal', amount: 'Rs. 15,200', status: 'Cancelled' }
    ];

    return (
        <div className="min-h-screen bg-[#0B0F2F] text-white px-4 py-6">

            {/* HEADER */}
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                    <Shield className="w-8 h-8 text-indigo-400" />
                    <div>
                        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
                        <p className="text-sm text-gray-400">
                            Welcome back, {user.name || 'Admin'}
                        </p>
                    </div>
                </div>

                <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 bg-red-500/10 hover:bg-red-500/20 px-4 py-2 rounded-xl"
                >
                    <LogOut className="w-4 h-4" />
                    Logout
                </button>
            </div>

            {/* STATS */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {stats.map((stat) => (
                    <div
                        key={stat.label}
                        className="bg-[#12174A] p-4 rounded-2xl shadow-md"
                    >
                        <div className="flex justify-between items-center">
                            <div>
                                <p className="text-gray-400 text-sm">{stat.label}</p>
                                <p className="text-2xl font-bold">{stat.value}</p>
                            </div>
                            <stat.icon className="w-6 h-6 text-indigo-400" />
                        </div>
                    </div>
                ))}
            </div>

            {/* QUICK ACTIONS */}
            <div className="bg-[#12174A] p-5 rounded-2xl mb-6">
                <h2 className="text-lg font-semibold mb-4">Quick Navigation</h2>

                <div className="grid md:grid-cols-3 gap-3">
                    <Link href="/dashboard/salesman" className="bg-[#0B0F2F] p-4 rounded-xl flex justify-between items-center hover:bg-[#1A1F5C]">
                        Salesman Dashboard
                        <ArrowRight className="w-4 h-4" />
                    </Link>

                    <Link href="/parts" className="bg-[#0B0F2F] p-4 rounded-xl flex justify-between items-center hover:bg-[#1A1F5C]">
                        Parts Catalog
                        <ArrowRight className="w-4 h-4" />
                    </Link>

                    <Link href="/categories" className="bg-[#0B0F2F] p-4 rounded-xl flex justify-between items-center hover:bg-[#1A1F5C]">
                        Categories
                        <ArrowRight className="w-4 h-4" />
                    </Link>
                </div>
            </div>

            {/* RECENT ORDERS */}
            <div className="bg-[#12174A] p-5 rounded-2xl">
                <h2 className="text-lg font-semibold mb-4">Recent Orders</h2>

                <div className="space-y-3">
                    {recentOrders.map((order) => (
                        <div
                            key={order.id}
                            className="flex justify-between items-center bg-[#0B0F2F] p-3 rounded-xl"
                        >
                            <div>
                                <p className="font-medium">{order.id}</p>
                                <p className="text-sm text-gray-400">{order.name}</p>
                            </div>

                            <div className="text-right">
                                <p className="font-semibold">{order.amount}</p>
                                <p
                                    className={`text-xs ${order.status === 'Completed'
                                        ? 'text-green-400'
                                        : order.status === 'Pending'
                                            ? 'text-yellow-400'
                                            : 'text-red-400'
                                        }`}
                                >
                                    {order.status}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}