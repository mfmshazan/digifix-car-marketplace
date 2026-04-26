import React from 'react';
import { Modal, StyleSheet, Text, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ModalProps {
  setModalVisible: (visible: boolean) => void;
  modalVisible: boolean;
  onSelectMethod: (method: "stripe" | "wallet" | "cod") => void;
}

const CustomModal = ({ modalVisible, setModalVisible, onSelectMethod }: ModalProps) => {
  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={modalVisible}
      onRequestClose={() => {
        setModalVisible(false);
      }}
    >
      <View style={styles.overlay}>
        <View style={styles.modalView}>
          <Text style={styles.modalTitle}>Select Payment Method</Text>

          {/* Pay with Stripe */}
          <Pressable
            style={[styles.button, styles.stripeButton]}
            onPress={() => onSelectMethod('stripe')}
          >
            <Ionicons name="card-outline" size={20} color="#0f172a" />
            <Text style={styles.stripeText}>Pay with Card (Stripe)</Text>
          </Pressable>

          {/* Pay with Wallet */}
          <Pressable
            style={[styles.button, styles.walletButton]}
            onPress={() => onSelectMethod('wallet')}
          >
            <Ionicons name="wallet-outline" size={20} color="#f8fafc" />
            <Text style={styles.textStyle}>Pay with Wallet</Text>
          </Pressable>

          {/* Cash on Delivery */}
          <Pressable
            style={[styles.button, styles.codButton]}
            onPress={() => onSelectMethod('cod')}
          >
            <Ionicons name="cash-outline" size={20} color="#f8fafc" />
            <Text style={styles.textStyle}>Cash on Delivery</Text>
          </Pressable>

          {/* Cancel Button */}
          <Pressable
            style={styles.cancelButton}
            onPress={() => setModalVisible(false)}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
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
    backgroundColor: 'rgba(0, 0, 0, 0.6)', // Dark semi-transparent background
  },
  modalView: {
    width: '85%',
    backgroundColor: '#1e293b', // Slate background
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
  stripeButton: {
    backgroundColor: '#22d3ee', // Cyan accent
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
  codButton: {
    backgroundColor: '#334155',
    borderWidth: 1,
    borderColor: '#475569',
  },
  textStyle: {
    color: '#f8fafc',
    fontWeight: 'bold',
    fontSize: 16,
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