/**
 * Domain Events System
 *
 * Provides type-safe event emission and handling for domain operations.
 * Allows external systems to react to domain changes without tight coupling.
 */

export type DomainEventType =
  | 'rule.created'
  | 'rule.updated'
  | 'rule.deleted'
  | 'rule.executed'
  | 'rule.execution.success'
  | 'rule.execution.failed'
  | 'rule.execution.skipped'
  | 'event.created'
  | 'event.updated'
  | 'event.deleted'
  | 'template.cloned';

export interface BaseDomainEvent {
  type: DomainEventType;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface RuleCreatedEvent extends BaseDomainEvent {
  type: 'rule.created';
  payload: {
    ruleId: number;
    name: string;
    isActive: boolean;
  };
}

export interface RuleUpdatedEvent extends BaseDomainEvent {
  type: 'rule.updated';
  payload: {
    ruleId: number;
    changes: Record<string, any>;
  };
}

export interface RuleDeletedEvent extends BaseDomainEvent {
  type: 'rule.deleted';
  payload: {
    ruleId: number;
    name: string;
  };
}

export interface RuleExecutedEvent extends BaseDomainEvent {
  type: 'rule.executed';
  payload: {
    ruleId: number;
    ruleName: string;
    messagesProcessed: number;
    duration: number;
  };
}

export interface RuleExecutionSuccessEvent extends BaseDomainEvent {
  type: 'rule.execution.success';
  payload: {
    ruleId: number;
    messageId: string;
    calendarEventId: string;
  };
}

export interface RuleExecutionFailedEvent extends BaseDomainEvent {
  type: 'rule.execution.failed';
  payload: {
    ruleId: number;
    messageId: string;
    error: {
      message: string;
      code?: string;
    };
  };
}

export interface EventCreatedEvent extends BaseDomainEvent {
  type: 'event.created';
  payload: {
    eventId: string;
    title: string;
    start: string;
    end: string;
  };
}

export type DomainEvent =
  | RuleCreatedEvent
  | RuleUpdatedEvent
  | RuleDeletedEvent
  | RuleExecutedEvent
  | RuleExecutionSuccessEvent
  | RuleExecutionFailedEvent
  | EventCreatedEvent;

/**
 * Event handler function type
 */
export type EventHandler<T extends DomainEvent = DomainEvent> = (event: T) => void | Promise<void>;

/**
 * Simple in-memory event emitter
 * Can be replaced with more sophisticated pub/sub systems later
 */
export class DomainEventEmitter {
  private handlers: Map<DomainEventType, Set<EventHandler>> = new Map();

  /**
   * Register an event handler
   */
  on<T extends DomainEvent>(eventType: T['type'], handler: EventHandler<T>): void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }
    this.handlers.get(eventType)!.add(handler as EventHandler);
  }

  /**
   * Unregister an event handler
   */
  off<T extends DomainEvent>(eventType: T['type'], handler: EventHandler<T>): void {
    const handlers = this.handlers.get(eventType);
    if (handlers) {
      handlers.delete(handler as EventHandler);
    }
  }

  /**
   * Emit an event
   */
  async emit<T extends DomainEvent>(event: T): Promise<void> {
    const handlers = this.handlers.get(event.type);
    if (!handlers || handlers.size === 0) {
      return;
    }

    const promises = Array.from(handlers).map((handler) => {
      try {
        return Promise.resolve(handler(event));
      } catch (error) {
        console.error(`Error in event handler for ${event.type}:`, error);
        return Promise.resolve();
      }
    });

    await Promise.all(promises);
  }

  /**
   * Get all registered event types
   */
  getRegisteredEvents(): DomainEventType[] {
    return Array.from(this.handlers.keys());
  }

  /**
   * Clear all handlers
   */
  clear(): void {
    this.handlers.clear();
  }
}

// Global singleton instance
let globalEmitter: DomainEventEmitter | null = null;

export function getEventEmitter(): DomainEventEmitter {
  if (!globalEmitter) {
    globalEmitter = new DomainEventEmitter();
  }
  return globalEmitter;
}

export function resetEventEmitter(): void {
  globalEmitter = null;
}
