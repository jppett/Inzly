import { Kafka, Consumer, EachMessagePayload } from 'kafkajs';
import { EventEnvelope } from '@bones-report/shared';

export class EventConsumer {
  private kafka: Kafka;
  private consumer: Consumer;
  private handlers: Map<string, (envelope: EventEnvelope) => Promise<void>>;

  constructor() {
    const brokers = process.env.REDPANDA_BROKERS?.split(',') || ['localhost:19092'];
    
    this.kafka = new Kafka({
      clientId: 'orchestrator-service',
      brokers,
    });

    this.consumer = this.kafka.consumer({ 
      groupId: 'orchestrator-group'
    });

    this.handlers = new Map();
  }

  /**
   * Register a handler for a specific event type
   */
  registerHandler(eventType: string, handler: (envelope: EventEnvelope) => Promise<void>) {
    this.handlers.set(eventType, handler);
  }

  /**
   * Start consuming events from all relevant topics
   */
  async start() {
    await this.consumer.connect();
    
    // Subscribe to topics we care about
    const topics = [
      'AddressRequest.create',
      'AddressRequest.update',
      'MLSListingRequest.create',
      'MLSListingResult.create',
      'MLSListingResult.update',
      'BonesReportResult.create',
      'BonesReportResult.update'
    ];

    for (const topic of topics) {
      await this.consumer.subscribe({ topic, fromBeginning: true });
    }

    await this.consumer.run({
      eachMessage: async ({ topic, partition, message }: EachMessagePayload) => {
        try {
          if (!message.value) return;

          const envelope: EventEnvelope = JSON.parse(message.value.toString());
          
          console.log(`Received event: ${envelope.type} at ${envelope.ts}`);
          
          const handler = this.handlers.get(envelope.type);
          if (handler) {
            await handler(envelope);
          } else {
            console.log(`No handler registered for event type: ${envelope.type}`);
          }
        } catch (error) {
          console.error('Error processing message:', error);
        }
      },
    });
  }

  /**
   * Stop the consumer
   */
  async stop() {
    await this.consumer.disconnect();
  }
}