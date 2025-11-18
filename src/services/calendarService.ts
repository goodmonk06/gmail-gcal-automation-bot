import { calendar_v3 } from 'googleapis';
import { GoogleClientManager } from '../config/googleClient';

export interface CalendarEventInput {
  calendarId: string;
  summary: string;
  description?: string;
  start: Date;
  end: Date;
  location?: string;
  attendees?: string[];
  source?: {
    title: string;
    url: string;
  };
}

export interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: Date;
  end: Date;
  htmlLink: string;
}

export class CalendarService {
  private calendar: calendar_v3.Calendar;

  constructor(private clientManager: GoogleClientManager) {
    this.calendar = clientManager.getCalendarClient();
  }

  /**
   * Create a calendar event
   */
  async createEvent(input: CalendarEventInput): Promise<CalendarEvent> {
    await this.clientManager.refreshTokenIfNeeded();

    try {
      const event: calendar_v3.Schema$Event = {
        summary: input.summary,
        description: input.description,
        location: input.location,
        start: {
          dateTime: input.start.toISOString(),
          timeZone: 'UTC',
        },
        end: {
          dateTime: input.end.toISOString(),
          timeZone: 'UTC',
        },
      };

      if (input.attendees && input.attendees.length > 0) {
        event.attendees = input.attendees.map(email => ({ email }));
      }

      if (input.source) {
        event.source = input.source;
      }

      const response = await this.calendar.events.insert({
        calendarId: input.calendarId,
        requestBody: event,
      });

      const createdEvent = response.data;

      if (!createdEvent.id || !createdEvent.start?.dateTime || !createdEvent.end?.dateTime) {
        throw new Error('Invalid event data returned from Google Calendar API');
      }

      return {
        id: createdEvent.id,
        summary: createdEvent.summary || '',
        description: createdEvent.description,
        start: new Date(createdEvent.start.dateTime),
        end: new Date(createdEvent.end.dateTime),
        htmlLink: createdEvent.htmlLink || '',
      };
    } catch (error) {
      console.error('Error creating calendar event:', error);
      throw error;
    }
  }

  /**
   * List upcoming events
   */
  async listUpcomingEvents(calendarId: string = 'primary', maxResults: number = 10): Promise<CalendarEvent[]> {
    await this.clientManager.refreshTokenIfNeeded();

    try {
      const response = await this.calendar.events.list({
        calendarId,
        timeMin: new Date().toISOString(),
        maxResults,
        singleEvents: true,
        orderBy: 'startTime',
      });

      const events = response.data.items || [];

      return events
        .filter(event => event.id && event.start?.dateTime && event.end?.dateTime)
        .map(event => ({
          id: event.id!,
          summary: event.summary || '',
          description: event.description,
          start: new Date(event.start!.dateTime!),
          end: new Date(event.end!.dateTime!),
          htmlLink: event.htmlLink || '',
        }));
    } catch (error) {
      console.error('Error listing calendar events:', error);
      throw error;
    }
  }

  /**
   * Delete a calendar event
   */
  async deleteEvent(calendarId: string, eventId: string): Promise<void> {
    await this.clientManager.refreshTokenIfNeeded();

    try {
      await this.calendar.events.delete({
        calendarId,
        eventId,
      });

      console.log(`Event ${eventId} deleted successfully`);
    } catch (error) {
      console.error('Error deleting calendar event:', error);
      throw error;
    }
  }

  /**
   * Update a calendar event
   */
  async updateEvent(calendarId: string, eventId: string, input: Partial<CalendarEventInput>): Promise<CalendarEvent> {
    await this.clientManager.refreshTokenIfNeeded();

    try {
      const event: calendar_v3.Schema$Event = {};

      if (input.summary) event.summary = input.summary;
      if (input.description !== undefined) event.description = input.description;
      if (input.location !== undefined) event.location = input.location;

      if (input.start) {
        event.start = {
          dateTime: input.start.toISOString(),
          timeZone: 'UTC',
        };
      }

      if (input.end) {
        event.end = {
          dateTime: input.end.toISOString(),
          timeZone: 'UTC',
        };
      }

      if (input.attendees) {
        event.attendees = input.attendees.map(email => ({ email }));
      }

      const response = await this.calendar.events.patch({
        calendarId,
        eventId,
        requestBody: event,
      });

      const updatedEvent = response.data;

      if (!updatedEvent.id || !updatedEvent.start?.dateTime || !updatedEvent.end?.dateTime) {
        throw new Error('Invalid event data returned from Google Calendar API');
      }

      return {
        id: updatedEvent.id,
        summary: updatedEvent.summary || '',
        description: updatedEvent.description,
        start: new Date(updatedEvent.start.dateTime),
        end: new Date(updatedEvent.end.dateTime),
        htmlLink: updatedEvent.htmlLink || '',
      };
    } catch (error) {
      console.error('Error updating calendar event:', error);
      throw error;
    }
  }
}
