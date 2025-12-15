const {
  BufferJSON,
  STORIES_JID,
  WA_DEFAULT_EPHEMERAL,
  generateWAMessageFromContent,
  proto,
S_WHATSAPP_NET,
  generateWAMessageContent,
  generateWAMessage,
  prepareWAMessageMedia,
  areJidsSameUser,
  getContentType
} = require("@whiskeysockets/baileys");

const fs = require("fs");
const cheerio = require("cheerio");
global.axios = require("axios").default;
const fetch = require("node-fetch");
const chalk = require("chalk");
const yts = require("yt-search");
const { exec, spawn, execSync } = require("child_process");
const os = require("os");
const util = require("util");
const { Sticker, StickerTypes } = require("wa-sticker-formatter");
const ytdownload = require("./Scrapers/ytdownload");
const execPromise = util.promisify(exec);
const { gpt } = require('./Scrapers/gpt.js');  
const venicechat = require('./Scrapers/venice.js');
const mm = require('music-metadata');
const ffmpeg = require("fluent-ffmpeg");

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
const Jimp = require("jimp");

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

function bufferToStream(buffer) {
  const stream = new Readable();
  stream.push(buffer);
  stream.push(null);
  return stream;
}


async function isValidMp3Buffer(buffer) {
  try {
    const metadata = await mm.parseBuffer(buffer, 'audio/mpeg');
    return metadata.format.container === 'MPEG' && metadata.format.duration > 0;
  } catch {
    return false;
  }
}


async function waitForFileToStabilize(filePath, timeout = 5000) {
  let lastSize = -1;
  let stableCount = 0;
  const interval = 200;

  return new Promise((resolve, reject) => {
    const start = Date.now();
    const timer = setInterval(async () => {
      try {
        const { size } = await fs.promises.stat(filePath);
        if (size === lastSize) {
          stableCount++;
          if (stableCount >= 3) {
            clearInterval(timer);
            return resolve();
          }
        } else {
          stableCount = 0;
          lastSize = size;
        }

        if (Date.now() - start > timeout) {
          clearInterval(timer);
          return reject(new Error("File stabilization timed out."));
        }
      } catch (err) {

      }
    }, interval);
  });
}


async function reencodeMp3(buffer) {
  const inputPath = '/tmp/input.mp3';
  const outputPath = '/tmp/output.mp3';

  fs.writeFileSync(inputPath, buffer);

  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .audioCodec('libmp3lame')
      .audioBitrate('128k')
      .audioFrequency(44100)
      .on('end', async () => {
        try {
          await waitForFileToStabilize(outputPath);
          const fixedBuffer = fs.readFileSync(outputPath);
          resolve(fixedBuffer);
        } catch (err) {
          reject(err);
        }
      })
      .on('error', reject)
      .save(outputPath);
  });
}



   

    
    if (m.chat.endsWith("broadcast")) {
      await client.readMessages([m.key]);
    }

    const quotedMessage = m.msg?.contextInfo?.quotedMessage;

    
    if (quotedMessage && textL.startsWith("save") && m.quoted.chat.includes("status@broadcast")) {
      if (quotedMessage.imageMessage) {
        let imageCaption = quotedMessage.imageMessage.caption;
        let imageUrl = await client.downloadAndSaveMediaMessage(quotedMessage.imageMessage);
        client.sendMessage(botNumber, {
          image: { url: imageUrl },
          caption: imageCaption
        });
      }

      if (quotedMessage.videoMessage) {
        let videoCaption = quotedMessage.videoMessage.caption;
        let videoUrl = await client.downloadAndSaveMediaMessage(quotedMessage.videoMessage);
        client.sendMessage(botNumber, {
          video: { url: videoUrl },
          caption: videoCaption
        });
      }
    }

   
    if (/^(uhm|wow|nice|🙂)/i.test(budy) && m.quoted) {
      if (quotedMessage?.imageMessage) {
        let imageCaption = quotedMessage.imageMessage.caption || "";
        let imageUrl = await client.downloadAndSaveMediaMessage(quotedMessage.imageMessage);
        client.sendMessage(botNumber, {
          image: { url: imageUrl },
          caption: imageCaption
        });
      }

      if (quotedMessage?.videoMessage) {
        let videoCaption = quotedMessage.videoMessage.caption || "";
        let videoUrl = await client.downloadAndSaveMediaMessage(quotedMessage.videoMessage);
        client.sendMessage(botNumber, {
          video: { url: videoUrl },
          caption: videoCaption
        });
      }

      if (quotedMessage?.audioMessage) {
        let audioUrl = await client.downloadAndSaveMediaMessage(quotedMessage.audioMessage);
        client.sendMessage(botNumber, {
          audio: { url: audioUrl },
          mimetype: quotedMessage.audioMessage.mimetype,
          ptt: quotedMessage.audioMessage.ptt || false
        });
      }
    }

    
    const prefix = "";
    const isCmd = budy.startsWith(prefix);
    const command = isCmd
      ? budy.slice(prefix.length).trim().split(/ +/).shift().toLowerCase()
      : "";
    const args = budy.trim().split(/ +/).slice(1);

   
   // if (sender !== botNumber) return;
