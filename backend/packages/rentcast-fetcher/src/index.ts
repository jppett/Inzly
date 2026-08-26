// RentCast fetcher worker service entry point
import { RentCastEventConsumer } from './consumer.js';
import { RentCastAddressRequestHandler } from './handlers/address-request-handler.js';

async function main() {
  console.log('🏠 RentCast fetcher service starting...');

  // Initialize Redis connection (required by repositories)
  const redisHost = process.env.REDIS_HOST || 'localhost';
  const redisPort = parseInt(process.env.REDIS_PORT || '6379');
  console.log(`🔗 Connecting to Redis at ${redisHost}:${redisPort}`);

  // Initialize event consumer
  const consumer = new RentCastEventConsumer();
  const addressHandler = new RentCastAddressRequestHandler();

  // Register event handlers
  consumer.registerHandler('AddressRequest.create', (envelope) => 
    addressHandler.handleCreate(envelope)
  );
  
  consumer.registerHandler('AddressRequest.update', (envelope) => 
    addressHandler.handleUpdate(envelope)
  );

  // Start consuming events
  console.log('🎯 Starting event consumer...');
  await consumer.start();
  console.log('✅ RentCast fetcher service ready and listening for events');
  
  // Graceful shutdown handling
  process.on('SIGINT', async () => {
    console.log('🛑 RentCast fetcher service shutting down...');
    await consumer.stop();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('🛑 RentCast fetcher service shutting down...');
    await consumer.stop();
    process.exit(0);
  });
}

main().catch((error) => {
  console.error('💥 Failed to start RentCast fetcher service:', error);
  process.exit(1);
});