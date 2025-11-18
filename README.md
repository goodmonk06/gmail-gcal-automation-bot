# Gmail-Calendar Automation Bot

GmailとGoogleカレンダーを自動連携し、ルールベースでメールからカレンダー予定を作成するボットシステム。

## 📋 Overview

このボットは、Gmail APIとGoogle Calendar APIを活用し、特定のメール（ラベル、件名パターンなど）を検知して、自動的にGoogleカレンダーの予定を作成します。ルールエンジンとテンプレートシステムにより、柔軟な自動化フローを構築できます。

**主な機能:**
- ルールベースのメール検出（Gmailクエリ構文をサポート）
- カレンダー予定の自動作成
- 3種類の時間戦略（本文解析、固定遅延、固定日時）
- REST API による完全な Rule CRUD操作
- Webダッシュボードでのルール管理とトリガー
- 定期実行（cron）とWebhook対応
- Docker環境での簡単デプロイ

## 🛠 Tech Stack

- **Runtime**: Node.js 20 + TypeScript 5
- **Framework**: Express.js
- **Database**: SQLite (デフォルト) / PostgreSQL (オプション)
- **Google APIs**: Gmail API, Google Calendar API
- **Validation**: Zod
- **Testing**: Vitest
- **Date Parsing**: chrono-node
- **Containerization**: Docker + Docker Compose

## 📊 Domain Model

### Core Entities

#### Rule
メールからカレンダー予定への変換ルールを定義するエンティティ。

- **gmailQuery**: Gmail検索クエリ (例: `label:meeting`, `subject:重要`)
- **titleTemplate**: 予定タイトルのテンプレート (`{{subject}}` など)
- **descriptionTemplate**: 予定説明のテンプレート
- **timeStrategy**: 予定日時の決定方法
  - `parse_from_body`: メール本文から日時を自動抽出
  - `fixed_delay`: メール受信からN時間後
  - `fixed_datetime`: 特定の日時を指定
- **calendarId**: 対象カレンダー（通常は `primary`）
- **isActive**: ルールの有効/無効

#### ExecutionLog
ルール実行履歴を記録するエンティティ。

- **ruleId**: 実行されたルールのID
- **gmailMessageId**: 処理対象のメールID
- **status**: `success`, `failed`, `skipped`
- **error**: エラー詳細（JSON）
- **createdAt**: 実行日時

### Relationships
- `Rule` 1 --< N `ExecutionLog`

## 🚀 Getting Started

### Requirements

- **Node.js** 20.x or later
- **npm** or **pnpm**
- **Google Cloud Project** with Gmail & Calendar API enabled
- **Docker** (optional, for containerized deployment)

### Setup Steps

#### 1. Clone and Install

```bash
git clone <repository-url>
cd gmail-gcal-automation-bot
npm install
```

#### 2. Google Cloud Configuration

