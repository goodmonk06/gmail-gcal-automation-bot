/**
 * Event Storage Adapter Interface
 *
 * Provides abstraction for storing event snapshots,
 * allowing different storage backends (DB, S3, etc.)
 */

import { EventSnapshot, EventSnapshotInput } from '../../db/types';

export interface IEventStorageAdapter {
  /**
   * Store an event snapshot
   */
  storeSnapshot(input: EventSnapshotInput): Promise<EventSnapshot>;

  /**
   * Retrieve event snapshot by ID
   */
  getSnapshot(id: number): Promise<EventSnapshot | null>;

  /**
   * Get snapshots for a rule
   */
  getSnapshotsByRule(ruleId: number, limit?: number): Promise<EventSnapshot[]>;

  /**
   * Update sync status
   */
  updateSyncStatus(id: number, status: EventSnapshot['syncStatus']): Promise<void>;

  /**
   * Delete snapshot
   */
  deleteSnapshot(id: number): Promise<void>;

  /**
   * Check if adapter is configured
   */
  isConfigured(): boolean;

  /**
   * Get adapter name
   */
  getName(): string;
}

/**
 * In-memory Event Storage (for testing)
 */
export class InMemoryEventStorage implements IEventStorageAdapter {
  private snapshots: Map<number, EventSnapshot> = new Map();
  private nextId: number = 1;

  async storeSnapshot(input: EventSnapshotInput): Promise<EventSnapshot> {
    const snapshot: EventSnapshot = {
      id: this.nextId++,
      ...input,
      syncStatus: input.syncStatus || 'synced',
      lastSyncedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    this.snapshots.set(snapshot.id, snapshot);
    return snapshot;
  }

  async getSnapshot(id: number): Promise<EventSnapshot | null> {
    return this.snapshots.get(id) || null;
  }

  async getSnapshotsByRule(ruleId: number, limit: number = 100): Promise<EventSnapshot[]> {
    const filtered = Array.from(this.snapshots.values())
      .filter(s => s.ruleId === ruleId)
      .slice(0, limit);

    return filtered;
  }

  async updateSyncStatus(id: number, status: EventSnapshot['syncStatus']): Promise<void> {
    const snapshot = this.snapshots.get(id);
    if (snapshot) {
      snapshot.syncStatus = status;
      snapshot.lastSyncedAt = new Date().toISOString();
    }
  }

  async deleteSnapshot(id: number): Promise<void> {
    this.snapshots.delete(id);
  }

  isConfigured(): boolean {
    return true;
  }

  getName(): string {
    return 'in-memory';
  }

  // Utility methods
  clear(): void {
    this.snapshots.clear();
    this.nextId = 1;
  }

  getAll(): EventSnapshot[] {
    return Array.from(this.snapshots.values());
  }
}

/**
 * Database Event Storage (stub - to be implemented with actual DB)
 */
export class DatabaseEventStorage implements IEventStorageAdapter {
  constructor(private db: any) {}

  async storeSnapshot(input: EventSnapshotInput): Promise<EventSnapshot> {
    // TODO: Implement actual database insert
    throw new Error('Not implemented');
  }

  async getSnapshot(id: number): Promise<EventSnapshot | null> {
    // TODO: Implement actual database query
    throw new Error('Not implemented');
  }

  async getSnapshotsByRule(ruleId: number, limit: number = 100): Promise<EventSnapshot[]> {
    // TODO: Implement actual database query
    throw new Error('Not implemented');
  }

  async updateSyncStatus(id: number, status: EventSnapshot['syncStatus']): Promise<void> {
    // TODO: Implement actual database update
    throw new Error('Not implemented');
  }

  async deleteSnapshot(id: number): Promise<void> {
    // TODO: Implement actual database delete
    throw new Error('Not implemented');
  }

  isConfigured(): boolean {
    return !!this.db;
  }

  getName(): string {
    return 'database';
  }
}
