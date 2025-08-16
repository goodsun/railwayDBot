const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } = require('discord.js');
const { ethers } = require('ethers');

// Polygon RPC設定
const POLYGON_RPC_URL = process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com';
const provider = new ethers.JsonRpcProvider(POLYGON_RPC_URL);

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
    .setDescription('使用可能なコマンドを表示します')
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
  client.user.setActivity('NFT情報を取得中...');
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
          const [tokenURI, name, symbol, owner] = await Promise.all([
            contract.tokenURI(tokenId),
            contract.name().catch(() => 'Unknown'),
            contract.symbol().catch(() => 'Unknown'),
            contract.ownerOf(tokenId).catch(() => null)
          ]);
          
          // メタデータを取得
          let metadata = null;
          if (tokenURI) {
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
          
          // Embedメッセージの作成
          const embed = {
            title: `${name} #${tokenId}`,
            color: 0x0099FF,
            fields: [
              { name: 'コレクション', value: `${name} (${symbol})`, inline: true },
              { name: 'トークンID', value: tokenId.toString(), inline: true },
              { name: 'ネットワーク', value: 'Polygon Mainnet', inline: true },
              { name: 'コントラクト', value: `\`${address}\``, inline: false },
              { name: 'Token URI', value: tokenURI ? `\`${tokenURI}\`` : 'N/A', inline: false }
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
              if (imageUrl.startsWith('ipfs://')) {
                imageUrl = imageUrl.replace('ipfs://', 'https://ipfs.io/ipfs/');
              }
              embed.image = { url: imageUrl };
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
            }
          ],
          footer: { text: 'NFT Info Bot - Powered by Railway' }
        };
        
        await interaction.reply({ embeds: [helpEmbed] });
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