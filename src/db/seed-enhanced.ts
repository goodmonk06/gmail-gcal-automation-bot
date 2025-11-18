import { AppDatabase } from './database';
import { InMemoryTemplateRepository, TemplateService } from '../domain/template.service';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Enhanced Seed Script - Phase 3
 * Populates database with comprehensive demo data including rules, templates, and logs
 */
async function seedEnhanced() {
  console.log('🌱 Starting Enhanced Database Seed (Phase 3)...\n');

  const db = new AppDatabase();
  const templateRepo = new InMemoryTemplateRepository();
  const templateService = new TemplateService(templateRepo);

  try {
    db.initialize();

    // Clear existing data
    console.log('Clearing existing data...');
    const existingRules = db.getAllRules();
    existingRules.forEach(rule => db.deleteRule(rule.id));

    // ═══════════════════════════════════════════════════════════
    // 1. CREATE RULE TEMPLATES (Marketplace)
    // ═══════════════════════════════════════════════════════════
    console.log('\n📚 Creating Rule Templates...');

    const templates = await Promise.all([
      // Meeting templates
      templateService.createTemplate({
        name: '会議招待からカレンダー作成',
        description: 'メールの会議招待を自動的にカレンダーに追加します',
        category: 'meeting',
        gmailQueryTemplate: 'subject:(会議 OR ミーティング OR meeting) -label:processed',
        titleTemplate: '📅 {{subject}}',
        descriptionTemplate: '送信者: {{from}}\n\n{{body}}',
        timeStrategy: { type: 'parse_from_body', durationMinutes: 60 },
        retryConfig: { maxRetries: 3, retryDelayMs: 2000, exponentialBackoff: true },
        tags: ['meeting', 'automation', 'work'],
        isPublic: true,
        createdBy: 'system',
      }),

      // Task templates
      templateService.createTemplate({
        name: 'TODOリマインダー（翌日）',
        description: 'TODOラベルのメールを翌日の朝にリマインド',
        category: 'task',
        gmailQueryTemplate: 'label:todo -label:done',
        titleTemplate: '✅ TODO: {{subject}}',
        descriptionTemplate: 'タスク詳細:\n{{snippet}}\n\nメールを確認: https://mail.google.com',
        timeStrategy: { type: 'fixed_delay', delayHours: 24, durationMinutes: 30 },
        retryConfig: { maxRetries: 2, retryDelayMs: 1000, exponentialBackoff: false },
        tags: ['task', 'reminder', 'productivity'],
        isPublic: true,
        createdBy: 'system',
      }),

      templateService.createTemplate({
        name: '緊急タスク（3時間後）',
        description: '重要なタスクを3時間後にリマインド',
        category: 'task',
        gmailQueryTemplate: 'label:urgent OR subject:urgent',
        titleTemplate: '🚨 URGENT: {{subject}}',
        descriptionTemplate: '{{body}}',
        timeStrategy: { type: 'fixed_delay', delayHours: 3, durationMinutes: 15 },
        retryConfig: { maxRetries: 5, retryDelayMs: 500, exponentialBackoff: true },
        tags: ['urgent', 'task', 'high-priority'],
        isPublic: true,
        createdBy: 'system',
      }),

      // Reminder templates
      templateService.createTemplate({
        name: '重要メールレビュー（翌朝9時）',
        description: '重要メールを翌朝レビュー',
        category: 'reminder',
        gmailQueryTemplate: 'is:important OR is:starred',
        titleTemplate: '⭐ レビュー: {{subject}}',
        descriptionTemplate: 'From: {{from}}\n\n{{snippet}}',
        timeStrategy: { type: 'fixed_delay', delayHours: 16, durationMinutes: 20 },
        tags: ['important', 'review', 'morning'],
        isPublic: true,
        createdBy: 'system',
      }),

      // Report templates
      templateService.createTemplate({
        name: '週次報告ミーティング設定',
        description: '週次報告メールから定例MTGを自動作成',
        category: 'meeting',
        gmailQueryTemplate: 'subject:(週報 OR weekly OR 週次)',
        titleTemplate: '📊 {{subject}} - レビューMTG',
        descriptionTemplate: '報告内容:\n{{body}}',
        timeStrategy: { type: 'fixed_delay', delayHours: 48, durationMinutes: 45 },
        tags: ['report', 'meeting', 'weekly'],
        isPublic: true,
        createdBy: 'system',
      }),

      // Custom templates
      templateService.createTemplate({
        name: 'プロジェクト進捗確認',
        description: 'プロジェクト関連メールから進捗確認MTGを設定',
        category: 'meeting',
        gmailQueryTemplate: 'subject:project label:work',
        titleTemplate: '🎯 Project Review: {{subject}}',
        descriptionTemplate: '{{body}}',
        timeStrategy: { type: 'parse_from_body', durationMinutes: 30 },
        tags: ['project', 'review'],
        isPublic: false,
        createdBy: 'user_advanced',
      }),
    ]);

    console.log(`✓ Created ${templates.length} templates`);

    // ═══════════════════════════════════════════════════════════
    // 2. CREATE RULES (From Templates and Custom)
    // ═══════════════════════════════════════════════════════════
    console.log('\n🎯 Creating Rules...');

    const rules = [];

    // Clone some templates to active rules
    const meetingRule = await templateService.cloneToRule(templates[0].id, {
      name: '会議招待 → カレンダー (アクティブ)',
      isActive: true,
      calendarId: 'primary',
      priority: 10,
    });
    const meetingRuleId = db.createRule(meetingRule);
    rules.push(meetingRuleId);

    const todoRule = await templateService.cloneToRule(templates[1].id, {
      name: 'TODOタスク管理',
      isActive: true,
      calendarId: 'primary',
      priority: 5,
    });
    const todoRuleId = db.createRule(todoRule);
    rules.push(todoRuleId);

    const urgentRule = await templateService.cloneToRule(templates[2].id, {
      name: '緊急タスク対応',
      isActive: true,
      calendarId: 'primary',
      priority: 20,
      metadata: { alertChannel: 'slack' },
    });
    const urgentRuleId = db.createRule(urgentRule);
    rules.push(urgentRuleId);

    // Create custom rules
    const customRule1 = db.createRule({
      name: 'チームMTG (毎週金曜)',
      description: 'チームミーティングの招待を自動追加',
      gmailQuery: 'from:team-lead@company.com subject:"Team Meeting"',
      calendarId: 'primary',
      titleTemplate: '👥 {{subject}}',
      descriptionTemplate: 'Team Meeting\n\n{{body}}',
      timeStrategy: { type: 'parse_from_body', durationMinutes: 60 },
      isActive: true,
      priority: 15,
      retryConfig: { maxRetries: 3, retryDelayMs: 1000, exponentialBackoff: true },
      tags: ['team', 'recurring'],
      metadata: { recurring: 'weekly', day: 'friday' },
    });
    rules.push(customRule1);

    const customRule2 = db.createRule({
      name: '顧客対応リマインダー',
      description: '顧客からのメールに5時間後リマインド',
      gmailQuery: 'from:*@customer.com',
      calendarId: 'primary',
      titleTemplate: '📞 顧客対応: {{subject}}',
      descriptionTemplate: 'Customer: {{from}}\n\n{{snippet}}',
      timeStrategy: { type: 'fixed_delay', delayHours: 5, durationMinutes: 30 },
      isActive: true,
      priority: 8,
      retryConfig: { maxRetries: 2, retryDelayMs: 1500, exponentialBackoff: false },
      tags: ['customer', 'support'],
      metadata: { department: 'sales' },
    });
    rules.push(customRule2);

    // Inactive rule for testing
    const inactiveRule = db.createRule({
      name: '[無効] テスト用ルール',
      description: 'テスト・デモ用の無効化されたルール',
      gmailQuery: 'subject:test',
      calendarId: 'primary',
      titleTemplate: 'Test: {{subject}}',
      descriptionTemplate: '{{body}}',
      timeStrategy: { type: 'fixed_delay', delayHours: 1, durationMinutes: 15 },
      isActive: false,
      priority: 0,
      retryConfig: { maxRetries: 1, retryDelayMs: 500, exponentialBackoff: false },
      tags: ['test'],
      metadata: { purpose: 'testing' },
    });
    rules.push(inactiveRule);

    console.log(`✓ Created ${rules.length} rules`);

    // ═══════════════════════════════════════════════════════════
    // 3. CREATE EXECUTION LOGS (Historical Data)
    // ═══════════════════════════════════════════════════════════
    console.log('\n📝 Creating Execution Logs...');

    let logCount = 0;

    // Success logs for meeting rule
    for (let i = 1; i <= 5; i++) {
      db.createExecutionLog(meetingRuleId, `msg_meeting_${i}`, 'success');
      logCount++;
    }

    // Success and failed logs for TODO rule
    for (let i = 1; i <= 3; i++) {
      db.createExecutionLog(todoRuleId, `msg_todo_${i}`, 'success');
      logCount++;
    }
    db.createExecutionLog(todoRuleId, 'msg_todo_4', 'failed', {
      message: 'Could not parse date from email body',
      code: 'PARSE_ERROR',
    });
    logCount++;

    // Urgent rule with mixed results
    db.createExecutionLog(urgentRuleId, 'msg_urgent_1', 'success');
    db.createExecutionLog(urgentRuleId, 'msg_urgent_2', 'success');
    db.createExecutionLog(urgentRuleId, 'msg_urgent_3', 'failed', {
      message: 'Calendar API rate limit exceeded',
      code: 'RATE_LIMIT',
    });
    logCount += 3;

    // Custom rule logs
    db.createExecutionLog(customRule1, 'msg_team_1', 'success');
    db.createExecutionLog(customRule1, 'msg_team_2', 'skipped');
    db.createExecutionLog(customRule2, 'msg_customer_1', 'success');
    db.createExecutionLog(customRule2, 'msg_customer_2', 'success');
    db.createExecutionLog(customRule2, 'msg_customer_3', 'failed', {
      message: 'Invalid calendar ID',
      code: 'INVALID_CALENDAR',
    });
    logCount += 5;

    console.log(`✓ Created ${logCount} execution logs`);

    // ═══════════════════════════════════════════════════════════
    // 4. SUMMARY
    // ═══════════════════════════════════════════════════════════
    console.log('\n' + '═'.repeat(80));
    console.log('SEED SUMMARY (Phase 3 Enhanced)');
    console.log('═'.repeat(80));
    console.log(`✓ Templates created:    ${templates.length} (${templates.filter(t => t.isPublic).length} public)`);
    console.log(`✓ Rules created:        ${rules.length} (${rules.length - 1} active, 1 inactive)`);
    console.log(`✓ Execution logs:       ${logCount}`);
    console.log(`✓ Template categories:  meeting, task, reminder`);
    console.log('');
    console.log('Categories breakdown:');
    const meetingCount = templates.filter(t => t.category === 'meeting').length;
    const taskCount = templates.filter(t => t.category === 'task').length;
    const reminderCount = templates.filter(t => t.category === 'reminder').length;
    console.log(`  📅 Meeting:   ${meetingCount} templates`);
    console.log(`  ✅ Task:      ${taskCount} templates`);
    console.log(`  ⏰ Reminder:  ${reminderCount} templates`);
    console.log('');
    console.log('Next steps:');
    console.log('  1. Start server:          npm run dev');
    console.log('  2. View dashboard:        http://localhost:3000');
    console.log('  3. Browse templates:      GET /api/templates');
    console.log('  4. View rules:            npm run cli rules:list');
    console.log('  5. Check stats:           npm run cli db:stats');
    console.log('═'.repeat(80));

  } catch (error) {
    console.error('\n❌ Seed failed:', error);
    process.exit(1);
  } finally {
    db.close();
  }
}

seedEnhanced();
