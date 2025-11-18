#!/usr/bin/env node
/**
 * CLI Tool for Gmail-Calendar Automation Bot
 *
 * Provides command-line utilities for managing rules, templates,
 * and performing common operations.
 */

import { AppDatabase } from './db/database';
import { getLogger } from './lib/logger';
import { InMemoryTemplateRepository, TemplateService } from './domain/template.service';
import dotenv from 'dotenv';

dotenv.config();

const logger = getLogger({ service: 'cli' });

// Parse CLI arguments
const args = process.argv.slice(2);
const command = args[0];

async function main() {
  switch (command) {
    case 'rules:list':
      await listRules();
      break;
    case 'rules:create':
      await createRuleInteractive();
      break;
    case 'rules:toggle':
      await toggleRule(args[1]);
      break;
    case 'db:reset':
      await resetDatabase();
      break;
    case 'db:stats':
      await showStats();
      break;
    case 'templates:list':
      await listTemplates();
      break;
    case 'help':
    default:
      showHelp();
  }
}

async function listRules() {
  const db = new AppDatabase();
  db.initialize();

  try {
    const rules = db.getAllRules();

    console.log('\n📋 All Rules:\n');
    console.log('─'.repeat(80));

    if (rules.length === 0) {
      console.log('No rules found. Run `npm run db:seed` to create sample rules.');
    } else {
      rules.forEach(rule => {
        const status = rule.isActive ? '✅ Active' : '❌ Inactive';
        console.log(`ID: ${rule.id} | ${status} | ${rule.name}`);
        console.log(`   Query: ${rule.gmailQuery}`);
        console.log(`   Strategy: ${rule.timeStrategy.type}`);
        console.log('─'.repeat(80));
      });
    }

    console.log(`\nTotal: ${rules.length} rules\n`);
  } finally {
    db.close();
  }
}

async function createRuleInteractive() {
  console.log('\n🎯 Create New Rule\n');
  console.log('This feature requires interactive input.');
  console.log('Use the web dashboard at http://localhost:3000 to create rules.');
  console.log('Or use the API: POST /api/rules\n');
}

async function toggleRule(ruleIdStr: string) {
  if (!ruleIdStr) {
    console.error('Error: Please provide a rule ID');
    console.log('Usage: npm run cli rules:toggle <rule-id>');
    return;
  }

  const ruleId = parseInt(ruleIdStr, 10);
  if (isNaN(ruleId)) {
    console.error('Error: Invalid rule ID');
    return;
  }

  const db = new AppDatabase();
  db.initialize();

  try {
    const rule = db.getRule(ruleId);
    if (!rule) {
      console.error(`Error: Rule ${ruleId} not found`);
      return;
    }

    const newStatus = !rule.isActive;
    db.updateRule(ruleId, { isActive: newStatus });

    console.log(`\n✓ Rule ${ruleId} (${rule.name}) is now ${newStatus ? 'ACTIVE' : 'INACTIVE'}\n`);
  } finally {
    db.close();
  }
}

async function resetDatabase() {
  console.log('\n⚠️  Resetting Database...\n');

  const db = new AppDatabase();

  try {
    // Note: This is a simplified reset. In production, you'd use proper migrations.
    db.initialize();
    console.log('✓ Database schema recreated');
    console.log('\nRun `npm run db:seed` to populate with demo data.\n');
  } finally {
    db.close();
  }
}

async function showStats() {
  const db = new AppDatabase();
  db.initialize();

  try {
    const rules = db.getAllRules();
    const activeRules = rules.filter(r => r.isActive);
    const logs = db.getRecentExecutionLogs(1000);

    const successLogs = logs.filter(l => l.status === 'success');
    const failedLogs = logs.filter(l => l.status === 'failed');
    const skippedLogs = logs.filter(l => l.status === 'skipped');

    console.log('\n📊 Database Statistics\n');
    console.log('═'.repeat(80));
    console.log(`Rules:          ${rules.length} total (${activeRules.length} active, ${rules.length - activeRules.length} inactive)`);
    console.log(`Execution Logs: ${logs.length} total`);
    console.log(`  ✅ Success:   ${successLogs.length}`);
    console.log(`  ❌ Failed:    ${failedLogs.length}`);
    console.log(`  ⏭️  Skipped:   ${skippedLogs.length}`);

    if (logs.length > 0) {
      const latestLog = logs[0];
      console.log(`\nLatest execution: ${latestLog.createdAt}`);
    }

    console.log('═'.repeat(80));
    console.log('');
  } finally {
    db.close();
  }
}

async function listTemplates() {
  console.log('\n📚 Rule Templates\n');
  console.log('Templates feature is available via API at /api/templates');
  console.log('Use the web dashboard to browse and clone templates.\n');
}

function showHelp() {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════╗
║                 Gmail-Calendar Automation Bot - CLI Tool                  ║
╚═══════════════════════════════════════════════════════════════════════════╝

Usage: npm run cli <command> [arguments]

Commands:

  rules:list                    List all rules
  rules:create                  Create a new rule (interactive)
  rules:toggle <rule-id>        Toggle rule active/inactive status

  db:reset                      Reset database schema
  db:stats                      Show database statistics

  templates:list                List available templates

  help                          Show this help message

Examples:

  npm run cli rules:list
  npm run cli rules:toggle 1
  npm run cli db:stats

For more information, visit the documentation or web dashboard at:
  http://localhost:3000

  `);
}

// Run main function
main().catch(error => {
  logger.error('CLI command failed', error);
  console.error('\n❌ Error:', error.message);
  process.exit(1);
});
