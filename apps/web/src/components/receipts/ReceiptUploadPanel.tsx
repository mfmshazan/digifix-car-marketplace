'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Upload, FileText, Image as ImageIcon, CheckCircle2, XCircle, Clock } from 'lucide-react';
import api, { API_BASE_URL } from '@/lib/api';

interface Receipt {
    id: string;
    amount: number;
    fileType: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    note: string | null;
    rejectionReason: string | null;
    createdAt: string;
    viewUrl: string;
}

export default function ReceiptUploadPanel() {
    const [balance, setBalance] = useState<number | null>(null);
    const [receipts, setReceipts] = useState<Receipt[]>([]);
    const [file, setFile] = useState<File | null>(null);
    const [amount, setAmount] = useState('');
    const [note, setNote] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get('/wallet/receipts/my');
            setBalance(res.data.balance);
            setReceipts(res.data.data);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file || !amount) return;

        setSubmitting(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('amount', amount);
            formData.append('note', note);

            await api.post('/wallet/receipts', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            setFile(null);
            setAmount('');
            setNote('');
            await load();
        } catch (err: any) {
            alert(err?.response?.data?.msg || 'Failed to submit receipt');
        } finally {
            setSubmitting(false);
        }
    };

    const statusBadge = (status: Receipt['status']) => {
        const map = {
            PENDING: { icon: Clock, cls: 'bg-yellow-100 text-yellow-800' },
            APPROVED: { icon: CheckCircle2, cls: 'bg-green-100 text-green-800' },
            REJECTED: { icon: XCircle, cls: 'bg-red-100 text-red-800' },
        } as const;
        const { icon: Icon, cls } = map[status];
        return (
            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${cls}`}>
                <Icon size={12} /> {status}
            </span>
        );
    };

    return (
        <div className="max-w-2xl mx-auto p-6 space-y-6">
            <div className="bg-white rounded-xl shadow p-5">
                <h2 className="text-lg font-semibold mb-1">Wallet Balance</h2>
                <p className={`text-2xl font-bold ${balance !== null && balance < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                    {balance !== null ? `LKR ${balance.toFixed(2)}` : '—'}
                </p>
                {balance !== null && balance < 0 && (
                    <p className="text-sm text-gray-500 mt-1">
                        Your balance is negative. Upload a bank transfer receipt below to settle it.
                    </p>
                )}
            </div>

            <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow p-5 space-y-4">
                <h3 className="font-semibold flex items-center gap-2"><Upload size={18} /> Upload Repayment Receipt</h3>

                <div>
                    <label className="block text-sm font-medium mb-1">Amount Paid (LKR)</label>
                    <input
                        type="number" step="0.01" min="0" required value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="w-full border rounded-lg px-3 py-2"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1">Note (bank ref, account, etc.)</label>
                    <input
                        type="text" value={note} onChange={(e) => setNote(e.target.value)}
                        placeholder="e.g. Transferred to Sampath Bank a/c ...1234, ref #556"
                        className="w-full border rounded-lg px-3 py-2"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1">Receipt (PDF or Image)</label>
                    <input
                        type="file" required accept="image/jpeg,image/png,image/webp,application/pdf"
                        onChange={(e) => setFile(e.target.files?.[0] || null)}
                        className="w-full border rounded-lg px-3 py-2"
                    />
                </div>

                <button
                    type="submit" disabled={submitting || !file || !amount}
                    className="w-full bg-blue-600 text-white rounded-lg py-2 font-medium disabled:opacity-50"
                >
                    {submitting ? 'Submitting...' : 'Submit Receipt'}
                </button>
            </form>

            <div className="bg-white rounded-xl shadow p-5">
                <h3 className="font-semibold mb-3">Your Receipts</h3>
                {loading ? (
                    <p className="text-sm text-gray-500">Loading...</p>
                ) : receipts.length === 0 ? (
                    <p className="text-sm text-gray-500">No receipts submitted yet.</p>
                ) : (
                    <div className="space-y-3">
                        {receipts.map((r) => (
                            <div key={r.id} className="border rounded-lg p-3 flex items-start justify-between">
                                <div className="flex items-start gap-3">
                                    {r.fileType === 'pdf' ? <FileText size={20} className="text-gray-400 mt-1" /> : <ImageIcon size={20} className="text-gray-400 mt-1" />}
                                    <div>
                                        <p className="font-medium">LKR {r.amount.toFixed(2)}</p>
                                        {r.note && <p className="text-sm text-gray-500">{r.note}</p>}
                                        {r.status === 'REJECTED' && r.rejectionReason && (
                                            <p className="text-sm text-red-600">Reason: {r.rejectionReason}</p>
                                        )}
                                        <a href={r.viewUrl} target="_blank" rel="noreferrer" className="text-sm text-blue-600 underline">
                                            View file
                                        </a>
                                    </div>
                                </div>
                                {statusBadge(r.status)}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}