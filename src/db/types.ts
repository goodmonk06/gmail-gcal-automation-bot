export interface Rule {
  id: number;
  name: string;
  description: string;
  gmailQuery: string;
  calendarId: string;
  titleTemplate: string;
  descriptionTemplate: string;
  timeStrategy: TimeStrategy;
  isActive: boolean;
  priority: number; // Higher priority rules execute first
  retryConfig: RetryConfig;
  metadata: Record<string, any>; // Flexible metadata storage
  tags: string[]; // For filtering and organization
  scheduleId: number | null; // Link to RuleSchedule
  templateId: number | null; // If cloned from template
  executionCount: number;
  lastExecutedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TimeStrategy {
  type: 'parse_from_body' | 'fixed_delay' | 'fixed_datetime';
  // parse_from_body: メール本文から日時を抽出
  // fixed_delay: メール受信からN時間後
  // fixed_datetime: 特定の日時を指定

  delayHours?: number; // fixed_delay用
  fixedDate?: string;  // fixed_datetime用
  durationMinutes?: number; // 予定の長さ（分）
}

export interface ExecutionLog {
  id: number;
  ruleId: number;
  gmailMessageId: string;
  status: 'success' | 'failed' | 'skipped';
  error: ErrorDetail | null;
  createdAt: string;
}

export interface ErrorDetail {
  message: string;
  stack?: string;
  code?: string;
}

// Retry configuration
export interface RetryConfig {
  maxRetries: number;
  retryDelayMs: number;
  exponentialBackoff: boolean;
}

// Rule Template entity
export interface RuleTemplate {
  id: number;
  name: string;
  description: string;
  category: string; // e.g., "meeting", "task", "reminder"
  gmailQueryTemplate: string;
  titleTemplate: string;
  descriptionTemplate: string;
  timeStrategy: TimeStrategy;
  retryConfig: RetryConfig;
  metadata: Record<string, any>;
  tags: string[];
  isPublic: boolean;
  usageCount: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// Rule Schedule entity
export interface RuleSchedule {
  id: number;
  name: string;
  cronExpression: string | null; // e.g., "0 */15 * * * *"
  timeWindows: TimeWindow[];
  timezone: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TimeWindow {
  dayOfWeek: number[]; // 0-6 (Sunday-Saturday)
  startTime: string; // HH:mm format
  endTime: string;
}

// Event Snapshot entity
export interface EventSnapshot {
  id: number;
  ruleId: number;
  executionLogId: number;
  gmailMessageId: string;
  calendarEventId: string;
  calendarId: string;
  eventTitle: string;
  eventDescription: string;
  eventStart: string;
  eventEnd: string;
  eventLink: string;
  syncStatus: 'synced' | 'modified' | 'deleted' | 'out_of_sync';
  lastSyncedAt: string;
  createdAt: string;
}

// Notification Preference entity
export interface NotificationPreference {
  id: number;
  userId: string; // Future: for multi-user support
  ruleId: number | null; // null = global preference
  channels: NotificationChannel[];
  events: NotificationEvent[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationChannel {
  type: 'email' | 'slack' | 'webhook' | 'discord';
  config: Record<string, any>;
  isActive: boolean;
}

export type NotificationEvent = 'rule_success' | 'rule_failure' | 'rule_skipped' | 'daily_summary';

// Rule Tag entity
export interface RuleTag {
  id: number;
  name: string;
  color: string; // Hex color code
  description: string;
  createdAt: string;
}

// Analytics data
export interface RuleAnalytics {
  ruleId: number;
  period: 'hour' | 'day' | 'week' | 'month';
  periodStart: string;
  executionCount: number;
  successCount: number;
  failureCount: number;
  skippedCount: number;
  avgProcessingTimeMs: number;
  updatedAt: string;
}

export interface RuleInput {
  name: string;
  description?: string;
  gmailQuery: string;
  calendarId: string;
  titleTemplate: string;
  descriptionTemplate: string;
  timeStrategy: TimeStrategy;
  isActive: boolean;
  priority?: number;
  retryConfig?: RetryConfig;
  metadata?: Record<string, any>;
  tags?: string[];
  scheduleId?: number | null;
  templateId?: number | null;
}

export interface RuleTemplateInput {
  name: string;
  description: string;
  category: string;
  gmailQueryTemplate: string;
  titleTemplate: string;
  descriptionTemplate: string;
  timeStrategy: TimeStrategy;
  retryConfig?: RetryConfig;
  metadata?: Record<string, any>;
  tags?: string[];
  isPublic?: boolean;
  createdBy: string;
}

export interface EventSnapshotInput {
  ruleId: number;
  executionLogId: number;
  gmailMessageId: string;
  calendarEventId: string;
  calendarId: string;
  eventTitle: string;
  eventDescription: string;
  eventStart: string;
  eventEnd: string;
  eventLink: string;
  syncStatus?: 'synced' | 'modified' | 'deleted' | 'out_of_sync';
}