1. Create a project in [Google Cloud Console](https://console.cloud.google.com/)
2. Enable APIs:
   - [Gmail API](https://console.cloud.google.com/apis/library/gmail.googleapis.com)
   - [Google Calendar API](https://console.cloud.google.com/apis/library/calendar-json.googleapis.com)
3. Create OAuth 2.0 credentials:
   - Go to [Credentials page](https://console.cloud.google.com/apis/credentials)
   - Click "Create Credentials" → "OAuth client ID"
   - Application type: **Web application** or **Desktop app**
   - Add authorized redirect URI: `http://localhost:3000/oauth2callback`
   - Save **Client ID** and **Client Secret**

#### 3. Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Edit `.env`:

```env
GOOGLE_CLIENT_ID=your_actual_client_id_here
GOOGLE_CLIENT_SECRET=your_actual_client_secret_here
GOOGLE_REDIRECT_URI=http://localhost:3000/oauth2callback

DATABASE_PATH=./data.db
PORT=3000
GMAIL_USER_EMAIL=your_email@gmail.com
```

#### 4. Initialize Database

```bash
npm run db:migrate
```

This creates the database schema (rules and execution_logs tables).

#### 5. Seed Demo Data

```bash
npm run db:seed
```

This populates the database with 5 realistic demo rules and sample execution logs.

#### 6. Authenticate with Google

Start the development server:

```bash
npm run dev
```

Visit http://localhost:3000 and click "Authenticate with Google" to complete OAuth flow. A `token.json` file will be created.

## 📖 Usage

### Development Mode

```bash
npm run dev
```

- Dashboard: http://localhost:3000
- REST API: http://localhost:3000/api/*
- View rules, trigger execution manually, check logs

### Production Build

```bash
npm run build
npm start
```

### Cron Mode (Scheduled Execution)

```bash
npm run cron
```

Executes all active rules once and exits. Ideal for cron jobs.

**Example crontab (every 15 minutes):**

```cron
*/15 * * * * cd /path/to/gmail-gcal-automation-bot && npm run cron >> logs/cron.log 2>&1
```

### Docker Deployment

```bash
# Build and start with Docker Compose
npm run docker:up

# View logs
npm run docker:logs

# Stop containers
npm run docker:down
```

**Note**: Before running Docker, ensure `.env` is configured and `token.json` exists (authenticate locally first).

## 🔌 API Endpoints

### Rule Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/rules` | List all rules (query: `?active=true` for active only) |
| GET | `/api/rules/:id` | Get specific rule |
| POST | `/api/rules` | Create new rule |
| PATCH | `/api/rules/:id` | Update rule |
| DELETE | `/api/rules/:id` | Delete rule |

### Execution Logs

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/logs/rules/:ruleId` | Get logs for specific rule |
| GET | `/api/logs/recent` | Get recent logs across all rules |

### OAuth & Trigger

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/auth` | Start OAuth authentication |
| GET | `/oauth2callback` | OAuth callback |
| POST | `/trigger` | Manually trigger all active rules |

### Example API Usage

```bash
# Create a new rule
curl -X POST http://localhost:3000/api/rules \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Important Email Reminder",
    "gmailQuery": "is:important",
    "calendarId": "primary",
    "titleTemplate": "⭐ Review: {{subject}}",
    "descriptionTemplate": "From: {{from}}\n\n{{snippet}}",
    "timeStrategy": {
      "type": "fixed_delay",
      "delayHours": 2,
      "durationMinutes": 30
    },
    "isActive": true
  }'

# List all active rules
curl http://localhost:3000/api/rules?active=true

# Get execution logs for rule ID 1
curl http://localhost:3000/api/logs/rules/1?limit=50
```

## 🧪 Testing

Run all tests:

```bash
npm test
```

Run tests in watch mode:

```bash
npm run test:watch
```

Tests cover:
- Template engine (variable substitution)
- Time parser (all 3 strategies)
- Database CRUD operations
- Rule execution logic

## 🔍 Example Flow

### Vertical Slice: Meeting Email → Calendar Event

1. **Email arrives** in Gmail with label "meeting"
2. **Rule matches**: `gmailQuery: "label:meeting"`
3. **Engine extracts** email metadata (subject, from, body, date)
4. **Template renders**: `titleTemplate: "{{subject}}"` → "Team Sync Meeting"
5. **Time parser** determines event time:
   - `parse_from_body`: Parses "tomorrow at 2pm" from body
   - `fixed_delay`: Creates event 3 hours after email received
6. **Calendar API** creates event with rendered title, description, time
7. **Execution log** records success with message ID
8. **Duplicate prevention**: Same message won't be processed again

## 🔧 Development Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server with ts-node |
| `npm run build` | Compile TypeScript to JavaScript |
| `npm start` | Run compiled production build |
| `npm test` | Run tests with Vitest |
| `npm run lint` | Lint TypeScript files |
| `npm run lint:fix` | Lint and auto-fix issues |
| `npm run db:migrate` | Initialize database schema |
| `npm run db:seed` | Populate database with demo data |
| `npm run cron` | Execute all active rules once |
| `npm run docker:up` | Start Docker containers |
| `npm run docker:down` | Stop Docker containers |
| `npm run docker:logs` | View container logs |

## 📁 Project Structure

```
gmail-gcal-automation-bot/
├── src/
│   ├── api/                  # REST API layer
│   │   ├── schemas.ts        # Zod validation schemas
│   │   ├── middleware.ts     # Error handling, validation
│   │   ├── rules.router.ts   # Rule CRUD endpoints
│   │   └── logs.router.ts    # Execution log endpoints
│   ├── config/               # Configuration
│   │   ├── env.ts            # Environment variables
│   │   └── googleClient.ts   # Google OAuth client
│   ├── db/                   # Database layer
│   │   ├── types.ts          # TypeScript types
│   │   ├── database.ts       # SQLite operations
│   │   ├── migrate.ts        # Schema migration
│   │   └── seed.ts           # Demo data seeding
│   ├── rules/                # Rule engine
│   │   ├── ruleEngine.ts     # Main execution logic
│   │   ├── templateEngine.ts # {{variable}} substitution
│   │   └── timeParser.ts     # Date/time parsing
│   ├── services/             # External services
│   │   ├── gmailWatcher.ts   # Gmail API client
│   │   └── calendarService.ts # Calendar API client
│   ├── server.ts             # Express server + dashboard
│   └── cron.ts               # Cron execution script
├── Dockerfile                # Production container
├── docker-compose.yml        # Multi-container orchestration
├── .env.example              # Environment template
├── vitest.config.ts          # Test configuration
└── README.md
```

## 🔐 Security

- **OAuth tokens** (`token.json`) are excluded from version control
- **Environment variables** (`.env`) must be kept private
- **API validation** via Zod schemas prevents malformed input
- **Error details** are sanitized in API responses
- **Container security**: Non-root user in Docker image

## 🐛 Troubleshooting

### Authentication Issues

```bash
# Delete token and re-authenticate
rm token.json
npm run dev
# Visit http://localhost:3000/auth
```

### No Emails Found

- Verify Gmail query in Gmail web UI first
- Check that labels exist and are spelled correctly
- Ensure Gmail API has required scopes: `gmail.readonly`

### Calendar Creation Fails

- Verify Calendar API is enabled in Google Cloud
- Check `calendarId` (usually `primary` for main calendar)
- Confirm OAuth token has `calendar` scope

### Database Locked (SQLite)

- Close any other connections to `data.db`
- Check file permissions
- Consider switching to PostgreSQL for concurrent access

## 🚀 Future Extensions

- [ ] **Push Notifications**: Use Gmail Push API (Pub/Sub) for real-time email detection
- [ ] **Multi-user Support**: Extend to support multiple Gmail accounts
- [ ] **Advanced Scheduling**: Support recurring event creation
- [ ] **Webhook Integration**: Trigger external services after event creation
- [ ] **AI-Enhanced Parsing**: Use LLMs for smarter email content extraction
- [ ] **Web UI**: Full-featured admin dashboard (React/Vue)
- [ ] **Rule Templates**: Marketplace of pre-built rules
- [ ] **Analytics Dashboard**: Execution metrics and insights
- [ ] **PostgreSQL Adapter**: Full support for PostgreSQL database
- [ ] **Rate Limiting**: API rate limiting and quota management

## 📝 License

MIT

## 🤝 Contributing

Contributions are welcome! Please feel free to submit issues and pull requests.

### Development Workflow

1. Fork the repository
2. Create feature branch: `git checkout -b feature/my-feature`
3. Make changes and add tests
4. Run tests: `npm test`
5. Run linter: `npm run lint:fix`
6. Commit with clear message
7. Push and create pull request

---

**Built with ❤️ for automation enthusiasts**
