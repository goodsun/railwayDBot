require('dotenv').config();
const express = require('express');
const fs = require('fs');

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
    railway_deployment_id: process.env.RAILWAY_DEPLOYMENT_ID || null
  });
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

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});