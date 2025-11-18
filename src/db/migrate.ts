import { AppDatabase } from './database';
import dotenv from 'dotenv';

dotenv.config();

async function migrate() {
  console.log('Starting database migration...');

  const db = new AppDatabase();

  try {
    db.initialize();
    console.log('✓ Database schema initialized successfully');

    // Insert sample rules for demonstration
    const sampleRuleId = db.createRule({
      name: 'ミーティング通知からカレンダー追加',
      gmailQuery: 'label:meeting subject:ミーティング',
      calendarId: 'primary',
      titleTemplate: '{{subject}}',
      descriptionTemplate: 'メール本文:\n{{body}}',
      timeStrategy: {
        type: 'parse_from_body',
        durationMinutes: 60
      },
      isActive: true
    });

    console.log(`✓ Sample rule created with ID: ${sampleRuleId}`);

    const delayRuleId = db.createRule({
      name: 'タスクリマインダー（3時間後）',
      gmailQuery: 'label:todo',
      calendarId: 'primary',
      titleTemplate: 'TODO: {{subject}}',
      descriptionTemplate: 'タスク詳細:\n{{snippet}}',
      timeStrategy: {
        type: 'fixed_delay',
        delayHours: 3,
        durationMinutes: 30
      },
      isActive: true
    });

    console.log(`✓ Sample rule created with ID: ${delayRuleId}`);

  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    db.close();
  }

  console.log('Migration completed successfully!');
}

migrate();
