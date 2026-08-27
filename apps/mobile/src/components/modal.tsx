import React, { useEffect, useState } from 'react';
import { Modal, StyleSheet, Text, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatCurrency } from '../lib/currency';

type PaymentMethod = 'stripe' | 'wallet' | 'cod';

interface ModalProps {
  setModalVisible: (visible: boolean) => void;
  modalVisible: boolean;
  /**
   * @param method   'wallet' = whole total from wallet; 'stripe'/'cod' = that method
   *                 covers the remainder (`orderTotal - walletAmount`).
   * @param walletAmount  amount to draw from the wallet (0 when not used).
   */
  onSelectMethod: (method: PaymentMethod, walletAmount: number) => void;
  walletBalance?: number | null;
  orderTotal?: number;
}

const CustomModal = ({ modalVisible, setModalVisible, onSelectMethod, walletBalance, orderTotal }: ModalProps) => {
  const total = orderTotal ?? 0;
  const balance = walletBalance ?? 0;
  const walletCoversAll = balance > 0 && total > 0 && balance >= total;
  const walletCoversSome = balance > 0 && total > 0 && balance < total;

  // Two-step flow: pick a method, then (for a partial wallet) pick how to pay the rest.
  const [step, setStep] = useState<'method' | 'remainder'>('method');
  useEffect(() => {
    if (!modalVisible) setStep('method');
  }, [modalVisible]);

  const partialWallet = Math.min(balance, total);
  const remaining = Math.max(0, total - partialWallet);

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={modalVisible}
      onRequestClose={() => setModalVisible(false)}
    >
      <View style={styles.overlay}>
        <View style={styles.modalView}>
          {step === 'method' ? (
            <>
              <Text style={styles.modalTitle}>Select Payment Method</Text>

              {/* Pay with Card (full amount) */}
              <Pressable
                style={[styles.button, styles.stripeButton]}
                onPress={() => onSelectMethod('stripe', 0)}
              >
                <Ionicons name="card-outline" size={20} color="#0f172a" />
                <Text style={styles.stripeText}>Pay with Card (Stripe)</Text>
              </Pressable>

              {/* Wallet — full or partial */}
              {walletCoversAll && (
                <Pressable
                  style={[styles.button, styles.walletButton]}
                  onPress={() => onSelectMethod('wallet', total)}
                >
                  <Ionicons name="wallet-outline" size={20} color="#f8fafc" />
                  <View style={styles.buttonBody}>
                    <Text style={styles.textStyle}>Pay with Wallet</Text>
                    <Text style={styles.walletBalanceText}>Balance: {formatCurrency(balance)}</Text>
                  </View>
                </Pressable>
              )}

              {walletCoversSome && (
                <Pressable
                  style={[styles.button, styles.walletButton]}
                  onPress={() => setStep('remainder')}
                >
                  <Ionicons name="wallet-outline" size={20} color="#f8fafc" />
                  <View style={styles.buttonBody}>
                    <Text style={styles.textStyle}>
                      Use wallet ({formatCurrency(partialWallet)}) + pay the rest
                    </Text>
                    <Text style={styles.walletBalanceText}>
                      Balance: {formatCurrency(balance)} · {formatCurrency(remaining)} remaining
                    </Text>
                  </View>
                </Pressable>
              )}

              {balance <= 0 && (
                <View style={[styles.button, styles.walletButton, styles.buttonDisabled]}>
                  <Ionicons name="wallet-outline" size={20} color="#64748b" />
                  <View style={styles.buttonBody}>
                    <Text style={[styles.textStyle, styles.textDisabled]}>Pay with Wallet</Text>
                    <Text style={styles.walletBalanceText}>Balance: {formatCurrency(balance)}</Text>
                  </View>
                </View>
              )}

              {/* Cash on Delivery (full amount) */}
              <Pressable
                style={[styles.button, styles.codButton]}
                onPress={() => onSelectMethod('cod', 0)}
              >
                <Ionicons name="cash-outline" size={20} color="#f8fafc" />
                <Text style={styles.textStyle}>Cash on Delivery</Text>
              </Pressable>

              <Pressable style={styles.cancelButton} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text style={styles.modalTitle}>Pay the remaining balance</Text>
              <Text style={styles.splitSummary}>
                {formatCurrency(partialWallet)} from wallet
              </Text>
              <Text style={styles.splitRemaining}>
                {formatCurrency(remaining)} still to pay
              </Text>

              <Pressable
                style={[styles.button, styles.stripeButton]}
                onPress={() => onSelectMethod('stripe', partialWallet)}
              >
                <Ionicons name="card-outline" size={20} color="#0f172a" />
                <Text style={styles.stripeText}>Pay {formatCurrency(remaining)} by Card</Text>
              </Pressable>

              <Pressable
                style={[styles.button, styles.codButton]}
                onPress={() => onSelectMethod('cod', partialWallet)}
              >
                <Ionicons name="cash-outline" size={20} color="#f8fafc" />
                <Text style={styles.textStyle}>
                  {formatCurrency(remaining)} Cash on Delivery
                </Text>
              </Pressable>

              <Pressable style={styles.cancelButton} onPress={() => setStep('method')}>
                <Text style={styles.cancelText}>Back</Text>
              </Pressable>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  modalView: {
    width: '85%',
    backgroundColor: '#1e293b',
    borderRadius: 20,
    padding: 25,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#f8fafc',
    marginBottom: 20,
    textAlign: 'center',
  },
  splitSummary: {
    color: '#4ade80',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  splitRemaining: {
    color: '#94a3b8',
    fontSize: 13,
    marginBottom: 18,
  },
  button: {
    width: '100%',
    flexDirection: 'row',
    borderRadius: 12,
    padding: 15,
    elevation: 2,
    marginBottom: 12,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  buttonBody: {
    flex: 1,
    alignItems: 'center',
  },
  stripeButton: {
    backgroundColor: '#22d3ee',
  },
  stripeText: {
    color: '#0f172a',
    fontWeight: 'bold',
    fontSize: 16,
  },
  walletButton: {
    backgroundColor: '#334155',
    borderWidth: 1,
    borderColor: '#475569',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  textDisabled: {
    color: '#64748b',
  },
  walletBalanceText: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 2,
    textAlign: 'center',
  },
  codButton: {
    backgroundColor: '#334155',
    borderWidth: 1,
    borderColor: '#475569',
  },
  textStyle: {
    color: '#f8fafc',
    fontWeight: 'bold',
    fontSize: 16,
    textAlign: 'center',
  },
  cancelButton: {
    marginTop: 10,
    padding: 10,
  },
  cancelText: {
    color: '#94a3b8',
    fontWeight: '600',
    fontSize: 14,
  },
});

export default CustomModal;
