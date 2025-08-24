const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
  AttachmentBuilder,
} = require("discord.js");
const { ethers } = require("ethers");
const sharp = require("sharp");

// RPC設定（デフォルト: Polygon Mainnet）
const RPC_URL = process.env.RPC_URL || "https://polygon-rpc.com";
const provider = new ethers.JsonRpcProvider(RPC_URL);

// デフォルトのトークンコントラクトアドレス
const TOKEN_CA = process.env.TOKEN_CA;
if (!TOKEN_CA) {
  console.error("TOKEN_CA環境変数が設定されていません");
  process.exit(1);
}

// OpenSea URL生成関数
function getOpenSeaUrl(contractAddress, tokenId, chainId = 137) {
  // chainId 137 = Polygon
  const baseUrl =
    chainId === 137
      ? "https://opensea.io/assets/matic"
      : "https://opensea.io/assets/ethereum";
  return `${baseUrl}/${contractAddress}/${tokenId}`;
}

// SVGからエフェクトレイヤーを削除する関数
function removeEffectLayers(svgString) {
  try {
    // 最後のimageタグを削除（最前面のエフェクトレイヤー）
    // </svg>の前にある最後の<image>タグを見つけて削除
    const lastImageRegex = /<image[^>]*>(?!.*<image[^>]*>).*?<\/svg>/s;
    const modifiedSvg = svgString.replace(lastImageRegex, '</svg>');
    
    return modifiedSvg;
  } catch (error) {
    console.error("SVGエフェクト削除エラー:", error);
    return svgString; // エラー時は元のSVGを返す
  }
}

// ERC721 ABI
const ERC721_ABI = [
  "function tokenURI(uint256 tokenId) view returns (string)",
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function ownerOf(uint256 tokenId) view returns (address)",
];

// Discord Botクライアントの作成
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
});

