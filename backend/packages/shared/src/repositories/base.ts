// Base repository class with common CRUD operations
import { RedisClientType } from 'redis';
import { z } from 'zod';
import { getRedisClient } from '../redis/index.js';
import { EventPublisher, getEventPublisher } from '../events/publisher.js';
import { EventTopic } from '../events.js';
import { generateId, createTimestamp, ValidationError, NotFoundError } from '../utils.js';

export interface Repository<T extends EntityWithId, TInput, TUpdate = Partial<TInput>> {
  create(input: TInput): Promise<T>;
  findById(id: string): Promise<T | null>;
  findAll(): Promise<T[]>;
  update(id: string, input: TUpdate): Promise<T>;
  delete(id: string): Promise<boolean>;
  count(): Promise<number>;
}

export abstract class BaseRepository<T extends EntityWithId, TInput, TUpdate = Partial<TInput>> 
  implements Repository<T, TInput, TUpdate> {
  
  protected client: RedisClientType | null = null;
  protected eventPublisher: EventPublisher;
  protected keyPrefix: string;
  protected entityName: string;

  constructor(
    keyPrefix: string,
    entityName: string,
    eventPublisher?: EventPublisher
  ) {
    this.keyPrefix = keyPrefix;
    this.entityName = entityName;
    this.eventPublisher = eventPublisher || getEventPublisher();
  }

  protected async getClient(): Promise<RedisClientType> {
    if (!this.client) {
      this.client = await getRedisClient();
    }
    return this.client;
  }

  protected getKey(id: string): string {
    return `${this.keyPrefix}:${id}`;
  }

  protected getIndexKey(): string {
    return `${this.keyPrefix}:index`;
  }

  protected abstract getCreateSchema(): z.ZodSchema<TInput>;
  protected abstract getUpdateSchema(): z.ZodSchema<TUpdate>;
  protected abstract getEntitySchema(): z.ZodSchema<T>;
  protected abstract createEntity(input: TInput): T;
  protected abstract updateEntity(existing: T, input: TUpdate): T;
  protected abstract getCreateEventTopic(): EventTopic;
  protected abstract getUpdateEventTopic(): EventTopic;

  protected validateInput(input: unknown, schema: z.ZodSchema): any {
    try {
      return schema.parse(input);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const message = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
        throw new ValidationError(`Validation failed: ${message}`);
      }
      throw error;
    }
  }

  public async create(input: TInput): Promise<T> {
    const validatedInput = this.validateInput(input, this.getCreateSchema());
    const entity = this.createEntity(validatedInput);
    
    const client = await this.getClient();
    const key = this.getKey(entity.id);
    const indexKey = this.getIndexKey();

    // Store the entity
    await client.set(key, JSON.stringify(entity));
    
    // Add to index
    await client.sAdd(indexKey, entity.id);

    // Publish create event
    try {
      await this.eventPublisher.publish(this.getCreateEventTopic(), entity);
    } catch (error) {
      console.error(`Failed to publish create event for ${this.entityName}:`, error);
      // Don't fail the operation if event publishing fails
    }

    return entity;
  }

  public async findById(id: string): Promise<T | null> {
    const client = await this.getClient();
    const key = this.getKey(id);
    
    const data = await client.get(key);
    if (!data) {
      return null;
    }

    try {
      const parsed = JSON.parse(data);
      return this.validateInput(parsed, this.getEntitySchema());
    } catch (error) {
      console.error(`Failed to parse ${this.entityName} with id ${id}:`, error);
      return null;
    }
  }

  public async findAll(): Promise<T[]> {
    const client = await this.getClient();
    const indexKey = this.getIndexKey();
    
    const ids = await client.sMembers(indexKey);
    const entities: T[] = [];

    for (const id of ids) {
      const entity = await this.findById(id);
      if (entity) {
        entities.push(entity);
      }
    }

    return entities;
  }

  public async update(id: string, input: TUpdate): Promise<T> {
    const validatedInput = this.validateInput(input, this.getUpdateSchema());
    
    const existing = await this.findById(id);
    if (!existing) {
      throw new NotFoundError(this.entityName, id);
    }

    const updated = this.updateEntity(existing, validatedInput);
    
    const client = await this.getClient();
    const key = this.getKey(id);

    // Store the updated entity
    await client.set(key, JSON.stringify(updated));

    // Publish update event
    try {
      await this.eventPublisher.publish(this.getUpdateEventTopic(), {
        id,
        ...validatedInput,
        updated_at: createTimestamp(),
      });
    } catch (error) {
      console.error(`Failed to publish update event for ${this.entityName}:`, error);
      // Don't fail the operation if event publishing fails
    }

    return updated;
  }

  public async delete(id: string): Promise<boolean> {
    const client = await this.getClient();
    const key = this.getKey(id);
    const indexKey = this.getIndexKey();

    // Check if entity exists
    const exists = await this.findById(id);
    if (!exists) {
      return false;
    }

    // Remove from store and index
    await Promise.all([
      client.del(key),
      client.sRem(indexKey, id),
    ]);

    return true;
  }

  public async count(): Promise<number> {
    const client = await this.getClient();
    const indexKey = this.getIndexKey();
    
    return await client.sCard(indexKey);
  }

  public async exists(id: string): Promise<boolean> {
    const client = await this.getClient();
    const key = this.getKey(id);
    
    const exists = await client.exists(key);
    return exists === 1;
  }

  // Health check method
  public async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; count?: number }> {
    try {
      const count = await this.count();
      return { status: 'healthy', count };
    } catch (error) {
      console.error(`${this.entityName} repository health check failed:`, error);
      return { status: 'unhealthy' };
    }
  }
}

// Type helper for entity with ID
export interface EntityWithId {
  id: string;
  created_at: string;
}