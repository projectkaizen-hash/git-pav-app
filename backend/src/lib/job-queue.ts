/**
 * Background Job Queue Abstraction
 * 
 * Provides a unified interface for background job processing
 * supporting multiple queue backends (Redis, Bull, AWS SQS, etc.).
 * 
 * For production, this would integrate with Redis/Bull or AWS SQS.
 * The abstraction allows switching queue providers without changing application code.
 */

export interface JobConfig {
  provider: 'redis' | 'memory' | 'sqs';
  redisUrl?: string;
  queueName?: string;
  defaultJobOptions?: {
    attempts?: number;
    backoff?: {
      type: 'exponential' | 'fixed';
      delay: number;
    };
    removeOnComplete?: number;
    removeOnFail?: number;
  };
}

export interface JobData {
  id: string;
  type: string;
  payload: any;
  createdAt: Date;
  attempts: number;
  maxAttempts: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error?: string;
  processedAt?: Date;
  completedAt?: Date;
}

export interface JobResult {
  success: boolean;
  result?: any;
  error?: string;
}

export interface JobHandler {
  (payload: any): Promise<JobResult>;
}

class JobQueue {
  private config: JobConfig;
  private handlers: Map<string, JobHandler> = new Map();
  private jobs: Map<string, JobData> = new Map();

  constructor(config: JobConfig) {
    this.config = config;
  }

  /**
   * Register a job handler for a specific job type
   */
  registerHandler(jobType: string, handler: JobHandler): void {
    this.handlers.set(jobType, handler);
  }

  /**
   * Add a job to the queue
   */
  async add(jobType: string, payload: any, options?: {
    delay?: number;
    attempts?: number;
  }): Promise<string> {
    const jobId = crypto.randomUUID();
    
    const job: JobData = {
      id: jobId,
      type: jobType,
      payload,
      createdAt: new Date(),
      attempts: 0,
      maxAttempts: options?.attempts || this.config.defaultJobOptions?.attempts || 3,
      status: 'pending',
    };

    this.jobs.set(jobId, job);
    
    console.log(`[JOB QUEUE] Added job: ${jobType} (${jobId})`);
    
    // In production, this would add to Redis/Bull/SQS
    // For now, process immediately in memory
    if (this.config.provider === 'memory') {
      setImmediate(() => this.processJob(jobId));
    }

    return jobId;
  }

  /**
   * Process a job
   */
  private async processJob(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) {
      console.error(`[JOB QUEUE] Job not found: ${jobId}`);
      return;
    }

    if (job.status !== 'pending') {
      return;
    }

    job.status = 'processing';
    job.processedAt = new Date();
    job.attempts++;

    const handler = this.handlers.get(job.type);
    if (!handler) {
      job.status = 'failed';
      job.error = `No handler registered for job type: ${job.type}`;
      job.completedAt = new Date();
      console.error(`[JOB QUEUE] ${job.error}`);
      return;
    }

    try {
      console.log(`[JOB QUEUE] Processing job: ${job.type} (${jobId}) - attempt ${job.attempts}`);
      
      const result = await handler(job.payload);
      
      job.status = 'completed';
      job.completedAt = new Date();
      
      console.log(`[JOB QUEUE] Job completed: ${job.type} (${jobId})`);
      
    } catch (error) {
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : 'Unknown error';
      job.completedAt = new Date();
      
      console.error(`[JOB QUEUE] Job failed: ${job.type} (${jobId}) - ${job.error}`);
      
      // Retry logic
      if (job.attempts < job.maxAttempts) {
        const delay = this.config.defaultJobOptions?.backoff?.delay || 1000;
        setTimeout(() => {
          job.status = 'pending';
          this.processJob(jobId);
        }, delay * Math.pow(2, job.attempts));
      }
    }
  }

  /**
   * Get job status
   */
  async getJob(jobId: string): Promise<JobData | null> {
    return this.jobs.get(jobId) || null;
  }

  /**
   * Remove completed jobs
   */
  async removeCompletedJobs(olderThan?: Date): Promise<number> {
    let removed = 0;
    const cutoff = olderThan || new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours default
    
    for (const [jobId, job] of this.jobs.entries()) {
      if (job.status === 'completed' && job.completedAt && job.completedAt < cutoff) {
        this.jobs.delete(jobId);
        removed++;
      }
    }
    
    console.log(`[JOB QUEUE] Removed ${removed} completed jobs`);
    return removed;
  }

  /**
   * Get queue statistics
   */
  async getStats(): Promise<{
    pending: number;
    processing: number;
    completed: number;
    failed: number;
  }> {
    let pending = 0;
    let processing = 0;
    let completed = 0;
    let failed = 0;

    for (const job of this.jobs.values()) {
      switch (job.status) {
        case 'pending':
          pending++;
          break;
        case 'processing':
          processing++;
          break;
        case 'completed':
          completed++;
          break;
        case 'failed':
          failed++;
          break;
      }
    }

    return { pending, processing, completed, failed };
  }

  /**
   * Start the queue processor
   */
  async start(): Promise<void> {
    console.log(`[JOB QUEUE] Started processor (${this.config.provider})`);
    
    // In production, this would start the Bull/SQS worker
    // For memory provider, jobs are processed immediately when added
  }

  /**
   * Stop the queue processor
   */
  async stop(): Promise<void> {
    console.log(`[JOB QUEUE] Stopped processor`);
    
    // In production, this would close the Bull/SQS worker
  }
}

/**
 * Create job queue for different providers
 */
export function createJobQueue(config: JobConfig): JobQueue {
  return new JobQueue(config);
}

/**
 * Development job queue (in-memory)
 */
export const developmentJobQueue = createJobQueue({
  provider: 'memory',
  queueName: 'development',
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
    removeOnComplete: 100,
    removeOnFail: 50,
  },
});

/**
 * Redis-backed job queue (production)
 */
export function createRedisJobQueue(config: {
  redisUrl: string;
  queueName: string;
}): JobQueue {
  return createJobQueue({
    provider: 'redis',
    ...config,
  });
}

/**
 * AWS SQS job queue (production)
 */
export function createSqsJobQueue(config: {
  queueUrl: string;
  region: string;
}): JobQueue {
  return createJobQueue({
    provider: 'sqs',
    ...config,
  });
}
