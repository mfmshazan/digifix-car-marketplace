import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { getMyReceipts, submitReceipt } from '../services/api-receipts';
import { colors, spacing, typography, shadows, radii } from '../styles/theme';

export default function ReceiptUploadScreen() {
  const [balance, setBalance] = useState(null);
  const [receipts, setReceipts] = useState([]);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getMyReceipts();
      if (res.data.success) { setBalance(res.data.balance); setReceipts(res.data.data); }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const pickFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
      copyToCacheDirectory: true,
    });
    if (!result.canceled && result.assets?.[0]) setFile(result.assets[0]);
  };

  const handleSubmit = async () => {
    if (!file || !amount) { Alert.alert('Missing info', 'Select a file and enter the amount.'); return; }
    setSubmitting(true);
    try {
      const res = await submitReceipt(file.uri, file.name, file.mimeType || 'application/octet-stream', amount, note);
      if (res.data.success) {
        setFile(null); setAmount(''); setNote('');
        Alert.alert('Submitted', 'Your receipt was submitted for review.');
        load();
      } else {
        Alert.alert('Error', res.data.msg || 'Failed to submit');
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to submit receipt');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <ActivityIndicator style={{ marginTop: 40 }} />;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.md }}>
      <View style={styles.card}>
        <Text style={styles.label}>Wallet Balance</Text>
        <Text style={[styles.balance, balance < 0 && styles.negative]}>LKR {balance?.toFixed(2) ?? '—'}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Upload Repayment Receipt</Text>
        <TextInput style={styles.input} placeholder="Amount paid (LKR)" keyboardType="decimal-pad" value={amount} onChangeText={setAmount} />
        <TextInput style={styles.input} placeholder="Note (bank ref, account, etc.)" value={note} onChangeText={setNote} />
        <TouchableOpacity style={styles.fileButton} onPress={pickFile}>
          <Text>{file ? file.name : 'Choose PDF or Image'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} disabled={submitting}>
          <Text style={styles.submitButtonText}>{submitting ? 'Submitting...' : 'Submit'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Your Receipts</Text>
        {receipts.length === 0 ? <Text style={styles.muted}>No receipts submitted yet.</Text> : receipts.map((r) => (
          <View key={r.id} style={styles.receiptRow}>
            <Text style={{ fontWeight: '600' }}>LKR {r.amount.toFixed(2)}</Text>
            <Text style={{ fontSize: 12, fontWeight: '600', color: r.status === 'APPROVED' ? colors.success ?? '#16a34a' : r.status === 'REJECTED' ? colors.danger ?? '#dc2626' : '#d97706' }}>
              {r.status}
            </Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background ?? '#f5f5f5' },
  card: { backgroundColor: '#fff', borderRadius: radii.md ?? 12, padding: spacing.md, marginBottom: spacing.md, ...shadows.sm },
  label: { fontSize: 13, color: '#666' },
  balance: { fontSize: 24, fontWeight: '700', marginTop: 4 },
  negative: { color: '#dc2626' },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 12 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10, marginBottom: 10 },
  fileButton: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, marginBottom: 10 },
  submitButton: { backgroundColor: '#2563eb', borderRadius: 8, padding: 12, alignItems: 'center' },
  submitButtonText: { color: '#fff', fontWeight: '600' },
  muted: { color: '#999' },
  receiptRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#eee' },
});
