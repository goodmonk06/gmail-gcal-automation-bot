import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import fs from 'fs';
import path from 'path';
import { config } from './env';

export class GoogleClientManager {
  private oauth2Client: OAuth2Client;
  private tokenPath: string;

  constructor(tokenPath: string = './token.json') {
    this.tokenPath = tokenPath;
    this.oauth2Client = new google.auth.OAuth2(
      config.google.clientId,
      config.google.clientSecret,
      config.google.redirectUri
    );

    this.loadToken();
  }

  private loadToken(): void {
    try {
      if (fs.existsSync(this.tokenPath)) {
        const token = JSON.parse(fs.readFileSync(this.tokenPath, 'utf-8'));
        this.oauth2Client.setCredentials(token);
      }
    } catch (error) {
      console.warn('Could not load token:', error);
    }
  }

  saveToken(token: any): void {
    fs.writeFileSync(this.tokenPath, JSON.stringify(token, null, 2));
    this.oauth2Client.setCredentials(token);
  }

  getAuthUrl(): string {
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/calendar',
      ],
    });
  }

  async getToken(code: string): Promise<any> {
    const { tokens } = await this.oauth2Client.getToken(code);
    return tokens;
  }

  getOAuth2Client(): OAuth2Client {
    return this.oauth2Client;
  }

  isAuthenticated(): boolean {
    const credentials = this.oauth2Client.credentials;
    return !!(credentials && credentials.access_token);
  }

  async refreshTokenIfNeeded(): Promise<void> {
    const credentials = this.oauth2Client.credentials;
    if (!credentials.expiry_date) return;

    const now = Date.now();
    const expiryDate = credentials.expiry_date;

    // Refresh if token expires in less than 5 minutes
    if (expiryDate - now < 5 * 60 * 1000) {
      try {
        const { credentials: newCredentials } = await this.oauth2Client.refreshAccessToken();
        this.oauth2Client.setCredentials(newCredentials);
        this.saveToken(newCredentials);
      } catch (error) {
        console.error('Failed to refresh token:', error);
        throw error;
      }
    }
  }

  // Gmail API client
  getGmailClient() {
    return google.gmail({ version: 'v1', auth: this.oauth2Client });
  }

  // Calendar API client
  getCalendarClient() {
    return google.calendar({ version: 'v3', auth: this.oauth2Client });
  }
}

// Singleton instance
let clientManager: GoogleClientManager | null = null;

export function getGoogleClientManager(): GoogleClientManager {
  if (!clientManager) {
    clientManager = new GoogleClientManager();
  }
  return clientManager;
}
