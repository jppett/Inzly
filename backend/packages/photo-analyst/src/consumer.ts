import { Kafka, type Consumer } from 'kafkajs';
import { EVENT_TOPICS, parseEventEnvelope, type EventEnvelope } from '@bones-report/shared';
import { MLSListingResultHandler } from './handlers/mls-listing-result-handler.js';

const CLIENT_ID = 'photo-analyst';
const GROUP_ID = 'photo-analyst-group';

export class PhotoAnalystConsumer {
  private readonly consumer: Consumer;
  private readonly handler = new MLSListingResultHandler();

  constructor(brokers: string[]) {
    this.consumer = new Kafka({ clientId: CLIENT_ID, brokers }).consumer({
      groupId: GROUP_ID,
    });
  }

  async start(): Promise<void> {
    await this.consumer.connect();
    await this.consumer.subscribe({
      topic: EVENT_TOPICS.MLS_LISTING_RESULT_CREATE,
      fromBeginning: false,
    });

    await this.consumer.run({
      eachMessage: async ({ topic, message }) => {
        const raw = message.value?.toString();
        if (!raw) return;

        const envelope = parseEventEnvelope(raw) as EventEnvelope | null;
        if (!envelope) {
          console.warn(`⚠️ [photo-analyst] Unparsable event on ${topic}`);
          return;
        }

        try {
          await this.handler.handleCreate(envelope);
        } catch (error) {
          // Never rethrow: a poison message must not stall the partition.
          console.error(`❌ [photo-analyst] Handler error on ${topic}:`, error);
        }
      },
    });

    console.log(`🎧 [photo-analyst] Listening on ${EVENT_TOPICS.MLS_LISTING_RESULT_CREATE}`);
  }

  async stop(): Promise<void> {
    await this.consumer.disconnect();
  }
}
