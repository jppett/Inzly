// Event orchestrator service entry point
import { EventConsumer } from './consumer.js';
import { AddressRequestHandler } from './handlers/address-request-handler.js';
import { CompletionHandler } from './handlers/completion-handler.js';

async function main() {
  console.log('Orchestrator service starting...');

  // Initialize Redis connection (required by repositories)
  const redisHost = process.env.REDIS_HOST || 'localhost';
  const redisPort = parseInt(process.env.REDIS_PORT || '6379');
  console.log(`Connecting to Redis at ${redisHost}:${redisPort}`);

  // Initialize event consumer and handlers
  const consumer = new EventConsumer();
  const addressHandler = new AddressRequestHandler();
  const completionHandler = new CompletionHandler();

  // Register AddressRequest event handlers
  consumer.registerHandler('AddressRequest.create', (envelope) => 
    addressHandler.handleCreate(envelope)
  );
  
  consumer.registerHandler('AddressRequest.update', (envelope) => 
    addressHandler.handleUpdate(envelope)
  );

  // Register completion event handlers
  consumer.registerHandler('BonesReportResult.create', (envelope) => 
    completionHandler.handleBonesReportCreate(envelope)
  );

  consumer.registerHandler('BonesReportResult.update', (envelope) => 
    completionHandler.handleBonesReportUpdate(envelope)
  );

  consumer.registerHandler('MLSListingResult.create', (envelope) => 
    completionHandler.handleMLSListingResultCreate(envelope)
  );

  consumer.registerHandler('MLSListingResult.update', (envelope) => 
    completionHandler.handleMLSListingResultUpdate(envelope)
  );

  // Start consuming events
  console.log('Starting event consumer...');
  await consumer.start();
  console.log('Orchestrator service ready and listening for events');
  console.log('📋 Handling: AddressRequest, BonesReportResult, MLSListingResult events');
  console.log('🎯 Functions: Workflow initiation + Completion detection');

  // Perform initial manual completion check for any orphaned processing requests
  console.log('🔄 Performing initial completion check...');
  setTimeout(() => {
    completionHandler.performManualCompletionCheck().catch(console.error);
  }, 5000); // Wait 5 seconds for services to stabilize
  
  // Graceful shutdown handling
  process.on('SIGINT', async () => {
    console.log('Orchestrator service shutting down...');
    await consumer.stop();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('Orchestrator service shutting down...');
    await consumer.stop();
    process.exit(0);
  });
}

main().catch((error) => {
  console.error('Failed to start orchestrator service:', error);
  process.exit(1);
});