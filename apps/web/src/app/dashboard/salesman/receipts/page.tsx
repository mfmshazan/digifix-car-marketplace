'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import ReceiptUploadPanel from '@/components/receipts/ReceiptUploadPanel';

export default function SalesmanReceiptsPage() {
  const { user, isAuthenticated } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) { router.replace('/login'); return; }
    if (user && user.role !== 'SALESMAN' && user.role !== 'SHOP_MANAGER') { router.replace('/'); }
  }, [isAuthenticated, user, router]);

  return <ReceiptUploadPanel />;
}
