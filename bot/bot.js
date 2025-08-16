const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } = require('discord.js');
const { ethers } = require('ethers');

// RPC設定（デフォルト: Polygon Mainnet）
const RPC_URL = process.env.RPC_URL || 'https://polygon-rpc.com';
const provider = new ethers.JsonRpcProvider(RPC_URL);

// ERC721 ABI
const ERC721_ABI = [
  'function tokenURI(uint256 tokenId) view returns (string)',
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function ownerOf(uint256 tokenId) view returns (address)'
];

// Discord Botクライアントの作成
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds
  ]
});

// スラッシュコマンドの定義
const commands = [
  new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Botの応答速度を確認します'),
  
  new SlashCommandBuilder()
    .setName('tokeninfo')
    .setDescription('NFTトークンの情報を取得します')
    .addStringOption(option =>
      option.setName('address')
        .setDescription('コントラクトアドレス')
        .setRequired(true))
    .addIntegerOption(option =>
      option.setName('tokenid')
        .setDescription('トークンID')
        .setRequired(true)),
  
  new SlashCommandBuilder()
    .setName('help')
    .setDescription('使用可能なコマンドを表示します'),
  
  new SlashCommandBuilder()
    .setName('register')
    .setDescription('Discord IDとEOAアドレスを紐付けます')
    .addStringOption(option =>
      option.setName('address')
        .setDescription('あなたのEOAアドレス（例: 0x123...）')
        .setRequired(true))
].map(command => command.toJSON());

// コマンドの登録
async function registerCommands() {
  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
  
  try {
    console.log('スラッシュコマンドの登録を開始...');
    
    // グローバルコマンドとして登録
    await rest.put(
      Routes.applicationCommands(process.env.DISCORD_CLIENT_ID),
      { body: commands }
    );
    
    console.log('スラッシュコマンドの登録が完了しました！');
  } catch (error) {
    console.error('コマンド登録エラー:', error);
  }
}

// Botの準備完了時
client.once('ready', () => {
  console.log(`✅ ${client.user.tag} としてログインしました！`);
  const appName = process.env.APP_NAME || 'railwayDBot';
  client.user.setActivity(appName);
});

