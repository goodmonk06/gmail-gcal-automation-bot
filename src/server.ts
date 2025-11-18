import express from 'express';
import { config, validateConfig } from './config/env';
import { getGoogleClientManager } from './config/googleClient';
import { AppDatabase } from './db/database';
import { RuleEngine } from './rules/ruleEngine';
import { GmailWatcher } from './services/gmailWatcher';
import { CalendarService } from './services/calendarService';
import { createRulesRouter } from './api/rules.router';
import { createLogsRouter } from './api/logs.router';
import { errorHandler, successResponse } from './api/middleware';

const app = express();
app.use(express.json());

// Initialize
validateConfig();
const db = new AppDatabase();
db.initialize();

const clientManager = getGoogleClientManager();
const gmailWatcher = new GmailWatcher(clientManager);
const calendarService = new CalendarService(clientManager);
const ruleEngine = new RuleEngine(db, gmailWatcher, calendarService);

// Root endpoint - Dashboard
app.get('/', (req, res) => {
  const isAuthenticated = clientManager.isAuthenticated();
  const rules = db.getAllActiveRules();

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Gmail-Calendar Automation Bot</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
      background: #f5f5f5;
    }
    .header {
      background: white;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 20px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .status {
      padding: 10px 20px;
      border-radius: 4px;
      display: inline-block;
      font-weight: bold;
    }
    .status.authenticated {
      background: #4CAF50;
      color: white;
    }
    .status.not-authenticated {
      background: #f44336;
      color: white;
    }
    .section {
      background: white;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 20px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    th, td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #ddd;
    }
    th {
      background: #f0f0f0;
      font-weight: bold;
    }
    .btn {
      display: inline-block;
      padding: 10px 20px;
      background: #2196F3;
      color: white;
      text-decoration: none;
      border-radius: 4px;
      border: none;
      cursor: pointer;
      font-size: 14px;
    }
    .btn:hover {
      background: #1976D2;
    }
    .btn-success {
      background: #4CAF50;
    }
    .btn-success:hover {
      background: #45a049;
    }
    pre {
      background: #f5f5f5;
      padding: 10px;
      border-radius: 4px;
      overflow-x: auto;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Gmail-Calendar Automation Bot</h1>
    <div class="status ${isAuthenticated ? 'authenticated' : 'not-authenticated'}">
      ${isAuthenticated ? '✓ Authenticated' : '✗ Not Authenticated'}
    </div>
    ${!isAuthenticated ? '<p><a href="/auth" class="btn">Authenticate with Google</a></p>' : ''}
  </div>

  <div class="section">
    <h2>Active Rules (${rules.length})</h2>
    ${rules.length === 0 ? '<p>No active rules found. Run <code>npm run migrate</code> to create sample rules.</p>' : `
    <table>
      <thead>
        <tr>
          <th>ID</th>
          <th>Name</th>
          <th>Gmail Query</th>
          <th>Calendar</th>
          <th>Time Strategy</th>
        </tr>
      </thead>
      <tbody>
        ${rules.map(rule => `
          <tr>
            <td>${rule.id}</td>
            <td>${rule.name}</td>
            <td><code>${rule.gmailQuery}</code></td>
            <td>${rule.calendarId}</td>
            <td>${rule.timeStrategy.type}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
    `}
  </div>

  <div class="section">
    <h2>Actions</h2>
    <form action="/trigger" method="POST" style="display: inline;">
      <button type="submit" class="btn btn-success" ${!isAuthenticated ? 'disabled' : ''}>
        Trigger Rules Now
      </button>
    </form>
    ${!isAuthenticated ? '<p style="color: #666; font-size: 14px;">Please authenticate first to trigger rules.</p>' : ''}
  </div>

  <div class="section">
    <h2>API Endpoints</h2>
    <h3>REST API</h3>
    <ul>
      <li><code>GET /api/rules</code> - List all rules</li>
      <li><code>GET /api/rules/:id</code> - Get rule by ID</li>
      <li><code>POST /api/rules</code> - Create new rule</li>
      <li><code>PATCH /api/rules/:id</code> - Update rule</li>
      <li><code>DELETE /api/rules/:id</code> - Delete rule</li>
      <li><code>GET /api/logs/rules/:ruleId</code> - Get execution logs for a rule</li>
      <li><code>GET /api/logs/recent</code> - Get recent execution logs</li>
    </ul>
    <h3>OAuth & Execution</h3>
    <ul>
      <li><code>GET /auth</code> - Start OAuth authentication</li>
      <li><code>GET /oauth2callback</code> - OAuth callback</li>
      <li><code>POST /trigger</code> - Manually trigger all rules</li>
    </ul>
  </div>
</body>
</html>
  `;

  res.send(html);
});

// API Routes
app.use('/api/rules', createRulesRouter(db));
app.use('/api/logs', createLogsRouter(db));

// OAuth - Start authentication
app.get('/auth', (req, res) => {
  const authUrl = clientManager.getAuthUrl();
  res.redirect(authUrl);
});

// OAuth - Callback
app.get('/oauth2callback', async (req, res) => {
  const code = req.query.code as string;

  if (!code) {
    return res.status(400).send('Missing authorization code');
  }

  try {
    const token = await clientManager.getToken(code);
    clientManager.saveToken(token);

    res.send(`
      <h1>Authentication Successful!</h1>
      <p>You can now close this window and return to the <a href="/">dashboard</a>.</p>
    `);
  } catch (error) {
    console.error('OAuth callback error:', error);
    res.status(500).send('Authentication failed');
  }
});

// Legacy endpoints for backward compatibility (redirect to new API)
app.get('/rules', (req, res) => res.redirect('/api/rules?active=true'));
app.get('/logs/:ruleId', (req, res) => res.redirect(`/api/logs/rules/${req.params.ruleId}`));

// API: Manually trigger all rules
app.post('/trigger', async (req, res) => {
  if (!clientManager.isAuthenticated()) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    console.log('Manually triggering all rules...');
    const results = await ruleEngine.executeAllRules();

    const summary = {
      timestamp: new Date().toISOString(),
      rulesExecuted: results.length,
      totalProcessed: results.reduce((sum, r) => sum + r.processedCount, 0),
      totalSuccess: results.reduce((sum, r) => sum + r.successCount, 0),
      totalFailed: results.reduce((sum, r) => sum + r.failedCount, 0),
      totalSkipped: results.reduce((sum, r) => sum + r.skippedCount, 0),
      results,
    };

    res.json(successResponse(summary));
  } catch (error) {
    console.error('Error triggering rules:', error);
    res.status(500).json({ success: false, error: { message: 'Failed to execute rules' } });
  }
});

// Error handler (must be last)
app.use(errorHandler);

// Start server
const PORT = config.server.port;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log('');
  if (!clientManager.isAuthenticated()) {
    console.log('⚠️  Not authenticated. Visit http://localhost:' + PORT + '/auth to authenticate.');
  } else {
    console.log('✓ Authenticated and ready to process rules.');
  }
});
