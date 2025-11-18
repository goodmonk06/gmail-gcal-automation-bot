import { AppDatabase } from './database';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Seed script to populate database with realistic demo data
 */
async function seed() {
  console.log('Starting database seed...');

  const db = new AppDatabase();

  try {
    // Ensure database schema exists
    db.initialize();

    // Clear existing data (optional - comment out if you want to keep existing data)
    console.log('Clearing existing rules...');
    const existingRules = db.getAllRules();
    existingRules.forEach(rule => db.deleteRule(rule.id));

    // Seed realistic rules
    console.log('Creating seed rules...');

    // Rule 1: Meeting invitations from email
    const meetingRuleId = db.createRule({
      name: 'ミーティング招待メールから予定作成',
      gmailQuery: 'subject:(ミーティング OR 会議 OR meeting) -label:processed',
      calendarId: 'primary',
      titleTemplate: '{{subject}}',
      descriptionTemplate: '送信者: {{from}}\n\n内容:\n{{body}}',
      timeStrategy: {
        type: 'parse_from_body',
        durationMinutes: 60,
      },
      isActive: true,
    });
    console.log(`✓ Created meeting rule (ID: ${meetingRuleId})`);

    // Rule 2: Task reminders
    const taskRuleId = db.createRule({
      name: 'TODOメールから3時間後にリマインダー',
      gmailQuery: 'label:todo OR subject:TODO',
      calendarId: 'primary',
      titleTemplate: '📋 TODO: {{subject}}',
      descriptionTemplate: 'タスク詳細:\n{{snippet}}\n\nメールリンク: https://mail.google.com',
      timeStrategy: {
        type: 'fixed_delay',
        delayHours: 3,
        durationMinutes: 30,
      },
      isActive: true,
    });
    console.log(`✓ Created task reminder rule (ID: ${taskRuleId})`);

    // Rule 3: Important emails - next day morning review
    const importantRuleId = db.createRule({
      name: '重要メールの翌朝レビュー',
      gmailQuery: 'is:important OR label:important',
      calendarId: 'primary',
      titleTemplate: '⭐ 重要メールレビュー: {{subject}}',
      descriptionTemplate: '差出人: {{from}}\n件名: {{subject}}\n\nスニペット:\n{{snippet}}',
      timeStrategy: {
        type: 'fixed_delay',
        delayHours: 16,
        durationMinutes: 15,
      },
      isActive: true,
    });
    console.log(`✓ Created important email rule (ID: ${importantRuleId})`);

    // Rule 4: Weekly report emails
    const reportRuleId = db.createRule({
      name: '週次報告メールから定例MTG作成',
      gmailQuery: 'subject:(週次 OR 週報 OR weekly report)',
      calendarId: 'primary',
      titleTemplate: '📊 {{subject}} - レビュー',
      descriptionTemplate: '{{body}}',
      timeStrategy: {
        type: 'fixed_delay',
        delayHours: 2,
        durationMinutes: 45,
      },
      isActive: true,
    });
    console.log(`✓ Created weekly report rule (ID: ${reportRuleId})`);

    // Rule 5: Inactive example rule (for testing inactive filtering)
    const inactiveRuleId = db.createRule({
      name: '[無効] テストルール',
      gmailQuery: 'subject:test',
      calendarId: 'primary',
      titleTemplate: 'Test: {{subject}}',
      descriptionTemplate: '{{body}}',
      timeStrategy: {
        type: 'fixed_delay',
        delayHours: 1,
        durationMinutes: 30,
      },
      isActive: false,
    });
    console.log(`✓ Created inactive test rule (ID: ${inactiveRuleId})`);

    // Add some sample execution logs
    console.log('Creating sample execution logs...');

    db.createExecutionLog(meetingRuleId, 'msg_001', 'success');
    db.createExecutionLog(meetingRuleId, 'msg_002', 'success');
    db.createExecutionLog(taskRuleId, 'msg_003', 'success');
    db.createExecutionLog(taskRuleId, 'msg_004', 'failed', {
      message: 'Could not parse date from email body',
      code: 'PARSE_ERROR',
    });
    db.createExecutionLog(importantRuleId, 'msg_005', 'skipped');
    db.createExecutionLog(reportRuleId, 'msg_006', 'success');

    console.log('✓ Created sample execution logs');

    // Print summary
    console.log('');
    console.log('='.repeat(60));
    console.log('SEED SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total rules created: 5 (4 active, 1 inactive)`);
    console.log(`Total execution logs: 6`);
    console.log('');
    console.log('You can now start the server with:');
    console.log('  npm run dev');
    console.log('');
    console.log('And visit http://localhost:3000 to see the dashboard');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  } finally {
    db.close();
  }
}

seed();
