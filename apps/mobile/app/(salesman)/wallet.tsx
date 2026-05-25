import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { getMyWallet, triggerSalesmanPayout, WalletTransaction, WalletData } from '../../src/api/wallet';

const TRANSACTION_LABELS: Record<string, string> = {
  DEPOSIT: 'Deposit',
  PURCHASE: 'Purchase',
  SALE_EARNING: 'Sale Earning',
  PLATFORM_FEE: 'Platform Fee',
  DELIVERY_FEE: 'Delivery Fee',
  EARNING: 'Earning',
  PAYOUT: 'Payout',
  REFUND: 'Refund',
  COD_PAYMENT: 'COD Collected',
  COD_REMITTANCE: 'COD Remittance',
  REFUND_SETTLEMENT: 'Refund Settlement',
};

export default function SalesmanWalletScreen() {
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [payingOut, setPayingOut] = useState(false);

  const fetchWallet = useCallback(async () => {
    try {
      const result = await getMyWallet();
      if (result.success && result.data) {
        setWallet(result.data);
      }
    } catch (err) {
      console.error('Failed to fetch wallet:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchWallet();
    }, [fetchWallet])
  );

  const handlePayout = async () => {
    if (!wallet || wallet.balance <= 0) {
      Alert.alert('No Balance', 'You have no funds available to withdraw.');
      return;
    }
    Alert.alert(
      'Withdraw to Bank',
      `Transfer Rs. ${wallet.balance.toLocaleString()} to your connected Stripe account?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Withdraw',
          style: 'default',
          onPress: async () => {
            setPayingOut(true);
            try {
              const result = await triggerSalesmanPayout();
              if (result.success) {
                Alert.alert('Success', result.msg);
                fetchWallet();
              } else {
                Alert.alert('Failed', result.msg || 'Withdrawal failed. Try again.');
              }
            } catch (err) {
              Alert.alert('Error', 'Network error. Please try again.');
            } finally {
              setPayingOut(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#EF4444" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchWallet(); }} />}
    >
      {/* Balance Card */}
      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Available Balance</Text>
        <Text style={styles.balanceAmount}>
          Rs. {wallet ? wallet.balance.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '0.00'}
        </Text>
        <TouchableOpacity
          style={[styles.payoutButton, (payingOut || !wallet || wallet.balance <= 0) && styles.payoutButtonDisabled]}
          onPress={handlePayout}
          disabled={payingOut || !wallet || wallet.balance <= 0}
        >
          {payingOut ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="arrow-up-circle-outline" size={18} color="#fff" />
              <Text style={styles.payoutButtonText}>Withdraw to Bank</Text>
            </>
          )}
        </TouchableOpacity>
        <Text style={styles.payoutNote}>
          Funds are released after order delivery is confirmed.
        </Text>
      </View>

      {/* Transactions */}
      <Text style={styles.sectionTitle}>Transaction History</Text>
      {!wallet || wallet.transactions.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="receipt-outline" size={48} color="#9CA3AF" />
          <Text style={styles.emptyText}>No transactions yet</Text>
        </View>
      ) : (
        wallet.transactions.map((tx) => (
          <View key={tx.id} style={styles.txCard}>
            <View style={[styles.txIcon, tx.direction === 'IN' ? styles.txIconIn : styles.txIconOut]}>
              <Ionicons
                name={tx.direction === 'IN' ? 'arrow-down-outline' : 'arrow-up-outline'}
                size={16}
                color="#fff"
              />
            </View>
            <View style={styles.txDetails}>
              <Text style={styles.txType}>{TRANSACTION_LABELS[tx.type] || tx.type}</Text>
              {tx.description ? <Text style={styles.txDesc} numberOfLines={1}>{tx.description}</Text> : null}
              <Text style={styles.txDate}>{new Date(tx.createdAt).toLocaleDateString()}</Text>
            </View>
            <Text style={[styles.txAmount, tx.direction === 'IN' ? styles.txAmountIn : styles.txAmountOut]}>
              {tx.direction === 'IN' ? '+' : '-'}Rs. {tx.amount.toLocaleString()}
            </Text>
          </View>
        ))
      )}
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  balanceCard: {
    margin: 16,
    padding: 24,
    backgroundColor: '#1F2937',
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  balanceLabel: { color: '#9CA3AF', fontSize: 14, marginBottom: 6 },
  balanceAmount: { color: '#FFFFFF', fontSize: 36, fontWeight: '700', marginBottom: 20 },
  payoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EF4444',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    gap: 8,
    marginBottom: 12,
  },
  payoutButtonDisabled: { opacity: 0.5 },
  payoutButtonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  payoutNote: { color: '#6B7280', fontSize: 12, textAlign: 'center' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginHorizontal: 16, marginTop: 8, marginBottom: 8 },
  emptyContainer: { alignItems: 'center', padding: 40 },
  emptyText: { color: '#6B7280', fontSize: 14, marginTop: 12 },
  txCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 14,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  txIcon: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  txIconIn: { backgroundColor: '#10B981' },
  txIconOut: { backgroundColor: '#EF4444' },
  txDetails: { flex: 1 },
  txType: { fontSize: 14, fontWeight: '600', color: '#111827' },
  txDesc: { fontSize: 12, color: '#6B7280', marginTop: 1 },
  txDate: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  txAmount: { fontSize: 14, fontWeight: '700' },
  txAmountIn: { color: '#10B981' },
  txAmountOut: { color: '#EF4444' },
});
