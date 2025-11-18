export interface Rule {
  id: number;
  name: string;
  gmailQuery: string;
  calendarId: string;
  titleTemplate: string;
  descriptionTemplate: string;
  timeStrategy: TimeStrategy;
  isActive: boolean;
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

export interface RuleInput {
  name: string;
  gmailQuery: string;
  calendarId: string;
  titleTemplate: string;
  descriptionTemplate: string;
  timeStrategy: TimeStrategy;
  isActive: boolean;
}
