/**
 * Envelope Encryption Service for Clinical Records and Document Metadata
 *
 * Implements AES-256-GCM envelope encryption using per-record random 256-bit
 * Data Encryption Keys (DEKs) wrapped by a Key Encryption Key (KEK) derived
 * via HKDF-SHA256 from the configured master key / KMS key context.
 */

import crypto from "crypto";
import { env } from "../config/env";

export interface EncryptionConfig {
  keyId: string;
  region: string;
  algorithm: string;
}

export interface EncryptedData {
  ciphertext: string;
  iv: string;
  encryptedDek?: string;
  dekIv?: string;
  keyId: string;
  algorithm: string;
}

export class EncryptionService {
  private config: EncryptionConfig;

  constructor(config: EncryptionConfig) {
    this.config = config;
    // Validate master key on service instantiation
    this.deriveKek();
  }

  /**
   * Encrypt plaintext using a unique random 256-bit DEK wrapped by the KEK.
   */
  async encrypt(plaintext: string): Promise<EncryptedData> {
    const kek = this.deriveKek();

    // 1. Generate unique 32-byte Data Encryption Key (DEK) for this record
    const dek = crypto.randomBytes(32);
    const dekIv = crypto.randomBytes(12);

    // 2. Wrap DEK with KEK using AES-256-GCM and keyId as AAD
    const dekCipher = crypto.createCipheriv("aes-256-gcm", kek, dekIv);
    dekCipher.setAAD(Buffer.from(this.config.keyId, "utf8"));
    const wrappedDek = Buffer.concat([dekCipher.update(dek), dekCipher.final()]);
    const dekAuthTag = dekCipher.getAuthTag();
    const encryptedDek = Buffer.concat([wrappedDek, dekAuthTag]).toString("hex");

    // 3. Encrypt payload with DEK using AES-256-GCM
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv("aes-256-gcm", dek, iv);
    let ciphertext = cipher.update(plaintext, "utf8", "hex");
    ciphertext += cipher.final("hex");
    const authTag = cipher.getAuthTag();

    // Zero out raw DEK buffer after use
    dek.fill(0);

    return {
      ciphertext: ciphertext + authTag.toString("hex"),
      iv: iv.toString("hex"),
      encryptedDek,
      dekIv: dekIv.toString("hex"),
      keyId: this.config.keyId,
      algorithm: this.config.algorithm,
    };
  }

  /**
   * Decrypt data using unwrapped DEK (or legacy direct key for backward compatibility).
   */
  async decrypt(encryptedData: EncryptedData): Promise<string> {
    const kek = this.deriveKek();
    let dek: Buffer;

    if (encryptedData.encryptedDek && encryptedData.dekIv) {
      const dekIv = Buffer.from(encryptedData.dekIv, "hex");
      const rawWrapped = Buffer.from(encryptedData.encryptedDek, "hex");
      const dekAuthTag = rawWrapped.slice(-16);
      const wrappedDek = rawWrapped.slice(0, -16);

      const dekDecipher = crypto.createDecipheriv("aes-256-gcm", kek, dekIv);
      dekDecipher.setAAD(Buffer.from(encryptedData.keyId || this.config.keyId, "utf8"));
      dekDecipher.setAuthTag(dekAuthTag);
      dek = Buffer.concat([dekDecipher.update(wrappedDek), dekDecipher.final()]);
    } else {
      dek = kek;
    }

    try {
      const iv = Buffer.from(encryptedData.iv, "hex");
      const ciphertext = Buffer.from(encryptedData.ciphertext, "hex");
      const authTag = ciphertext.slice(-16);
      const encrypted = ciphertext.slice(0, -16);

      const decipher = crypto.createDecipheriv("aes-256-gcm", dek, iv);
      decipher.setAuthTag(authTag);

      let plaintext = decipher.update(encrypted, undefined, "utf8");
      plaintext += decipher.final("utf8");
      return plaintext;
    } finally {
      if (encryptedData.encryptedDek) {
        dek.fill(0);
      }
    }
  }

  /**
   * Derive a 256-bit Key Encryption Key (KEK) using HKDF-SHA256.
   * Refuses weak or static fallback keys.
   */
  private deriveKek(): Buffer {
    const rawKey = process.env.ENCRYPTION_KEY || env.encryptionKey;
    if (!rawKey || rawKey.length < 32 || rawKey.includes("default-key")) {
      throw new Error(
        "CRITICAL: ENCRYPTION_KEY must be configured with at least 32 characters. Static fallback keys are forbidden."
      );
    }

    return Buffer.from(
      crypto.hkdfSync(
        "sha256",
        Buffer.from(rawKey, "utf8"),
        Buffer.from(this.config.region, "utf8"),
        Buffer.from(`pavdental-kek:${this.config.keyId}`, "utf8"),
        32
      )
    );
  }

  /**
   * Hash data for integrity verification
   */
  hash(data: string): string {
    return crypto.createHash("sha256").update(data).digest("hex");
  }

  /**
   * Verify data integrity using timing-safe comparison
   */
  verifyHash(data: string, expectedHash: string): boolean {
    const computed = Buffer.from(this.hash(data), "utf8");
    const target = Buffer.from(expectedHash, "utf8");
    if (computed.length !== target.length) return false;
    return crypto.timingSafeEqual(computed, target);
  }
}

export class ClinicalRecordEncryptionService {
  private encryptionService: EncryptionService;

  constructor(config: EncryptionConfig) {
    this.encryptionService = new EncryptionService(config);
  }

  async encryptClinicalRecord(record: unknown): Promise<EncryptedData> {
    const plaintext = JSON.stringify(record);
    return await this.encryptionService.encrypt(plaintext);
  }

  async decryptClinicalRecord(encryptedData: EncryptedData): Promise<unknown> {
    const plaintext = await this.encryptionService.decrypt(encryptedData);
    return JSON.parse(plaintext);
  }

  async encryptField(field: string): Promise<EncryptedData> {
    return await this.encryptionService.encrypt(field);
  }

  async decryptField(encryptedData: EncryptedData): Promise<string> {
    return await this.encryptionService.decrypt(encryptedData);
  }
}

export class DocumentMetadataEncryptionService {
  private encryptionService: EncryptionService;

  constructor(config: EncryptionConfig) {
    this.encryptionService = new EncryptionService(config);
  }

  async encryptMetadata(metadata: unknown): Promise<EncryptedData> {
    const plaintext = JSON.stringify(metadata);
    return await this.encryptionService.encrypt(plaintext);
  }

  async decryptMetadata(encryptedData: EncryptedData): Promise<unknown> {
    const plaintext = await this.encryptionService.decrypt(encryptedData);
    return JSON.parse(plaintext);
  }
}

const encryptionConfig: EncryptionConfig = {
  keyId: env.kmsKeyId,
  region: process.env.AWS_REGION || "eu-west-2",
  algorithm: "aes-256-gcm",
};

export const encryptionService = new EncryptionService(encryptionConfig);
export const clinicalRecordEncryptionService = new ClinicalRecordEncryptionService(encryptionConfig);
export const documentMetadataEncryptionService = new DocumentMetadataEncryptionService(encryptionConfig);
