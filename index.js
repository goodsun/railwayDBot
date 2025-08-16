require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');
const { ethers } = require('ethers');

const app = express();
const PORT = process.env.PORT || 3000;

// EJSを設定
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'public'));

// ビルド情報を読み込む
let buildInfo = {};
try {
  if (fs.existsSync('build-info.json')) {
    buildInfo = JSON.parse(fs.readFileSync('build-info.json', 'utf8'));
  }
} catch (error) {
  console.error('Failed to load build info:', error.message);
}

// RPC設定（デフォルト: Polygon Mainnet）
const RPC_URL = process.env.RPC_URL || 'https://polygon-rpc.com';
const provider = new ethers.JsonRpcProvider(RPC_URL);

// ERC721 ABI (tokenURIメソッドのみ)
const ERC721_ABI = [
  'function tokenURI(uint256 tokenId) view returns (string)',
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function ownerOf(uint256 tokenId) view returns (address)'
];

app.use(express.json());

// 開発環境でのみviewerを有効化
if (process.env.NODE_ENV !== 'production') {
  app.use('/viewer', express.static('viewer'));
}

// 登録ページ用の静的ファイル
app.use('/register', express.static('public'));

app.get('/', (req, res) => {
  res.json({ 
    message: 'Discord Bot API is running',
    status: 'active',
    timestamp: new Date().toISOString()
  });
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

app.get('/version', (req, res) => {
  res.json({
    version: process.env.RAILWAY_GIT_COMMIT_SHA || buildInfo.commit || 'unknown',
    branch: process.env.RAILWAY_GIT_BRANCH || buildInfo.branch || 'unknown',
    build_time: buildInfo.buildTime || new Date().toISOString(),
    node_version: process.version,
    railway_deployment_id: process.env.RAILWAY_DEPLOYMENT_ID || null,
    discord_client_id: process.env.DISCORD_CLIENT_ID || null,
    discord_guild_id: process.env.DISCORD_GUILD_ID || null,
    member_info_ca: process.env.MEMBER_INFO_CA || null,
    app_url: process.env.APP_URL || null,
    rpc_url: process.env.RPC_URL || null
  });
});

app.get('/tokeninfo/:ca/:tokenId', async (req, res) => {
  const { ca, tokenId } = req.params;
  
  try {
    // アドレスの検証
    if (!ethers.isAddress(ca)) {
      return res.status(400).json({ error: 'Invalid contract address' });
    }
    
    // トークンIDの検証
    const tokenIdBN = BigInt(tokenId);
    
    // コントラクトインスタンスを作成
    const contract = new ethers.Contract(ca, ERC721_ABI, provider);
    
    // トークン情報を取得
    const [tokenURI, name, symbol, owner] = await Promise.all([
      contract.tokenURI(tokenIdBN),
      contract.name().catch(() => 'Unknown'),
      contract.symbol().catch(() => 'Unknown'),
      contract.ownerOf(tokenIdBN).catch(() => null)
    ]);
    
    res.json({
      contract_address: ca,
      token_id: tokenId,
      token_uri: tokenURI,
      name,
      symbol,
      owner,
      network: 'polygon-mainnet'
    });
    
  } catch (error) {
    console.error('Token info error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch token info',
      message: error.message 
    });
  }
});

app.post('/webhook', (req, res) => {
  const { message, user } = req.body;
  
  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }
  
  res.json({
    received: true,
    echo: message,
    user: user || 'anonymous',
    processed_at: new Date().toISOString()
  });
});

// 登録ページのエンドポイント
app.get('/register/:token', (req, res) => {
  const { token } = req.params;
  
  // セッション情報の確認
  if (!global.registrationSessions || !global.registrationSessions[token]) {
    return res.status(404).send('Invalid or expired registration link');
  }
  
  const session = global.registrationSessions[token];
  
  // 有効期限の確認
  if (Date.now() > session.expiresAt) {
    delete global.registrationSessions[token];
    return res.status(410).send('Registration link has expired');
  }
  
  // デバッグ: 環境変数の確認
  console.log('MEMBER_INFO_CA from env:', process.env.MEMBER_INFO_CA);
  console.log('CHAIN_ID from env:', process.env.CHAIN_ID);
  
  // ネットワーク設定
  const networkConfig = {
    chainId: process.env.CHAIN_ID || '137',
    chainName: process.env.CHAIN_NAME || 'Polygon Mainnet',
    rpcUrl: process.env.RPC_URL || 'https://polygon-rpc.com',
    currencySymbol: process.env.CURRENCY_SYMBOL || 'MATIC',
    blockExplorerUrl: process.env.BLOCK_EXPLORER_URL || 'https://polygonscan.com'
  };
  
  // 登録ページのHTMLを返す
  res.render('register', { 
    CONTRACT_ADDRESS: process.env.MEMBER_INFO_CA || '0x0000000000000000000000000000000000000000',
    NETWORK_CONFIG: networkConfig
  });
});

// 登録セッション情報の取得
app.get('/api/register/:token', (req, res) => {
  const { token } = req.params;
  
  if (!global.registrationSessions || !global.registrationSessions[token]) {
    return res.status(404).json({ error: 'Invalid or expired token' });
  }
  
  const session = global.registrationSessions[token];
  
  if (Date.now() > session.expiresAt) {
    delete global.registrationSessions[token];
    return res.status(410).json({ error: 'Token has expired' });
  }
  
  res.json({
    discordId: session.discordId,
    discordUsername: session.discordUsername,
    avatarUrl: session.avatarUrl,
    address: session.address
  });
});

// 登録の完了
app.post('/api/register/:token', async (req, res) => {
  const { token } = req.params;
  const { txHash } = req.body;
  
  if (!global.registrationSessions || !global.registrationSessions[token]) {
    return res.status(404).json({ error: 'Invalid or expired token' });
  }
  
  const session = global.registrationSessions[token];
  
  // トランザクション確認後、セッションを削除
  delete global.registrationSessions[token];
  
  res.json({
    success: true,
    message: 'Registration completed',
    discordId: session.discordId,
    address: session.address,
    txHash
  });
});

// Discord画像プロキシ（CORS回避用）
app.get('/api/proxy-image', async (req, res) => {
  const { url } = req.query;
  
  if (!url || !url.startsWith('https://cdn.discordapp.com/')) {
    return res.status(400).json({ error: 'Invalid URL' });
  }
  
  try {
    const response = await fetch(url);
    const buffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type');
    
    res.set('Content-Type', contentType);
    res.send(Buffer.from(buffer));
  } catch (error) {
    console.error('Image proxy error:', error);
    res.status(500).json({ error: 'Failed to fetch image' });
  }
});

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

// Discord Botの初期化
const { initializeBot } = require('./bot/bot');

app.listen(PORT, async () => {
  console.log(`Server is running on port ${PORT}`);
  console.log('Environment variables:');
  console.log('- MEMBER_INFO_CA:', process.env.MEMBER_INFO_CA || 'NOT SET');
  console.log('- APP_URL:', process.env.APP_URL || 'NOT SET');
  console.log('- RPC_URL:', process.env.RPC_URL || 'NOT SET');
  console.log('- CHAIN_ID:', process.env.CHAIN_ID || 'NOT SET (default: 137)');
  console.log('- CHAIN_NAME:', process.env.CHAIN_NAME || 'NOT SET (default: Polygon Mainnet)');
  
  // Discord Tokenが設定されている場合のみBotを起動
  if (process.env.DISCORD_TOKEN) {
    console.log('Discord Botを起動中...');
    await initializeBot();
  } else {
    console.log('DISCORD_TOKENが設定されていないため、Botは起動されません');
  }
});