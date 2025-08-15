# Discord Bot 設定ガイド

## 目次
1. [Discord Developerアカウントの作成](#1-discord-developerアカウントの作成)
2. [新しいApplicationの作成](#2-新しいapplicationの作成)
3. [Botの作成と設定](#3-botの作成と設定)
4. [Botの権限設定](#4-botの権限設定)
5. [BotをDiscordサーバーに招待](#5-botをdiscordサーバーに招待)
6. [環境変数の設定](#6-環境変数の設定)
7. [トラブルシューティング](#7-トラブルシューティング)

## 1. Discord Developerアカウントの作成

1. [Discord Developer Portal](https://discord.com/developers/applications)にアクセス
2. Discordアカウントでログイン
3. 初回アクセス時は利用規約に同意

## 2. 新しいApplicationの作成

1. 右上の「New Application」ボタンをクリック
2. アプリケーション名を入力（例：`My Discord Bot`）
3. 利用規約に同意して「Create」をクリック

### Application設定
- **Name**: Botの名前（後で変更可能）
- **Description**: Botの説明（オプション）
- **App Icon**: Botのアイコン画像（オプション）

## 3. Botの作成と設定

### Bot作成手順

1. 左側メニューから「Bot」を選択
2. 「Add Bot」ボタンをクリック
3. 確認ダイアログで「Yes, do it!」をクリック

### 重要な設定項目

#### Token（最重要）
1. 「Reset Token」ボタンをクリック
2. 表示されたトークンを**安全な場所に保存**
3. **注意**: このトークンは一度しか表示されません
4. トークンは絶対に公開しないでください

```
例: YOUR_BOT_TOKEN_HERE.xxxxxx.xxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

#### Privileged Gateway Intents
必要に応じて以下を有効化：
- **Presence Intent**: ユーザーのオンライン状態を取得
- **Server Members Intent**: サーバーメンバー情報を取得
- **Message Content Intent**: メッセージ内容を読み取る

### Bot設定のベストプラクティス

```
✅ Public Bot: OFF（開発中は無効化推奨）
✅ Require OAuth2 Code Grant: OFF（通常は不要）
```

## 4. Botの権限設定

### OAuth2 URL Generator

1. 左側メニューから「OAuth2」→「URL Generator」を選択
2. **Scopes**で「bot」にチェック
3. **Bot Permissions**で必要な権限を選択

### 推奨権限設定

#### 基本的なBot
```
✅ View Channels
✅ Send Messages
✅ Read Message History
✅ Add Reactions
```

#### 管理機能を持つBot
```
✅ Manage Messages
✅ Manage Channels
✅ Kick Members
✅ Ban Members
✅ Manage Roles
```

#### 音楽Bot
```
✅ Connect
✅ Speak
✅ Use Voice Activity
```

### 権限の数値

選択した権限は数値で表現されます：
- 基本的な権限: `68608`
- 管理者権限: `8`（すべての権限）

## 5. BotをDiscordサーバーに招待

### 招待URLの生成

1. OAuth2 URL Generatorで設定後、ページ下部のURLをコピー
2. URLの形式：
```
https://discord.com/api/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=YOUR_PERMISSIONS&scope=bot
```

### サーバーへの追加

1. 生成したURLをブラウザで開く
2. Botを追加したいサーバーを選択
3. 権限を確認して「認証」をクリック
4. CAPTCHAを完了

## 6. 環境変数の設定

### 必要な情報の取得

#### Client ID
1. 「General Information」ページ
2. 「Application ID」をコピー

#### Bot Token
1. 「Bot」ページ
2. 先ほど保存したトークンを使用

### .env ファイルの例

```env
# Discord Bot設定
DISCORD_TOKEN=YOUR_BOT_TOKEN_HERE
DISCORD_CLIENT_ID=YOUR_CLIENT_ID_HERE
DISCORD_GUILD_ID=YOUR_GUILD_ID_HERE  # テストサーバーのID（オプション）

# アプリケーション設定
NODE_ENV=development
PORT=3000
```

### 環境変数の説明

| 変数名 | 説明 | 必須 | 例 |
|--------|------|------|-----|
| DISCORD_TOKEN | Bot認証トークン | ✅ | `MTE1MDQ...` |
| DISCORD_CLIENT_ID | ApplicationのID | ✅ | `115049568...` |
| DISCORD_GUILD_ID | 開発用サーバーID | ❌ | `123456789...` |

## 7. トラブルシューティング

### よくある問題と解決方法

#### Botがオフラインのまま
- トークンが正しいか確認
- コードでBotがログインしているか確認
- ネットワーク接続を確認

#### 権限エラー
- Botに必要な権限が付与されているか確認
- Botのロールがチャンネルで適切に設定されているか確認
- サーバーの階層でBotのロールが上位にあるか確認

#### Intentsエラー
```
Error: Disallowed Intents
```
- Developer Portalで必要なIntentsが有効化されているか確認
- コード内で正しいIntentsを指定しているか確認

### セキュリティのベストプラクティス

1. **トークンの管理**
   - Gitにコミットしない
   - 環境変数で管理
   - 定期的に再生成

2. **権限の最小化**
   - 必要最小限の権限のみ付与
   - 開発と本番で権限を分ける

3. **アクセス制御**
   - 特定のサーバーのみで動作するよう制限
   - コマンドの実行権限を適切に設定

## 次のステップ

1. [Railway デプロイガイド](./railway-deploy.md)を参照
2. Discord.jsを使用してBotの機能を実装
3. コマンドハンドラーの実装
4. データベース連携の設定