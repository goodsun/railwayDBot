# Railway Discord Bot with NFT Integration

Discord コミュニティと ブロックチェーンを繋ぐ、NFT 統合機能を持つ Discord Bot システム。Railway 上でのデプロイを前提として設計されています。

<img src="https://yg4hpr6yt5u4rkn7eamxwanuybm6mnpm6imq75hjmnzl7n7gkgeq.arweave.net/wbh3x9ifacipvyAZewG0wFnmNezyGQ_06WNyv7fmUYk" alt="dbot Logo"  width="120px">

## 概要

このシステムは、Discord の社会的機能とブロックチェーンの所有権・アイデンティティ機能をシームレスに統合します。Web3 コミュニティ向けに、Discord アカウントと EOA（Externally Owned Account）アドレスの紐付け、NFT 情報の取得、メンバー登録などの機能を提供します。

### 主な機能

- **Discord Bot**: スラッシュコマンドによる NFT 情報取得やメンバー登録
- **Web3 統合**: MetaMask を使用した EOA アドレスとの連携
- **メンバー登録システム**: SBT（Soul Bound Token）を使用したオンチェーンメンバー管理
- **NFT メタデータ取得**: IPFS、オンチェーン Base64 など複数のソースに対応

## 技術スタック

- **Backend**: Node.js, Express.js
- **Discord Integration**: Discord.js v14
- **Blockchain**: ethers.js v6
- **Web3 Frontend**: Web3.js, MetaMask
- **Template Engine**: EJS
- **Deployment**: Railway

## セットアップ

### 必要な環境

- Node.js 18.x 以上
- npm

### インストール

```bash
git clone <repository-url>
cd railwayDBot
npm install
```

### 環境変数

`.env`ファイルを作成し、以下の環境変数を設定してください：

```env
# サーバー設定
PORT=3000
NODE_ENV=development
APP_URL=http://localhost:3000

# Discord Bot 設定
DISCORD_TOKEN=your_discord_bot_token
DISCORD_CLIENT_ID=your_discord_client_id
DISCORD_GUILD_ID=your_discord_guild_id
APP_NAME=railwayDBot

# ブロックチェーン設定
RPC_URL=https://polygon-rpc.com
CHAIN_ID=137
CHAIN_NAME=Polygon Mainnet

# スマートコントラクト
MEMBER_INFO_CA=your_member_sbt_contract_address
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

## Discord Bot コマンド

### /ping

Bot の応答時間を確認

### /tokeninfo

NFT の情報を取得

- `contract_address`: NFT コントラクトアドレス
- `token_id`: トークン ID

### /register

Discord アカウントと EOA アドレスを紐付け

- Web ページへのリンクを生成し、MetaMask での署名を通じて登録

### /help

利用可能なコマンドの一覧を表示

## API エンドポイント

### GET /

API の状態を確認

**レスポンス例:**

```json
{
  "message": "Discord Bot API is running",
  "status": "active",
  "timestamp": "2025-08-15T12:00:00.000Z"
}
```

### GET /health

ヘルスチェック

**レスポンス例:**

```json
{
  "status": "healthy",
  "uptime": 123.456,
  "environment": "development",
  "bot": {
    "ready": true,
    "guilds": 1
  }
}
```

### GET /api/tokeninfo/:contractAddress/:tokenId

NFT メタデータを取得

**レスポンス例:**

```json
{
  "tokenId": "1",
  "owner": "0x...",
  "metadata": {
    "name": "NFT Name",
    "description": "NFT Description",
    "image": "ipfs://..."
  }
}
```

### POST /api/register-session

登録セッションを作成

**リクエストボディ:**

```json
{
  "discordId": "123456789",
  "username": "username#1234"
}
```

### GET /register/:sessionId

メンバー登録ページ（Web3 統合）

### GET /proxy/discord-avatar/:userId/:avatarId

Discord アバター画像のプロキシ（CORS 対応）

## Railway へのデプロイ

1. Railway アカウントを作成
2. 新しいプロジェクトを作成
3. GitHub リポジトリと連携
4. 環境変数を設定
5. デプロイを実行

Railway は自動的に `npm start` コマンドを実行し、`PORT` 環境変数を提供します。

## 環境変数一覧

| 変数名            | 説明                       | 必須 | デフォルト値            |
| ----------------- | -------------------------- | ---- | ----------------------- |
| PORT              | サーバーポート             | ❌   | 3000                    |
| NODE_ENV          | 実行環境                   | ❌   | development             |
| APP_URL           | アプリケーション URL       | ✅   | -                       |
| DISCORD_TOKEN     | Discord Bot トークン       | ✅   | -                       |
| DISCORD_CLIENT_ID | Discord クライアント ID    | ✅   | -                       |
| DISCORD_GUILD_ID  | Discord サーバー ID        | ✅   | -                       |
| APP_NAME          | Bot のアクティビティ表示名 | ❌   | railwayDBot             |
| RPC_URL           | ブロックチェーン RPC URL   | ❌   | https://polygon-rpc.com |
| CHAIN_ID          | チェーン ID                | ❌   | 137                     |
| CHAIN_NAME        | チェーン名                 | ❌   | Polygon Mainnet         |
| MEMBER_INFO_CA    | メンバー SBT コントラクト  | ✅   | -                       |

### 他のチェーンへの接続例

```env
# Ethereum Mainnet
RPC_URL=https://eth.llamarpc.com
CHAIN_ID=1
CHAIN_NAME=Ethereum Mainnet

# Arbitrum One
RPC_URL=https://arb1.arbitrum.io/rpc
CHAIN_ID=42161
CHAIN_NAME=Arbitrum One

# Base
RPC_URL=https://mainnet.base.org
CHAIN_ID=8453
CHAIN_NAME=Base
```

## アーキテクチャ

### システム構成

```
railwayDBot/
├── index.js              # Express サーバーのエントリーポイント
├── bot/
│   └── bot.js           # Discord Bot のメインロジック
├── public/
│   ├── register.ejs     # メンバー登録 Web ページ
│   └── css/            # スタイルシート
└── package.json         # 依存関係とスクリプト
```

### 登録フロー

1. ユーザーが Discord で `/register` コマンドを実行
2. Bot が一時的なセッション ID を生成し、登録リンクを返す
3. ユーザーが Web ページにアクセスし、MetaMask で接続
4. ユーザー情報（Discord ID、ユーザー名、アバター）を SBT としてオンチェーンに保存
5. 既存の SBT がある場合は更新、ない場合は新規発行

## ユースケース

- **NFT コミュニティ管理**: NFT の所有権を確認し、コレクション情報を表示
- **DAO メンバーシップ**: Discord アイデンティティをブロックチェーンアドレスにリンク
- **Web3 コミュニティ構築**: Discord とブロックチェーンの橋渡し

## セキュリティ考慮事項

- セッション ID は一時的で、5 分後に自動的に期限切れ
- CORS 設定により、Discord アバター画像への安全なアクセス
- 環境変数による機密情報の管理

## 今後の実装予定

- 複数チェーン対応の拡張
- ロール自動付与機能
- NFT 保有者限定チャンネルアクセス
- データベース連携によるトランザクション履歴管理

## ライセンス

MIT