// スラッシュコマンドの定義
const commands = [
  new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Check bot response speed"),

  new SlashCommandBuilder()
    .setName("tokeninfo")
    .setDescription("Get NFT token information")
    .addIntegerOption((option) =>
      option.setName("tokenid").setDescription("tokenID").setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("help")
    .setDescription("使用可能なコマンドを表示します"),

  new SlashCommandBuilder()
    .setName("register")
    .setDescription("connect DiscordID to EOA")
    .addStringOption((option) =>
      option
        .setName("address")
        .setDescription("Your EOA（ex: 0x123...）")
        .setRequired(true)
    ),
].map((command) => command.toJSON());

// コマンドの登録
async function registerCommands() {
  const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

  try {
    console.log("スラッシュコマンドの登録を開始...");

    // グローバルコマンドとして登録
    await rest.put(Routes.applicationCommands(process.env.DISCORD_CLIENT_ID), {
      body: commands,
    });

    console.log("スラッシュコマンドの登録が完了しました！");
  } catch (error) {
    console.error("コマンド登録エラー:", error);
  }
}

// Botの準備完了時
client.once("ready", () => {
  console.log(`✅ ${client.user.tag} としてログインしました！`);
  const appName = process.env.APP_NAME || "railwayDBot";
  client.user.setActivity(appName);
});

// インタラクション（スラッシュコマンド）の処理
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName } = interaction;

  try {
    switch (commandName) {
      case "ping":
        const latency = Date.now() - interaction.createdTimestamp;
        await interaction.reply(
          `Pong! speed: ${latency}ms, API: ${Math.round(client.ws.ping)}ms`
        );
        break;

      case "tokeninfo":
        await interaction.deferReply();

        const tokenId = interaction.options.getInteger("tokenid");
        const address = TOKEN_CA; // 環境変数から取得

        try {
          // NFT情報を取得
          const contract = new ethers.Contract(address, ERC721_ABI, provider);

          let tokenURI, name, symbol, owner;
          let tokenExists = true;
          let isValidNFT = true;

          try {
            // まずコントラクトがERC721かチェック（name/symbolの取得を試みる）
            [name, symbol] = await Promise.all([
              contract.name().catch(() => null),
              contract.symbol().catch(() => null),
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
                if (
                  ownerError.message.includes("invalid token ID") ||
                  ownerError.message.includes("execution reverted")
                ) {
                  tokenExists = false;
                } else if (
                  ownerError.message.includes("could not decode result data")
                ) {
                  // ownerOfメソッドが存在しない
                  isValidNFT = false;
                } else {
                  throw ownerError;
                }
              }
            }
          } catch (error) {
            console.error("コントラクト情報取得エラー:", error);
            isValidNFT = false;
          }

          // 有効なNFTコントラクトでない場合
          if (!isValidNFT) {
            const embed = {
              title: `❌ unknown NFT contract`,
              color: 0xff0000,
              description: "This address is not an ERC721 NFT contract",
              fields: [
                {
                  name: "Contract",
                  value: `\`${address}\``,
                  inline: false,
                },
                {
                  name: "detail",
                  value: "Please verify this is an ERC721 contract",
                  inline: false,
                },
              ],
              timestamp: new Date().toISOString(),
              footer: { text: "NFT Info Bot" },
            };

            await interaction.editReply({ embeds: [embed] });
            return;
          }

          // トークンが存在しない場合
          if (!tokenExists) {
            const embed = {
              title: `❌ NFT does not exist`,
              color: 0xff0000,
              fields: [
                {
                  name: "Collection",
                  value: `${name} (${symbol})`,
                  inline: true,
                },
                { name: "TokenID", value: tokenId.toString(), inline: true },
                {
                  name: "status",
                  value: "🚫 This token ID does not exist",
                  inline: false,
                },
                {
                  name: "Contract",
                  value: `\`${address}\``,
                  inline: false,
                },
              ],
              timestamp: new Date().toISOString(),
              footer: { text: "NFT Info Bot" },
            };

            await interaction.editReply({ embeds: [embed] });
            return;
          }

          // メタデータを取得
          let metadata = null;
          let isBase64 = false;

          if (tokenURI) {
            // base64データの場合
            if (tokenURI.startsWith("data:")) {
              isBase64 = true;
              try {
                const base64Data = tokenURI.split(",")[1];
                const jsonString = Buffer.from(base64Data, "base64").toString(
                  "utf-8"
                );
                metadata = JSON.parse(jsonString);
              } catch (error) {
                console.error("base64メタデータ解析エラー:", error);
              }
            } else {
              // 通常のURLの場合
              try {
                let metadataUrl = tokenURI;
                if (metadataUrl.startsWith("ipfs://")) {
                  metadataUrl = metadataUrl.replace(
                    "ipfs://",
                    "https://ipfs.io/ipfs/"
                  );
                }

                const response = await fetch(metadataUrl);
                metadata = await response.json();
              } catch (error) {
                console.error("メタデータ取得エラー:", error);
              }
            }
          }

          // Embedメッセージの作成
          const embed = {
            title: `${name} #${tokenId}`,
            url: getOpenSeaUrl(address, tokenId), // 画像クリック時のジャンプ先
            color: 0x0099ff,
            fields: [
              {
                name: "Collection",
                value: `${name} (${symbol})`,
                inline: true,
              },
              { name: "TokenID", value: tokenId.toString(), inline: true },
              { name: "Network", value: "Polygon Mainnet", inline: true },
              {
                name: "NFT Marketplace",
                value: isBase64
                  ? `[view on OpenSea](${getOpenSeaUrl(address, tokenId)})`
                  : tokenURI
                  ? tokenURI.length > 1000
                    ? `\`${tokenURI.substring(0, 100)}...\``
                    : `\`${tokenURI}\``
                  : "N/A",
                inline: false,
              },
              { name: "Contract", value: `\`${address}\``, inline: false },
            ],
            timestamp: new Date().toISOString(),
            footer: { text: "NFT Info" },
          };

          if (owner) {
            embed.fields.push({
              name: "Owner",
              value: `\`${owner}\``,
              inline: false,
            });
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

              // base64画像の場合は添付ファイルとして処理
              if (imageUrl.startsWith("data:")) {
                try {
                  // データURLから画像データを抽出
                  const matches = imageUrl.match(/^data:(.+);base64,(.+)$/);
                  if (matches && matches[2]) {
                    let buffer = Buffer.from(matches[2], "base64");
                    const mimeType = matches[1];
                    let extension = mimeType.split("/")[1] || "png";

                    // SVGの場合はPNGに変換（ドット絵風）
                    if (mimeType.includes("svg") || extension === "svg") {
                      try {
                        // SVGからエフェクトレイヤーを削除
                        const svgString = buffer.toString('utf-8');
                        const cleanedSvg = removeEffectLayers(svgString);
                        const cleanedBuffer = Buffer.from(cleanedSvg, 'utf-8');
                        
                        // まず元のSVGサイズでラスタライズ（ピクセルパーフェクト）
                        const tempBuffer = await sharp(cleanedBuffer, {
                          density: 72,
                          // SVGレンダリング時にアンチエイリアスを無効化
                          unlimited: true,
                        })
                          .resize(24, 24, {
                            // 元の想定サイズ（24x24ピクセルアート）
                            kernel: sharp.kernel.nearest,
                            fit: "fill",
                          })
                          .toBuffer();

                        // その後、216x216に拡大（9倍）
                        buffer = await sharp(tempBuffer)
                          .resize(216, 216, {
                            kernel: sharp.kernel.nearest, // 最近傍補間で拡大
                            fit: "fill",
                          })
                          .png({
                            compressionLevel: 9,
                            palette: true, // パレットPNGで色数を制限
                            quality: 100,
                          })
                          .toBuffer();
                        extension = "png";
                      } catch (conversionError) {
                        console.error("SVG変換エラー:", conversionError);
                        // 変換に失敗した場合はそのまま続行
                      }
                    }

                    const filename = `nft_image_${tokenId}.${extension}`;
                    const attachment = new AttachmentBuilder(buffer, {
                      name: filename,
                    });

                    // embedに添付ファイルの参照を設定
                    embed.image = { url: `attachment://${filename}` };

                    // editReplyにfilesオプションを追加するためフラグを設定
                    embed._attachments = [attachment];
                  } else {
                    embed.fields.push({
                      name: "画像",
                      value:
                        "🖼️ Base64エンコードされた画像データ（形式が不正）",
                      inline: false,
                    });
                  }
                } catch (error) {
                  console.error("Base64画像の処理エラー:", error);
                  embed.fields.push({
                    name: "画像",
                    value: "🖼️ Base64エンコードされた画像データ（処理エラー）",
                    inline: false,
                  });
                }
              } else {
                if (imageUrl.startsWith("ipfs://")) {
                  imageUrl = imageUrl.replace(
                    "ipfs://",
                    "https://ipfs.io/ipfs/"
                  );
                }
                // URLが2048文字以内の場合のみ画像を表示
                if (imageUrl.length <= 2048) {
                  embed.image = { url: imageUrl };
                } else {
                  embed.fields.push({
                    name: "画像",
                    value: "🔗 画像URLが長すぎるため表示できません",
                    inline: false,
                  });
                }
              }
            }
          }

          // 添付ファイルがある場合はfilesオプションを追加
          const replyOptions = { embeds: [embed] };
          if (embed._attachments) {
            replyOptions.files = embed._attachments;
            delete embed._attachments; // embedオブジェクトから一時プロパティを削除
          }
          await interaction.editReply(replyOptions);
        } catch (error) {
          console.error("NFT情報取得エラー:", error);
          await interaction.editReply(
            `❌ エラーが発生しました: ${error.message}`
          );
        }
        break;

      case "help":
        const helpEmbed = {
          title: "📚 使用可能なコマンド",
          color: 0x00ff00,
          fields: [
            {
              name: "/ping",
              value: "Botの応答速度を確認します",
              inline: false,
            },
            {
              name: "/tokeninfo <tokenid>",
              value: "NFTトークンの情報を取得します\n例: `/tokeninfo 14`",
              inline: false,
            },
            {
              name: "/help",
              value: "このヘルプメッセージを表示します",
              inline: false,
            },
            {
              name: "/register <address>",
              value: "Discord IDとEOAアドレスを紐付けます",
              inline: false,
            },
          ],
          footer: { text: "Infomation Bot" },
        };

        await interaction.reply({ embeds: [helpEmbed] });
        break;

      case "register":
        const userAddress = interaction.options.getString("address");

        // アドレスの検証
        if (!ethers.isAddress(userAddress)) {
          await interaction.reply({
            content:
              "❌ 無効なEOAアドレスです。正しいアドレスを入力してください。",
            ephemeral: true,
          });
          return;
        }

        // Discord IDとアバター情報を取得
        const discordId = interaction.user.id;
        // サーバーニックネームを優先して取得、なければユーザー名を使用
        const discordUsername = interaction.member?.displayName || interaction.user.username;
        const avatarHash = interaction.user.avatar;

        // アバターURLを生成（Discord CDN）
        let avatarUrl = null;
        if (avatarHash) {
          const extension = avatarHash.startsWith("a_") ? "gif" : "png";
          avatarUrl = `https://cdn.discordapp.com/avatars/${discordId}/${avatarHash}.${extension}?size=256`;
        } else {
          // デフォルトアバターURL
          const defaultAvatarNumber = (BigInt(discordId) >> 22n) % 6n;
          avatarUrl = `https://cdn.discordapp.com/embed/avatars/${defaultAvatarNumber}.png`;
        }

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
          avatarUrl,
          address: userAddress,
          createdAt: Date.now(),
          expiresAt: Date.now() + 10 * 60 * 1000, // 10分後に期限切れ
        };

        // 埋め込みメッセージを作成
        const registerEmbed = {
          title: "🔗 EOAアドレスの登録",
          description:
            "以下のリンクをクリックして、MetaMaskで署名してください。",
          color: 0x5865f2,
          fields: [
            {
              name: "Discord ID",
              value: `${discordUsername} (${discordId})`,
              inline: true,
            },
            {
              name: "EOAアドレス",
              value: `\`${userAddress}\``,
              inline: true,
            },
            {
              name: "登録URL",
              value: `[こちらをクリック](${registrationUrl})`,
              inline: false,
            },
          ],
          footer: {
            text: "このリンクは10分間有効です",
          },
          timestamp: new Date(),
        };

        await interaction.reply({
          embeds: [registerEmbed],
          ephemeral: true, // 本人のみに表示
        });
        break;
    }
  } catch (error) {
    console.error("コマンド実行エラー:", error);
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply("❌ コマンドの実行中にエラーが発生しました");
    } else {
      await interaction.reply("❌ コマンドの実行中にエラーが発生しました");
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
    console.error("Bot初期化エラー:", error);
    process.exit(1);
  }
}

module.exports = { initializeBot, client };
