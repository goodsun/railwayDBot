# Discord Bot API 設計書

## プロジェクト概要

Railway上で動作するDiscord Bot用のバックエンドAPIサービス。段階的にDiscord Botの機能を実装していくための基盤となるシステム。

## アーキテクチャ

### システム構成

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Discord   │────▶│   REST API   │────▶│  Railway    │
│    Bot      │     │   (Express)  │     │  Platform   │
└─────────────┘     └──────────────┘     └─────────────┘
                            │
                            ▼
                    ┌──────────────┐
                    │   Database   │
                    │   (Future)   │
                    └──────────────┘
```

### 技術選定理由

#### Express.js
- 軽量で高速なWebフレームワーク
- シンプルなAPIサーバーの構築に最適
- 豊富なミドルウェアエコシステム
- Discord.jsとの相性が良い

#### Railway
- GitHubとの連携によるCI/CD
- 環境変数の管理が簡単
- 自動的なHTTPS対応
- 無料枠でのスタートが可能

## APIエンドポイント設計

### 現在実装済み

| メソッド | パス | 説明 | ステータス |
|---------|------|------|------------|
| GET | / | APIステータス確認 | ✅ 実装済み |
| GET | /health | ヘルスチェック | ✅ 実装済み |
| POST | /webhook | メッセージ受信・処理 | ✅ 実装済み |

### 今後の実装予定

| メソッド | パス | 説明 | 優先度 |
|---------|------|------|--------|
| POST | /discord/commands | Discordコマンド処理 | 高 |
| GET | /discord/guilds | サーバー情報取得 | 中 |
| POST | /discord/messages | メッセージ送信 | 高 |
| GET | /users/:id | ユーザー情報取得 | 中 |
| POST | /auth/discord | Discord OAuth認証 | 低 |

## データモデル（将来実装）

### User
```javascript
{
  id: String,          // Discord User ID
  username: String,    // Discord Username
  discriminator: String,
  avatar: String,
  createdAt: Date,
  updatedAt: Date
}
```

### Guild
```javascript
{
  id: String,          // Discord Guild ID
  name: String,
  owner_id: String,
  icon: String,
  settings: Object,    // Bot固有の設定
  createdAt: Date,
  updatedAt: Date
}
```

### Command
```javascript
{
  guild_id: String,
  user_id: String,
  command: String,
  arguments: Array,
  response: String,
  timestamp: Date
}
```

## セキュリティ設計

### 認証・認可
- 初期段階：APIキーによる認証
- 将来：Discord OAuth2による認証
- レート制限の実装

### データ保護
- HTTPS通信の強制
- 環境変数による機密情報の管理
- SQLインジェクション対策（DB実装時）

## エラーハンドリング

### HTTPステータスコード

| コード | 説明 | 使用場面 |
|--------|------|----------|
| 200 | OK | 正常なレスポンス |
| 400 | Bad Request | 不正なリクエスト |
| 401 | Unauthorized | 認証エラー |
| 404 | Not Found | リソースが見つからない |
| 429 | Too Many Requests | レート制限 |
| 500 | Internal Server Error | サーバーエラー |

### エラーレスポンス形式
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "details": {}
  }
}
```

## 開発フロー

### フェーズ1：基盤構築（完了）
- [x] Express.jsのセットアップ
- [x] 基本的なルーティング
- [x] エラーハンドリング
- [x] Railway設定

### フェーズ2：Discord連携
- [ ] Discord.jsの統合
- [ ] Webhookの実装
- [ ] コマンドハンドラー
- [ ] イベントリスナー

### フェーズ3：データ永続化
- [ ] データベース選定（PostgreSQL/MongoDB）
- [ ] ORMの導入
- [ ] マイグレーション設定
- [ ] バックアップ戦略

### フェーズ4：高度な機能
- [ ] ユーザー認証
- [ ] 権限管理
- [ ] ダッシュボード
- [ ] 分析機能

## パフォーマンス考慮事項

- レスポンスのキャッシング
- データベースクエリの最適化
- 非同期処理の活用
- CDNの利用（静的ファイル）

## 監視・ログ

- アプリケーションログ
- エラートラッキング
- パフォーマンスメトリクス
- アップタイム監視

## デプロイメント

### 環境変数
```
NODE_ENV=production
PORT=<Railway提供>
DISCORD_TOKEN=<Discord Bot Token>
DISCORD_CLIENT_ID=<Discord Application ID>
DATABASE_URL=<データベース接続文字列>
```

### CI/CDパイプライン
1. GitHubへのpush
2. Railwayでの自動ビルド
3. テストの実行
4. 本番環境へのデプロイ

## 今後の検討事項

- マイクロサービス化
- GraphQL APIの検討
- WebSocket通信の実装
- 国際化対応
