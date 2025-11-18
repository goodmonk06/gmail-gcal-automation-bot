import { Rule } from '../db/types';
import { AppDatabase } from '../db/database';
import { GmailWatcher, GmailMessage } from '../services/gmailWatcher';
import { CalendarService } from '../services/calendarService';
import { TemplateEngine } from './templateEngine';
import { TimeParser } from './timeParser';

export interface RuleExecutionResult {
  ruleId: number;
  ruleName: string;
  processedCount: number;
  successCount: number;
  failedCount: number;
  skippedCount: number;
  errors: Array<{ messageId: string; error: string }>;
}

export class RuleEngine {
  constructor(
    private db: AppDatabase,
    private gmailWatcher: GmailWatcher,
    private calendarService: CalendarService
  ) {}

  /**
   * Execute all active rules
   */
  async executeAllRules(): Promise<RuleExecutionResult[]> {
    const rules = this.db.getAllActiveRules();
    console.log(`Found ${rules.length} active rules`);

    const results: RuleExecutionResult[] = [];

    for (const rule of rules) {
      const result = await this.executeRule(rule);
      results.push(result);
    }

    return results;
  }

  /**
   * Execute a single rule
   */
  async executeRule(rule: Rule): Promise<RuleExecutionResult> {
    console.log(`Executing rule: ${rule.name} (ID: ${rule.id})`);

    const result: RuleExecutionResult = {
      ruleId: rule.id,
      ruleName: rule.name,
      processedCount: 0,
      successCount: 0,
      failedCount: 0,
      skippedCount: 0,
      errors: [],
    };

    try {
      // Fetch messages matching the gmail query
      const messages = await this.gmailWatcher.searchMessages(rule.gmailQuery);
      console.log(`  Found ${messages.length} messages matching query: ${rule.gmailQuery}`);

      for (const message of messages) {
        result.processedCount++;

        // Skip if already processed
        if (this.db.checkMessageProcessed(message.id)) {
          console.log(`  Skipping already processed message: ${message.id}`);
          result.skippedCount++;
          this.db.createExecutionLog(rule.id, message.id, 'skipped');
          continue;
        }

        try {
          await this.processMessage(rule, message);
          result.successCount++;
          this.db.createExecutionLog(rule.id, message.id, 'success');
          console.log(`  ✓ Successfully processed message: ${message.id}`);
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          result.failedCount++;
          result.errors.push({ messageId: message.id, error: errorMsg });
          this.db.createExecutionLog(rule.id, message.id, 'failed', {
            message: errorMsg,
            stack: error instanceof Error ? error.stack : undefined,
          });
          console.error(`  ✗ Failed to process message ${message.id}:`, error);
        }
      }
    } catch (error) {
      console.error(`Failed to execute rule ${rule.id}:`, error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      result.errors.push({ messageId: 'N/A', error: errorMsg });
    }

    return result;
  }

  /**
   * Process a single message according to a rule
   */
  private async processMessage(rule: Rule, message: GmailMessage): Promise<void> {
    // Prepare template data
    const templateData = {
      subject: message.subject,
      from: message.from,
      to: message.to,
      snippet: message.snippet,
      body: message.body,
      date: message.date.toISOString(),
    };

    // Render title and description
    const title = TemplateEngine.render(rule.titleTemplate, templateData);
    const description = TemplateEngine.render(rule.descriptionTemplate, templateData);

    // Parse datetime based on time strategy
    const dateTime = TimeParser.parseDateTime(
      rule.timeStrategy,
      message.body,
      message.date
    );

    if (!dateTime) {
      throw new Error('Could not determine event datetime');
    }

    // Create calendar event
    await this.calendarService.createEvent({
      calendarId: rule.calendarId,
      summary: title,
      description: description,
      start: dateTime.start,
      end: dateTime.end,
      source: {
        title: `Gmail: ${message.id}`,
        url: `https://mail.google.com/mail/u/0/#inbox/${message.id}`,
      },
    });

    console.log(`    Created calendar event: "${title}"`);
  }
}
