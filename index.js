require('dotenv').config();
const express = require('express');
const fs = require('fs');
const { ethers } = require('ethers');

const app = express();
const PORT = process.env.PORT || 3000;

// ビルド情報を読み込む
let buildInfo = {};
try {
  if (fs.existsSync('build-info.json')) {
    buildInfo = JSON.parse(fs.readFileSync('build-info.json', 'utf8'));
  }
} catch (error) {
  console.error('Failed to load build info:', error.message);
}

// Polygon Mainnet RPC設定
const POLYGON_RPC_URL = process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com';
const provider = new ethers.JsonRpcProvider(POLYGON_RPC_URL);

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
    discord_guild_id: process.env.DISCORD_GUILD_ID || null
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
  
  // Discord Tokenが設定されている場合のみBotを起動
  if (process.env.DISCORD_TOKEN) {
    console.log('Discord Botを起動中...');
    await initializeBot();
  } else {
    console.log('DISCORD_TOKENが設定されていないため、Botは起動されません');
  }
});