import { prisma } from "../lib/prisma";
import { encryptField, decryptField, decryptString, isEncryptedEnvelope } from "../lib/encryption";
import { ObjectStorage } from "../lib/object-storage";
import { env } from "../config/env";
import crypto from "crypto";

describe("CS-26: PHI at Rest and Storage Security", () => {
  describe("OS-1: Object Storage Boot Refusal in Staging/Production", () => {
    const originalEnv = process.env.NODE_ENV;

    afterEach(() => {
      process.env.NODE_ENV = originalEnv;
    });

    it("refuses to boot with local provider in staging", () => {
      process.env.NODE_ENV = "staging";

      expect(() => {
        new ObjectStorage({ provider: "local" });
      }).toThrow(/Staging and Production must not use local object storage/);
    });

    it("refuses to boot with local provider in production", () => {
      process.env.NODE_ENV = "production";

      expect(() => {
        new ObjectStorage({ provider: "local" });
      }).toThrow(/Staging and Production must not use local object storage/);
    });

    it("allows local provider in development and test", () => {
      process.env.NODE_ENV = "test";

      expect(() => {
        new ObjectStorage({ provider: "local", uploadPath: "./tmp/test-uploads" });
      }).not.toThrow();
    });
  });

  describe("OS-2: Server-Side Encryption on S3 Uploads", () => {
    it("configures AES256 server side encryption for S3 uploads", async () => {
      const storage = new ObjectStorage({
        provider: "s3",
        endpoint: "https://s3.eu-west-2.amazonaws.com",
        bucket: "test-phi-bucket",
        accessKeyId: "mock-key",
        secretAccessKey: "mock-secret",
      });

      const s3Client = (storage as any).s3Client;
      expect(s3Client).toBeDefined();

      let capturedCommand: any = null;
      s3Client.send = jest.fn().mockImplementation(async (command) => {
        capturedCommand = command;
        return {};
      });

      const testBuffer = Buffer.from("Radiograph image data");
      await storage.upload("patients/123/xray.png", testBuffer, "image/png");

      expect(capturedCommand).toBeDefined();
      expect(capturedCommand.input.ServerSideEncryption).toBe("AES256");
      expect(capturedCommand.input.Bucket).toBe("test-phi-bucket");
      expect(capturedCommand.input.Key).toBe("patients/123/xray.png");
    });
  });

  describe("DB-3 & REQ-SEC-002: Field-Level PHI Encryption at Rest", () => {
    const testEmail = `phi-test-${Date.now()}@example.test`;
    let userId: string;
    let profileId: string;

    beforeAll(async () => {
      const user = await prisma.user.create({
        data: {
          email: testEmail,
          passwordHash: "mock-hash",
          role: "patient",
        },
      });
      userId = user.id;

      const profile = await prisma.patientProfile.create({
        data: {
          userId,
          firstName: "Phi",
          lastName: "Test",
          dob: new Date("1990-01-01"),
          gender: "other",
          postcode: "SW1A 1AA",
        },
      });
      profileId = profile.id;
    });

    afterAll(async () => {
      await prisma.patientProfile.deleteMany({ where: { id: profileId } });
      await prisma.user.deleteMany({ where: { id: userId } });
      await prisma.$disconnect();
    });

    it("stores encrypted envelope in raw database column and decrypts round-trip", async () => {
      const sensitiveMedicalHistory = {
        conditions: ["Hypertension", "Dental Anxiety"],
        allergies: ["Penicillin", "Latex"],
        notes: "Sensitive patient clinical notes",
      };

      const encrypted = await encryptField(sensitiveMedicalHistory);
      expect(isEncryptedEnvelope(encrypted)).toBe(true);

      await prisma.patientProfile.update({
        where: { id: profileId },
        data: { medicalHistory: encrypted as any },
      });

      // Query raw database column to verify ciphertext at rest in Postgres
      const rawRows = await prisma.$queryRaw<Array<{ medical_history: any }>>`
        SELECT medical_history FROM "patient_profiles" WHERE id = ${profileId}::uuid
      `;
      expect(rawRows.length).toBe(1);
      const rawCol = rawRows[0].medical_history;

      // Assert raw column is NOT plaintext
      expect(JSON.stringify(rawCol)).not.toContain("Penicillin");
      expect(JSON.stringify(rawCol)).not.toContain("Dental Anxiety");

      // Assert raw column contains encrypted envelope properties
      expect(rawCol).toHaveProperty("ciphertext");
      expect(rawCol).toHaveProperty("iv");
      expect(rawCol).toHaveProperty("keyId");
      expect(rawCol).toHaveProperty("algorithm");

      // Decrypt round-trip
      const decrypted = await decryptField<typeof sensitiveMedicalHistory>(rawCol);
      expect(decrypted).toEqual(sensitiveMedicalHistory);
    });

    it("transparently decrypts plain string or stringified encrypted envelopes", async () => {
      const plainMessage = "Hello, your appointment is confirmed.";
      expect(await decryptString(plainMessage)).toBe(plainMessage);

      const secretNote = "Private operator dispatch instruction";
      const encrypted = await encryptField(secretNote);
      const envelopeJson = JSON.stringify(encrypted);

      const decrypted = await decryptString(envelopeJson);
      expect(decrypted).toBe(secretNote);
    });
  });
});
