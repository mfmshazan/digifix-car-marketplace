// Form validation utilities

export const validateEmail = (email: string): { valid: boolean; error?: string } => {
  if (!email.trim()) {
    return { valid: false, error: "Email is required" };
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { valid: false, error: "Invalid email format" };
  }
  
  return { valid: true };
};

export const validatePassword = (password: string): { valid: boolean; error?: string } => {
  if (!password) {
    return { valid: false, error: "Password is required" };
  }
  
  if (password.length < 6) {
    return { valid: false, error: "Password must be at least 6 characters" };
  }
  
  return { valid: true };
};

export const validatePhone = (phone: string): { valid: boolean; error?: string } => {
  if (!phone.trim()) {
    return { valid: true }; // Phone is optional
  }
  
  const phoneRegex = /^[\d\s\-\+\(\)]+$/;
  if (!phoneRegex.test(phone)) {
    return { valid: false, error: "Invalid phone number format" };
  }
  
  return { valid: true };
};

export const validateCardNumber = (cardNumber: string): { valid: boolean; error?: string } => {
  const cleaned = cardNumber.replace(/\s/g, '');
  
  if (!cleaned) {
    return { valid: false, error: "Card number is required" };
  }
  
  if (cleaned.length !== 16) {
    return { valid: false, error: "Card number must be 16 digits" };
  }
  
  if (!/^\d+$/.test(cleaned)) {
    return { valid: false, error: "Card number must contain only digits" };
  }
  
  return { valid: true };
};

export const validateExpiryDate = (expiryDate: string): { valid: boolean; error?: string } => {
  if (!expiryDate) {
    return { valid: false, error: "Expiry date is required" };
  }
  
  const parts = expiryDate.split('/');
  if (parts.length !== 2) {
    return { valid: false, error: "Invalid expiry date format (MM/YY)" };
  }
  
  const month = parseInt(parts[0], 10);
  const year = parseInt(parts[1], 10);
  
  if (isNaN(month) || isNaN(year)) {
    return { valid: false, error: "Invalid expiry date" };
  }
  
  if (month < 1 || month > 12) {
    return { valid: false, error: "Invalid month" };
  }
  
  // Check if card is expired
  const now = new Date();
  const currentYear = now.getFullYear() % 100; // Last 2 digits
  const currentMonth = now.getMonth() + 1;
  
  if (year < currentYear || (year === currentYear && month < currentMonth)) {
    return { valid: false, error: "Card has expired" };
  }
  
  return { valid: true };
};

export const validateCVV = (cvv: string): { valid: boolean; error?: string } => {
  if (!cvv) {
    return { valid: false, error: "CVV is required" };
  }
  
  if (cvv.length !== 3) {
    return { valid: false, error: "CVV must be 3 digits" };
  }
  
  if (!/^\d+$/.test(cvv)) {
    return { valid: false, error: "CVV must contain only digits" };
  }
  
  return { valid: true };
};

export const validateRequired = (value: string, fieldName: string): { valid: boolean; error?: string } => {
  if (!value.trim()) {
    return { valid: false, error: `${fieldName} is required` };
  }
  
  return { valid: true };
};
