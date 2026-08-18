import { getApiUrl } from '../config/api.config';
import { getToken } from './storage';

export const getMyReceipts = async () => {
  const token = await getToken();
  const res = await fetch(`${getApiUrl()}/wallet/receipts/my`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
};

export const submitReceipt = async (fileUri: string, fileName: string, mimeType: string, amount: string, note: string) => {
  const token = await getToken();
  const formData = new FormData();
  // @ts-ignore - React Native FormData file shape
  formData.append('file', { uri: fileUri, name: fileName, type: mimeType });
  formData.append('amount', amount);
  formData.append('note', note);

  const res = await fetch(`${getApiUrl()}/wallet/receipts`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
    body: formData,
  });
  return res.json();
};
