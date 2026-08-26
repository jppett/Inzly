import { Kafka, type Consumer } from 'kafkajs';
import { EVENT_TOPICS, parseEventEnvelope, type EventEnvelope } from '@bones-report/shared';
import { PermitsAddressRequestHandler } from './handlers/address-request-handler.js';

export class PermitsConsumer {
  private readonly consumer: Consumer;
  private readonly handler = new PermitsAddressRequestHandler();

  constructor(brokers: string[]) {
    this.consumer = new Kafka({ clientId: 'permits-fetcher', brokers }).consumer({
      groupId: 'permits-fetcher-group',
    });
  }

  async start(): Promise<void> {
    await this.consumer.connect();
    for (const topic of [
      EVENT_TOPICS.ADDRESS_REQUEST_CREATE,
      EVENT_TOPICS.ADDRESS_REQUEST_UPDATE,
    ]) {
      await this.consumer.subscribe({ topic, fromBeginning: false });
    }

    await this.consumer.run({
      eachMessage: async ({ topic, message }) => {
        const raw = message.value?.toString();
        if (!raw) return;

        const envelope = parseEventEnvelope(raw) as EventEnvelope | null;
        if (!envelope) return;

        try {
          if (topic === EVENT_TOPICS.ADDRESS_REQUEST_CREATE) {
            await this.handler.handleCreate(envelope);
          } else {
            await this.handler.handleUpdate(envelope);
          }
        } catch (error) {
          // Never rethrow — a poison message must not stall the partition.
          console.error(`❌ [permits] Handler error on ${topic}:`, error);
        }
      },
    });

    console.log('🎧 [permits] Listening on AddressRequest.create / .update');
  }

  async stop(): Promise<void> {
    await this.consumer.disconnect();
  }
}
