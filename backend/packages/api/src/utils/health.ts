// Health check utilities for the API
import { getRedisClient } from '@bones-report/shared';
import { healthCheckAllRepositories } from '@bones-report/shared';

/**
 * Check Redis health
 */
export async function checkRedisHealth(): Promise<boolean> {
  try {
    const redis = await getRedisClient();
    const result = await redis.ping();
    return result === 'PONG';
  } catch (error) {
    console.error('Redis health check failed:', error);
    return false;
  }
}

/**
 * Check all repository health
 */
export async function checkAllRepositoriesHealth(): Promise<boolean> {
  try {
    const result = await healthCheckAllRepositories();
    return result.status === 'healthy';
  } catch (error) {
    console.error('Repository health check failed:', error);
    return false;
  }
}