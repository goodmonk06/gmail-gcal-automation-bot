# gmail-gcal-automation-bot

GmailとGoogleカレンダーを監視し、件名ルールやラベルに応じて自動予定作成・リマインドを行うボット。

## 📋 概要

このボットは、Gmailの特定のメール（ラベルや件名パターン）を検知し、自動的にGoogleカレンダーの予定を作成します。

**主な機能:**
- Gmailのクエリ（ラベル、件名など）に基づいたメール検出
- カレンダー予定の自動作成
- 柔軟なルールエンジン（データベースで管理）
- 本文からの日時パース、または固定時間後の予定作成
- 定期実行（cron）とWebダッシュボードの両方に対応

## 🛠 Tech Stack

- **Node.js + TypeScript**: メイン実装言語
- **Google APIs**: Gmail API、Google Calendar API
- **SQLite**: ルールと実行ログの保存
- **Express**: Webサーバー・ダッシュボード
- **chrono-node**: 自然言語日時パーサー

## 🚀 セットアップ手順

### 1. リポジトリのクローンと依存関係のインストール

```bash
git clone <repository-url>
cd gmail-gcal-automation-bot
npm install
```

### 2. Google Cloud プロジェクトの設定

#### 2.1 Google Cloud Console でプロジェクトを作成

