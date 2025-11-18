import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const config = {
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    redirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/oauth2callback',
  },
  database: {
    path: process.env.DATABASE_PATH || './data.db',
  },
  server: {
    port: parseInt(process.env.PORT || '3000', 10),
  },
  gmail: {
    userEmail: process.env.GMAIL_USER_EMAIL || '',
  },
};

export function validateConfig(): void {
  const errors: string[] = [];

  if (!config.google.clientId) {
    errors.push('GOOGLE_CLIENT_ID is not set');
  }
  if (!config.google.clientSecret) {
    errors.push('GOOGLE_CLIENT_SECRET is not set');
  }

  if (errors.length > 0) {
    console.warn('Configuration warnings:');
    errors.forEach(err => console.warn(`  - ${err}`));
    console.warn('Please check your .env file');
  }
}
