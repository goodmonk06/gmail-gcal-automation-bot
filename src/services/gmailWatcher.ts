import { gmail_v1 } from 'googleapis';
import { GoogleClientManager } from '../config/googleClient';

export interface GmailMessage {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  to: string;
  date: Date;
  snippet: string;
  body: string;
  labels: string[];
}

export class GmailWatcher {
  private gmail: gmail_v1.Gmail;

  constructor(private clientManager: GoogleClientManager) {
    this.gmail = clientManager.getGmailClient();
  }

  /**
   * Search for messages matching a Gmail query
   * @param query Gmail search query (e.g., "label:meeting", "subject:important")
   * @param maxResults Maximum number of messages to return
   */
  async searchMessages(query: string, maxResults: number = 50): Promise<GmailMessage[]> {
    await this.clientManager.refreshTokenIfNeeded();

    try {
      const response = await this.gmail.users.messages.list({
        userId: 'me',
        q: query,
        maxResults,
      });

      const messages = response.data.messages || [];

      if (messages.length === 0) {
        return [];
      }

      // Fetch full message details
      const fullMessages: GmailMessage[] = [];

      for (const message of messages) {
        if (!message.id) continue;

        try {
          const fullMessage = await this.getMessage(message.id);
          fullMessages.push(fullMessage);
        } catch (error) {
          console.error(`Failed to fetch message ${message.id}:`, error);
        }
      }

      return fullMessages;
    } catch (error) {
      console.error('Error searching Gmail messages:', error);
      throw error;
    }
  }

  /**
   * Get a single message by ID
   */
  async getMessage(messageId: string): Promise<GmailMessage> {
    await this.clientManager.refreshTokenIfNeeded();

    const response = await this.gmail.users.messages.get({
      userId: 'me',
      id: messageId,
      format: 'full',
    });

    const message = response.data;

    if (!message.payload || !message.id) {
      throw new Error(`Invalid message data for ID: ${messageId}`);
    }

    const headers = message.payload.headers || [];
    const subject = this.getHeader(headers, 'Subject') || '(No Subject)';
    const from = this.getHeader(headers, 'From') || '';
    const to = this.getHeader(headers, 'To') || '';
    const dateStr = this.getHeader(headers, 'Date') || new Date().toISOString();
    const date = new Date(dateStr);

    const body = this.extractBody(message.payload);
    const snippet = message.snippet || '';
    const labels = message.labelIds || [];

    return {
      id: message.id,
      threadId: message.threadId || '',
      subject,
      from,
      to,
      date,
      snippet,
      body,
      labels,
    };
  }

  /**
   * Extract header value
   */
  private getHeader(headers: gmail_v1.Schema$MessagePartHeader[], name: string): string | undefined {
    const header = headers.find(h => h.name?.toLowerCase() === name.toLowerCase());
    return header?.value;
  }

  /**
   * Extract message body (text/plain preferred, fallback to text/html)
   */
  private extractBody(payload: gmail_v1.Schema$MessagePart): string {
    if (!payload) return '';

    // Check if body data exists directly
    if (payload.body?.data) {
      return this.decodeBase64(payload.body.data);
    }

    // Check multipart
    if (payload.parts) {
      for (const part of payload.parts) {
        if (part.mimeType === 'text/plain' && part.body?.data) {
          return this.decodeBase64(part.body.data);
        }
      }

      // Fallback to HTML
      for (const part of payload.parts) {
        if (part.mimeType === 'text/html' && part.body?.data) {
          return this.stripHtml(this.decodeBase64(part.body.data));
        }
      }

      // Recursively check nested parts
      for (const part of payload.parts) {
        const body = this.extractBody(part);
        if (body) return body;
      }
    }

    return '';
  }

  /**
   * Decode base64url encoded string
   */
  private decodeBase64(data: string): string {
    const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
    return Buffer.from(base64, 'base64').toString('utf-8');
  }

  /**
   * Strip HTML tags (simple implementation)
   */
  private stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
  }

  /**
   * Watch for new messages (using Gmail Push Notifications)
   * Note: Requires setting up a Cloud Pub/Sub topic
   */
  async setupWatch(topicName: string): Promise<void> {
    await this.clientManager.refreshTokenIfNeeded();

    const response = await this.gmail.users.watch({
      userId: 'me',
      requestBody: {
        topicName,
        labelIds: ['INBOX'],
      },
    });

    console.log('Gmail watch setup:', response.data);
  }

  /**
   * Stop watching for new messages
   */
  async stopWatch(): Promise<void> {
    await this.clientManager.refreshTokenIfNeeded();

    await this.gmail.users.stop({
      userId: 'me',
    });

    console.log('Gmail watch stopped');
  }
}
