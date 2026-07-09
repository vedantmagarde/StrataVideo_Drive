import crypto from 'crypto';

/**
 * Derives a consistent 32-byte (256-bit) encryption key from the user's email address.
 * Uses PBKDF2 with SHA-256, 100000 iterations.
 */
export const deriveKeyFromEmail = (email) => {
    // We use the email as both password and salt for simplicity and consistency
    // since the goal is a consistent, deterministic key based ONLY on the email.
    return crypto.pbkdf2Sync(email.toLowerCase(), email.toLowerCase(), 100000, 32, 'sha256');
};

/**
 * Encrypts a buffer using AES-256-CBC.
 */
export const encryptBuffer = (buffer, email) => {
    const key = deriveKeyFromEmail(email);
    // Generate a random 16-byte initialization vector
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    
    const encryptedBuffer = Buffer.concat([cipher.update(buffer), cipher.final()]);
    // Prepend the IV to the encrypted data so it can be extracted during decryption
    return Buffer.concat([iv, encryptedBuffer]);
};

/**
 * Decrypts a buffer using AES-256-CBC.
 */
export const decryptBuffer = (buffer, email) => {
    const key = deriveKeyFromEmail(email);
    // Extract the IV (first 16 bytes)
    const iv = buffer.subarray(0, 16);
    const encryptedData = buffer.subarray(16);
    
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    
    const decryptedBuffer = Buffer.concat([decipher.update(encryptedData), decipher.final()]);
    return decryptedBuffer;
};
