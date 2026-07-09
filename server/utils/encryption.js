import crypto from 'crypto';

export const deriveKey = (email) => {
    return crypto.pbkdf2Sync(email.toLowerCase(), email.toLowerCase(), 100000, 32, 'sha256');
};

export const encrypt = (buffer, email) => {
    const key = deriveKey(email);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    
    const encryptedData = Buffer.concat([cipher.update(buffer), cipher.final()]);
    
    return Buffer.concat([iv, encryptedData]);
};

export const decrypt = (buffer, email) => {
    const key = deriveKey(email);
    const iv = buffer.subarray(0, 16);
    const encryptedData = buffer.subarray(16);
    
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    
    const decryptedBuffer = Buffer.concat([decipher.update(encryptedData), decipher.final()]);
    return decryptedBuffer;
};
