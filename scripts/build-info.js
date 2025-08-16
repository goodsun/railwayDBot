const fs = require('fs');
const { execSync } = require('child_process');

// Git情報を取得
try {
  const gitCommit = execSync('git rev-parse HEAD').toString().trim();
  const gitBranch = execSync('git rev-parse --abbrev-ref HEAD').toString().trim();
  const buildTime = new Date().toISOString();

  const buildInfo = {
    commit: gitCommit,
    branch: gitBranch,
    buildTime: buildTime
  };

  // build-info.jsonに保存
  fs.writeFileSync('build-info.json', JSON.stringify(buildInfo, null, 2));
  console.log('Build info generated:', buildInfo);
} catch (error) {
  console.error('Failed to generate build info:', error.message);
  // Gitが使えない環境用のフォールバック
  const buildInfo = {
    commit: 'unknown',
    branch: 'unknown',
    buildTime: new Date().toISOString()
  };
  fs.writeFileSync('build-info.json', JSON.stringify(buildInfo, null, 2));
}