// if (m.chat.endsWith('@g.us')) return;
    if (isCmd) {
      switch (command) {
        case "ping":
        case "test":
          reply("✅ Bot is active!");
          break;
case "stats": {
  try {
    // Uptime
    const totalSeconds = os.uptime();
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);

    // RAM
    const totalRam = os.totalmem();
    const freeRam = os.freemem();
    const usedRam = totalRam - freeRam;

    const formatBytes = (bytes) =>
      (bytes / 1024 / 1024 / 1024).toFixed(2) + " GB";

    // Disk (ROM) — Linux VPS
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

        fs.mkdirSync("./temp", { recursive: true });

        const tmpPath = "./temp/sticker.webp";
        const outPath = "./temp/image.jpg";

        const stream = await quoted.download();
        await fs.promises.writeFile(tmpPath, stream);

        await execPromise(`ffmpeg -y -i "${tmpPath}" "${outPath}"`);

        await client.sendMessage(m.chat, {
            image: fs.readFileSync(outPath),
            caption: "✅ Sticker converted to image."
        }, { quoted: m });

        fs.unlinkSync(tmpPath);
        fs.unlinkSync(outPath);

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

        const quoted = m.msg?.contextInfo?.quotedMessage;
        if (!quoted?.imageMessage && !quoted?.videoMessage) {
            await client.sendMessage(m.chat, { text: "Only images or short videos can be converted." }, { quoted: m });
            return;
        }

if (quoted?.videoMessage) {
    const duration = quoted.videoMessage.seconds || 0;
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

        fs.unlinkSync(mediaPath);

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
        let mp3 = null;

        try {
            const result = await ytdownload(song.url);
            mp3 = result?.mp3;
        } catch (e) {
            throw new Error("Failed to fetch song link.");
        }

        if (!mp3) {
            throw new Error("No mp3 URL found!");
        }

        const responses = await axios.get(mp3, {
            responseType: "arraybuffer",
            headers: { "User-Agent": "Mozilla/5.0" }
        });

        const mp3Buffer = Buffer.from(responses.data);

        const sizeMB = mp3Buffer.length / (1024 * 1024);
        if (sizeMB > 16) {
            await client.sendMessage(m.chat, { text: "⚠️ File is large, download might take a while..." }, { quoted: m });
        }

        let finalBuffer = mp3Buffer;
        const isValid = await isValidMp3Buffer(mp3Buffer);
        if (!isValid) {
            await client.sendMessage(m.chat, { text: "Searching your song..." }, { quoted: m });
            finalBuffer = await reencodeMp3(mp3Buffer);
        }

        await client.sendMessage(m.chat, { text: `🎵 Downloading: *${song.title}*` }, { quoted: m });

        await client.sendMessage(m.chat, {
            document: finalBuffer,
            mimetype: "audio/mpeg",
            ptt: false,
            fileName: `${song.title}.mp3`
        }, { quoted: m });

    } catch (error) {
        console.error(error);
        await client.sendMessage(m.chat, { text: "Download failed: " + error.message }, { quoted: m });
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

            fs.unlinkSync(medis);
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