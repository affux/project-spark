/**
 * Utility functions for masking sensitive data in the UI
 */

/**
 * Masks a bank account number, showing only the last 4 digits
 */
export const maskBankAccount = (account: string): string => {
  if (!account) return '';
  if (account.length <= 4) return account;
  return '*'.repeat(account.length - 4) + account.slice(-4);
};

/**
 * Masks an Aadhaar number (12 digits), showing only last 4 digits
 */
export const maskAadhaar = (aadhaar: string): string => {
  if (!aadhaar) return '';
  if (aadhaar.length <= 4) return aadhaar;
  return 'XXXX-XXXX-' + aadhaar.slice(-4);
};

/**
 * Masks a PAN number (10 chars), showing only first 2 and last 2
 */
export const maskPAN = (pan: string): string => {
  if (!pan) return '';
  if (pan.length <= 4) return pan;
  return pan.slice(0, 2) + '****' + pan.slice(-2);
};

/**
 * Masks a UPI ID, showing only the first 2 characters and domain
 */
export const maskUpiId = (upiId: string): string => {
  if (!upiId) return '';
  const parts = upiId.split('@');
  if (parts.length !== 2) return upiId;
  const [username, domain] = parts;
  if (username.length <= 2) return upiId;
  return username.slice(0, 2) + '*'.repeat(username.length - 2) + '@' + domain;
};

/**
 * Masks an IFSC code, showing only first 4 characters
 */
export const maskIfscCode = (ifsc: string): string => {
  if (!ifsc) return '';
  if (ifsc.length <= 4) return ifsc;
  return ifsc.slice(0, 4) + '*'.repeat(ifsc.length - 4);
};

/**
 * Masks a phone number, showing only last 4 digits
 */
export const maskPhoneNumber = (phone: string): string => {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length <= 4) return phone;
  return '*'.repeat(digits.length - 4) + digits.slice(-4);
};

/**
 * Masks an email address, showing only first 2 characters and domain
 */
export const maskEmail = (email: string): string => {
  if (!email) return '';
  const parts = email.split('@');
  if (parts.length !== 2) return email;
  const [username, domain] = parts;
  if (username.length <= 2) return email;
  return username.slice(0, 2) + '*'.repeat(Math.min(username.length - 2, 6)) + '@' + domain;
};

/**
 * Generic masking function that detects the field type and applies appropriate masking
 */
export const maskSensitiveField = (key: string, value: string): string => {
  if (!value || typeof value !== 'string') return value;
  
  const keyLower = key.toLowerCase();
  
  // Account number patterns
  if (keyLower.includes('account') || keyLower.includes('acc_no') || keyLower.includes('accountnumber')) {
    return maskBankAccount(value);
  }
  
  // UPI patterns
  if (keyLower.includes('upi') || keyLower.includes('vpa')) {
    return maskUpiId(value);
  }
  
  // IFSC patterns
  if (keyLower.includes('ifsc')) {
    return maskIfscCode(value);
  }
  
  // Phone patterns
  if (keyLower.includes('phone') || keyLower.includes('mobile')) {
    return maskPhoneNumber(value);
  }
  
  // Don't mask other fields like beneficiary name, bank name, etc.
  return value;
};

/**
 * Masks all sensitive fields in a payment details object
 */
export const maskPaymentDetails = (details: Record<string, any>): Record<string, any> => {
  const masked: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(details)) {
    if (typeof value === 'string') {
      masked[key] = maskSensitiveField(key, value);
    } else {
      masked[key] = value;
    }
  }
  
  return masked;
};
