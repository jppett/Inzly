// Shared types and utilities for bones-report

// Core type definitions
export * from './types.js';

// Property insight types (photo-analyst output)
export * from './insights.js';

// Permit history types (permits-fetcher output)
export * from './permits.js';

// Property summary types (Summary Agent output)
export * from './summary.js';

// Runtime validation schemas
export * from './schemas/index.js';

// Event management utilities (excluding EventEnvelope to avoid duplicate)
export {
  EVENT_TOPICS,
  createEventEnvelope,
  createAddressRequestCreateEvent,
  createAddressRequestUpdateEvent,
  createBonesReportResultCreateEvent,
  createBonesReportResultUpdateEvent,
  createMLSListingRequestCreateEvent,
  createMLSListingRequestUpdateEvent,
  createMLSListingResultCreateEvent,
  createMLSListingResultUpdateEvent,
  createPropertyInsightsResultCreateEvent,
  createPropertyInsightsResultUpdateEvent,
  createPermitHistoryResultCreateEvent,
  createPermitHistoryResultUpdateEvent,
  createPropertySummaryResultCreateEvent,
  createPropertySummaryResultUpdateEvent,
  type EventTopic,
  type AppEvent,
  type AddressRequestCreateEvent,
  type AddressRequestUpdateEvent,
  type BonesReportResultCreateEvent,
  type BonesReportResultUpdateEvent,
  type MLSListingRequestCreateEvent,
  type MLSListingRequestUpdateEvent,
  type MLSListingResultCreateEvent,
  type MLSListingResultUpdateEvent,
  type PropertyInsightsResultCreateEvent,
  type PropertyInsightsResultUpdateEvent,
  type PermitHistoryResultCreateEvent,
  type PermitHistoryResultUpdateEvent,
  type PropertySummaryResultCreateEvent,
  type PropertySummaryResultUpdateEvent,
} from './events/index.js';

// General utilities
export * from './utils/index.js';

// Validation utilities
export * from './validation/index.js';

// Additional utilities from subdirectories
export {
  isEventOfType,
  parseEventEnvelope,
} from './events/index.js';

// Redis utilities
export * from './redis/index.js';

// Repository utilities
export * from './repositories/index.js';

// Event publisher
export * from './events/publisher.js';