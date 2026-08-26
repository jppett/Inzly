// Permits fetcher service entry point.
import { PermitsConsumer } from './consumer.js';

export * from './services/index.js';
export { PermitsAddressRequestHandler } from './handlers/address-request-handler.js';

async function main(): Promise<void> {
  const brokers = (process.env.REDPANDA_BROKERS || 'localhost:9092').split(',');
  const consumer = new PermitsConsumer(brokers);

  await consumer.start();
  console.log('🚀 [permits] Service running');

  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.on(signal, async () => {
      console.log(`\n[permits] ${signal} received, shutting down`);
      await consumer.stop();
      process.exit(0);
    });
  }
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop() ?? '')) {
  main().catch((error) => {
    console.error('❌ [permits] Fatal:', error);
    process.exit(1);
  });
}
