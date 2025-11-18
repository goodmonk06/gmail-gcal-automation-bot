import Database from 'better-sqlite3';
import path from 'path';
import { Rule, ExecutionLog, RuleInput, ErrorDetail } from './types';

export class AppDatabase {
  private db: Database.Database;

  constructor(dbPath?: string) {
    const finalPath = dbPath || process.env.DATABASE_PATH || './data.db';
    this.db = new Database(finalPath);
    this.db.pragma('journal_mode = WAL');
  }

  // Initialize database schema
  initialize(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS rules (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        gmailQuery TEXT NOT NULL,
        calendarId TEXT NOT NULL,
        titleTemplate TEXT NOT NULL,
        descriptionTemplate TEXT NOT NULL,
        timeStrategy TEXT NOT NULL, -- JSON string
        isActive INTEGER NOT NULL DEFAULT 1,
        createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS execution_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ruleId INTEGER NOT NULL,
        gmailMessageId TEXT NOT NULL,
        status TEXT NOT NULL,
        error TEXT, -- JSON string
        createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (ruleId) REFERENCES rules(id)
      );

      CREATE INDEX IF NOT EXISTS idx_execution_logs_ruleId ON execution_logs(ruleId);
      CREATE INDEX IF NOT EXISTS idx_execution_logs_gmailMessageId ON execution_logs(gmailMessageId);
      CREATE INDEX IF NOT EXISTS idx_execution_logs_createdAt ON execution_logs(createdAt);
    `);
  }

  // Rule CRUD operations
  createRule(input: RuleInput): number {
    const stmt = this.db.prepare(`
      INSERT INTO rules (name, gmailQuery, calendarId, titleTemplate, descriptionTemplate, timeStrategy, isActive)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      input.name,
      input.gmailQuery,
      input.calendarId,
      input.titleTemplate,
      input.descriptionTemplate,
      JSON.stringify(input.timeStrategy),
      input.isActive ? 1 : 0
    );

    return result.lastInsertRowid as number;
  }

  getRule(id: number): Rule | undefined {
    const stmt = this.db.prepare('SELECT * FROM rules WHERE id = ?');
    const row = stmt.get(id) as any;
    return row ? this.deserializeRule(row) : undefined;
  }

  getAllActiveRules(): Rule[] {
    const stmt = this.db.prepare('SELECT * FROM rules WHERE isActive = 1 ORDER BY id');
    const rows = stmt.all() as any[];
    return rows.map(row => this.deserializeRule(row));
  }

  getAllRules(): Rule[] {
    const stmt = this.db.prepare('SELECT * FROM rules ORDER BY id');
    const rows = stmt.all() as any[];
    return rows.map(row => this.deserializeRule(row));
  }

  updateRule(id: number, input: Partial<RuleInput>): void {
    const fields: string[] = [];
    const values: any[] = [];

    if (input.name !== undefined) {
      fields.push('name = ?');
      values.push(input.name);
    }
    if (input.gmailQuery !== undefined) {
      fields.push('gmailQuery = ?');
      values.push(input.gmailQuery);
    }
    if (input.calendarId !== undefined) {
      fields.push('calendarId = ?');
      values.push(input.calendarId);
    }
    if (input.titleTemplate !== undefined) {
      fields.push('titleTemplate = ?');
      values.push(input.titleTemplate);
    }
    if (input.descriptionTemplate !== undefined) {
      fields.push('descriptionTemplate = ?');
      values.push(input.descriptionTemplate);
    }
    if (input.timeStrategy !== undefined) {
      fields.push('timeStrategy = ?');
      values.push(JSON.stringify(input.timeStrategy));
    }
    if (input.isActive !== undefined) {
      fields.push('isActive = ?');
      values.push(input.isActive ? 1 : 0);
    }

    if (fields.length === 0) return;

    fields.push('updatedAt = CURRENT_TIMESTAMP');
    values.push(id);

    const sql = `UPDATE rules SET ${fields.join(', ')} WHERE id = ?`;
    this.db.prepare(sql).run(...values);
  }

  deleteRule(id: number): void {
    this.db.prepare('DELETE FROM rules WHERE id = ?').run(id);
  }

  // ExecutionLog operations
  createExecutionLog(ruleId: number, gmailMessageId: string, status: 'success' | 'failed' | 'skipped', error?: ErrorDetail): number {
    const stmt = this.db.prepare(`
      INSERT INTO execution_logs (ruleId, gmailMessageId, status, error)
      VALUES (?, ?, ?, ?)
    `);

    const result = stmt.run(
      ruleId,
      gmailMessageId,
      status,
      error ? JSON.stringify(error) : null
    );

    return result.lastInsertRowid as number;
  }

  getExecutionLog(id: number): ExecutionLog | undefined {
    const stmt = this.db.prepare('SELECT * FROM execution_logs WHERE id = ?');
    const row = stmt.get(id) as any;
    return row ? this.deserializeExecutionLog(row) : undefined;
  }

  getExecutionLogsByRule(ruleId: number, limit: number = 100): ExecutionLog[] {
    const stmt = this.db.prepare('SELECT * FROM execution_logs WHERE ruleId = ? ORDER BY createdAt DESC LIMIT ?');
    const rows = stmt.all(ruleId, limit) as any[];
    return rows.map(row => this.deserializeExecutionLog(row));
  }

  getRecentExecutionLogs(limit: number = 50): ExecutionLog[] {
    const stmt = this.db.prepare('SELECT * FROM execution_logs ORDER BY createdAt DESC LIMIT ?');
    const rows = stmt.all(limit) as any[];
    return rows.map(row => this.deserializeExecutionLog(row));
  }

  checkMessageProcessed(gmailMessageId: string): boolean {
    const stmt = this.db.prepare('SELECT COUNT(*) as count FROM execution_logs WHERE gmailMessageId = ?');
    const result = stmt.get(gmailMessageId) as { count: number };
    return result.count > 0;
  }

  // Serialization helpers
  private deserializeRule(row: any): Rule {
    return {
      id: row.id,
      name: row.name,
      gmailQuery: row.gmailQuery,
      calendarId: row.calendarId,
      titleTemplate: row.titleTemplate,
      descriptionTemplate: row.descriptionTemplate,
      timeStrategy: JSON.parse(row.timeStrategy),
      isActive: row.isActive === 1,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    };
  }

  private deserializeExecutionLog(row: any): ExecutionLog {
    return {
      id: row.id,
      ruleId: row.ruleId,
      gmailMessageId: row.gmailMessageId,
      status: row.status,
      error: row.error ? JSON.parse(row.error) : null,
      createdAt: row.createdAt
    };
  }

  close(): void {
    this.db.close();
  }
}
