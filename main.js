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
const { exec, spawn, execSync } = require("child_process");
const util = require("util");
const execPromise = util.promisify(exec);
const { gpt } = require('./Scrapers/gpt.js');  
const venicechat = require('./Scrapers/venice.js');

module.exports = main = async (client, m, chatUpdate) => {
  try {
    const { handleIncomingMessage, handleMessageRevocation } = require("./antidelete.js");

   
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

   if (mek.message?.protocolMessage?.key) {
      await handleMessageRevocation(client, mek, botNumber);
    } else {
      handleIncomingMessage(mek);
    }

    
    if (m.chat.endsWith("broadcast")) {
      await client.readMessages([m.key]);
    }

    const quotedMessage = m.msg?.contextInfo?.quotedMessage;

    
    if (quotedMessage && textL.startsWith("#save") && m.quoted.chat.includes("status@broadcast")) {
      if (quotedMessage.imageMessage) {
        let imageCaption = quotedMessage.imageMessage.caption;
        let imageUrl = await client.downloadAndSaveMediaMessage(quotedMessage.imageMessage);
        client.sendMessage(client.user.id, {
          image: { url: imageUrl },
          caption: imageCaption
        });
      }

      if (quotedMessage.videoMessage) {
        let videoCaption = quotedMessage.videoMessage.caption;
        let videoUrl = await client.downloadAndSaveMediaMessage(quotedMessage.videoMessage);
        client.sendMessage(client.user.id, {
          video: { url: videoUrl },
          caption: videoCaption
        });
      }
    }

   
    if (/^(uhm|wow|nice|🙂)/i.test(budy) && m.quoted) {
      if (quotedMessage?.imageMessage) {
        let imageCaption = quotedMessage.imageMessage.caption || "";
        let imageUrl = await client.downloadAndSaveMediaMessage(quotedMessage.imageMessage);
        client.sendMessage(client.user.id, {
          image: { url: imageUrl },
          caption: imageCaption
        });
      }

      if (quotedMessage?.videoMessage) {
        let videoCaption = quotedMessage.videoMessage.caption || "";
        let videoUrl = await client.downloadAndSaveMediaMessage(quotedMessage.videoMessage);
        client.sendMessage(client.user.id, {
          video: { url: videoUrl },
          caption: videoCaption
        });
      }

      if (quotedMessage?.audioMessage) {
        let audioUrl = await client.downloadAndSaveMediaMessage(quotedMessage.audioMessage);
        client.sendMessage(client.user.id, {
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

   
    if (sender !== botNumber) return;

    if (isCmd) {
      switch (command) {
        case "ping":
        case "test":
          reply("✅ Bot is active!");
          break;

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
        await client.sendMessage(m.chat, { text: "❌ Failed to convert sticker to image.\n" + err.message }, { quoted: m });
    }
    break;

        case "sticker":
          reply("Sticker function placeholder.");
         
          break;

        case "play":
        case "music":
          if (!args[0]) return reply("🎵 Provide a song name!");
          reply("🎶 Music download placeholder.");
        
          break;

        
case "gpt":
  if (!args[0]) return reply("💡 Provide a prompt!");

  try {
    const prompt = args.join(" ");
    const result = await gpt(prompt);

    if (result?.response) {
      reply(result.response);
    } else {
      reply("⚠️ Invalid response from AI.");
    }
  } catch (err) {
    reply("❌ Something went wrong...\n\n" + err.message);
  }
  break;
case "darkgpt":
  if (!args[0]) return reply("💡 Provide a prompt for DarkGPT!");

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
            `📖 *Bot Commands*\n\n` +
              `#test / #ping → Check if bot is active\n` +
              `#sticker → Make sticker\n` +
              `#play [song] → Download music\n` +
              `#gpt [prompt] → Ask AI\n` +
              `#setpp (reply image) → Set profile picture\n` +
              `#getdp [jid] → Get someone's profile pic\n` +
              `#save (reply status) → Save status to bot\n` +
              `uhm/wow/nice/🙂 (reply) → Auto-save media`
          );
          break;

        
      }
    }
  } catch (error) {
    console.error(error);
  }
};