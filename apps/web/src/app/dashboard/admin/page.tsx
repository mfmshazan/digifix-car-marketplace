'use client';

import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { adminApi } from '@/lib/api';
import AdminReceiptsPage from './receipts/page';
import {
    Bell,
    MessageSquare,
    Users,
    DollarSign,
    LayoutDashboard,
    LogOut,
    ShoppingBag,
    ShieldCheck,
    TrendingUp,
    Activity,
    ShieldAlert,
    UserX,
    CheckCircle,
    Search,
    X,
    Receipt,
    ArrowRight,
    Calendar,
    Filter,
    ChevronLeft,
    ChevronRight,
    Check,
    Slash,
    Wallet,
    ArrowDownCircle,
    ArrowUpCircle,
    Clock,
    Loader2
} from 'lucide-react';
import { connectSocket, disconnectSocket } from '@/lib/socket';



type AdminTab = 'overview' | 'users' | 'finances' | 'catalog' | 'reviews' | 'receipts' | 'wallet';

interface AdminCancellationNotification {
    id: string;
    orderNumber: string;
    customerName?: string;
    reason: string;
    time: Date;
    read: boolean;
}

export default function AdminDashboard() {
    const router = useRouter();
    const { user, logout, isAuthenticated } = useAuthStore();
    const [activeTab, setActiveTab] = useState<AdminTab>('overview');
    const [cancelNotifs, setCancelNotifs] = useState<AdminCancellationNotification[]>([]);
    const [showNotifDropdown, setShowNotifDropdown] = useState(false);
    const [processingOrderId, setProcessingOrderId] = useState<string | null>(null);

    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        setMounted(true);
    }, []);

    // Authorization Check
    useEffect(() => {
        if (!mounted) return;
        
        if (!isAuthenticated) {
            // Check localStorage directly as a fallback before kicking out
            const hasToken = typeof window !== 'undefined' && localStorage.getItem('digifix_token');
            if (!hasToken) {
                router.push('/login');
            }
        } else if (user?.role !== 'ADMIN') {
            // Redirect non-admins based on their role
            router.push(`/dashboard/${user?.role?.toLowerCase() || ''}`);
        }
    }, [isAuthenticated, user, router, mounted]);

    useEffect(() => {
        if (!user?.id || user.role !== 'ADMIN') return;

        const socket = connectSocket(user.id, 'ADMIN');

        const handleCancellationRequested = (payload: {
            orderId: string;
            orderNumber: string;
            customerName?: string;
            reason: string;
        }) => {
            setCancelNotifs((prev) => {
                // Guard against duplicate socket deliveries for the same order
                if (prev.some((n) => n.id === payload.orderId)) {
                    return prev;
                }

                return [
                    {
                        id: payload.orderId,
                        orderNumber: payload.orderNumber,
                        customerName: payload.customerName,
                        reason: payload.reason,
                        time: new Date(),
                        read: false,
                    },
                    ...prev,
                ];
            });
        };

        socket.on('cancellationRequested', handleCancellationRequested);

        return () => {
            socket.off('cancellationRequested', handleCancellationRequested);
            disconnectSocket();
        };
    }, [user?.id, user?.role]);

    const handleApproveCancellation = async (orderId: string) => {
        try {
            setProcessingOrderId(orderId);
            const response = await adminApi.approveCancellation(orderId);
            if (response?.success) {
                setCancelNotifs((prev) => prev.filter((n) => n.id !== orderId));
                alert('Refund request approved. Salesman has been notified.');
                return;
            }
            alert(response?.message || 'Failed to approve refund request');
        } catch (error: any) {
            alert(error?.response?.data?.message || error?.message || 'Failed to approve refund request');
        } finally {
            setProcessingOrderId(null);
        }
    };

    const handleRejectCancellation = async (orderId: string) => {
        try {
            const message = window.prompt('Optional reason for rejection (shown to customer):', '');
            setProcessingOrderId(orderId);
            const response = await adminApi.rejectCancellation(orderId, message || undefined);
            if (response?.success) {
                setCancelNotifs((prev) => prev.filter((n) => n.id !== orderId));
                alert('Refund request rejected successfully.');
                return;
            }
            alert(response?.message || 'Failed to reject refund request');
        } catch (error: any) {
            alert(error?.response?.data?.message || error?.message || 'Failed to reject refund request');
        } finally {
            setProcessingOrderId(null);
        }
    };

    const handleLogout = () => {
        logout();
        router.push('/login');
    };

    if (!user || user.role !== 'ADMIN') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="animate-spin w-8 h-8 border-2 border-[#00002E] border-t-transparent rounded-full" />
            </div>
        );
    }

    const tabs: { id: AdminTab; label: string; icon: React.ElementType }[] = [
        { id: 'overview', label: 'Overview', icon: LayoutDashboard },
        { id: 'users', label: 'User Management', icon: Users },
        { id: 'finances', label: 'System Finances', icon: DollarSign },
        { id: 'wallet', label: 'Wallet', icon: Wallet },
        { id: 'catalog', label: 'Global Catalog', icon: ShoppingBag },
        { id: 'reviews', label: 'Reviews Moderation', icon: ShieldAlert },
        { id: 'receipts', label: 'Receipt Reviews', icon: Receipt },
    ];

    const unreadCancelCount = cancelNotifs.filter((n) => !n.read).length;

    return (
        <div className="min-h-screen bg-[#f4f6fb]">
            {/* ── Top Navigation Bar ── */}
            <nav className="sticky top-0 z-30 bg-[#060618] shadow-xl border-b border-white/5">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">

                        {/* Brand / Admin Badge */}
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-[#2D1622] rounded-xl flex items-center justify-center">
                                <ShieldCheck className="w-5 h-5 text-[#FF6B6B]" />
                            </div>
                            <div className="flex flex-col justify-center">
                                <p className="text-white font-bold leading-none text-[13px] tracking-wide">System Admin</p>
                                <p className="text-[#8A8A9B] text-[11px] mt-1 font-medium">Master Control Panel</p>
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
                                        onClick={() => setActiveTab(tab.id)}
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
                            <div className="relative">
                                <button
                                    onClick={() => setShowNotifDropdown(!showNotifDropdown)}
                                    className="relative flex items-center justify-center p-2 rounded-xl hover:bg-white/5 text-[#8A8A9B] hover:text-white transition-colors"
                                    title="Cancellation requests"
                                >
                                    <MessageSquare className="w-[18px] h-[18px]" />
                                    {unreadCancelCount > 0 && (
                                        <span className="absolute top-1 right-1 min-w-[14px] h-[14px] px-0.5 rounded-full bg-[#FF6B6B] text-white text-[9px] font-bold flex items-center justify-center border-2 border-[#060618]">
                                            {unreadCancelCount}
                                        </span>
                                    )}
                                </button>

                                {showNotifDropdown && (
                                    <div className="absolute top-full mt-2 right-0 w-96 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50">
                                        <div className="px-4 py-2 border-b border-gray-50 flex justify-between items-center gap-2">
                                            <h3 className="font-bold text-gray-900 text-sm">Cancellation Requests</h3>
                                            {cancelNotifs.length > 0 && (
                                                <button
                                                    onClick={() => setCancelNotifs((prev) => prev.map((n) => ({ ...n, read: true })))}
                                                    className="text-xs text-blue-600 hover:underline whitespace-nowrap"
                                                >
                                                    Mark all read
                                                </button>
                                            )}
                                        </div>

                                        <div className="max-h-80 overflow-y-auto">
                                            {cancelNotifs.length === 0 ? (
                                                <div className="px-4 py-8 text-center text-sm text-gray-400">
                                                    No cancellation notifications yet
                                                </div>
                                            ) : (
                                                cancelNotifs.map((notif) => (
                                                    <div
                                                        key={notif.id}
                                                        className={`w-full text-left px-4 py-3 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors ${!notif.read ? 'bg-blue-50/50' : ''}`}
                                                    >
                                                        <div className="flex items-start justify-between gap-2">
                                                            <p className="text-sm font-semibold text-gray-900">
                                                                Order {notif.orderNumber} cancellation requested
                                                            </p>
                                                            {!notif.read && <span className="w-2 h-2 rounded-full bg-blue-600 mt-1 shrink-0" />}
                                                        </div>
                                                        <p className="text-xs text-gray-600 mt-0.5">
                                                            {notif.customerName || 'Customer'}: {notif.reason}
                                                        </p>
                                                        <div className="mt-2 flex items-center justify-between gap-2">
                                                            <button
                                                                onClick={() => setCancelNotifs((prev) => prev.map((n) => n.id === notif.id ? { ...n, read: true } : n))}
                                                                className="text-xs text-blue-600 hover:underline"
                                                            >
                                                                Mark read
                                                            </button>
                                                            <div className="flex items-center gap-2">
                                                                <button
                                                                    onClick={() => handleRejectCancellation(notif.id)}
                                                                    disabled={processingOrderId === notif.id}
                                                                    className="px-2.5 py-1 text-xs font-semibold rounded-md border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-60 disabled:cursor-not-allowed"
                                                                >
                                                                    Reject
                                                                </button>
                                                                <button
                                                                    onClick={() => handleApproveCancellation(notif.id)}
                                                                    disabled={processingOrderId === notif.id}
                                                                    className="px-2.5 py-1 text-xs font-semibold rounded-md bg-[#00002E] text-white hover:bg-[#00002E]/90 disabled:opacity-60 disabled:cursor-not-allowed"
                                                                >
                                                                    {processingOrderId === notif.id ? 'Processing...' : 'Approve'}
                                                                </button>
                                                            </div>
                                                        </div>
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

            {/* ── Mobile Tab Bar ── */}
            <div className="sm:hidden bg-white border-b border-gray-100 px-4 overflow-x-auto">
                <div className="flex gap-1 min-w-max">
                    {tabs.map(tab => {
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center justify-center gap-2 py-3 px-4 text-sm font-semibold border-b-2 transition-all ${activeTab === tab.id
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

            {/* ── Page Content ── */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

                {/* Dynamic Header */}
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-gray-900">
                        {activeTab === 'overview' && 'System Overview'}
                        {activeTab === 'users' && 'User Management'}
                        {activeTab === 'finances' && 'Platform Finances'}
                        {activeTab === 'wallet' && 'Platform Wallet'}
                        {activeTab === 'catalog' && 'Global Catalog'}
                        {activeTab === 'reviews' && 'Reviews Moderation'}
                        {activeTab === 'receipts' && 'Receipt Review Queue'}
                    </h1>
                    <p className="text-gray-500 text-sm mt-0.5">
                        {activeTab === 'overview' && 'Monitor key platform metrics and recent activities.'}
                        {activeTab === 'users' && 'Manage customers, salesmen, and account statuses.'}
                        {activeTab === 'finances' && 'Track platform fees, total revenue, and system wallets.'}
                        {activeTab === 'wallet' && 'Internal ledger balance and the real Stripe account balance, side by side.'}
                        {activeTab === 'catalog' && 'View all products, categories, and active car parts.'}
                        {activeTab === 'reviews' && 'Moderate flagged and pending reviews.'}
                        {activeTab === 'receipts' && 'Review pending repayment receipts, approve valid payments, and reject invalid ones.'}
                    </p>
                </div>

                {/* Tab Contents */}
                {activeTab === 'overview' && <OverviewTab />}
                {activeTab === 'users' && <UsersTab />}
                {activeTab === 'finances' && <FinancesTab />}
                {activeTab === 'wallet' && <AdminWalletTab />}
                {activeTab === 'catalog' && <CatalogTab />}
                {activeTab === 'reviews' && <ReviewsModerationTab />}
                {activeTab === 'receipts' && <AdminReceiptQueueView />}
            </main>
        </div>
    );
}

// ─── Sub-Components ──────────

function AdminReceiptQueueView() {
    return <AdminReceiptsPage />;
}

function OverviewTab() {
    // Cached via React Query so switching admin tabs and back is instant.
    const { data: stats, isLoading: loading } = useQuery({
        queryKey: ['admin-stats'],
        queryFn: async () => {
            const res = await adminApi.getStats();
            return res.success ? res.data : null;
        },
    });

    if (loading) return <div className="py-20 flex justify-center"><div className="animate-spin w-8 h-8 border-2 border-[#00002E] border-t-transparent rounded-full" /></div>;

    const kpis = [
        { label: 'Total Revenue', value: new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(stats?.totalRevenue || 0), icon: DollarSign, color: 'text-green-600', bg: 'bg-green-100' },
        { label: 'Active Users', value: stats?.totalActiveUsers || 0, icon: Users, color: 'text-blue-600', bg: 'bg-blue-100' },
        { label: 'Pending Orders', value: stats?.pendingOrders || 0, icon: Activity, color: 'text-amber-600', bg: 'bg-amber-100' },
        { label: 'Active Sellers', value: stats?.activeSellers || 0, icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-100' },
    ];

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {kpis.map((stat, i) => (
                    <div key={i} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                        <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center mb-3`}>
                            <stat.icon className={`w-5 h-5 ${stat.color}`} />
                        </div>
                        <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                        <p className="text-sm text-gray-500">{stat.label}</p>
                    </div>
                ))}
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 h-64 flex items-center justify-center">
                <p className="text-gray-400 text-sm">System analytics and activity graphs will appear here.</p>
            </div>
        </div>
    );
}

function UsersTab() {
    const queryClient = useQueryClient();
    const [roleFilter, setRoleFilter] = useState<string>('');

    const { data: users = [], isLoading: loading } = useQuery<any[]>({
        queryKey: ['admin-users', roleFilter],
        queryFn: async () => {
            const res = await adminApi.getUsers({ role: roleFilter });
            return res.success ? res.data : [];
        },
    });
    const fetchUsers = () => queryClient.invalidateQueries({ queryKey: ['admin-users'] });

    const toggleUserStatus = async (userId: string, currentStatus: string, userDetails: any) => {
        const newStatus = currentStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
        try {
            await adminApi.updateUserStatus(userId, newStatus, {
                email: userDetails.email,
                name: userDetails.name
            });
            fetchUsers();
        } catch (error) {
            alert('Failed to update status');
        }
    };


    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                <h2 className="text-lg font-bold text-gray-900">Platform Users</h2>
                <div className="flex gap-2 bg-gray-50 p-1 rounded-xl border border-gray-200">
                    {['', 'CUSTOMER', 'SHOP_MANAGER', 'SALESMAN', 'RIDER'].map((role) => (
                        <button
                            key={role}
                            onClick={() => setRoleFilter(role)}
                            className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all ${roleFilter === role ? 'bg-white shadow-sm text-[#00002E]' : 'text-gray-500 hover:text-gray-900'
                                }`}
                        >
                            {role === '' ? 'All' : role === 'SHOP_MANAGER' ? 'Managers' : role === 'SALESMAN' ? 'Sellers' : role === 'RIDER' ? 'Riders' : 'Customers'}
                        </button>
                    ))}
                </div>
            </div>

            {loading ? (
                <div className="py-10 flex justify-center"><div className="animate-spin w-6 h-6 border-2 border-[#00002E] border-t-transparent rounded-full" /></div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-gray-500 bg-gray-50 border-y border-gray-100">
                            <tr>
                                <th className="px-4 py-3 font-semibold">User</th>
                                <th className="px-4 py-3 font-semibold">Role</th>
                                <th className="px-4 py-3 font-semibold">Status</th>
                                <th className="px-4 py-3 font-semibold text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {users.map((u) => (
                                <tr key={u.id} className="hover:bg-gray-50/50">
                                    <td className="px-4 py-3">
                                        <p className="font-semibold text-gray-900">{u.name || 'N/A'}</p>
                                        <p className="text-xs text-gray-500">{u.email}</p>
                                    </td>
                                    <td className="px-4 py-3 text-xs font-medium uppercase text-gray-600">{u.role}</td>
                                    <td className="px-4 py-3">
                                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${u.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                            }`}>
                                            {u.status === 'ACTIVE' ? <CheckCircle className="w-3 h-3" /> : <UserX className="w-3 h-3" />}
                                            {u.status}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <button
                                            onClick={() => toggleUserStatus(u.id, u.status, u)}
                                            className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${u.status === 'ACTIVE' ? 'border-red-200 text-red-600 hover:bg-red-50' : 'border-green-200 text-green-600 hover:bg-green-50'
                                                }`}
                                        >
                                            {u.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
                                        </button>
                                    </td>

                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

function AdminWalletTab() {
    const { data: wallet, isLoading: walletLoading } = useQuery({
        queryKey: ['admin-wallet'],
        queryFn: async () => {
            const res = await adminApi.getMyWallet();
            return res.success ? res.data : null;
        },
    });

    const { data: stripeBalance, isLoading: stripeLoading, isError: stripeErrored } = useQuery({
        queryKey: ['admin-stripe-balance'],
        queryFn: async () => {
            const res = await adminApi.getStripeBalance();
            if (!res.success) throw new Error(res.msg || 'Failed to fetch Stripe balance');
            return res.data;
        },
        retry: 1,
    });

    const fmtCurrency = (v: number) => `Rs. ${(v || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })}`;
    const fmtStripeEntries = (entries?: { amount: number; currency: string }[]) => {
        if (!entries || entries.length === 0) return 'Rs. 0.00';
        return entries
            .map((e) => `${e.currency.toUpperCase()} ${e.amount.toLocaleString('en-LK', { minimumFractionDigits: 2 })}`)
            .join(' · ');
    };
    const fmtDate = (d: string) => new Date(d).toLocaleString('en-LK', { dateStyle: 'medium', timeStyle: 'short' });

    const balance = wallet?.balance ?? 0;
    const transactions = wallet?.transactions ?? [];

    return (
        <div className="space-y-6">
            {/* ── Balance Cards ── */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-[#060618] p-5 rounded-2xl shadow-sm text-white flex items-center gap-4">
                    <div className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
                        <Wallet className="w-5 h-5 text-[#8ec5ff]" />
                    </div>
                    <div>
                        <p className="text-xl font-bold">
                            {walletLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : fmtCurrency(balance)}
                        </p>
                        <p className="text-xs text-slate-300">Platform ledger balance</p>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                    <div className="w-11 h-11 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
                        <ArrowDownCircle className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                        <p className="text-xl font-bold text-gray-900">
                            {stripeLoading ? <Loader2 className="w-5 h-5 animate-spin text-gray-400" /> : stripeErrored ? '—' : fmtStripeEntries(stripeBalance?.available)}
                        </p>
                        <p className="text-xs text-gray-500">Stripe available balance</p>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                    <div className="w-11 h-11 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                        <Clock className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                        <p className="text-xl font-bold text-gray-900">
                            {stripeLoading ? <Loader2 className="w-5 h-5 animate-spin text-gray-400" /> : stripeErrored ? '—' : fmtStripeEntries(stripeBalance?.pending)}
                        </p>
                        <p className="text-xs text-gray-500">Stripe pending balance</p>
                    </div>
                </div>
            </div>

            {stripeErrored && (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    Couldn&apos;t reach Stripe for the account balance. The ledger balance above is unaffected.
                </div>
            )}

            {/* ── Recent Transactions ── */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-lg font-bold text-gray-900">Recent ledger transactions</h2>
                    <span className="text-xs font-medium uppercase tracking-wide text-gray-400">Last 30</span>
                </div>

                {walletLoading ? (
                    <div className="py-10 flex justify-center">
                        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                    </div>
                ) : transactions.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-500">
                        No wallet activity yet.
                    </div>
                ) : (
                    <div className="space-y-3">
                        {transactions.map((tx: any) => {
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
                                                {counterparty} · {tx.createdAt ? fmtDate(tx.createdAt) : 'Recent'}
                                            </p>
                                        </div>
                                    </div>
                                    <p className={`text-sm font-bold ${isIncoming ? 'text-emerald-600' : 'text-amber-600'}`}>
                                        {isIncoming ? '+' : '-'}{fmtCurrency(Math.abs(Number(tx.amount || 0)))}
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}

function FinancesTab() {
    const queryClient = useQueryClient();
    const [selectedTx, setSelectedTx] = useState<any>(null);
    const [filters, setFilters] = useState({
        status: '',
        paymentStatus: '',
        dateFrom: '',
        dateTo: '',
        page: 1,
    });

    const { data, isLoading: loading } = useQuery<{ transactions: any[]; meta: any }>({
        queryKey: ['admin-finances', filters],
        queryFn: async () => {
            const params: any = { page: filters.page, limit: 20 };
            if (filters.status) params.status = filters.status;
            if (filters.paymentStatus) params.paymentStatus = filters.paymentStatus;
            if (filters.dateFrom) params.dateFrom = filters.dateFrom;
            if (filters.dateTo) params.dateTo = filters.dateTo;
            const res = await adminApi.getFinances(params);
            return res.success ? { transactions: res.data, meta: res.meta } : { transactions: [], meta: null };
        },
    });
    const transactions = data?.transactions ?? [];
    const meta = data?.meta ?? null;
    const fetchFinances = () => queryClient.invalidateQueries({ queryKey: ['admin-finances'] });

    const statusColors: Record<string, string> = {
        PENDING:    'bg-amber-100 text-amber-700',
        CONFIRMED:  'bg-blue-100 text-blue-700',
        PROCESSING: 'bg-indigo-100 text-indigo-700',
        SHIPPED:    'bg-purple-100 text-purple-700',
        DELIVERED:  'bg-green-100 text-green-700',
        CANCELLED:  'bg-red-100 text-red-700',
        REFUNDED:   'bg-rose-100 text-rose-700',
    };
    const paymentColors: Record<string, string> = {
        PAID:    'bg-emerald-100 text-emerald-700',
        PENDING: 'bg-amber-100 text-amber-700',
        FAILED:  'bg-red-100 text-red-700',
        REFUNDED:'bg-rose-100 text-rose-700',
    };

    const fmtCurrency = (v: number) => new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(v || 0);
    const fmtDate = (d: string) => new Date(d).toLocaleString('en-LK', { dateStyle: 'medium', timeStyle: 'short' });
    const shortId = (id: string) => `TRX-${id.slice(-6).toUpperCase()}`;

    return (
        <div className="space-y-6">
            {/* ── Summary Cards ── */}
            {meta && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {[
                        { label: 'Total Revenue', value: fmtCurrency(meta.totalRevenue), icon: DollarSign, color: 'text-green-600', bg: 'bg-green-100' },
                        { label: 'Platform Fee Collected (5%)', value: fmtCurrency(meta.totalPlatformFee), icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-100' },
                        { label: 'Total Transactions', value: meta.total, icon: Receipt, color: 'text-purple-600', bg: 'bg-purple-100' },
                    ].map((c, i) => (
                        <div key={i} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                            <div className={`w-11 h-11 rounded-xl ${c.bg} flex items-center justify-center flex-shrink-0`}>
                                <c.icon className={`w-5 h-5 ${c.color}`} />
                            </div>
                            <div>
                                <p className="text-xl font-bold text-gray-900">{c.value}</p>
                                <p className="text-xs text-gray-500">{c.label}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* ── Filters Bar ── */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                <div className="flex flex-wrap items-end gap-3">
                    <div className="flex items-center gap-2 text-gray-500">
                        <Filter className="w-4 h-4" />
                        <span className="text-sm font-semibold">Filters</span>
                    </div>

                    {/* Order Status */}
                    <div className="flex flex-col gap-1">
                        <label className="text-xs text-gray-400 font-medium">Order Status</label>
                        <select
                            title="Filter by order status"
                            value={filters.status}
                            onChange={e => setFilters(f => ({ ...f, status: e.target.value, page: 1 }))}
                            className="text-xs border border-gray-200 rounded-lg px-3 py-2 text-gray-700 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#00002E]/20"
                        >
                            <option value="">All Statuses</option>
                            {['PENDING','CONFIRMED','PROCESSING','SHIPPED','DELIVERED','CANCELLED','REFUNDED'].map(s => (
                                <option key={s} value={s}>{s}</option>
                            ))}
                        </select>
                    </div>

                    {/* Payment Status */}
                    <div className="flex flex-col gap-1">
                        <label className="text-xs text-gray-400 font-medium">Payment Status</label>
                        <select
                            title="Filter by payment status"
                            value={filters.paymentStatus}
                            onChange={e => setFilters(f => ({ ...f, paymentStatus: e.target.value, page: 1 }))}
                            className="text-xs border border-gray-200 rounded-lg px-3 py-2 text-gray-700 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#00002E]/20"
                        >
                            <option value="">All Payments</option>
                            {['PAID','PENDING','FAILED','REFUNDED'].map(s => (
                                <option key={s} value={s}>{s}</option>
                            ))}
                        </select>
                    </div>

                    {/* Date Range */}
                    <div className="flex flex-col gap-1">
                        <label className="text-xs text-gray-400 font-medium">From</label>
                        <input type="date" title="Filter from date" value={filters.dateFrom}
                            onChange={e => setFilters(f => ({ ...f, dateFrom: e.target.value, page: 1 }))}
                            className="text-xs border border-gray-200 rounded-lg px-3 py-2 text-gray-700 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#00002E]/20" />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-xs text-gray-400 font-medium">To</label>
                        <input type="date" title="Filter to date" value={filters.dateTo}
                            onChange={e => setFilters(f => ({ ...f, dateTo: e.target.value, page: 1 }))}
                            className="text-xs border border-gray-200 rounded-lg px-3 py-2 text-gray-700 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#00002E]/20" />
                    </div>

                    {/* Clear */}
                    {(filters.status || filters.paymentStatus || filters.dateFrom || filters.dateTo) && (
                        <button onClick={() => setFilters({ status: '', paymentStatus: '', dateFrom: '', dateTo: '', page: 1 })}
                            className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1 font-medium mt-4">
                            <X className="w-3 h-3" /> Clear
                        </button>
                    )}
                </div>
            </div>

            {/* ── Data Grid ── */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                {loading ? (
                    <div className="py-16 flex justify-center"><div className="animate-spin w-7 h-7 border-2 border-[#00002E] border-t-transparent rounded-full" /></div>
                ) : transactions.length === 0 ? (
                    <div className="py-16 text-center text-gray-400 text-sm">No transactions found for the selected filters.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-gray-500 bg-gray-50 border-b border-gray-100">
                                <tr>
                                    <th className="px-4 py-3 font-semibold">Transaction ID</th>
                                    <th className="px-4 py-3 font-semibold">Date & Time</th>
                                    <th className="px-4 py-3 font-semibold">From → To</th>
                                    <th className="px-4 py-3 font-semibold text-right">Amount</th>
                                    <th className="px-4 py-3 font-semibold text-right">Platform Fee</th>
                                    <th className="px-4 py-3 font-semibold">Order Status</th>
                                    <th className="px-4 py-3 font-semibold">Payment</th>
                                    <th className="px-4 py-3 font-semibold text-center">Receipt</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {transactions.map((tx) => (
                                    <tr key={tx.id} className="hover:bg-gray-50/60 transition-colors">
                                        <td className="px-4 py-3">
                                            <button onClick={() => setSelectedTx(tx)} title="Open transaction details"
                                                className="font-mono text-xs font-bold text-[#00002E] hover:underline">
                                                {shortId(tx.id)}
                                            </button>
                                        </td>
                                        <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                                            {fmtDate(tx.createdAt)}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-1 text-xs">
                                                <span className="font-medium text-gray-800 truncate max-w-[90px]">{tx.customer?.name || 'N/A'}</span>
                                                <ArrowRight className="w-3 h-3 text-gray-400 flex-shrink-0" />
                                                <span className="font-medium text-gray-800 truncate max-w-[90px]">{tx.salesman?.name || 'N/A'}</span>
                                            </div>
                                            <p className="text-xs text-gray-400">{tx.customer?.email}</p>
                                        </td>
                                        <td className="px-4 py-3 text-right font-semibold text-gray-900 whitespace-nowrap">
                                            {fmtCurrency(tx.total)}
                                        </td>
                                        <td className="px-4 py-3 text-right text-xs font-medium text-blue-600 whitespace-nowrap">
                                            {fmtCurrency(tx.platformFee)}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${statusColors[tx.status] || 'bg-gray-100 text-gray-600'}`}>
                                                {tx.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${paymentColors[tx.paymentStatus] || 'bg-gray-100 text-gray-600'}`}>
                                                {tx.paymentStatus}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <button onClick={() => setSelectedTx(tx)} title="View receipt"
                                                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-[#00002E] transition-colors">
                                                <Receipt className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination */}
                {meta && meta.totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50">
                        <p className="text-xs text-gray-500">Showing page {meta.page} of {meta.totalPages} ({meta.total} records)</p>
                        <div className="flex gap-2">
                            <button disabled={filters.page <= 1} title="Previous page"
                                onClick={() => setFilters(f => ({ ...f, page: f.page - 1 }))}
                                className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed">
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <button disabled={filters.page >= meta.totalPages} title="Next page"
                                onClick={() => setFilters(f => ({ ...f, page: f.page + 1 }))}
                                className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed">
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* ── Receipt Modal ── */}
            {selectedTx && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setSelectedTx(null)}>
                    <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl p-6 relative" onClick={e => e.stopPropagation()}>
                        <button onClick={() => setSelectedTx(null)} title="Close receipt modal"
                            className="absolute top-4 right-4 p-1.5 rounded-xl hover:bg-gray-100 text-gray-400">
                            <X className="w-5 h-5" />
                        </button>

                        {/* Header */}
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 bg-[#00002E] rounded-xl flex items-center justify-center">
                                <Receipt className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <p className="font-bold text-gray-900">Transaction Receipt</p>
                                <p className="text-xs font-mono text-gray-500">{shortId(selectedTx.id)}</p>
                            </div>
                        </div>

                        {/* Entities */}
                        <div className="bg-gray-50 rounded-2xl p-4 mb-4 flex items-center justify-between">
                            <div>
                                <p className="text-xs text-gray-400">Customer (Payer)</p>
                                <p className="font-semibold text-sm text-gray-900">{selectedTx.customer?.name || 'N/A'}</p>
                                <p className="text-xs text-gray-500">{selectedTx.customer?.email}</p>
                            </div>
                            <ArrowRight className="w-5 h-5 text-gray-300" />
                            <div className="text-right">
                                <p className="text-xs text-gray-400">Shop Owner (Recipient)</p>
                                <p className="font-semibold text-sm text-gray-900">{selectedTx.salesman?.name || 'N/A'}</p>
                                <p className="text-xs text-gray-500">{selectedTx.salesman?.email}</p>
                            </div>
                        </div>

                        {/* Items */}
                        {selectedTx.items?.length > 0 && (
                            <div className="mb-4">
                                <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Items Purchased</p>
                                <div className="space-y-1">
                                    {selectedTx.items.map((item: any, i: number) => (
                                        <div key={i} className="flex justify-between text-xs text-gray-700">
                                            <span>{item.itemName || item.itemType} × {item.quantity}</span>
                                            <span className="font-medium">{fmtCurrency(item.total)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Breakdown */}
                        <div className="border-t border-gray-100 pt-4 space-y-2">
                            {[
                                { label: 'Subtotal',     value: fmtCurrency(selectedTx.subtotal) },
                                { label: 'Delivery Fee', value: fmtCurrency(selectedTx.deliveryFee) },
                                { label: 'Discount',     value: `- ${fmtCurrency(selectedTx.discount)}` },
                                { label: 'Platform Fee (5%)', value: fmtCurrency(selectedTx.platformFee), highlight: true },
                            ].map((r, i) => (
                                <div key={i} className={`flex justify-between text-sm ${r.highlight ? 'text-blue-600 font-semibold' : 'text-gray-600'}`}>
                                    <span>{r.label}</span><span>{r.value}</span>
                                </div>
                            ))}
                            <div className="flex justify-between font-bold text-gray-900 text-base pt-2 border-t border-gray-200">
                                <span>Total Paid</span><span>{fmtCurrency(selectedTx.total)}</span>
                            </div>
                        </div>

                        {/* Status badges */}
                        <div className="flex gap-3 mt-4">
                            <span className={`flex-1 text-center py-1.5 rounded-xl text-xs font-bold ${statusColors[selectedTx.status] || 'bg-gray-100 text-gray-600'}`}>
                                Order: {selectedTx.status}
                            </span>
                            <span className={`flex-1 text-center py-1.5 rounded-xl text-xs font-bold ${paymentColors[selectedTx.paymentStatus] || 'bg-gray-100 text-gray-600'}`}>
                                Payment: {selectedTx.paymentStatus}
                            </span>
                        </div>

                        <p className="text-xs text-center text-gray-400 mt-4">{fmtDate(selectedTx.createdAt)}</p>
                    </div>
                </div>
            )}
        </div>
    );
}

function CatalogTab() {
    const queryClient = useQueryClient();
    const [filters, setFilters] = useState({
        type: 'PRODUCT', // PRODUCT or CAR_PART
        status: 'pending', // all, active, pending
    });

    const { data: items = [], isLoading: loading } = useQuery<any[]>({
        queryKey: ['admin-catalog', filters],
        queryFn: async () => {
            const res = await adminApi.getCatalog({
                type: filters.type,
                ...(filters.status !== 'all' && { status: filters.status })
            });
            return res.success ? res.data : [];
        },
    });
    const fetchCatalog = () => queryClient.invalidateQueries({ queryKey: ['admin-catalog'] });

    const handleStatusToggle = async (id: string, currentStatus: boolean) => {
        try {
            await adminApi.updateCatalogItemStatus(id, filters.type, !currentStatus);
            fetchCatalog(); // refresh list
        } catch (error) {
            alert('Failed to update status');
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900">Catalog Moderation</h2>
                        <p className="text-xs text-gray-500">Review and approve listings before they go public.</p>
                    </div>

                    <div className="flex flex-wrap gap-4 items-center">
                        {/* Type Toggle */}
                        <div className="flex bg-gray-100 p-1 rounded-xl">
                            <button
                                onClick={() => setFilters(f => ({ ...f, type: 'PRODUCT' }))}
                                className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all ${filters.type === 'PRODUCT' ? 'bg-white shadow-sm text-[#00002E]' : 'text-gray-500 hover:text-gray-900'
                                    }`}
                            >
                                Shop Products
                            </button>
                            <button
                                onClick={() => setFilters(f => ({ ...f, type: 'CAR_PART' }))}
                                className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all ${filters.type === 'CAR_PART' ? 'bg-white shadow-sm text-[#00002E]' : 'text-gray-500 hover:text-gray-900'
                                    }`}
                            >
                                Car Parts
                            </button>
                        </div>

                        {/* Status Filter */}
                        <select
                            title="Filter catalog by listing status"
                            value={filters.status}
                            onChange={(e) => setFilters(f => ({ ...f, status: e.target.value }))}
                            className="text-xs border border-gray-200 rounded-xl px-3 py-2 text-gray-700 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#00002E]/20"
                        >
                            <option value="pending">Pending Approval</option>
                            <option value="active">Active Listings</option>
                            <option value="all">All Listings</option>
                        </select>
                    </div>
                </div>

                {loading ? (
                    <div className="py-16 flex justify-center"><div className="animate-spin w-7 h-7 border-2 border-[#00002E] border-t-transparent rounded-full" /></div>
                ) : items.length === 0 ? (
                    <div className="py-16 text-center text-gray-400 text-sm flex flex-col items-center">
                        <ShieldCheck className="w-10 h-10 text-gray-200 mb-3" />
                        <p>No listings found in this queue.</p>
                        <p className="text-xs mt-1 text-gray-400">All caught up!</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {items.map((item) => (
                            <div key={item.id} className="border border-gray-100 rounded-2xl overflow-hidden flex flex-col hover:shadow-md transition-shadow">
                                <div className="h-40 bg-gray-100 relative">
                                    {item.images?.[0] ? (
                                        <img src={item.images[0]} alt={item.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-gray-300">
                                            <ShoppingBag className="w-8 h-8" />
                                        </div>
                                    )}
                                    <div className="absolute top-2 right-2 flex gap-2">
                                        <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase ${item.isActive ? 'bg-green-500 text-white' : 'bg-amber-500 text-white'
                                            }`}>
                                            {item.isActive ? 'Active' : 'Pending'}
                                        </span>
                                    </div>
                                </div>
                                <div className="p-4 flex-1 flex flex-col">
                                    <h3 className="font-bold text-gray-900 text-sm line-clamp-1">{item.name}</h3>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                                            {item.category?.parent?.name ? `${item.category.parent.name} > ` : ''}
                                            {item.category?.name || 'Uncategorized'}
                                        </span>

                                        <p className="text-[10px] text-gray-500">By {item.salesman?.name || item.seller?.name || 'Unknown'}</p>
                                    </div>
                                    <p className="text-xs text-gray-400 mt-2 line-clamp-2">{item.description || 'No description provided.'}</p>

                                    <div className="mt-auto pt-4 flex gap-2">
                                        {item.isActive ? (
                                            <button
                                                onClick={() => handleStatusToggle(item.id, item.isActive)}
                                                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                                            >
                                                <Slash className="w-3.5 h-3.5" /> Suspend
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => handleStatusToggle(item.id, item.isActive)}
                                                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold bg-[#00002E] text-white hover:bg-[#00002E]/90 transition-colors"
                                            >
                                                <Check className="w-3.5 h-3.5" /> Approve
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

function ReviewsModerationTab() {
    const queryClient = useQueryClient();
    const [filters, setFilters] = useState({
        status: 'FLAGGED',
        targetType: '',
        page: 1,
    });

    const { data, isLoading: loading } = useQuery<{ reviews: any[]; meta: any }>({
        queryKey: ['admin-reviews', filters],
        queryFn: async () => {
            const params: any = { page: filters.page, limit: 10 };
            if (filters.status) params.status = filters.status;
            if (filters.targetType) params.targetType = filters.targetType;

            const res = await adminApi.getReviews(params);
            return res.success ? { reviews: res.data, meta: res.meta } : { reviews: [], meta: null };
        },
    });
    const reviews = data?.reviews ?? [];
    const meta = data?.meta ?? null;
    const fetchReviews = () => queryClient.invalidateQueries({ queryKey: ['admin-reviews'] });

    const handleModerate = async (reviewId: string, status: 'PUBLISHED' | 'HIDDEN') => {
        try {
            const res = await adminApi.moderateReview(reviewId, status);
            if (res.success) {
                fetchReviews();
            } else {
                alert(res.message || 'Failed to moderate review');
            }
        } catch (error) {
            console.error('Moderation error:', error);
            alert('Failed to update review status.');
        }
    };

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                <h2 className="text-lg font-bold text-gray-900">Review Queue</h2>
                <div className="flex gap-2 bg-gray-50 p-1 rounded-xl border border-gray-200">
                    {['FLAGGED', 'PUBLISHED', 'HIDDEN', ''].map((status) => (
                        <button
                            key={status}
                            onClick={() => setFilters(f => ({ ...f, status, page: 1 }))}
                            className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all ${filters.status === status ? 'bg-white shadow-sm text-[#00002E]' : 'text-gray-500 hover:text-gray-900'
                                }`}
                        >
                            {status === '' ? 'All' : status}
                        </button>
                    ))}
                </div>
            </div>

            {loading ? (
                <div className="py-10 flex justify-center"><div className="animate-spin w-6 h-6 border-2 border-[#00002E] border-t-transparent rounded-full" /></div>
            ) : reviews.length === 0 ? (
                <div className="py-16 text-center text-gray-400 text-sm flex flex-col items-center">
                    <ShieldAlert className="w-10 h-10 text-gray-200 mb-3" />
                    <p>No reviews found matching the criteria.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {reviews.map((r) => (
                        <div key={r.id} className="border border-gray-100 rounded-xl p-4 hover:bg-gray-50/50 transition-colors">
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <h3 className="font-bold text-gray-900 text-sm">
                                        Rating: {r.rating} ⭐ 
                                        <span className="ml-2 px-2 py-0.5 rounded text-[10px] bg-gray-100 text-gray-600 font-medium">
                                            {r.targetType}
                                        </span>
                                        <span className={`ml-2 px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                            r.status === 'PUBLISHED' ? 'bg-green-100 text-green-700' :
                                            r.status === 'HIDDEN' ? 'bg-red-100 text-red-700' :
                                            r.status === 'FLAGGED' ? 'bg-orange-100 text-orange-700' :
                                            'bg-amber-100 text-amber-700'
                                        }`}>
                                            {r.status}
                                        </span>
                                    </h3>
                                    <p className="text-xs text-gray-500 mt-0.5">By: {r.user?.name || 'Anonymous'} ({r.user?.email})</p>
                                </div>
                                <div className="text-xs text-gray-400">
                                    {new Date(r.createdAt).toLocaleString()}
                                </div>
                            </div>
                            <p className="text-sm text-gray-700 mt-2">{r.comment || <span className="italic text-gray-400">No comment provided</span>}</p>
                            
                            <div className="mt-4 flex gap-2">
                                {r.status !== 'PUBLISHED' && (
                                    <button
                                        onClick={() => handleModerate(r.id, 'PUBLISHED')}
                                        className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#00002E] text-white hover:bg-[#00002E]/90"
                                    >
                                        Approve & Publish
                                    </button>
                                )}
                                {r.status !== 'HIDDEN' && (
                                    <button
                                        onClick={() => handleModerate(r.id, 'HIDDEN')}
                                        className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
                                    >
                                        Hide Review
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}

                    {meta && meta.totalPages > 1 && (
                        <div className="flex items-center justify-between pt-4 border-t border-gray-100 mt-6">
                            <p className="text-xs text-gray-500">Page {meta.page} of {meta.totalPages}</p>
                            <div className="flex gap-2">
                                <button disabled={filters.page <= 1} 
                                    onClick={() => setFilters(f => ({ ...f, page: f.page - 1 }))}
                                    className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-white disabled:opacity-40">
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                                <button disabled={filters.page >= meta.totalPages} 
                                    onClick={() => setFilters(f => ({ ...f, page: f.page + 1 }))}
                                    className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-white disabled:opacity-40">
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}