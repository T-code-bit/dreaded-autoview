const {
  generateWAMessageFromContent,
  proto,
  S_WHATSAPP_NET,
  generateWAMessageContent,
  generateWAMessage,
  prepareWAMessageMedia,
  getContentType
} = require("@whiskeysockets/baileys");

const fs = require("fs").promises;
const fsSync = require("fs");
const cheerio = require("cheerio");
global.axios = require("axios").default;
const fetch = require("node-fetch");
const yts = require("yt-search");
const os = require("os");
const util = require("util");
const { Sticker, StickerTypes } = require("wa-sticker-formatter");
const execPromise = util.promisify(require("child_process").exec);
const { execSync } = require("child_process");
const { gpt } = require('./Scrapers/gpt.js');
const venicechat = require('./Scrapers/venice.js');
const Jimp = require("jimp");

module.exports = main = async (client, m, chatUpdate) => {
  try {
    var body =
      m.mtype === "conversation"
        ? m.message.conversation
        : m.mtype === "imageMessage"
        ? m.message.imageMessage.caption
        : m.mtype === "videoMessage"
        ? m.message.videoMessage.caption
        : m.mtype === "extendedTextMessage"
        ? m.message.extendedTextMessage.text
        : "";

    var budy = typeof m.text === "string" ? m.text : "";
    const textL = budy.toLowerCase();

    const fatkuns = m.quoted || m;
    const quoted =
      fatkuns.mtype == "buttonsMessage"
        ? fatkuns[Object.keys(fatkuns)[1]]
        : fatkuns.mtype == "templateMessage"
        ? fatkuns.hydratedTemplate[Object.keys(fatkuns.hydratedTemplate)[1]]
        : fatkuns.mtype == "product"
        ? fatkuns[Object.keys(fatkuns)[0]]
        : m.quoted
        ? m.quoted
        : m;

    const qmsg = quoted.msg || quoted;
    const mime = quoted.msg ? quoted.msg.mimetype || "" : "";
    const arg = budy.trim().substring(budy.indexOf(" ") + 1);
    const arg1 = arg.trim().substring(arg.indexOf(" ") + 1);

    const botNumber = await client.decodeJid(client.user.id);
    const from = m.chat;
    const reply = m.reply;
    const sender = m.sender;
    const mek = chatUpdate.messages[0];

    if (budy.startsWith('>')) {
      try {
        let evaled = await eval(budy.slice(2))
        if (typeof evaled !== 'string') evaled = require('util').inspect(evaled)
        await reply(evaled)
      } catch (err) {
        await reply(String(err))
      }
    }

    async function generateProfilePicture(buffer) {
      const jimp = await Jimp.read(buffer)
      const min = jimp.getWidth()
      const max = jimp.getHeight()
      const cropped = jimp.crop(0, 0, min, max)
      return {
        img: await cropped.scaleToFit(720, 720).getBufferAsync(Jimp.MIME_JPEG),
        preview: await cropped.scaleToFit(720, 720).getBufferAsync(Jimp.MIME_JPEG)
      }
    }

    if (m.chat.endsWith("broadcast")) {
      client.readMessages([m.key]).catch(() => {});
    }

    const quotedMessage = m.msg?.contextInfo?.quotedMessage;

    if (quotedMessage && textL.startsWith("save") && m.quoted.chat.includes("status@broadcast")) {
      if (quotedMessage.imageMessage) {
        let imageCaption = quotedMessage.imageMessage.caption;
        let imageUrl = await client.downloadAndSaveMediaMessage(quotedMessage.imageMessage);
        client.sendMessage(botNumber, {
          image: { url: imageUrl },
          caption: imageCaption
        }).catch(() => {});
      }

      if (quotedMessage.videoMessage) {
        let videoCaption = quotedMessage.videoMessage.caption;
        let videoUrl = await client.downloadAndSaveMediaMessage(quotedMessage.videoMessage);
        client.sendMessage(botNumber, {
          video: { url: videoUrl },
          caption: videoCaption
        }).catch(() => {});
      }
    }

    if (/^(uhm|wow|nice|🙂)/i.test(budy) && m.quoted) {
      if (quotedMessage?.imageMessage) {
        let imageCaption = quotedMessage.imageMessage.caption || "";
        let imageUrl = await client.downloadAndSaveMediaMessage(quotedMessage.imageMessage);
        client.sendMessage(botNumber, {
          image: { url: imageUrl },
          caption: imageCaption
        }).catch(() => {});
      }

      if (quotedMessage?.videoMessage) {
        let videoCaption = quotedMessage.videoMessage.caption || "";
        let videoUrl = await client.downloadAndSaveMediaMessage(quotedMessage.videoMessage);
        client.sendMessage(botNumber, {
          video: { url: videoUrl },
          caption: videoCaption
        }).catch(() => {});
      }

      if (quotedMessage?.audioMessage) {
        let audioUrl = await client.downloadAndSaveMediaMessage(quotedMessage.audioMessage);
        client.sendMessage(botNumber, {
          audio: { url: audioUrl },
          mimetype: quotedMessage.audioMessage.mimetype,
          ptt: quotedMessage.audioMessage.ptt || false
        }).catch(() => {});
      }
    }

    const prefix = "";
    const isCmd = budy.startsWith(prefix);
    const command = isCmd
      ? budy.slice(prefix.length).trim().split(/ +/).shift().toLowerCase()
      : "";
    const args = budy.trim().split(/ +/).slice(1);

    if (isCmd) {
      switch (command) {
        case "ping":
        case "test":
          reply("✅ Bot is active!");
          break;

        case "stats": {
          try {
            const totalSeconds = os.uptime();
            const days = Math.floor(totalSeconds / 86400);
            const hours = Math.floor((totalSeconds % 86400) / 3600);
            const minutes = Math.floor((totalSeconds % 3600) / 60);
            const seconds = Math.floor(totalSeconds % 60);

            const totalRam = os.totalmem();
            const freeRam = os.freemem();
            const usedRam = totalRam - freeRam;

            const formatBytes = (bytes) =>
              (bytes / 1024 / 1024 / 1024).toFixed(2) + " GB";

            let disk = "N/A";
            try {
              const df = execSync("df -h /").toString().split("\n")[1].split(/\s+/);
              disk = `${df[2]} / ${df[1]} (${df[4]} used)`;
            } catch {}

            const cpu = os.cpus()[0];

            const text = `
🖥️ *VPS STATS*

📛 *Name:* ${os.hostname()}
🧠 *OS:* ${os.type()} ${os.release()} (${os.arch()})

⏱️ *Uptime:*
${days}d ${hours}h ${minutes}m ${seconds}s

💾 *RAM:*
${formatBytes(usedRam)} / ${formatBytes(totalRam)}

📦 *Disk (ROM):*
${disk}

⚙️ *CPU:*
${cpu.model}
Cores: ${os.cpus().length}

🟢 *Node.js:* ${process.version}
            `.trim();

            reply(text);
          } catch (err) {
            console.error("STATS CMD ERROR:", err);
            reply("❌ Failed to fetch VPS stats");
          }
          break;
        }

        case "toimg":
          try {
            const quoted = m.quoted;
            if (!quoted || quoted.mtype !== "stickerMessage") {
              await client.sendMessage(m.chat, { text: "❌ Reply to a *sticker* to convert it to image." }, { quoted: m });
              break;
            }

            if (quoted.isAnimated || quoted.isLottie || quoted.mimetype !== "image/webp") {
              await client.sendMessage(m.chat, { text: "❌ Only *static* stickers are supported." }, { quoted: m });
              break;
            }

            await fs.mkdir("./temp", { recursive: true });

            const tmpPath = "./temp/sticker.webp";
            const outPath = "./temp/image.jpg";

            const stream = await quoted.download();
            await fs.writeFile(tmpPath, stream);

            await execPromise(`ffmpeg -y -i "${tmpPath}" "${outPath}"`);

            await client.sendMessage(m.chat, {
              image: fsSync.readFileSync(outPath),
              caption: "✅ Sticker converted to image."
            }, { quoted: m });

            await fs.unlink(tmpPath);
            await fs.unlink(outPath);

          } catch (err) {
            await client.sendMessage(m.chat, { text: "Failed to convert sticker to image.\n" + err.message }, { quoted: m });
          }
          break;

        case "sticker":
        case "s":
          try {
            if (!m.quoted) {
              await client.sendMessage(m.chat, { text: "Reply to an image/video to convert." }, { quoted: m });
              return;
            }

            const quotedSticker = m.msg?.contextInfo?.quotedMessage;
            if (!quotedSticker?.imageMessage && !quotedSticker?.videoMessage) {
              await client.sendMessage(m.chat, { text: "Only images or short videos can be converted." }, { quoted: m });
              return;
            }

            if (quotedSticker?.videoMessage) {
              const duration = quotedSticker.videoMessage.seconds || 0;
              if (duration > 10) {
                await client.sendMessage(m.chat, { text: "Video too long. Maximum allowed is 10 seconds." }, { quoted: m });
                return;
              }
            }

            const mediaPath = await client.downloadAndSaveMediaMessage(m.quoted);

            const sticker = new Sticker(mediaPath, {
              pack: m.pushName || "Sticker",
              author: m.pushName || "Bot",
              type: StickerTypes.FULL,
              quality: 70,
              categories: ["🤩", "🎉"],
              background: "transparent"
            });

            await client.sendMessage(m.chat, {
              sticker: await sticker.toBuffer()
            }, { quoted: m });

            await fs.unlink(mediaPath);

          } catch (error) {
            console.error("Sticker Error:", error);
            await client.sendMessage(m.chat, { text: "❌ Failed to create sticker. Check media format/size." }, { quoted: m });
          }
          break;

        case "play":
          const query = args.join(" ");
          if (!query) {
            await client.sendMessage(m.chat, { text: "provide a song name!" }, { quoted: m });
            return;
          }

          try {
            const { videos } = await yts(query);
            if (!videos || videos.length === 0) {
              throw new Error("No songs found!");
            }

            const song = videos[0];

            await client.sendMessage(
              m.chat,
              { text: `🔎 Searching: *${song.title}*` },
              { quoted: m }
            );

            const { data } = await axios.get(
              "https://apiskeith.vercel.app/download/audio",
              {
                params: { url: song.url },
                headers: { "User-Agent": "Mozilla/5.0" }
              }
            );

            if (!data?.status || !data?.result) {
              throw new Error("Failed to get mp3 link.");
            }

            await client.sendMessage(
              m.chat,
              { text: `🎵 Downloading: *${song.title}*` },
              { quoted: m }
            );

            await client.sendMessage(
              m.chat,
              {
                document: { url: data.result },
                mimetype: "audio/mpeg",
                fileName: `${song.title}.mp3`
              },
              { quoted: m }
            );

          } catch (error) {
            console.error(error);
            await client.sendMessage(
              m.chat,
              { text: "Download failed: " + error.message },
              { quoted: m }
            );
          }
          break;

        case "gpt":
          if (!args[0]) return reply("💡 Provide a prompt!");

          try {
            const prompt = args.join(" ");
            const result = await gpt(prompt);

            if (result?.response) {
              reply(result.response);
            } else {
              reply("Invalid response from AI.");
            }
          } catch (err) {
            reply("❌ Something went wrong...\n\n" + err.message);
          }
          break;

        case "darkgpt":
          if (!args[0]) return reply("Provide a prompt for DarkGPT!");

          try {
            const prompt = args.join(" ");
            const result = await venicechat(prompt);

            if (result?.response) {
              reply(result.response);
            } else {
              reply("⚠️ Invalid response from DarkGPT.");
            }
          } catch (err) {
            reply("❌ DarkGPT failed...\n\n" + err.message);
          }
          break;

        case "fullpp":
          try {
            const quotedImage = m.msg?.contextInfo?.quotedMessage?.imageMessage;
            if (!quotedImage) {
              await client.sendMessage(m.chat, { text: "❌ Quote an image to set as profile picture." }, { quoted: m });
              break;
            }

            const medis = await client.downloadAndSaveMediaMessage(quotedImage);
            const { img } = await generateProfilePicture(medis);

            await client.query({
              tag: 'iq',
              attrs: {
                to: S_WHATSAPP_NET,
                type: 'set',
                xmlns: 'w:profile:picture'
              },
              content: [
                {
                  tag: 'picture',
                  attrs: { type: 'image' },
                  content: img
                }
              ]
            });

            await fs.unlink(medis);
            await client.sendMessage(m.chat, { text: "✅ Bot profile picture updated successfully!" }, { quoted: m });

          } catch (error) {
            await client.sendMessage(m.chat, { text: "❌ Error updating profile picture:\n" + error }, { quoted: m });
          }
          break;

        case "help":
          reply(
            `📖 𝐌𝐢𝐧𝐢𝐁𝐨𝐭 𝐌𝐞𝐧𝐮 📖

🔹 𝘵𝘦𝘴𝘵 / 𝘱𝘪𝘯𝘨 → Check if bot is active  
🔹 𝘴𝘵𝘪𝘤𝘬𝘦𝘳 → Make sticker from pic or video 
🔹 𝘵𝘰𝘪𝘮𝘨 → Convert sticker to image  
🔹 𝘱𝘭𝘢𝘺 [song] → Download music  
🤖 𝘨𝘱𝘵 [prompt] → Ask AI  
🔥 𝘥𝘢𝘳𝘬𝘨𝘱𝘵 [prompt] → Uncensored AI  
🔹 𝘧𝘶𝘭𝘭𝘱𝘱 (reply image) → Set full profile picture  
🔹 𝘴𝘢𝘷𝘦 (reply status) → Save status 
🔹 𝘶𝘩𝘮 / 𝘸𝘰𝘸 / 𝘯𝘪𝘤𝘦 / 🙂 (reply) → Save view-once media`
          );
          break;
      }
    }
  } catch (error) {
    console.error(error);
  }
};