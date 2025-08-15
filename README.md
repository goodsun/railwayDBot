# Railway Discord Bot API

Discord Bot用のREST APIサーバー。Railway上でのデプロイを前提として設計されています。

## 概要

このプロジェクトは、Discord Botの基盤となるREST APIを提供します。現在は基本的なエンドポイントのみ実装されており、今後Discord Botの機能を段階的に追加していく予定です。

## 技術スタック

- Node.js
- Express.js
- Railway（デプロイ環境）

## セットアップ

### 必要な環境

- Node.js 18.x以上
- npm

### インストール

```bash
git clone <repository-url>
cd railwayDBot
npm install
```

### 環境変数

`.env`ファイルを作成し、以下の環境変数を設定してください：

```
PORT=3000
NODE_ENV=development
```

## 起動方法

### 開発環境

```bash
npm run dev
```

### 本番環境

```bash
npm start
```

## API エンドポイント

### GET /

APIの状態を確認するエンドポイント

**レスポンス例:**
```json
{
  "message": "Discord Bot API is running",
  "status": "active",
  "timestamp": "2025-08-15T12:00:00.000Z"
}
```

### GET /health

APIのヘルスチェックエンドポイント

**レスポンス例:**
```json
{
  "status": "healthy",
  "uptime": 123.456,
  "environment": "development"
}
```

### POST /webhook

メッセージを受け取って処理するエンドポイント

**リクエストボディ:**
```json
{
  "message": "Hello, Bot!",
  "user": "username"
}
```

**レスポンス例:**
```json
{
  "received": true,
  "echo": "Hello, Bot!",
  "user": "username",
  "processed_at": "2025-08-15T12:00:00.000Z"
}
```

## Railway へのデプロイ

1. Railwayアカウントを作成
2. 新しいプロジェクトを作成
3. GitHubリポジトリと連携
4. 環境変数を設定
5. デプロイを実行

Railway は自動的に `npm start` コマンドを実行し、`PORT` 環境変数を提供します。

## 今後の実装予定

- Discord Bot との連携
- Discord API との統合
- コマンド処理システム
- データベース連携
- 認証・認可システム

## ライセンス

ISC
