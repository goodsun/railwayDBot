# Discord Bot コマンド一覧

## 実装済みコマンド

### 1. /ping

Bot の応答速度を確認します。

**使用例:**

```
/ping
```

**レスポンス:**

```
Pong! レイテンシ: 45ms, API: 23ms
```

---

### 2. /tokeninfo

NFT トークンの情報を取得します。

**パラメータ:**

- `address` (必須): NFT コントラクトアドレス
- `tokenid` (必須): トークン ID

**使用例:**

```
/tokeninfo address:0x72A02d559435319bD77462690E202a28c2Ba8623 tokenid:26
```

**レスポンス:**

- NFT の名前と画像
- コレクション情報（名前、シンボル）
- トークン ID
- コントラクトアドレス
- Token URI
- オーナーアドレス
- メタデータ（名前、説明、画像）

---

### 3. /help

使用可能なコマンドの一覧を表示します。

**使用例:**

```
/help
```

## Bot 機能

### 自動機能

- スラッシュコマンドの自動登録
- NFT メタデータの自動取得（IPFS 対応）
- エラーハンドリング

### 対応ネットワーク

- Polygon Mainnet

### 技術仕様

- Discord.js v14
- ethers.js v6
- Express.js（API 連携）

## セットアップ

### 必要な権限

Bot には以下の権限が必要です：

- Send Messages
- Use Slash Commands
- Embed Links
- Read Message History

### 環境変数

```env
DISCORD_TOKEN=your_bot_token
DISCORD_CLIENT_ID=your_client_id
DISCORD_GUILD_ID=your_guild_id
RPC_URL=https://polygon-rpc.com
APP_NAME=railwayDBot
```

## トラブルシューティング

### コマンドが表示されない

- Bot を再起動
- 1 時間待つ（グローバルコマンドの反映に時間がかかる場合がある）
- Bot の権限を確認

### NFT 情報が取得できない

- コントラクトアドレスが正しいか確認
- トークン ID が存在するか確認
- Polygon RPC が正常に動作しているか確認

## 今後の実装予定

- 複数チェーン対応
- NFT 画像のキャッシュ
- ユーザー設定の保存
- コレクション統計情報
