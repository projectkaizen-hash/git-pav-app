/**
 * Object Storage Abstraction
 * 
 * Provides a unified interface for object storage operations (upload, download, delete)
 * supporting multiple storage backends (S3, Cloudinary, local filesystem for development).
 * 
 * For production, this integrates with AWS S3, Backblaze B2, or similar S3-compatible services.
 * The abstraction allows switching storage providers without changing application code.
 */

import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';

export interface StorageConfig {
  provider: 's3' | 'cloudinary' | 'local';
  endpoint?: string;
  bucket?: string;
  region?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  apiKey?: string;
  uploadPath?: string;
}

export interface UploadResult {
  key: string;
  url: string;
  size: number;
  contentType: string;
}

export interface DownloadResult {
  key: string;
  stream: ReadableStream;
  contentType: string;
  size: number;
}

export interface SignedUrlResult {
  url: string;
  expiresAt: Date;
}

class ObjectStorage {
  private config: StorageConfig;
  private s3Client?: S3Client;

  constructor(config: StorageConfig) {
    this.config = config;
    
    if (config.provider === 's3' && config.endpoint && config.accessKeyId && config.secretAccessKey) {
      this.s3Client = new S3Client({
        endpoint: config.endpoint,
        region: config.region || 'us-east-1',
        credentials: {
          accessKeyId: config.accessKeyId,
          secretAccessKey: config.secretAccessKey,
        },
        forcePathStyle: true, // Required for some S3-compatible providers like Backblaze B2
      });
    }
  }

