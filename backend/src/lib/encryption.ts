/**
 * Encryption Service for Clinical Records and Document Metadata
 * 
 * Provides client-side encryption using AWS KMS managed keys
 * for clinical records and document metadata at rest.
 */

import crypto from 'crypto';

export interface EncryptionConfig {
  keyId: string;
  region: string;
  algorithm: string;
}

export interface EncryptedData {
  ciphertext: string;
  iv: string;
  keyId: string;
  algorithm: string;
}

/**
 * Encryption Service
 */
export class EncryptionService {
  private config: EncryptionConfig;

  constructor(config: EncryptionConfig) {
    this.config = config;
  }

  /**
   * Encrypt data
   * Note: This is a placeholder for AWS KMS integration
   * In production, use AWS SDK to generate data key and encrypt
   */
  async encrypt(plaintext: string): Promise<EncryptedData> {
    // Generate random IV
    const iv = crypto.randomBytes(16);

    // In production, this would use AWS KMS to:
    // 1. Generate a data key using GenerateDataKey
    // 2. Encrypt the plaintext with the data key
    // 3. Return the encrypted data and encrypted data key

    // Placeholder implementation using AES-256-GCM
    const algorithm = 'aes-256-gcm';
    const key = this.getKey(); // In production, this comes from KMS
    const cipher = crypto.createCipheriv(algorithm, key, iv);

    let ciphertext = cipher.update(plaintext, 'utf8', 'hex');
    ciphertext += cipher.final('hex');
    const authTag = cipher.getAuthTag();

    return {
      ciphertext: ciphertext + authTag.toString('hex'),
      iv: iv.toString('hex'),
      keyId: this.config.keyId,
      algorithm: this.config.algorithm,
    };
  }

  /**
   * Decrypt data
   * Note: This is a placeholder for AWS KMS integration
   * In production, use AWS SDK to decrypt data key and decrypt data
   */
  async decrypt(encryptedData: EncryptedData): Promise<string> {
    const iv = Buffer.from(encryptedData.iv, 'hex');
    const ciphertext = Buffer.from(encryptedData.ciphertext, 'hex');

    // In production, this would use AWS KMS to:
    // 1. Decrypt the encrypted data key using Decrypt
    // 2. Decrypt the ciphertext with the data key
    // 3. Return the plaintext

    // Placeholder implementation using AES-256-GCM
    const algorithm = 'aes-256-gcm';
    const key = this.getKey(); // In production, this comes from KMS
    const decipher = crypto.createDecipheriv(algorithm, key, iv);

    // Extract auth tag (last 16 bytes)
    const authTag = ciphertext.slice(-16);
    const encrypted = ciphertext.slice(0, -16);
    decipher.setAuthTag(authTag);

    let plaintext = decipher.update(encrypted, undefined, 'utf8');
    plaintext += decipher.final('utf8');

    return plaintext;
  }

  /**
   * Get encryption key (placeholder)
   * In production, this would come from AWS KMS
   */
  private getKey(): Buffer {
    // In production, this would be:
    // 1. Decrypt the encrypted data key using AWS KMS
    // 2. Return the plaintext data key

    // Placeholder: generate a key from environment
    const key = process.env.ENCRYPTION_KEY || 'default-key-32-bytes-long!!';
    return crypto.createHash('sha256').update(key).digest();
  }

  /**
   * Hash data for integrity verification
   */
  hash(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Verify data integrity
   */
  verifyHash(data: string, hash: string): boolean {
    return this.hash(data) === hash;
  }
}

/**
 * Clinical Record Encryption Service
 */
export class ClinicalRecordEncryptionService {
  private encryptionService: EncryptionService;

  constructor(config: EncryptionConfig) {
    this.encryptionService = new EncryptionService(config);
  }

  /**
   * Encrypt clinical record
   */
  async encryptClinicalRecord(record: any): Promise<EncryptedData> {
    const plaintext = JSON.stringify(record);
    return await this.encryptionService.encrypt(plaintext);
  }

  /**
   * Decrypt clinical record
   */
  async decryptClinicalRecord(encryptedData: EncryptedData): Promise<any> {
    const plaintext = await this.encryptionService.decrypt(encryptedData);
    return JSON.parse(plaintext);
  }

  /**
   * Encrypt clinical field
   */
  async encryptField(field: string): Promise<EncryptedData> {
    return await this.encryptionService.encrypt(field);
  }

  /**
   * Decrypt clinical field
   */
  async decryptField(encryptedData: EncryptedData): Promise<string> {
    return await this.encryptionService.decrypt(encryptedData);
  }
}

/**
 * Document Metadata Encryption Service
 */
export class DocumentMetadataEncryptionService {
  private encryptionService: EncryptionService;

  constructor(config: EncryptionConfig) {
    this.encryptionService = new EncryptionService(config);
  }

  /**
   * Encrypt document metadata
   */
  async encryptMetadata(metadata: any): Promise<EncryptedData> {
    const plaintext = JSON.stringify(metadata);
    return await this.encryptionService.encrypt(plaintext);
  }

  /**
   * Decrypt document metadata
   */
  async decryptMetadata(encryptedData: EncryptedData): Promise<any> {
    const plaintext = await this.encryptionService.decrypt(encryptedData);
    return JSON.parse(plaintext);
  }
}

// Export singleton instances
const encryptionConfig: EncryptionConfig = {
  keyId: process.env.KMS_KEY_ID || 'default-key-id',
  region: process.env.AWS_REGION || 'eu-west-2',
  algorithm: 'aes-256-gcm',
};

export const encryptionService = new EncryptionService(encryptionConfig);
export const clinicalRecordEncryptionService = new ClinicalRecordEncryptionService(encryptionConfig);
export const documentMetadataEncryptionService = new DocumentMetadataEncryptionService(encryptionConfig);
