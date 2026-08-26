// Redis connection utilities
import { createClient, RedisClientType } from 'redis';
import { getEnvVar } from '../utils.js';

export class RedisConnection {
  private static instance: RedisConnection;
  private client: RedisClientType | null = null;
  private isConnected = false;

  private constructor() {}

  public static getInstance(): RedisConnection {
    if (!RedisConnection.instance) {
      RedisConnection.instance = new RedisConnection();
    }
    return RedisConnection.instance;
  }

  public async connect(): Promise<RedisClientType> {
    if (this.client && this.isConnected) {
      return this.client;
    }

    const redisUrl = getEnvVar('REDIS_URL', 'redis://localhost:6379');
    
    this.client = createClient({
      url: redisUrl,
      socket: {
        reconnectStrategy: (retries: number) => {
          // Exponential backoff with maximum 30 seconds
          const delay = Math.min(1000 * Math.pow(2, retries), 30000);
          console.log(`Redis reconnection attempt ${retries + 1} in ${delay}ms`);
          return delay;
        },
      },
    });

    // Error handling
    this.client.on('error', (error: Error) => {
      console.error('Redis Client Error:', error);
      this.isConnected = false;
    });

    this.client.on('connect', () => {
      console.log('Redis Client Connected');
      this.isConnected = true;
    });

    this.client.on('disconnect', () => {
      console.log('Redis Client Disconnected');
      this.isConnected = false;
    });

    this.client.on('reconnecting', () => {
      console.log('Redis Client Reconnecting');
    });

    await this.client.connect();
    return this.client;
  }

  public async disconnect(): Promise<void> {
    if (this.client && this.isConnected) {
      await this.client.disconnect();
      this.isConnected = false;
    }
  }

  public getClient(): RedisClientType | null {
    return this.client;
  }

  public isClientConnected(): boolean {
    return this.isConnected && this.client !== null;
  }

  public async ping(): Promise<string> {
    if (!this.client || !this.isConnected) {
      throw new Error('Redis client not connected');
    }
    return await this.client.ping();
  }

  // Health check method
  public async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; latency?: number }> {
    try {
      const start = Date.now();
      await this.ping();
      const latency = Date.now() - start;
      return { status: 'healthy', latency };
    } catch (error) {
      console.error('Redis health check failed:', error);
      return { status: 'unhealthy' };
    }
  }
}

// Singleton instance for easy access
export const redisConnection = RedisConnection.getInstance();

// Utility function for getting connected client
export async function getRedisClient(): Promise<RedisClientType> {
  return await redisConnection.connect();
}