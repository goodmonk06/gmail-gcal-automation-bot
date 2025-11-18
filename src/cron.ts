#!/usr/bin/env node
/**
 * Cron script for automated rule execution
 *
 * Usage:
 *   npm run cron
 *
 * Recommended crontab entry (run every 15 minutes):
 *   *\/15 * * * * cd /path/to/gmail-gcal-automation-bot && npm run cron >> cron.log 2>&1
 */

import { validateConfig } from './config/env';
import { getGoogleClientManager } from './config/googleClient';
import { AppDatabase } from './db/database';
import { RuleEngine } from './rules/ruleEngine';
import { GmailWatcher } from './services/gmailWatcher';
import { CalendarService } from './services/calendarService';

async function main() {
  console.log('='.repeat(60));
  console.log(`Gmail-Calendar Automation Bot - Cron Run`);
  console.log(`Started at: ${new Date().toISOString()}`);
  console.log('='.repeat(60));

  // Validate configuration
  validateConfig();

  // Initialize database
  const db = new AppDatabase();
  db.initialize();

  // Check authentication
  const clientManager = getGoogleClientManager();
  if (!clientManager.isAuthenticated()) {
    console.error('✗ Not authenticated. Please run the server and authenticate first.');
    console.error('  Run: npm run dev');
    console.error('  Then visit: http://localhost:3000/auth');
    process.exit(1);
  }

  console.log('✓ Authenticated');

  // Initialize services
  const gmailWatcher = new GmailWatcher(clientManager);
  const calendarService = new CalendarService(clientManager);
  const ruleEngine = new RuleEngine(db, gmailWatcher, calendarService);

  try {
    // Execute all active rules
    const results = await ruleEngine.executeAllRules();

    // Print summary
    console.log('');
    console.log('-'.repeat(60));
    console.log('EXECUTION SUMMARY');
    console.log('-'.repeat(60));

    let totalProcessed = 0;
    let totalSuccess = 0;
    let totalFailed = 0;
    let totalSkipped = 0;

    results.forEach((result, index) => {
      console.log(`\nRule ${index + 1}: ${result.ruleName} (ID: ${result.ruleId})`);
      console.log(`  Processed: ${result.processedCount}`);
      console.log(`  Success:   ${result.successCount}`);
      console.log(`  Failed:    ${result.failedCount}`);
      console.log(`  Skipped:   ${result.skippedCount}`);

      if (result.errors.length > 0) {
        console.log(`  Errors:`);
        result.errors.forEach(err => {
          console.log(`    - Message ${err.messageId}: ${err.error}`);
        });
      }

      totalProcessed += result.processedCount;
      totalSuccess += result.successCount;
      totalFailed += result.failedCount;
      totalSkipped += result.skippedCount;
    });

    console.log('');
    console.log('-'.repeat(60));
    console.log('OVERALL TOTALS');
    console.log('-'.repeat(60));
    console.log(`Rules Executed: ${results.length}`);
    console.log(`Total Processed: ${totalProcessed}`);
    console.log(`Total Success: ${totalSuccess}`);
    console.log(`Total Failed: ${totalFailed}`);
    console.log(`Total Skipped: ${totalSkipped}`);
    console.log('');
    console.log(`Completed at: ${new Date().toISOString()}`);
    console.log('='.repeat(60));

    // Exit with appropriate code
    if (totalFailed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (error) {
    console.error('');
    console.error('✗ FATAL ERROR:');
    console.error(error);
    console.log('');
    console.log(`Failed at: ${new Date().toISOString()}`);
    console.log('='.repeat(60));
    process.exit(1);
  } finally {
    db.close();
  }
}

main();