1. [Google Cloud Console](https://console.cloud.google.com/) にアクセス
2. 新しいプロジェクトを作成（例: `gmail-gcal-bot`）

#### 2.2 APIを有効化

以下のAPIを有効にします:

1. **Gmail API**: https://console.cloud.google.com/apis/library/gmail.googleapis.com
2. **Google Calendar API**: https://console.cloud.google.com/apis/library/calendar-json.googleapis.com

#### 2.3 OAuth 2.0 認証情報の作成

1. [認証情報ページ](https://console.cloud.google.com/apis/credentials) へ移動
2. 「認証情報を作成」→「OAuth クライアント ID」を選択
3. アプリケーションの種類: **デスクトップアプリ** または **ウェブアプリケーション**
4. ウェブアプリケーションの場合:
   - 承認済みのリダイレクト URI: `http://localhost:3000/oauth2callback`
5. 作成後、**クライアントID** と **クライアントシークレット** をコピー

### 3. 環境変数の設定

`.env.example` を `.env` にコピーして編集:

```bash
cp .env.example .env
```

`.env` の内容を編集:

```env
GOOGLE_CLIENT_ID=your_actual_client_id_here
GOOGLE_CLIENT_SECRET=your_actual_client_secret_here
GOOGLE_REDIRECT_URI=http://localhost:3000/oauth2callback

DATABASE_PATH=./data.db
PORT=3000
GMAIL_USER_EMAIL=your_email@gmail.com
```

### 4. データベースの初期化

```bash
npm run migrate
```

これにより、データベーステーブルが作成され、サンプルルールが2つ追加されます。

### 5. Google アカウントの認証

開発サーバーを起動:

```bash
npm run dev
```

ブラウザで http://localhost:3000 にアクセスし、「Authenticate with Google」をクリックして認証を完了します。

認証が完了すると `token.json` ファイルが作成されます。

## 📖 使い方

### 開発モード（ダッシュボード付き）

```bash
npm run dev
```

- http://localhost:3000 でダッシュボードにアクセス
- ルール一覧の確認
- 手動でルールをトリガー

### Cronモード（定期実行）

```bash
npm run cron
```

このコマンドは、すべてのアクティブなルールを実行し、結果を表示します。

**Crontabの設定例（15分ごとに実行）:**

```bash
*/15 * * * * cd /path/to/gmail-gcal-automation-bot && npm run cron >> cron.log 2>&1
```

## 📊 データベーススキーマ

### Rules テーブル

| カラム | 型 | 説明 |
|--------|-----|------|
| id | INTEGER | 主キー |
| name | TEXT | ルール名 |
| gmailQuery | TEXT | Gmail検索クエリ (例: `label:meeting`) |
| calendarId | TEXT | カレンダーID (通常は `primary`) |
| titleTemplate | TEXT | イベントタイトルのテンプレート |
| descriptionTemplate | TEXT | イベント説明のテンプレート |
| timeStrategy | TEXT | 日時戦略（JSON） |
| isActive | INTEGER | 有効/無効 (1/0) |

### ExecutionLog テーブル

| カラム | 型 | 説明 |
|--------|-----|------|
| id | INTEGER | 主キー |
| ruleId | INTEGER | ルールID（外部キー） |
| gmailMessageId | TEXT | GmailメッセージID |
| status | TEXT | `success`, `failed`, `skipped` |
| error | TEXT | エラー詳細（JSON） |
| createdAt | TEXT | 作成日時 |

## 🔧 ルールの設定例

### 例1: ミーティング通知から予定を作成

```json
{
  "name": "ミーティング通知からカレンダー追加",
  "gmailQuery": "label:meeting subject:ミーティング",
  "calendarId": "primary",
  "titleTemplate": "{{subject}}",
  "descriptionTemplate": "メール本文:\n{{body}}",
  "timeStrategy": {
    "type": "parse_from_body",
    "durationMinutes": 60
  },
  "isActive": true
}
```

**timeStrategy の種類:**

- `parse_from_body`: メール本文から日時を自動抽出（chrono-nodeを使用）
- `fixed_delay`: メール受信から指定時間後に予定を作成
- `fixed_datetime`: 特定の日時に予定を作成

### 例2: TODOラベルのメールから3時間後にリマインダー

```json
{
  "name": "TODOリマインダー（3時間後）",
  "gmailQuery": "label:todo",
  "calendarId": "primary",
  "titleTemplate": "TODO: {{subject}}",
  "descriptionTemplate": "タスク詳細:\n{{snippet}}",
  "timeStrategy": {
    "type": "fixed_delay",
    "delayHours": 3,
    "durationMinutes": 30
  },
  "isActive": true
}
```

### テンプレート変数

テンプレート（titleTemplate、descriptionTemplate）で使用可能な変数:

- `{{subject}}`: メールの件名
- `{{from}}`: 送信者
- `{{to}}`: 宛先
- `{{snippet}}`: メールのスニペット
- `{{body}}`: メール本文
- `{{date}}`: 受信日時

## 🔍 Gmail クエリの例

```
label:meeting                    # "meeting"ラベルのメール
subject:重要                     # 件名に"重要"を含む
from:boss@example.com           # 特定の送信者から
is:unread label:todo            # 未読かつTODOラベル
after:2024/01/01                # 特定日以降
```

詳細: [Gmail検索演算子](https://support.google.com/mail/answer/7190?hl=ja)

## 📁 ディレクトリ構成

```
gmail-gcal-automation-bot/
├── src/
│   ├── config/              # 設定ファイル
│   │   ├── env.ts          # 環境変数管理
│   │   └── googleClient.ts # Google API クライアント
│   ├── db/                  # データベース関連
│   │   ├── types.ts        # 型定義
│   │   ├── database.ts     # DB操作
│   │   └── migrate.ts      # マイグレーション
│   ├── rules/               # ルールエンジン
│   │   ├── ruleEngine.ts   # メインロジック
│   │   ├── templateEngine.ts # テンプレート処理
│   │   └── timeParser.ts   # 日時パース
│   ├── services/            # 外部サービス連携
│   │   ├── gmailWatcher.ts # Gmail API
│   │   └── calendarService.ts # Calendar API
│   ├── server.ts            # Webサーバー
│   └── cron.ts              # Cron実行スクリプト
├── .env                     # 環境変数（gitignore）
├── .env.example             # 環境変数テンプレート
├── package.json
├── tsconfig.json
└── README.md
```

## 🔐 セキュリティ

- `.env` と `token.json` は `.gitignore` に含まれているため、リポジトリにコミットされません
- OAuth トークンは自動的にリフレッシュされます
- Google Cloud Console でアクセス権限を適切に設定してください

## 🐛 トラブルシューティング

### 認証エラー

```bash
# token.jsonを削除して再認証
rm token.json
npm run dev
# ブラウザで http://localhost:3000/auth にアクセス
```

### メールが見つからない

- Gmail クエリが正しいか確認
- Gmailのウェブインターフェースで同じクエリを試す
- ラベルが正しく設定されているか確認

### カレンダー作成エラー

- Google Calendar API が有効になっているか確認
- calendarId が正しいか確認（通常は `primary`）

## 📝 ライセンス

MIT

## 🤝 貢献

プルリクエストを歓迎します！バグ報告や機能リクエストは Issue でお願いします。
