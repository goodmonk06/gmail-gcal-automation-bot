/**
 * Event Management Service
 *
 * Manages calendar event snapshots, synchronization status,
 * and provides event lifecycle operations.
 */

import { EventSnapshot, EventSnapshotInput } from '../db/types';
import { IEventStorageAdapter } from '../lib/adapters/storage.adapter';
import { CalendarService } from '../services/calendarService';
import { getLogger } from '../lib/logger';
import { getMetricsCollector, MetricNames } from '../lib/metrics';

const logger = getLogger({ service: 'event-management' });

export class EventManagementService {
  constructor(
    private storage: IEventStorageAdapter,
    private calendarService: CalendarService
  ) {}

  /**
   * Create event snapshot after calendar event creation
   */
  async createSnapshot(input: EventSnapshotInput): Promise<EventSnapshot> {
    logger.info('Creating event snapshot', {
      calendarEventId: input.calendarEventId,
      ruleId: input.ruleId,
    });

    const snapshot = await this.storage.storeSnapshot(input);

    getMetricsCollector().incrementCounter(MetricNames.CALENDAR_EVENTS_CREATED, 1, {
      ruleId: input.ruleId.toString(),
    });

    return snapshot;
  }

  /**
   * Get snapshots for a rule
   */
  async getSnapshotsByRule(ruleId: number, limit?: number): Promise<EventSnapshot[]> {
    return this.storage.getSnapshotsByRule(ruleId, limit);
  }

  /**
   * Get snapshot by ID
   */
  async getSnapshot(id: number): Promise<EventSnapshot | null> {
    return this.storage.getSnapshot(id);
  }

  /**
   * Sync snapshot with actual calendar event
   */
  async syncSnapshot(id: number): Promise<EventSnapshot> {
    const snapshot = await this.storage.getSnapshot(id);

    if (!snapshot) {
      throw new Error(`Snapshot ${id} not found`);
    }

    logger.info('Syncing event snapshot', {
      snapshotId: id,
      calendarEventId: snapshot.calendarEventId,
    });

    try {
      // Try to fetch the event from calendar
      const events = await this.calendarService.listUpcomingEvents(snapshot.calendarId, 100);
      const found = events.find(e => e.id === snapshot.calendarEventId);

      if (!found) {
        // Event was deleted
        await this.storage.updateSyncStatus(id, 'deleted');
      } else {
        // Check if event was modified
        const isModified =
          found.summary !== snapshot.eventTitle ||
          found.start.getTime() !== new Date(snapshot.eventStart).getTime();

        await this.storage.updateSyncStatus(id, isModified ? 'modified' : 'synced');
      }

      return (await this.storage.getSnapshot(id))!;
    } catch (error) {
      logger.error('Failed to sync snapshot', error, { snapshotId: id });
      await this.storage.updateSyncStatus(id, 'out_of_sync');
      throw error;
    }
  }

  /**
   * Update calendar event
   */
  async updateEvent(id: number, updates: {
    title?: string;
    description?: string;
    start?: Date;
    end?: Date;
  }): Promise<EventSnapshot> {
    const snapshot = await this.storage.getSnapshot(id);

    if (!snapshot) {
      throw new Error(`Snapshot ${id} not found`);
    }

    logger.info('Updating calendar event', {
      snapshotId: id,
      calendarEventId: snapshot.calendarEventId,
    });

    try {
      // Update in calendar
      const updatedEvent = await this.calendarService.updateEvent(
        snapshot.calendarId,
        snapshot.calendarEventId,
        {
          summary: updates.title,
          description: updates.description,
          start: updates.start,
          end: updates.end,
        }
      );

      // Update snapshot
      const updatedSnapshot: EventSnapshot = {
        ...snapshot,
        eventTitle: updatedEvent.summary,
        eventDescription: updatedEvent.description || snapshot.eventDescription,
        eventStart: updatedEvent.start.toISOString(),
        eventEnd: updatedEvent.end.toISOString(),
        syncStatus: 'synced',
        lastSyncedAt: new Date().toISOString(),
      };

      // Note: This is a simplified version. In production, you'd update in storage.
      return updatedSnapshot;
    } catch (error) {
      logger.error('Failed to update event', error, {
        snapshotId: id,
        calendarEventId: snapshot.calendarEventId,
      });
      throw error;
    }
  }

  /**
   * Delete event
   */
  async deleteEvent(id: number): Promise<void> {
    const snapshot = await this.storage.getSnapshot(id);

    if (!snapshot) {
      throw new Error(`Snapshot ${id} not found`);
    }

    logger.info('Deleting calendar event', {
      snapshotId: id,
      calendarEventId: snapshot.calendarEventId,
    });

    try {
      // Delete from calendar
      await this.calendarService.deleteEvent(snapshot.calendarId, snapshot.calendarEventId);

      // Update snapshot status
      await this.storage.updateSyncStatus(id, 'deleted');
    } catch (error) {
      logger.error('Failed to delete event', error, {
        snapshotId: id,
        calendarEventId: snapshot.calendarEventId,
      });
      throw error;
    }
  }

  /**
   * Get events by sync status
   */
  async getEventsBySyncStatus(status: EventSnapshot['syncStatus'], limit: number = 50): Promise<EventSnapshot[]> {
    // This would need to be implemented in the storage adapter
    // For now, return empty array
    return [];
  }

  /**
   * Bulk sync snapshots
   */
  async bulkSync(ruleId?: number): Promise<{
    total: number;
    synced: number;
    modified: number;
    deleted: number;
    errors: number;
  }> {
    logger.info('Starting bulk sync', { ruleId });

    const snapshots = ruleId
      ? await this.storage.getSnapshotsByRule(ruleId)
      : []; // Would need getAllSnapshots method

    const results = {
      total: snapshots.length,
      synced: 0,
      modified: 0,
      deleted: 0,
      errors: 0,
    };

    for (const snapshot of snapshots) {
      try {
        const updated = await this.syncSnapshot(snapshot.id);
        results[updated.syncStatus]++;
      } catch (error) {
        results.errors++;
      }
    }

    logger.info('Bulk sync completed', results);

    return results;
  }
}