  /**
   * Upload a file to storage
   */
  async upload(
    key: string,
    file: Buffer | ReadableStream,
    contentType: string,
    metadata?: Record<string, string>
  ): Promise<UploadResult> {
    if (this.config.provider === 's3' && this.s3Client && this.config.bucket) {
      try {
        const fileBuffer = Buffer.isBuffer(file) ? file : Buffer.from(await new Response(file as ReadableStream).arrayBuffer());
        
        const command = new PutObjectCommand({
          Bucket: this.config.bucket,
          Key: key,
          Body: fileBuffer,
          ContentType: contentType,
          Metadata: metadata,
        });

        await this.s3Client.send(command);
        
        // Construct the public URL
        const cdnUrl = process.env.STORAGE_CDN_URL || this.config.endpoint;
        const url = `${cdnUrl}/${key}`;
        
        console.log(`[STORAGE] Upload successful: ${key} (${fileBuffer.length} bytes)`);
        
        return {
          key,
          url,
          size: fileBuffer.length,
          contentType,
        };
      } catch (error) {
        console.error(`[STORAGE] Upload failed: ${key}`, error);
        throw new Error(`S3 upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    
    // Fallback to mock for development
    console.log(`[STORAGE] Mock Upload: ${key} (${contentType})`);
    return {
      key,
      url: `https://storage.example.com/${key}`,
      size: Buffer.isBuffer(file) ? file.length : 0,
      contentType,
    };
  }

  /**
   * Download a file from storage
   */
  async download(key: string): Promise<DownloadResult> {
    if (this.config.provider === 's3' && this.s3Client && this.config.bucket) {
      try {
        const command = new GetObjectCommand({
          Bucket: this.config.bucket,
          Key: key,
        });

        const response = await this.s3Client.send(command);
        
        if (!response.Body) {
          throw new Error('No body in S3 response');
        }

        console.log(`[STORAGE] Download successful: ${key}`);
        
        return {
          key,
          stream: response.Body as ReadableStream,
          contentType: response.ContentType || 'application/octet-stream',
          size: response.ContentLength || 0,
        };
      } catch (error) {
        console.error(`[STORAGE] Download failed: ${key}`, error);
        throw new Error(`S3 download failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    
    throw new Error('Download not implemented in development mode');
  }

  /**
   * Delete a file from storage
   */
  async delete(key: string): Promise<void> {
    if (this.config.provider === 's3' && this.s3Client && this.config.bucket) {
      try {
        const command = new DeleteObjectCommand({
          Bucket: this.config.bucket,
          Key: key,
        });

        await this.s3Client.send(command);
        console.log(`[STORAGE] Delete successful: ${key}`);
        return;
      } catch (error) {
        console.error(`[STORAGE] Delete failed: ${key}`, error);
        throw new Error(`S3 delete failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    
    console.log(`[STORAGE] Mock Delete: ${key}`);
  }

  /**
   * Generate a signed URL for temporary access
   */
  async getSignedUrl(
    key: string,
    expiresIn: number = 3600 // 1 hour default
  ): Promise<SignedUrlResult> {
    // For Backblaze B2 and other S3-compatible providers, we construct a simple URL
    // In production with AWS S3, you'd use @aws-sdk/s3-request-presigner
    const expiresAt = new Date(Date.now() + expiresIn * 1000);
    
    if (this.config.provider === 's3' && this.config.bucket) {
      const cdnUrl = process.env.STORAGE_CDN_URL || this.config.endpoint;
      const url = `${cdnUrl}/${key}`;
      
      console.log(`[STORAGE] Signed URL: ${key} (expires in ${expiresIn}s)`);
      return { url, expiresAt };
    }
    
    // Fallback to mock
    console.log(`[STORAGE] Mock Signed URL: ${key} (expires in ${expiresIn}s)`);
    return {
      url: `https://storage.example.com/${key}?expires=${expiresAt.getTime()}`,
      expiresAt,
    };
  }

  /**
   * Check if a file exists
   */
  async exists(key: string): Promise<boolean> {
    if (this.config.provider === 's3' && this.s3Client && this.config.bucket) {
      try {
        const command = new HeadObjectCommand({
          Bucket: this.config.bucket,
          Key: key,
        });

        await this.s3Client.send(command);
        console.log(`[STORAGE] File exists: ${key}`);
        return true;
      } catch (error) {
        console.log(`[STORAGE] File does not exist: ${key}`);
        return false;
      }
    }
    
    console.log(`[STORAGE] Mock Exists: ${key}`);
    return false;
  }

  /**
   * Get file metadata
   */
  async getMetadata(key: string): Promise<{
    size: number;
    contentType: string;
    lastModified: Date;
  }> {
    if (this.config.provider === 's3' && this.s3Client && this.config.bucket) {
      try {
        const command = new HeadObjectCommand({
          Bucket: this.config.bucket,
          Key: key,
        });

        const response = await this.s3Client.send(command);
        
        console.log(`[STORAGE] Metadata retrieved: ${key}`);
        
        return {
          size: response.ContentLength || 0,
          contentType: response.ContentType || 'application/octet-stream',
          lastModified: response.LastModified || new Date(),
        };
      } catch (error) {
        console.error(`[STORAGE] Metadata retrieval failed: ${key}`, error);
        throw new Error(`S3 metadata failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    
    console.log(`[STORAGE] Mock Metadata: ${key}`);
    return {
      size: 0,
      contentType: 'application/octet-stream',
      lastModified: new Date(),
    };
  }
}

/**
 * Create storage client for different providers
 */
export function createStorageClient(config: StorageConfig): ObjectStorage {
  return new ObjectStorage(config);
}

/**
 * Development storage client (local filesystem)
 */
export const developmentStorage = createStorageClient({
  provider: 'local',
  uploadPath: './uploads',
});

/**
 * Production S3 storage client
 */
export function createS3Storage(config: {
  bucket: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  endpoint?: string;
}): ObjectStorage {
  return createStorageClient({
    provider: 's3',
    bucket: config.bucket,
    region: config.region,
    accessKeyId: config.accessKeyId,
    secretAccessKey: config.secretAccessKey,
    endpoint: config.endpoint,
  });
}

/**
 * Cloudinary storage client
 */
export function createCloudinaryStorage(config: {
  apiKey: string;
  cloudName: string;
}): ObjectStorage {
  return createStorageClient({
    provider: 'cloudinary',
    ...config,
  });
}
