import { getApiUrl } from '../config/api.config';
import { getToken } from './storage';

export interface WalletTransaction {
  id: string;
  amount: number;
  type: string;
  direction: 'IN' | 'OUT';
  description?: string;
  createdAt: string;
  orderId?: string;
  codSettlementStatus?: string;
}

export interface WalletData {
  balance: number;
  walletId: string;
  transactions: WalletTransaction[];
}

export const getMyWallet = async (): Promise<{ success: boolean; data?: WalletData; msg?: string }> => {
  const token = await getToken();
  if (!token) throw new Error('Not authenticated');

  const response = await fetch(`${getApiUrl()}/wallet/my`, {
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
  });
  return response.json();
};
