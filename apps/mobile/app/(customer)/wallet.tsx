import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { getMyWallet } from '../../src/api/wallet';

export default function WalletScreen() {
  const [balance, setBalance] = useState<number | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getMyWallet();
      if (res.success && res.data) {
        setBalance(res.data.balance);
        setTransactions(res.data.transactions);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const formatAmount = (n: number) => `Rs. ${n.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

  const txIcon = (tx: any) => {
    if (tx.type === 'REFUND') return { name: 'return-down-back', color: '#16a34a' };
    if (tx.type === 'PURCHASE') return { name: 'cart', color: '#dc2626' };
    return { name: 'swap-horizontal', color: '#6B7280' };
  };

  const txLabel = (tx: any) => {
    if (tx.type === 'REFUND') return 'Refund Received';
    if (tx.type === 'PURCHASE') return 'Order Payment';
    return tx.type;
  };

  if (loading) return <ActivityIndicator style={{ marginTop: 60 }} size="large" color="#00002E" />;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Wallet Balance</Text>
        <Text style={styles.balanceAmount}>{balance !== null ? formatAmount(balance) : '—'}</Text>
        <Text style={styles.balanceNote}>Credited automatically when a refund is approved</Text>
      </View>

      <View style={styles.historyCard}>
        <Text style={styles.sectionTitle}>Transaction History</Text>
        {transactions.length === 0 ? (
          <Text style={styles.muted}>No transactions yet.</Text>
        ) : transactions.map((tx) => {
          const icon = txIcon(tx);
          return (
            <View key={tx.id} style={styles.txRow}>
              <View style={[styles.txIconWrap, { backgroundColor: `${icon.color}20` }]}>
                <Ionicons name={icon.name as any} size={18} color={icon.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.txLabel}>{txLabel(tx)}</Text>
                <Text style={styles.txDate}>{new Date(tx.createdAt).toLocaleDateString()}</Text>
              </View>
              <Text style={[styles.txAmount, { color: tx.direction === 'IN' ? '#16a34a' : '#dc2626' }]}>
                {tx.direction === 'IN' ? '+' : '-'}{formatAmount(tx.amount)}
              </Text>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  balanceCard: { backgroundColor: '#00002E', borderRadius: 16, padding: 20, marginBottom: 16, alignItems: 'center' },
  balanceLabel: { color: '#B0B3C6', fontSize: 13 },
  balanceAmount: { color: '#fff', fontSize: 32, fontWeight: '700', marginTop: 6 },
  balanceNote: { color: '#B0B3C6', fontSize: 12, marginTop: 10, textAlign: 'center' },
  historyCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 12, color: '#1A1A1A' },
  muted: { color: '#9CA3AF' },
  txRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  txIconWrap: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  txLabel: { fontSize: 14, fontWeight: '500', color: '#1A1A1A' },
  txDate: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  txAmount: { fontSize: 14, fontWeight: '600' },
});
