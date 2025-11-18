/**
 * Notification Adapter Interface
 *
 * Allows the system to send notifications through various channels
 * without coupling to specific notification services.
 */

export interface NotificationPayload {
  title: string;
  message: string;
  level: 'info' | 'success' | 'warning' | 'error';
  metadata?: Record<string, any>;
  timestamp?: string;
}

export interface INotificationAdapter {
  /**
   * Send a notification
   */
  send(payload: NotificationPayload): Promise<void>;

  /**
   * Check if the adapter is properly configured
   */
  isConfigured(): boolean;

  /**
   * Get adapter name
   */
  getName(): string;
}

/**
 * Email Notification Adapter
 */
export class EmailNotificationAdapter implements INotificationAdapter {
  constructor(private config: { smtpHost?: string; from?: string; to?: string }) {}

  async send(payload: NotificationPayload): Promise<void> {
    // TODO: Implement actual email sending (nodemailer, sendgrid, etc.)
    console.log(`[EmailNotification] ${payload.level}: ${payload.title} - ${payload.message}`);
  }

  isConfigured(): boolean {
    return !!(this.config.smtpHost && this.config.from && this.config.to);
  }

  getName(): string {
    return 'email';
  }
}

/**
 * Slack Notification Adapter
 */
export class SlackNotificationAdapter implements INotificationAdapter {
  constructor(private config: { webhookUrl?: string; channel?: string }) {}

  async send(payload: NotificationPayload): Promise<void> {
    if (!this.isConfigured()) {
      console.warn('[SlackNotification] Not configured, skipping');
      return;
    }

    // TODO: Implement actual Slack API call
    console.log(`[SlackNotification] ${payload.level}: ${payload.title} - ${payload.message}`);
  }

  isConfigured(): boolean {
    return !!this.config.webhookUrl;
  }

  getName(): string {
    return 'slack';
  }
}

/**
 * Webhook Notification Adapter
 */
export class WebhookNotificationAdapter implements INotificationAdapter {
  constructor(private config: { url?: string; headers?: Record<string, string> }) {}

  async send(payload: NotificationPayload): Promise<void> {
    if (!this.isConfigured()) {
      console.warn('[WebhookNotification] Not configured, skipping');
      return;
    }

    // TODO: Implement actual HTTP POST
    console.log(`[WebhookNotification] ${payload.level}: ${payload.title}`);
  }

  isConfigured(): boolean {
    return !!this.config.url;
  }

  getName(): string {
    return 'webhook';
  }
}

/**
 * Console Notification Adapter (for development)
 */
export class ConsoleNotificationAdapter implements INotificationAdapter {
  async send(payload: NotificationPayload): Promise<void> {
    const emoji = {
      info: 'ℹ️',
      success: '✅',
      warning: '⚠️',
      error: '❌',
    }[payload.level];

    console.log(`${emoji} [Notification] ${payload.title}: ${payload.message}`);
    if (payload.metadata) {
      console.log('  Metadata:', payload.metadata);
    }
  }

  isConfigured(): boolean {
    return true;
  }

  getName(): string {
    return 'console';
  }
}

/**
 * Multi-channel Notification Broadcaster
 */
export class NotificationBroadcaster {
  private adapters: INotificationAdapter[] = [];

  addAdapter(adapter: INotificationAdapter): void {
    if (adapter.isConfigured()) {
      this.adapters.push(adapter);
    }
  }

  async broadcast(payload: NotificationPayload): Promise<void> {
    const promises = this.adapters.map(adapter =>
      adapter.send(payload).catch(error => {
        console.error(`Failed to send notification via ${adapter.getName()}:`, error);
      })
    );

    await Promise.allSettled(promises);
  }

  getAdapters(): INotificationAdapter[] {
    return [...this.adapters];
  }
}
