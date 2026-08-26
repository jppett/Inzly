// Event publisher for Kafka/Redpanda integration
import { Kafka, Producer, ProducerRecord } from 'kafkajs';
import { EventEnvelope, EventTopic } from '../events.js';
import { getEnvVar } from '../utils.js';

export interface EventPublisher {
  publish<T>(topic: EventTopic, data: T): Promise<void>;
  publishEnvelope(topic: EventTopic, envelope: EventEnvelope): Promise<void>;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
}

export class KafkaEventPublisher implements EventPublisher {
  private producer: Producer;
  private kafka: Kafka;
  private isConnected = false;

  constructor(brokers?: string[]) {
    const defaultBrokers = getEnvVar('REDPANDA_BROKERS', 'localhost:19092').split(',');
    
    this.kafka = new Kafka({
      clientId: 'bones-report-publisher',
      brokers: brokers || defaultBrokers,
      retry: {
        initialRetryTime: 1000,
        retries: 5,
        factor: 2,
        maxRetryTime: 30000,
      },
    });

    this.producer = this.kafka.producer({
      allowAutoTopicCreation: true,
      transactionTimeout: 30000,
    });
  }

  public async connect(): Promise<void> {
    if (this.isConnected) {
      return;
    }

    try {
      await this.producer.connect();
      this.isConnected = true;
      console.log('Kafka producer connected');
    } catch (error) {
      console.error('Failed to connect Kafka producer:', error);
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    if (!this.isConnected) {
      return;
    }

    try {
      await this.producer.disconnect();
      this.isConnected = false;
      console.log('Kafka producer disconnected');
    } catch (error) {
      console.error('Error disconnecting Kafka producer:', error);
    }
  }

  public async publish<T>(topic: EventTopic, data: T): Promise<void> {
    const envelope: EventEnvelope<T> = {
      type: topic,
      ts: new Date().toISOString(),
      data,
    };

    await this.publishEnvelope(topic, envelope);
  }

  public async publishEnvelope(topic: EventTopic, envelope: EventEnvelope): Promise<void> {
    if (!this.isConnected) {
      await this.connect();
    }

    const message: ProducerRecord = {
      topic,
      messages: [
        {
          key: envelope.data?.id || new Date().toISOString(),
          value: JSON.stringify(envelope),
          timestamp: new Date(envelope.ts).getTime().toString(),
        },
      ],
    };

    try {
      const result = await this.producer.send(message);
      console.log(`Event published to topic ${topic}:`, result);
    } catch (error) {
      console.error(`Failed to publish event to topic ${topic}:`, error);
      throw error;
    }
  }

  public async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy' }> {
    try {
      if (!this.isConnected) {
        await this.connect();
      }
      return { status: 'healthy' };
    } catch (error) {
      console.error('Kafka health check failed:', error);
      return { status: 'unhealthy' };
    }
  }
}

// Mock event publisher for testing
export class MockEventPublisher implements EventPublisher {
  private events: Array<{ topic: EventTopic; envelope: EventEnvelope }> = [];

  public async connect(): Promise<void> {
    // Mock implementation
  }

  public async disconnect(): Promise<void> {
    // Mock implementation
  }

  public async publish<T>(topic: EventTopic, data: T): Promise<void> {
    const envelope: EventEnvelope<T> = {
      type: topic,
      ts: new Date().toISOString(),
      data,
    };

    await this.publishEnvelope(topic, envelope);
  }

  public async publishEnvelope(topic: EventTopic, envelope: EventEnvelope): Promise<void> {
    this.events.push({ topic, envelope });
    console.log(`Mock event published to topic ${topic}:`, envelope);
  }

  public getPublishedEvents(): Array<{ topic: EventTopic; envelope: EventEnvelope }> {
    return [...this.events];
  }

  public clearEvents(): void {
    this.events = [];
  }
}

// Singleton instance
let globalPublisher: EventPublisher | null = null;

export function getEventPublisher(): EventPublisher {
  if (!globalPublisher) {
    const nodeEnv = getEnvVar('NODE_ENV', 'development');
    
    if (nodeEnv === 'test') {
      globalPublisher = new MockEventPublisher();
    } else {
      globalPublisher = new KafkaEventPublisher();
    }
  }
  
  return globalPublisher;
}

export function setEventPublisher(publisher: EventPublisher): void {
  globalPublisher = publisher;
}