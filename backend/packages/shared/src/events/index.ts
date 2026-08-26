// Re-export all event utilities
export * from '../events.js';

// Import the EventEnvelope type to avoid circular imports
import type { EventEnvelope } from '../events.js';

// Additional event utilities
export function isEventOfType<T extends { type: string; data: any }>(
  event: { type: string; data: any },
  eventType: T['type']
): event is T {
  return event.type === eventType;
}

export function parseEventEnvelope<T>(rawEvent: string): EventEnvelope<T> | null {
  try {
    const parsed = JSON.parse(rawEvent);
    if (parsed.type && parsed.ts && parsed.data !== undefined) {
      return parsed as EventEnvelope<T>;
    }
    return null;
  } catch {
    return null;
  }
}