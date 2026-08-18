import api from './api';

export const getMyReceipts = () => api.get('/wallet/receipts/my');

export const submitReceipt = (fileUri, fileName, mimeType, amount, note) => {
  const formData = new FormData();
  formData.append('file', { uri: fileUri, name: fileName, type: mimeType });
  formData.append('amount', amount);
  formData.append('note', note);
  return api.post('/wallet/receipts', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
};
