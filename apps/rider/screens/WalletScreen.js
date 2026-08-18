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
import { useFocusEffect } from '@react-navigation/native';
import * as WebBrowser from 'expo-web-browser';
import api from '../services/api';
import { colors, spacing, typography, shadows, radii } from '../styles/theme';

const TRANSACTION_LABELS = {
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

export default function WalletScreen({ navigation }) {
    const [wallet, setWallet] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [payingOut, setPayingOut] = useState(false);
    const [stripeReady, setStripeReady] = useState(true);

    const fetchWallet = useCallback(async () => {
        try {
            const [walletRes, stripeRes] = await Promise.all([
                api.get('/wallet/my'),
                api.get('/stripe/account-status')
            ]);
            
            if (walletRes.data.success && walletRes.data.data) {
                setWallet(walletRes.data.data);
            }
            if (stripeRes.data.success) {
                setStripeReady(stripeRes.data.isReady);
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
                            const response = await api.post('/wallet/payout');
                            const result = response.data;
                            if (result.success) {
                                Alert.alert('Success', result.msg);
                                fetchWallet();
                            } else {
                                Alert.alert('Failed', result.msg || 'Withdrawal failed. Try again.');
                            }
                        } catch (err) {
                            Alert.alert('Error', err.response?.data?.msg || 'Network error. Please try again.');
                        } finally {
                            setPayingOut(false);
                        }
                    },
                },
            ]
        );
    };

    const handleOnboardStripe = async () => {
        try {
            setPayingOut(true);
            const response = await api.post('/stripe/onboard');
            const res = response.data;
            if (res.success && res.onboardingUrl) {
                await WebBrowser.openBrowserAsync(res.onboardingUrl);
                fetchWallet();
            } else {
                Alert.alert('Error', 'Failed to get Stripe setup link');
            }
        } catch (e) {
            Alert.alert('Error', 'Network error.');
        } finally {
            setPayingOut(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color={colors.secondary} />
            </View>
        );
    }

    return (
        <ScrollView
            style={styles.container}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchWallet(); }} tintColor={colors.secondary} />}
        >
            <View style={styles.balanceCard}>
                <Text style={styles.balanceLabel}>Available Balance</Text>
                <Text style={styles.balanceAmount}>
                    Rs. {wallet ? wallet.balance.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '0.00'}
                </Text>
                
                {!stripeReady ? (
                    <TouchableOpacity
                        style={[styles.payoutButton, { backgroundColor: '#6366F1' }, payingOut && styles.payoutButtonDisabled]}
                        onPress={handleOnboardStripe}
                        disabled={payingOut}
                    >
                        {payingOut ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <>
                                <Ionicons name="card-outline" size={18} color="#fff" />
                                <Text style={styles.payoutButtonText}>Complete Stripe Setup</Text>
                            </>
                        )}
                    </TouchableOpacity>
                ) : (
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
                )}
                
                <Text style={styles.payoutNote}>
                    Funds are released after order delivery is confirmed.
                </Text>
                <TouchableOpacity
                    style={styles.receiptAction}
                    onPress={() => navigation?.navigate?.('ReceiptUpload')}
                >
                    <Ionicons name="receipt-outline" size={18} color={colors.secondary} />
                    <Text style={styles.receiptActionText}>Upload Repayment Receipt</Text>
                </TouchableOpacity>
            </View>

            <Text style={styles.sectionTitle}>Transaction History</Text>
            {!wallet || wallet.transactions.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Ionicons name="receipt-outline" size={48} color={colors.textMuted} />
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
    container: { flex: 1, backgroundColor: colors.background },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    balanceCard: {
        margin: spacing.lg,
        padding: spacing.xl,
        backgroundColor: colors.surface,
        borderRadius: radii.lg,
        alignItems: 'center',
        ...shadows.medium,
        borderWidth: 1,
        borderColor: colors.border,
    },
    balanceLabel: { color: colors.textSecondary, fontSize: 14, marginBottom: 6 },
    balanceAmount: { color: colors.text, fontSize: 36, fontWeight: '700', marginBottom: 20 },
    payoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.secondary,
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: radii.md,
        gap: 8,
        marginBottom: 12,
    },
    payoutButtonDisabled: { opacity: 0.5 },
    payoutButtonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
    payoutNote: { color: colors.textMuted, fontSize: 12, textAlign: 'center' },
    receiptAction: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginTop: 12,
        paddingVertical: 12,
        borderRadius: radii.md,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
    },
    receiptActionText: {
        color: colors.secondary,
        fontSize: 14,
        fontWeight: '600',
    },
    sectionTitle: { ...typography.h3, color: colors.text, marginHorizontal: spacing.lg, marginTop: spacing.sm, marginBottom: spacing.sm },
    emptyContainer: { alignItems: 'center', padding: 40 },
    emptyText: { color: colors.textMuted, fontSize: 14, marginTop: 12 },
    txCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        marginHorizontal: spacing.lg,
        marginBottom: spacing.sm,
        padding: spacing.md,
        borderRadius: radii.md,
        ...shadows.small,
        borderWidth: 1,
        borderColor: colors.border,
    },
    txIcon: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    txIconIn: { backgroundColor: colors.success },
    txIconOut: { backgroundColor: colors.danger },
    txDetails: { flex: 1 },
    txType: { fontSize: 14, fontWeight: '600', color: colors.text },
    txDesc: { fontSize: 12, color: colors.textSecondary, marginTop: 1 },
    txDate: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
    txAmount: { fontSize: 14, fontWeight: '700' },
    txAmountIn: { color: colors.success },
    txAmountOut: { color: colors.danger },
});
