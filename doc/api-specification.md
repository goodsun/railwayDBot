# API 仕様書

## 概要

Discord Bot REST APIの仕様書です。このAPIはRailway上で動作し、Discord Bot機能とブロックチェーン情報取得機能を提供します。

## ベースURL

- 開発環境: `http://localhost:3000`
- 本番環境: `https://your-app.up.railway.app`

## 共通仕様

### リクエストヘッダー

| ヘッダー | 値 | 説明 |
|---------|-----|------|
| Content-Type | application/json | POSTリクエスト時必須 |

### エラーレスポンス

すべてのエラーレスポンスは以下の形式で返されます：

```json
{
  "error": "エラーメッセージ"
}
```

### HTTPステータスコード

| コード | 説明 |
|--------|------|
| 200 | 成功 |
| 400 | リクエストエラー |
| 404 | エンドポイントが見つからない |
| 500 | サーバーエラー |

## エンドポイント一覧

### 1. GET /

APIのステータスを確認します。

**リクエスト**
```
GET /
```

**レスポンス**
```json
{
  "message": "Discord Bot API is running",
  "status": "active",
  "timestamp": "2025-08-16T12:00:00.000Z"
}
```

**フィールド説明**
- `message` (string): APIの動作確認メッセージ
- `status` (string): APIのステータス（常に "active"）
- `timestamp` (string): レスポンス生成時刻（ISO 8601形式）

---

### 2. GET /health

APIのヘルスチェックを行います。

**リクエスト**
```
GET /health
```

**レスポンス**
```json
{
  "status": "healthy",
  "uptime": 123.456,
  "environment": "development"
}
```

**フィールド説明**
- `status` (string): ヘルスステータス（常に "healthy"）
- `uptime` (number): サーバー起動からの経過時間（秒）
- `environment` (string): 実行環境（"development" または "production"）

---

### 3. GET /version

デプロイされているバージョン情報を取得します。

**リクエスト**
```
GET /version
```

**レスポンス**
```json
{
  "version": "abc123def456...",
  "branch": "main",
  "build_time": "2025-08-16T12:00:00.000Z",
  "node_version": "v18.17.0",
  "railway_deployment_id": "dep_xxxxx"
}
```

**フィールド説明**
- `version` (string): Gitコミットハッシュ
- `branch` (string): Gitブランチ名
- `build_time` (string): ビルド時刻（ISO 8601形式）
- `node_version` (string): Node.jsバージョン
- `railway_deployment_id` (string|null): RailwayデプロイメントID

---

### 4. GET /tokeninfo/:ca/:tokenId

Polygon MainnetのNFTトークン情報を取得します。

**リクエスト**
```
GET /tokeninfo/{contractAddress}/{tokenId}
```

**パラメータ**
- `contractAddress` (string): NFTコントラクトアドレス（0xで始まる42文字）
- `tokenId` (string): トークンID（数値）

**リクエスト例**
```
GET /tokeninfo/0x72A02d559435319bD77462690E202a28c2Ba8623/26
```

**レスポンス**
```json
{
  "contract_address": "0x72A02d559435319bD77462690E202a28c2Ba8623",
  "token_id": "26",
  "token_uri": "ipfs://QmXxx.../26.json",
  "name": "Collection Name",
  "symbol": "SYMBOL",
  "owner": "0x1234...5678",
  "network": "polygon-mainnet"
}
```

**フィールド説明**
- `contract_address` (string): コントラクトアドレス
- `token_id` (string): トークンID
- `token_uri` (string): トークンメタデータURI
- `name` (string): コレクション名
- `symbol` (string): コレクションシンボル
- `owner` (string|null): トークン所有者アドレス
- `network` (string): ネットワーク名（常に "polygon-mainnet"）

**エラーレスポンス**

無効なコントラクトアドレス:
```json
{
  "error": "Invalid contract address"
}
```

トークン取得エラー:
```json
{
  "error": "Failed to fetch token info",
  "message": "詳細なエラーメッセージ"
}
```

---

### 5. POST /webhook

メッセージを受け取って処理します（将来的にDiscord Webhookとして使用予定）。

**リクエスト**
```
POST /webhook
Content-Type: application/json
```

**リクエストボディ**
```json
{
  "message": "Hello, Bot!",
  "user": "username"
}
```

**パラメータ**
- `message` (string, 必須): 処理するメッセージ
- `user` (string, オプション): ユーザー名

**レスポンス**
```json
{
  "received": true,
  "echo": "Hello, Bot!",
  "user": "username",
  "processed_at": "2025-08-16T12:00:00.000Z"
}
```

**フィールド説明**
- `received` (boolean): メッセージ受信確認（常に true）
- `echo` (string): 受信したメッセージのエコー
- `user` (string): ユーザー名（未指定の場合 "anonymous"）
- `processed_at` (string): 処理時刻（ISO 8601形式）

**エラーレスポンス**

メッセージ未指定:
```json
{
  "error": "Message is required"
}
```

---

## 開発者向け情報

### API Viewer

開発環境では `/viewer` にアクセスすることで、ブラウザベースのAPIテストツールを使用できます。

```
http://localhost:3000/viewer
```

**注意**: 本番環境では無効化されています。

### 環境変数

| 変数名 | 説明 | デフォルト値 |
|--------|------|-------------|
| PORT | サーバーポート | 3000 |
| NODE_ENV | 実行環境 | development |
| POLYGON_RPC_URL | Polygon RPC URL | https://polygon-rpc.com |
| DISCORD_TOKEN | Discord Botトークン | - |
| DISCORD_CLIENT_ID | Discord クライアントID | - |

### RPC制限

Polygon RPCには以下の制限があります：
- レート制限: 公開RPCの場合、秒間リクエスト数に制限あり
- 推奨: 本番環境では専用RPCエンドポイント（Alchemy、Infura等）の使用を推奨

## 今後の実装予定

1. **認証機能**
   - APIキー認証
   - Discord OAuth2連携

2. **Discord Bot機能**
   - コマンド処理エンドポイント
   - イベントリスナー
   - メッセージ送信API

3. **ブロックチェーン機能拡張**
   - 複数チェーン対応
   - ERC-1155サポート
   - メタデータ解析

4. **キャッシング**
   - トークン情報のキャッシュ
   - レート制限対策

## サポート

問題や質問がある場合は、GitHubリポジトリのIssuesに報告してください。