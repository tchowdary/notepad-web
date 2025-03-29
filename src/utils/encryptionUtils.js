import CryptoJS from 'crypto-js';

/**
 * Prepares an encrypted payload according to the reference implementation
 * @param {Object} payload - The original payload to encrypt
 * @param {string} key - Encryption key
 * @returns {Object} - Object with encrypted payload
 */
export const prepareEncryptedPayload = (payload, key) => {
  if (!key) {
    throw new Error('Encryption key is required');
  }
  
  // Convert payload to string
  const payloadString = JSON.stringify(payload);
  
  // Encrypt the payload
  const encrypted = CryptoJS.AES.encrypt(payloadString, key).toString();
  
  // Return the encrypted payload in the expected format
  return { encrypted };
};

/**
 * Decrypts an encrypted payload
 * @param {Object} encryptedPayload - Object containing the encrypted data
 * @param {string} key - Encryption key
 * @returns {Object} - Decrypted payload
 */
export const decryptPayload = (encryptedPayload, key) => {
  if (!key) {
    throw new Error('Encryption key is required');
  }
  
  if (!encryptedPayload.encrypted) {
    // If the payload is not encrypted, return it as is
    return encryptedPayload;
  }
  
  // Decrypt the data
  const bytes = CryptoJS.AES.decrypt(encryptedPayload.encrypted, key);
  const decryptedString = bytes.toString(CryptoJS.enc.Utf8);
  
  // Parse the decrypted string back to an object
  try {
    return JSON.parse(decryptedString);
  } catch (e) {
    console.error('Error parsing decrypted payload:', e);
    throw new Error('Failed to decrypt payload');
  }
};

/**
 * Checks if encryption is enabled
 * @returns {boolean} - True if encryption is enabled
 */
export const isEncryptionEnabled = () => {
  return Boolean(localStorage.getItem('proxy_encryption_key'));
};

/**
 * Gets the encryption key from local storage
 * @returns {string|null} - Encryption key or null if not set
 */
export const getEncryptionKey = () => {
  return localStorage.getItem('proxy_encryption_key');
};
