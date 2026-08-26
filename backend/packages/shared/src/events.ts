// Event envelope and types with enhanced utilities

// Event envelope interface
export interface EventEnvelope<T = any> {
  type: string;
  ts: string;
  data: T;
}

// Event topic constants
export const EVENT_TOPICS = {
  ADDRESS_REQUEST_CREATE: 'AddressRequest.create',
  ADDRESS_REQUEST_UPDATE: 'AddressRequest.update',
  BONES_REPORT_RESULT_CREATE: 'BonesReportResult.create',
  BONES_REPORT_RESULT_UPDATE: 'BonesReportResult.update',
  MLS_LISTING_REQUEST_CREATE: 'MLSListingRequest.create',
  MLS_LISTING_REQUEST_UPDATE: 'MLSListingRequest.update',
  MLS_LISTING_RESULT_CREATE: 'MLSListingResult.create',
  MLS_LISTING_RESULT_UPDATE: 'MLSListingResult.update',
  PROPERTY_INSIGHTS_RESULT_CREATE: 'PropertyInsightsResult.create',
  PROPERTY_INSIGHTS_RESULT_UPDATE: 'PropertyInsightsResult.update',
} as const;

export type EventTopic = typeof EVENT_TOPICS[keyof typeof EVENT_TOPICS];

// Event data types for each topic
export interface AddressRequestCreateEvent {
  type: typeof EVENT_TOPICS.ADDRESS_REQUEST_CREATE;
  data: {
    id: string;
    address: string;
    created_at: string;
    status: 'pending';
  };
}

export interface AddressRequestUpdateEvent {
  type: typeof EVENT_TOPICS.ADDRESS_REQUEST_UPDATE;
  data: {
    id: string;
    address?: string;
    status?: 'pending' | 'processing' | 'processed' | 'failed';
    updated_at: string;
  };
}

export interface BonesReportResultCreateEvent {
  type: typeof EVENT_TOPICS.BONES_REPORT_RESULT_CREATE;
  data: {
    id: string;
    address_request_id: string;
    report_data: Record<string, any>;
    created_at: string;
    status: 'completed' | 'failed';
  };
}

export interface BonesReportResultUpdateEvent {
  type: typeof EVENT_TOPICS.BONES_REPORT_RESULT_UPDATE;
  data: {
    id: string;
    status?: 'completed' | 'failed';
    updated_at: string;
  };
}

export interface MLSListingRequestCreateEvent {
  type: typeof EVENT_TOPICS.MLS_LISTING_REQUEST_CREATE;
  data: {
    id: string;
    address: string;
    created_at: string;
    status: 'pending';
  };
}

export interface MLSListingRequestUpdateEvent {
  type: typeof EVENT_TOPICS.MLS_LISTING_REQUEST_UPDATE;
  data: {
    id: string;
    status?: 'pending' | 'processed' | 'failed';
    updated_at: string;
  };
}

export interface MLSListingResultCreateEvent {
  type: typeof EVENT_TOPICS.MLS_LISTING_RESULT_CREATE;
  data: {
    id: string;
    mls_listing_request_id: string;
    listing_data: {
      address: string;
      price: number;
      bedrooms: number;
      photo_urls: string[];
    };
    created_at: string;
    status: 'completed' | 'failed';
  };
}

export interface MLSListingResultUpdateEvent {
  type: typeof EVENT_TOPICS.MLS_LISTING_RESULT_UPDATE;
  data: {
    id: string;
    status?: 'completed' | 'failed';
    updated_at: string;
  };
}

export interface PropertyInsightsResultCreateEvent {
  type: typeof EVENT_TOPICS.PROPERTY_INSIGHTS_RESULT_CREATE;
  data: {
    id: string;
    address_request_id: string;
    created_at: string;
    status: 'completed' | 'partial' | 'failed';
    insightCount: number;
  };
}

export interface PropertyInsightsResultUpdateEvent {
  type: typeof EVENT_TOPICS.PROPERTY_INSIGHTS_RESULT_UPDATE;
  data: {
    id: string;
    status?: 'completed' | 'partial' | 'failed';
    updated_at: string;
  };
}

// Union type for all events
export type AppEvent = 
  | AddressRequestCreateEvent
  | AddressRequestUpdateEvent
  | BonesReportResultCreateEvent
  | BonesReportResultUpdateEvent
  | MLSListingRequestCreateEvent
  | MLSListingRequestUpdateEvent
  | MLSListingResultCreateEvent
  | MLSListingResultUpdateEvent
  | PropertyInsightsResultCreateEvent
  | PropertyInsightsResultUpdateEvent;

// Utility functions for creating event envelopes
export function createEventEnvelope<T>(type: EventTopic, data: T): EventEnvelope<T> {
  return {
    type,
    ts: new Date().toISOString(),
    data,
  };
}

export function createAddressRequestCreateEvent(data: AddressRequestCreateEvent['data']): EventEnvelope<AddressRequestCreateEvent['data']> {
  return createEventEnvelope(EVENT_TOPICS.ADDRESS_REQUEST_CREATE, data);
}

export function createAddressRequestUpdateEvent(data: AddressRequestUpdateEvent['data']): EventEnvelope<AddressRequestUpdateEvent['data']> {
  return createEventEnvelope(EVENT_TOPICS.ADDRESS_REQUEST_UPDATE, data);
}

export function createBonesReportResultCreateEvent(data: BonesReportResultCreateEvent['data']): EventEnvelope<BonesReportResultCreateEvent['data']> {
  return createEventEnvelope(EVENT_TOPICS.BONES_REPORT_RESULT_CREATE, data);
}

export function createBonesReportResultUpdateEvent(data: BonesReportResultUpdateEvent['data']): EventEnvelope<BonesReportResultUpdateEvent['data']> {
  return createEventEnvelope(EVENT_TOPICS.BONES_REPORT_RESULT_UPDATE, data);
}

export function createMLSListingRequestCreateEvent(data: MLSListingRequestCreateEvent['data']): EventEnvelope<MLSListingRequestCreateEvent['data']> {
  return createEventEnvelope(EVENT_TOPICS.MLS_LISTING_REQUEST_CREATE, data);
}

export function createMLSListingRequestUpdateEvent(data: MLSListingRequestUpdateEvent['data']): EventEnvelope<MLSListingRequestUpdateEvent['data']> {
  return createEventEnvelope(EVENT_TOPICS.MLS_LISTING_REQUEST_UPDATE, data);
}

export function createMLSListingResultCreateEvent(data: MLSListingResultCreateEvent['data']): EventEnvelope<MLSListingResultCreateEvent['data']> {
  return createEventEnvelope(EVENT_TOPICS.MLS_LISTING_RESULT_CREATE, data);
}

export function createMLSListingResultUpdateEvent(data: MLSListingResultUpdateEvent['data']): EventEnvelope<MLSListingResultUpdateEvent['data']> {
  return createEventEnvelope(EVENT_TOPICS.MLS_LISTING_RESULT_UPDATE, data);
}
export function createPropertyInsightsResultCreateEvent(data: PropertyInsightsResultCreateEvent['data']): EventEnvelope<PropertyInsightsResultCreateEvent['data']> {
  return createEventEnvelope(EVENT_TOPICS.PROPERTY_INSIGHTS_RESULT_CREATE, data);
}

export function createPropertyInsightsResultUpdateEvent(data: PropertyInsightsResultUpdateEvent['data']): EventEnvelope<PropertyInsightsResultUpdateEvent['data']> {
  return createEventEnvelope(EVENT_TOPICS.PROPERTY_INSIGHTS_RESULT_UPDATE, data);
}