// インタラクション（スラッシュコマンド）の処理
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName } = interaction;

  try {
    switch (commandName) {
      case 'ping':
        const latency = Date.now() - interaction.createdTimestamp;
        await interaction.reply(`🏓 Pong! レイテンシ: ${latency}ms, API: ${Math.round(client.ws.ping)}ms`);
        break;

      case 'tokeninfo':
        await interaction.deferReply();
        
        const address = interaction.options.getString('address');
        const tokenId = interaction.options.getInteger('tokenid');
        
        try {
          // アドレスの検証
          if (!ethers.isAddress(address)) {
            await interaction.editReply('❌ 無効なコントラクトアドレスです');
            return;
          }
          
          // NFT情報を取得
          const contract = new ethers.Contract(address, ERC721_ABI, provider);
          
          let tokenURI, name, symbol, owner;
          let tokenExists = true;
          let isValidNFT = true;
          
          try {
            // まずコントラクトがERC721かチェック（name/symbolの取得を試みる）
            [name, symbol] = await Promise.all([
              contract.name().catch(() => null),
              contract.symbol().catch(() => null)
            ]);
            
            // nameとsymbolが取得できない場合、NFTコントラクトではない可能性
            if (!name && !symbol) {
              isValidNFT = false;
            } else {
              // ownerOfでトークンの存在を確認
              try {
                owner = await contract.ownerOf(tokenId);
                tokenExists = true;
                
                // トークンが存在する場合、tokenURIを取得
                tokenURI = await contract.tokenURI(tokenId).catch(() => null);
              } catch (ownerError) {
                if (ownerError.message.includes('invalid token ID') || 
                    ownerError.message.includes('execution reverted')) {
                  tokenExists = false;
                } else if (ownerError.message.includes('could not decode result data')) {
                  // ownerOfメソッドが存在しない
                  isValidNFT = false;
                } else {
                  throw ownerError;
                }
              }
            }
          } catch (error) {
            console.error('コントラクト情報取得エラー:', error);
            isValidNFT = false;
          }
          
          // 有効なNFTコントラクトでない場合
          if (!isValidNFT) {
            const embed = {
              title: `❌ 無効なNFTコントラクト`,
              color: 0xFF0000,
              description: 'このアドレスはERC721 NFTコントラクトではないようです',
              fields: [
                { name: 'コントラクト', value: `\`${address}\``, inline: false },
                { name: '詳細', value: '指定されたアドレスがNFTコントラクトであることを確認してください', inline: false }
              ],
              timestamp: new Date().toISOString(),
              footer: { text: 'NFT Info Bot' }
            };
            
            await interaction.editReply({ embeds: [embed] });
            return;
          }
          
          // トークンが存在しない場合
          if (!tokenExists) {
            const embed = {
              title: `❌ NFTが存在しません`,
              color: 0xFF0000,
              fields: [
                { name: 'コレクション', value: `${name} (${symbol})`, inline: true },
                { name: 'トークンID', value: tokenId.toString(), inline: true },
                { name: 'ステータス', value: '🚫 このトークンIDは存在しません', inline: false },
                { name: 'コントラクト', value: `\`${address}\``, inline: false }
              ],
              timestamp: new Date().toISOString(),
              footer: { text: 'NFT Info Bot' }
            };
            
            await interaction.editReply({ embeds: [embed] });
            return;
          }
          
          // メタデータを取得
          let metadata = null;
          let isBase64 = false;
          
          if (tokenURI) {
            // base64データの場合
            if (tokenURI.startsWith('data:')) {
              isBase64 = true;
              try {
                const base64Data = tokenURI.split(',')[1];
                const jsonString = Buffer.from(base64Data, 'base64').toString('utf-8');
                metadata = JSON.parse(jsonString);
              } catch (error) {
                console.error('base64メタデータ解析エラー:', error);
              }
            } else {
              // 通常のURLの場合
              try {
                let metadataUrl = tokenURI;
                if (metadataUrl.startsWith('ipfs://')) {
                  metadataUrl = metadataUrl.replace('ipfs://', 'https://ipfs.io/ipfs/');
                }
                
                const response = await fetch(metadataUrl);
                metadata = await response.json();
              } catch (error) {
                console.error('メタデータ取得エラー:', error);
              }
            }
          }
          
          // Embedメッセージの作成
          const embed = {
            title: `${name} #${tokenId}`,
            color: 0x0099FF,
            fields: [
              { name: 'コレクション', value: `${name} (${symbol})`, inline: true },
              { name: 'トークンID', value: tokenId.toString(), inline: true },
              { name: 'ネットワーク', value: 'Polygon Mainnet', inline: true },
              { name: 'コントラクト', value: `\`${address}\``, inline: false },
              { 
                name: 'Token URI', 
                value: isBase64 ? 
                  '📄 Base64エンコードされたオンチェーンデータ' : 
                  (tokenURI ? (tokenURI.length > 1000 ? `\`${tokenURI.substring(0, 100)}...\`` : `\`${tokenURI}\``) : 'N/A'), 
                inline: false 
              }
            ],
            timestamp: new Date().toISOString(),
            footer: { text: 'NFT Info Bot' }
          };
          
          if (owner) {
            embed.fields.push({ name: 'オーナー', value: `\`${owner}\``, inline: false });
          }
          
          if (metadata) {
            if (metadata.name) {
              embed.title = metadata.name;
            }
            if (metadata.description) {
              embed.description = metadata.description;
            }
            if (metadata.image) {
              let imageUrl = metadata.image;
              
              // base64画像の場合はスキップ（Discordの制限のため）
              if (imageUrl.startsWith('data:')) {
                embed.fields.push({ 
                  name: '画像', 
                  value: '🖼️ Base64エンコードされた画像データ', 
                  inline: false 
                });
              } else {
                if (imageUrl.startsWith('ipfs://')) {
                  imageUrl = imageUrl.replace('ipfs://', 'https://ipfs.io/ipfs/');
                }
                // URLが2048文字以内の場合のみ画像を表示
                if (imageUrl.length <= 2048) {
                  embed.image = { url: imageUrl };
                } else {
                  embed.fields.push({ 
                    name: '画像', 
                    value: '🔗 画像URLが長すぎるため表示できません', 
                    inline: false 
                  });
                }
              }
            }
          }
          
          await interaction.editReply({ embeds: [embed] });
          
        } catch (error) {
          console.error('NFT情報取得エラー:', error);
          await interaction.editReply(`❌ エラーが発生しました: ${error.message}`);
        }
        break;

      case 'help':
        const helpEmbed = {
          title: '📚 使用可能なコマンド',
          color: 0x00FF00,
          fields: [
            {
              name: '/ping',
              value: 'Botの応答速度を確認します',
              inline: false
            },
            {
              name: '/tokeninfo <address> <tokenid>',
              value: 'NFTトークンの情報を取得します\n例: `/tokeninfo 0x72A02d559435319bD77462690E202a28c2Ba8623 26`',
              inline: false
            },
            {
              name: '/help',
              value: 'このヘルプメッセージを表示します',
              inline: false
            },
            {
              name: '/register <address>',
              value: 'Discord IDとEOAアドレスを紐付けます',
              inline: false
            }
          ],
          footer: { text: 'NFT Info Bot - Powered by Railway' }
        };
        
        await interaction.reply({ embeds: [helpEmbed] });
        break;

      case 'register':
        const userAddress = interaction.options.getString('address');
        
        // アドレスの検証
        if (!ethers.isAddress(userAddress)) {
          await interaction.reply({
            content: '❌ 無効なEOAアドレスです。正しいアドレスを入力してください。',
            ephemeral: true
          });
          return;
        }
        
        // Discord IDを取得
        const discordId = interaction.user.id;
        const discordUsername = interaction.user.username;
        
        // 一意のトークンを生成（Discord ID + タイムスタンプのハッシュ）
        const token = ethers.id(`${discordId}-${Date.now()}`).slice(0, 16);
        
        // 署名用URLを生成
        const port = process.env.PORT || 3000;
        const baseUrl = process.env.APP_URL || `http://localhost:${port}`;
        const registrationUrl = `${baseUrl}/register/${token}`;
        
        // セッション情報を保存（実際の実装では Redis や DB を使用）
        if (!global.registrationSessions) {
          global.registrationSessions = {};
        }
        global.registrationSessions[token] = {
          discordId,
          discordUsername,
          address: userAddress,
          createdAt: Date.now(),
          expiresAt: Date.now() + 10 * 60 * 1000 // 10分後に期限切れ
        };
        
        // 埋め込みメッセージを作成
        const registerEmbed = {
          title: '🔗 EOAアドレスの登録',
          description: '以下のリンクをクリックして、MetaMaskで署名してください。',
          color: 0x5865F2,
          fields: [
            {
              name: 'Discord ID',
              value: `${discordUsername} (${discordId})`,
              inline: true
            },
            {
              name: 'EOAアドレス',
              value: `\`${userAddress}\``,
              inline: true
            },
            {
              name: '登録URL',
              value: `[こちらをクリック](${registrationUrl})`,
              inline: false
            }
          ],
          footer: { 
            text: 'このリンクは10分間有効です'
          },
          timestamp: new Date()
        };
        
        await interaction.reply({
          embeds: [registerEmbed],
          ephemeral: true // 本人のみに表示
        });
        break;
    }
  } catch (error) {
    console.error('コマンド実行エラー:', error);
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply('❌ コマンドの実行中にエラーが発生しました');
    } else {
      await interaction.reply('❌ コマンドの実行中にエラーが発生しました');
    }
  }
});

// Botの初期化
async function initializeBot() {
  try {
    // コマンドを登録
    await registerCommands();
    
    // Botにログイン
    await client.login(process.env.DISCORD_TOKEN);
  } catch (error) {
    console.error('Bot初期化エラー:', error);
    process.exit(1);
  }
}

module.exports = { initializeBot, client };