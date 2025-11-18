/**
 * AI Parsing Adapter Interface
 *
 * Allows integration with AI services for intelligent email parsing,
 * intent detection, and structured data extraction.
 */

export interface ParsedEmailData {
  dateTime?: {
    start: Date;
    end?: Date;
    confidence: number;
  };
  participants?: string[];
  location?: string;
  intent?: 'meeting' | 'task' | 'reminder' | 'information' | 'unknown';
  summary?: string;
  actionItems?: string[];
  priority?: 'low' | 'medium' | 'high';
}

export interface IAIParserAdapter {
  /**
   * Parse email content to extract structured data
   */
  parseEmail(content: {
    subject: string;
    body: string;
    from: string;
    to: string;
  }): Promise<ParsedEmailData>;

  /**
   * Extract date/time from text
   */
  extractDateTime(text: string, referenceDate?: Date): Promise<Date | null>;

  /**
   * Check if adapter is configured
   */
  isConfigured(): boolean;

  /**
   * Get adapter name
   */
  getName(): string;
}

/**
 * No-op AI Parser (fallback)
 */
export class NoOpAIParser implements IAIParserAdapter {
  async parseEmail(): Promise<ParsedEmailData> {
    return {};
  }

  async extractDateTime(): Promise<Date | null> {
    return null;
  }

  isConfigured(): boolean {
    return false;
  }

  getName(): string {
    return 'noop';
  }
}

/**
 * OpenAI-based Parser (stub implementation)
 */
export class OpenAIParserAdapter implements IAIParserAdapter {
  constructor(
    private config: {
      apiKey?: string;
      model?: string;
    }
  ) {}

  async parseEmail(content: {
    subject: string;
    body: string;
    from: string;
    to: string;
  }): Promise<ParsedEmailData> {
    if (!this.isConfigured()) {
      return {};
    }

    // TODO: Implement actual OpenAI API call with prompt engineering
    console.log('[OpenAIParser] Parsing email:', content.subject);

    // Stub: Return placeholder data
    return {
      intent: 'unknown',
      summary: content.subject,
    };
  }

  async extractDateTime(text: string, referenceDate?: Date): Promise<Date | null> {
    if (!this.isConfigured()) {
      return null;
    }

    // TODO: Implement actual OpenAI API call for date extraction
    console.log('[OpenAIParser] Extracting date from:', text);
    return null;
  }

  isConfigured(): boolean {
    return !!this.config.apiKey;
  }

  getName(): string {
    return 'openai';
  }
}

/**
 * Rule-based Parser (simple heuristics)
 */
export class RuleBasedParser implements IAIParserAdapter {
  async parseEmail(content: {
    subject: string;
    body: string;
  }): Promise<ParsedEmailData> {
    const result: ParsedEmailData = {};

    // Detect intent from keywords
    const text = `${content.subject} ${content.body}`.toLowerCase();

    if (text.includes('meeting') || text.includes('会議')) {
      result.intent = 'meeting';
    } else if (text.includes('todo') || text.includes('task')) {
      result.intent = 'task';
    } else if (text.includes('reminder')) {
      result.intent = 'reminder';
    }

    // Detect priority
    if (text.includes('urgent') || text.includes('important') || text.includes('重要')) {
      result.priority = 'high';
    }

    return result;
  }

  async extractDateTime(text: string): Promise<Date | null> {
    // Simple regex-based extraction (very basic)
    const patterns = [
      /(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})/,
      /(\d{1,2})\/(\d{1,2})\s+(\d{1,2}):(\d{2})/,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        // Parse matched groups - this is simplified
        return new Date(text); // Fallback to Date constructor
      }
    }

    return null;
  }

  isConfigured(): boolean {
    return true;
  }

  getName(): string {
    return 'rule-based';
  }
}
