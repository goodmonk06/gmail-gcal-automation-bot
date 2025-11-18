import * as chrono from 'chrono-node';
import { addHours } from 'date-fns';
import { TimeStrategy } from '../db/types';

export interface ParsedDateTime {
  start: Date;
  end: Date;
}

export class TimeParser {
  /**
   * Parse datetime based on TimeStrategy
   */
  static parseDateTime(
    strategy: TimeStrategy,
    emailBody: string,
    receivedDate: Date
  ): ParsedDateTime | null {
    switch (strategy.type) {
      case 'parse_from_body':
        return this.parseFromBody(emailBody, strategy.durationMinutes || 60);

      case 'fixed_delay':
        return this.parseFixedDelay(receivedDate, strategy.delayHours || 1, strategy.durationMinutes || 60);

      case 'fixed_datetime':
        return this.parseFixedDatetime(strategy.fixedDate || '', strategy.durationMinutes || 60);

      default:
        console.warn(`Unknown time strategy type: ${(strategy as any).type}`);
        return null;
    }
  }

  /**
   * Parse datetime from email body using chrono-node
   */
  private static parseFromBody(body: string, durationMinutes: number): ParsedDateTime | null {
    const parsed = chrono.parseDate(body);

    if (!parsed) {
      console.warn('Could not parse datetime from email body');
      return null;
    }

    const start = parsed;
    const end = new Date(start.getTime() + durationMinutes * 60 * 1000);

    return { start, end };
  }

  /**
   * Create event at fixed delay from email received time
   */
  private static parseFixedDelay(receivedDate: Date, delayHours: number, durationMinutes: number): ParsedDateTime {
    const start = addHours(receivedDate, delayHours);
    const end = new Date(start.getTime() + durationMinutes * 60 * 1000);

    return { start, end };
  }

  /**
   * Use a fixed datetime
   */
  private static parseFixedDatetime(fixedDate: string, durationMinutes: number): ParsedDateTime | null {
    try {
      const start = new Date(fixedDate);
      if (isNaN(start.getTime())) {
        console.warn(`Invalid fixed date: ${fixedDate}`);
        return null;
      }

      const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
      return { start, end };
    } catch (error) {
      console.error('Error parsing fixed datetime:', error);
      return null;
    }
  }
}
