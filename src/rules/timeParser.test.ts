import { describe, it, expect } from 'vitest';
import { TimeParser } from './timeParser';
import { TimeStrategy } from '../db/types';

describe('TimeParser', () => {
  describe('parseDateTime', () => {
    describe('fixed_delay strategy', () => {
      it('should create event 1 hour after received date', () => {
        const strategy: TimeStrategy = {
          type: 'fixed_delay',
          delayHours: 1,
          durationMinutes: 60,
        };

        const receivedDate = new Date('2025-01-01T10:00:00Z');
        const result = TimeParser.parseDateTime(strategy, '', receivedDate);

        expect(result).not.toBeNull();
        expect(result!.start.getTime()).toBe(new Date('2025-01-01T11:00:00Z').getTime());
        expect(result!.end.getTime()).toBe(new Date('2025-01-01T12:00:00Z').getTime());
      });

      it('should create event with custom delay and duration', () => {
        const strategy: TimeStrategy = {
          type: 'fixed_delay',
          delayHours: 3,
          durationMinutes: 30,
        };

        const receivedDate = new Date('2025-01-01T09:00:00Z');
        const result = TimeParser.parseDateTime(strategy, '', receivedDate);

        expect(result).not.toBeNull();
        expect(result!.start.getTime()).toBe(new Date('2025-01-01T12:00:00Z').getTime());
        expect(result!.end.getTime()).toBe(new Date('2025-01-01T12:30:00Z').getTime());
      });
    });

    describe('fixed_datetime strategy', () => {
      it('should create event at fixed datetime', () => {
        const strategy: TimeStrategy = {
          type: 'fixed_datetime',
          fixedDate: '2025-06-15T14:00:00Z',
          durationMinutes: 90,
        };

        const receivedDate = new Date('2025-01-01T10:00:00Z');
        const result = TimeParser.parseDateTime(strategy, '', receivedDate);

        expect(result).not.toBeNull();
        expect(result!.start.getTime()).toBe(new Date('2025-06-15T14:00:00Z').getTime());
        expect(result!.end.getTime()).toBe(new Date('2025-06-15T15:30:00Z').getTime());
      });

      it('should return null for invalid fixed date', () => {
        const strategy: TimeStrategy = {
          type: 'fixed_datetime',
          fixedDate: 'invalid-date',
          durationMinutes: 60,
        };

        const receivedDate = new Date('2025-01-01T10:00:00Z');
        const result = TimeParser.parseDateTime(strategy, '', receivedDate);

        expect(result).toBeNull();
      });
    });

    describe('parse_from_body strategy', () => {
      it('should parse date from email body', () => {
        const strategy: TimeStrategy = {
          type: 'parse_from_body',
          durationMinutes: 60,
        };

        const emailBody = 'Meeting tomorrow at 2pm';
        const receivedDate = new Date('2025-01-01T10:00:00Z');
        const result = TimeParser.parseDateTime(strategy, emailBody, receivedDate);

        expect(result).not.toBeNull();
        expect(result!.start).toBeInstanceOf(Date);
        expect(result!.end).toBeInstanceOf(Date);
        // End should be 60 minutes after start
        expect(result!.end.getTime() - result!.start.getTime()).toBe(60 * 60 * 1000);
      });

      it('should return null when no date found in body', () => {
        const strategy: TimeStrategy = {
          type: 'parse_from_body',
          durationMinutes: 60,
        };

        const emailBody = 'No dates in this email';
        const receivedDate = new Date('2025-01-01T10:00:00Z');
        const result = TimeParser.parseDateTime(strategy, emailBody, receivedDate);

        expect(result).toBeNull();
      });
    });
  });
});
