import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AppDatabase } from './database';
import { RuleInput, TimeStrategy } from './types';
import fs from 'fs';

const TEST_DB_PATH = './test-data.db';

describe('AppDatabase', () => {
  let db: AppDatabase;

  beforeEach(() => {
    // Clean up test database if it exists
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
    db = new AppDatabase(TEST_DB_PATH);
    db.initialize();
  });

  afterEach(() => {
    db.close();
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
  });

  describe('Rule CRUD operations', () => {
    const sampleRuleInput: RuleInput = {
      name: 'Test Rule',
      gmailQuery: 'subject:test',
      calendarId: 'primary',
      titleTemplate: '{{subject}}',
      descriptionTemplate: '{{body}}',
      timeStrategy: {
        type: 'fixed_delay',
        delayHours: 1,
        durationMinutes: 60,
      } as TimeStrategy,
      isActive: true,
    };

    it('should create a new rule', () => {
      const ruleId = db.createRule(sampleRuleInput);
      expect(ruleId).toBeGreaterThan(0);

      const rule = db.getRule(ruleId);
      expect(rule).toBeDefined();
      expect(rule!.name).toBe(sampleRuleInput.name);
      expect(rule!.gmailQuery).toBe(sampleRuleInput.gmailQuery);
      expect(rule!.isActive).toBe(true);
    });

    it('should get rule by id', () => {
      const ruleId = db.createRule(sampleRuleInput);
      const rule = db.getRule(ruleId);

      expect(rule).toBeDefined();
      expect(rule!.id).toBe(ruleId);
      expect(rule!.name).toBe(sampleRuleInput.name);
      expect(rule!.timeStrategy.type).toBe('fixed_delay');
    });

    it('should return undefined for non-existent rule', () => {
      const rule = db.getRule(9999);
      expect(rule).toBeUndefined();
    });

    it('should get all rules', () => {
      db.createRule(sampleRuleInput);
      db.createRule({ ...sampleRuleInput, name: 'Rule 2' });
      db.createRule({ ...sampleRuleInput, name: 'Rule 3', isActive: false });

      const allRules = db.getAllRules();
      expect(allRules).toHaveLength(3);
    });

    it('should get only active rules', () => {
      db.createRule(sampleRuleInput);
      db.createRule({ ...sampleRuleInput, name: 'Rule 2' });
      db.createRule({ ...sampleRuleInput, name: 'Inactive Rule', isActive: false });

      const activeRules = db.getAllActiveRules();
      expect(activeRules).toHaveLength(2);
      expect(activeRules.every(r => r.isActive)).toBe(true);
    });

    it('should update rule', () => {
      const ruleId = db.createRule(sampleRuleInput);

      db.updateRule(ruleId, {
        name: 'Updated Name',
        isActive: false,
      });

      const updated = db.getRule(ruleId);
      expect(updated!.name).toBe('Updated Name');
      expect(updated!.isActive).toBe(false);
      expect(updated!.gmailQuery).toBe(sampleRuleInput.gmailQuery); // unchanged
    });

    it('should delete rule', () => {
      const ruleId = db.createRule(sampleRuleInput);
      expect(db.getRule(ruleId)).toBeDefined();

      db.deleteRule(ruleId);
      expect(db.getRule(ruleId)).toBeUndefined();
    });
  });

  describe('ExecutionLog operations', () => {
    it('should create execution log', () => {
      const ruleId = db.createRule({
        name: 'Test Rule',
        gmailQuery: 'subject:test',
        calendarId: 'primary',
        titleTemplate: '{{subject}}',
        descriptionTemplate: '{{body}}',
        timeStrategy: { type: 'fixed_delay', delayHours: 1, durationMinutes: 60 },
        isActive: true,
      });

      const logId = db.createExecutionLog(ruleId, 'msg_001', 'success');
      expect(logId).toBeGreaterThan(0);

      const log = db.getExecutionLog(logId);
      expect(log).toBeDefined();
      expect(log!.ruleId).toBe(ruleId);
      expect(log!.gmailMessageId).toBe('msg_001');
      expect(log!.status).toBe('success');
    });

    it('should get logs by rule id', () => {
      const ruleId = db.createRule({
        name: 'Test Rule',
        gmailQuery: 'subject:test',
        calendarId: 'primary',
        titleTemplate: '{{subject}}',
        descriptionTemplate: '{{body}}',
        timeStrategy: { type: 'fixed_delay', delayHours: 1, durationMinutes: 60 },
        isActive: true,
      });

      db.createExecutionLog(ruleId, 'msg_001', 'success');
      db.createExecutionLog(ruleId, 'msg_002', 'failed', { message: 'Test error' });
      db.createExecutionLog(ruleId, 'msg_003', 'skipped');

      const logs = db.getExecutionLogsByRule(ruleId);
      expect(logs).toHaveLength(3);
      expect(logs[0].status).toBe('skipped'); // Most recent first
    });

    it('should check if message has been processed', () => {
      const ruleId = db.createRule({
        name: 'Test Rule',
        gmailQuery: 'subject:test',
        calendarId: 'primary',
        titleTemplate: '{{subject}}',
        descriptionTemplate: '{{body}}',
        timeStrategy: { type: 'fixed_delay', delayHours: 1, durationMinutes: 60 },
        isActive: true,
      });

      expect(db.checkMessageProcessed('msg_001')).toBe(false);

      db.createExecutionLog(ruleId, 'msg_001', 'success');

      expect(db.checkMessageProcessed('msg_001')).toBe(true);
      expect(db.checkMessageProcessed('msg_002')).toBe(false);
    });

    it('should get recent execution logs', () => {
      const ruleId1 = db.createRule({
        name: 'Rule 1',
        gmailQuery: 'subject:test1',
        calendarId: 'primary',
        titleTemplate: '{{subject}}',
        descriptionTemplate: '{{body}}',
        timeStrategy: { type: 'fixed_delay', delayHours: 1, durationMinutes: 60 },
        isActive: true,
      });

      const ruleId2 = db.createRule({
        name: 'Rule 2',
        gmailQuery: 'subject:test2',
        calendarId: 'primary',
        titleTemplate: '{{subject}}',
        descriptionTemplate: '{{body}}',
        timeStrategy: { type: 'fixed_delay', delayHours: 1, durationMinutes: 60 },
        isActive: true,
      });

      db.createExecutionLog(ruleId1, 'msg_001', 'success');
      db.createExecutionLog(ruleId2, 'msg_002', 'success');
      db.createExecutionLog(ruleId1, 'msg_003', 'failed', { message: 'Error' });

      const recentLogs = db.getRecentExecutionLogs(10);
      expect(recentLogs).toHaveLength(3);
      // Should be ordered by most recent first
      expect(recentLogs[0].gmailMessageId).toBe('msg_003');
    });
  });
});
