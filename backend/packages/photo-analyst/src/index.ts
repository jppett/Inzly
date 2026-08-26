// Photo analyst service entry point.
import { PhotoAnalystConsumer } from './consumer.js';

export { PhotoAnalyst } from './services/analyst.js';
export { reconcileCategory, dedupeInsights } from './services/reconcile.js';
export { EXPERT_AGENTS, AGENTS_BY_CATEGORY } from './agents/definitions.js';
export { SHARED_RUBRIC, OUTPUT_CONTRACT } from './agents/rubric.js';
export * from './providers/index.js';

async function main(): Promise<void> {
  const brokers = (process.env.REDPANDA_BROKERS || 'localhost:9092').split(',');
  const consumer = new PhotoAnalystConsumer(brokers);

  await consumer.start();
  console.log('🚀 [photo-analyst] Service running');

  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.on(signal, async () => {
      console.log(`\n[photo-analyst] ${signal} received, shutting down`);
      await consumer.stop();
      process.exit(0);
    });
  }
}

// Only run the service when executed directly, so the exports above stay
// importable from tests and scripts.
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop() ?? '')) {
  main().catch((error) => {
    console.error('❌ [photo-analyst] Fatal:', error);
    process.exit(1);
  });
}
