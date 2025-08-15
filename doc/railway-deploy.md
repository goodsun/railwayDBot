# Railway デプロイガイド

## 目次
1. [Railwayアカウントの作成](#1-railwayアカウントの作成)
2. [プロジェクトの作成](#2-プロジェクトの作成)
3. [GitHubリポジトリの連携](#3-githubリポジトリの連携)
4. [環境変数の設定](#4-環境変数の設定)
5. [デプロイの実行](#5-デプロイの実行)
6. [ドメインの設定](#6-ドメインの設定)
7. [監視とログ](#7-監視とログ)
8. [トラブルシューティング](#8-トラブルシューティング)

## 1. Railwayアカウントの作成

### サインアップ手順

1. [Railway.app](https://railway.app/)にアクセス
2. 「Start a New Project」をクリック
3. 以下のいずれかでサインアップ：
   - GitHub（推奨）
   - Google
   - Email

### 料金プラン

| プラン | 料金 | 特徴 |
|--------|------|------|
| Starter | 無料 | $5分のクレジット/月、基本機能 |
| Developer | $5/月 | $10分のリソース含む |
| Team | $20/月 | チーム機能、より多いリソース |

## 2. プロジェクトの作成

### 新規プロジェクト作成

1. ダッシュボードで「New Project」をクリック
2. 以下のオプションから選択：
   - **Deploy from GitHub repo**（推奨）
   - Empty Project
   - Deploy a Template

### プロジェクト設定

```
Project Name: discord-bot-api
Environment: Production
Region: US West (または最寄りのリージョン)
```

## 3. GitHubリポジトリの連携

### 連携手順

1. 「Deploy from GitHub repo」を選択
2. GitHubアカウントを認証
3. リポジトリを選択：
   - Organization/User を選択
   - リポジトリを検索して選択
   - ブランチを選択（通常は`main`）

### 自動デプロイ設定

```yaml
✅ Auto Deploy: Enabled
✅ Branch: main
✅ Check Suites: Required
```

## 4. 環境変数の設定

### Railway環境変数の追加

1. プロジェクトページで「Variables」タブを選択
2. 「New Variable」をクリック
3. 以下の変数を追加：

#### 必須環境変数

```bash
# Discord Bot設定
DISCORD_TOKEN=your_discord_bot_token_here
DISCORD_CLIENT_ID=your_discord_client_id_here

# Node.js設定
NODE_ENV=production

# Railway提供（自動設定）
PORT=（Railwayが自動的に設定）
```

#### 環境変数の追加方法

##### 個別追加
```
Key: DISCORD_TOKEN
Value: YOUR_BOT_TOKEN_HERE
```

##### 一括追加（Raw Editor）
```env
DISCORD_TOKEN=your_token_here
DISCORD_CLIENT_ID=your_client_id_here
NODE_ENV=production
```

### セキュリティ注意事項

- 環境変数は暗号化されて保存
- チームメンバー間で共有可能
- ログには表示されない

## 5. デプロイの実行

### 初回デプロイ

1. GitHubにコードをプッシュ
```bash
git add .
git commit -m "Initial deployment"
git push origin main
```

2. Railwayが自動的に以下を実行：
   - コードの取得
   - 依存関係のインストール
   - ビルドプロセス
   - アプリケーションの起動

### デプロイプロセス

```
1. GitHub Webhook受信
   ↓
2. ソースコード取得
   ↓
3. Buildpacksによる環境検出
   ↓
4. npm install実行
   ↓
5. npm start実行
   ↓
6. ヘルスチェック
   ↓
7. デプロイ完了
```

### ビルドログの確認

1. プロジェクトページで「Deployments」タブ
2. デプロイメントをクリック
3. ログを確認：
   - Build Logs
   - Deploy Logs

## 6. ドメインの設定

### Railway提供ドメイン

自動的に以下の形式でURLが生成されます：
```
https://your-project-name.up.railway.app
```

### カスタムドメイン設定

1. 「Settings」→「Domains」
2. 「Custom Domain」をクリック
3. ドメインを入力
4. DNSレコードを設定：

```
Type: CNAME
Name: bot（またはサブドメイン）
Value: your-project-name.up.railway.app
```

### SSL証明書

- Let's Encryptによる自動SSL
- HTTP→HTTPSの自動リダイレクト
- 証明書の自動更新

## 7. 監視とログ

### メトリクス確認

#### リソース使用状況
- CPU使用率
- メモリ使用量
- ネットワークI/O
- ディスク使用量

#### アプリケーションメトリクス
- リクエスト数
- レスポンスタイム
- エラー率

### ログ管理

#### リアルタイムログ
```bash
# Railway CLI経由
railway logs

# Web UI
Deployments → View Logs
```

#### ログフィルタリング
- Error logs only
- 時間範囲指定
- キーワード検索

### アラート設定

1. 「Settings」→「Notifications」
2. 通知チャンネル設定：
   - Email
   - Discord
   - Slack

## 8. トラブルシューティング

### よくある問題

#### ビルドエラー

**問題**: `npm install`が失敗する
```
解決策:
1. package.jsonの確認
2. Node.jsバージョン指定
3. package-lock.jsonの再生成
```

**package.jsonに追加**:
```json
{
  "engines": {
    "node": ">=18.0.0"
  }
}
```

#### 起動エラー

**問題**: アプリケーションが起動しない
```
確認事項:
1. npm startコマンドが正しいか
2. PORTが環境変数から取得されているか
3. 必須の環境変数が設定されているか
```

#### 接続エラー

**問題**: 外部からアクセスできない
```
解決策:
1. 0.0.0.0でリッスン
2. process.env.PORTを使用
3. ファイアウォール設定確認
```

### デバッグ手順

1. **ログの確認**
   ```bash
   railway logs --tail 100
   ```

2. **環境変数の確認**
   ```bash
   railway variables
   ```

3. **ローカルでの再現**
   ```bash
   railway run npm start
   ```

### パフォーマンス最適化

#### コールドスタート対策
- Keep-aliveエンドポイントの実装
- 軽量な初期化処理

#### リソース最適化
```javascript
// メモリ効率化
process.env.NODE_OPTIONS = '--max-old-space-size=512'

// CPU効率化
cluster.fork()を適切に使用
```

## デプロイチェックリスト

### デプロイ前確認

- [ ] 環境変数がすべて設定されている
- [ ] .gitignoreが適切に設定されている
- [ ] package.jsonにstartスクリプトがある
- [ ] ローカルでの動作確認済み
- [ ] セキュリティトークンが環境変数化されている

### デプロイ後確認

- [ ] アプリケーションが起動している
- [ ] エンドポイントが応答する
- [ ] ログにエラーがない
- [ ] リソース使用量が適切
- [ ] 外部サービスとの接続が確立

## 継続的デプロイメント

### GitHub Actions連携

`.github/workflows/deploy.yml`:
```yaml
name: Deploy to Railway

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: berviantoleo/railway-deploy@v1
        with:
          railway_token: ${{ secrets.RAILWAY_TOKEN }}
```

### ロールバック手順

1. Deployments履歴を確認
2. 以前の安定版を選択
3. 「Rollback to this deployment」をクリック

## 次のステップ

1. Discord.jsの統合
2. データベースの追加（PostgreSQL/Redis）
3. 監視ツールの設定
4. CI/CDパイプラインの強化