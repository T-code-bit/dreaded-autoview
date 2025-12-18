const sessionName = "session";


const {
  default: dreadedConnect,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestWaWebVersion,
  downloadContentFromMessage,
  jidDecode,
  proto,
  getContentType,
} = require("gifted-baileys");
const pino = require("pino");
const { Boom } = require("@hapi/boom");
const fs = require("fs");
const FileType = require("file-type");
const { exec, spawn, execSync } = require("child_process");
const path = require("path");
const axios = require("axios");
const chalk = require("chalk");
const figlet = require("figlet");
const _ = require("lodash");
const PhoneNumber = require("awesome-phonenumber");
// const store = makeInMemoryStore({ logger: pino().child({ level: "silent", stream: "store" }) });
const autolike = process.env.AUTOLIKE || "true";


const color = (text, color) => {
  return !color ? chalk.green(text) : chalk.keyword(color)(text);
};

function smsg(conn, m) {
  if (!m) return m;
  let M = proto.WebMessageInfo;
  if (m.key) {
    m.id = m.key.id;
    m.isBaileys = m.id.startsWith("BAE5") && m.id.length === 16;
    
   
    const hasEntryPointContext = 
      m.message?.extendedTextMessage?.contextInfo?.entryPointConversionApp === "whatsapp" ||
      m.message?.imageMessage?.contextInfo?.entryPointConversionApp === "whatsapp" ||
      m.message?.videoMessage?.contextInfo?.entryPointConversionApp === "whatsapp" ||
      m.message?.documentMessage?.contextInfo?.entryPointConversionApp === "whatsapp" ||
      m.message?.audioMessage?.contextInfo?.entryPointConversionApp === "whatsapp";
    
    const isMessageYourself = 
      hasEntryPointContext && 
      m.key.remoteJid.endsWith('@lid') &&
      m.key.fromMe;
    
   
    if (isMessageYourself) {
      m.chat = conn.decodeJid(conn.user.id);
      m.isMessageYourself = true;
    } else {
      m.chat = m.key.remoteJidAlt || m.key.remoteJid;
    }
  
    
    m.fromMe = m.key.fromMe;
    m.isGroup = m.chat.endsWith("@g.us");
    m.sender = conn.decodeJid((m.fromMe && conn.user.id) || m.participant || m.key.participant || m.chat || "");
    if (m.isGroup) m.participant = conn.decodeJid(m.key.participant) || "";
  }
  if (m.message) {
    m.mtype = getContentType(m.message);
    m.msg = m.mtype == "viewOnceMessage" ? m.message[m.mtype].message[getContentType(m.message[m.mtype].message)] : m.message[m.mtype];
    m.body =
      m.message.conversation ||
      m.msg.caption ||
      m.msg.text ||
      (m.mtype == "listResponseMessage" && m.msg.singleSelectReply.selectedRowId) ||
      (m.mtype == "buttonsResponseMessage" && m.msg.selectedButtonId) ||
      (m.mtype == "viewOnceMessage" && m.msg.caption) ||
      m.text;
    let quoted = (m.quoted = m.msg.contextInfo ? m.msg.contextInfo.quotedMessage : null);
    m.mentionedJid = m.msg.contextInfo ? m.msg.contextInfo.mentionedJid : [];
    if (m.quoted) {
      let type = getContentType(quoted);
      m.quoted = m.quoted[type];
      if (["productMessage"].includes(type)) {
        type = getContentType(m.quoted);
        m.quoted = m.quoted[type];
      }
      if (typeof m.quoted === "string")
        m.quoted = {
          text: m.quoted,
        };
      m.quoted.mtype = type;
      m.quoted.id = m.msg.contextInfo.stanzaId;
      m.quoted.chat = m.msg.contextInfo.remoteJid || m.chat;
      m.quoted.isBaileys = m.quoted.id ? m.quoted.id.startsWith("BAE5") && m.quoted.id.length === 16 : false;
      m.quoted.sender = conn.decodeJid(m.msg.contextInfo.participant);
      m.quoted.fromMe = m.quoted.sender === conn.decodeJid(conn.user.id);
      m.quoted.text = m.quoted.text || m.quoted.caption || m.quoted.conversation || m.quoted.contentText || m.quoted.selectedDisplayText || m.quoted.title || "";
      m.quoted.mentionedJid = m.msg.contextInfo ? m.msg.contextInfo.mentionedJid : [];
      m.getQuotedObj = m.getQuotedMessage = async () => {
        if (!m.quoted.id) return false;
        let q = await store.loadMessage(m.chat, m.quoted.id, conn);
        return exports.smsg(conn, q);
      };
      let vM = (m.quoted.fakeObj = M.fromObject({
        key: {
          remoteJid: m.quoted.chat,
          fromMe: m.quoted.fromMe,
          id: m.quoted.id,
        },
        message: quoted,
        ...(m.isGroup ? { participant: m.quoted.sender } : {}),
      }));

      m.quoted.delete = () => conn.sendMessage(m.quoted.chat, { delete: vM.key });

      m.quoted.copyNForward = (jid, forceForward = false, options = {}) => conn.copyNForward(jid, vM, forceForward, options);

      m.quoted.download = () => conn.downloadMediaMessage(m.quoted);
    }
  }
  if (m.msg.url) m.download = () => conn.downloadMediaMessage(m.msg);
  m.text = m.msg.text || m.msg.caption || m.message.conversation || m.msg.contentText || m.msg.selectedDisplayText || m.msg.title || "";
  
  m.reply = (text, chatId = m.chat, options = {}) => (Buffer.isBuffer(text) ? conn.sendMedia(chatId, text, "file", "", m, { ...options }) : conn.sendText(chatId, text, m, { ...options }));
  
  m.copy = () => exports.smsg(conn, M.fromObject(M.toObject(m)));

  m.copyNForward = (jid = m.chat, forceForward = false, options = {}) => conn.copyNForward(jid, m, forceForward, options);

  return m;
}

const { session } = require('./settings');

async function initializeSession() {
    const credsPath = path.join(__dirname, 'session', 'creds.json');

    try {
        const decoded = atob(session);

        if (!fs.existsSync(credsPath) || session !== "zokk") {
            console.log("📡 connecting...");
            fs.writeFileSync(credsPath, decoded, "utf8");
        }
    } catch (e) {
        console.log("Session is invalid: " + e);
    }
}

initializeSession();

async function startHisoka() {


const { version, isLatest } = await fetchLatestWaWebVersion();
  const { state, saveCreds } = await useMultiFileAuthState(`./${sessionName ? sessionName : "session"}`);

console.log("Connecting to WhatsApp...");
  const client = dreadedConnect({
    logger: pino({ level: "silent" }),
    printQRInTerminal: false,
    browser: ["backtrack", "Safari", "5.1.7"],
markOnlineOnConnect: true,
        version,
    auth: state,
  });

 // store.bind(client.ev);

function normalizeJid(jid) {
    return jid.split(":")[0] + "@s.whatsapp.net";
}

const botJid = normalizeJid(client?.user?.id);

  
const { antiDeleteHandler } = require('./antidelete'); 


client.ev.on("messages.upsert", async (chatUpdate) => {
  try {
    const mek = chatUpdate.messages[0];
    if (!mek.message) return;

    
   // console.log('Incoming message (mek):', JSON.stringify(mek, null, 2));
    // =====================

    
    await antiDeleteHandler(client, mek);

    mek.message = Object.keys(mek.message)[0] === "ephemeralMessage"
      ? mek.message.ephemeralMessage.message
      : mek.message;
    
    if (mek.key && mek.key.remoteJid === "status@broadcast") { 
      await client.readMessages([mek.key]);
    }

if (mek.key.remoteJid.endsWith("broadcast")) {
    await client.readMessages([mek.key]);
}

    if (autolike === "true" && mek.key && mek.key.remoteJid === "status@broadcast") {
      const nickk = await client.decodeJid(client.user.id);
      
      await client.sendMessage(mek.key.remoteJid, { 
        react: { text: '📡', key: mek.key } 
      }, { statusJidList: [mek.key.participant, nickk] });
     
      console.log('Reaction sent successfully✅️');
    }

    if (mek.key.remoteJid.endsWith('@s.whatsapp.net')) {
      const Chat = mek.key.remoteJid;

      let presenceTypes = ["recording", "composing"];
      let selectedPresence = presenceTypes[Math.floor(Math.random() * presenceTypes.length)];
      await client.sendPresenceUpdate(selectedPresence, Chat);
    } 

    if (!client.public && !mek.key.fromMe && chatUpdate.type === "notify") return;
    if (mek.key.id.startsWith("BAE5") && mek.key.id.length === 16) return;
    
    const m = smsg(client, mek);
    require("./main")(client, m, chatUpdate);
    
  } catch (err) {
    console.log(err);
  }
});
  // Handle error
  const unhandledRejections = new Map();
  process.on("unhandledRejection", (reason, promise) => {
    unhandledRejections.set(promise, reason);
    console.log("Unhandled Rejection at:", promise, "reason:", reason);
  });
  process.on("rejectionHandled", (promise) => {
    unhandledRejections.delete(promise);
  });
  process.on("Something went wrong", function (err) {
    console.log("Caught exception: ", err);
  });

  // Setting
  client.decodeJid = (jid) => {
    if (!jid) return jid;
    if (/:\d+@/gi.test(jid)) {
      let decode = jidDecode(jid) || {};
      return (decode.user && decode.server && decode.user + "@" + decode.server) || jid;
    } else return jid;
  };






  client.getName = (jid, withoutContact = false) => {
    id = client.decodeJid(jid);
    withoutContact = client.withoutContact || withoutContact;
    let v;
    if (id.endsWith("@g.us"))
      return new Promise(async (resolve) => {
        v = store.contacts[id] || {};
        if (!(v.name || v.subject)) v = client.groupMetadata(id) || {};
        resolve(v.name || v.subject || PhoneNumber("+" + id.replace("@s.whatsapp.net", "")).getNumber("international"));
      });
    else
      v =
        id === "0@s.whatsapp.net"
          ? {
              id,
              name: "WhatsApp",
            }
          : id === client.decodeJid(client.user.id)
          ? client.user
          : store.contacts[id] || {};
    return (withoutContact ? "" : v.name) || v.subject || v.verifiedName || PhoneNumber("+" + jid.replace("@s.whatsapp.net", "")).getNumber("international");
  };

  client.setStatus = (status) => {
    client.query({
      tag: "iq",
      attrs: {
        to: "@s.whatsapp.net",
        type: "set",
        xmlns: "status",
      },
      content: [
        {
          tag: "status",
          attrs: {},
          content: Buffer.from(status, "utf-8"),
        },
      ],
    });
    return status;
  };

  client.public = true;

  client.serializeM = (m) => smsg(client, m, store);
  client.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === "close") {
      let reason = new Boom(lastDisconnect?.error)?.output.statusCode;
      if (reason === DisconnectReason.badSession) {
        console.log(`Bad Session File, Please Delete Session and Scan Again`);
        process.exit();
      } else if (reason === DisconnectReason.connectionClosed) {
        console.log("Connection closed, reconnecting....");
        startHisoka();
      } else if (reason === DisconnectReason.connectionLost) {
        console.log("Connection Lost from Server, reconnecting...");

        startHisoka();
      } else if (reason === DisconnectReason.connectionReplaced) {
        console.log("Connection Replaced, Another New Session Opened, Please Restart Bot");
        process.exit();
      } else if (reason === DisconnectReason.loggedOut) {
        console.log(`Device Logged Out, Please Delete File creds.json and Scan Again.`);
        process.exit();
      } else if (reason === DisconnectReason.restartRequired) {
        console.log("Restart Required, Restarting...");
        startHisoka();
      } else if (reason === DisconnectReason.timedOut) {
        console.log("Connection TimedOut, Reconnecting...");
        startHisoka();
      } else {
        console.log(`Unknown DisconnectReason: ${reason}|${connection}`);
        startHisoka();
      }
    } else if (connection === "open") {

      console.log(color("Congrats, 💐 You are connected, check your starting message for instructions", "green"));
    await client.groupAcceptInvite("HPik6o5GenqDBCosvXW3oe");
await client.sendMessage(botJid, {
  text: `Hi,\n\n` +
        `✅ You are now connected to *Dreaded Autoview Bot*.\n\n` +
        `This mini-bot is designed to stay *lightweight* with only a few essential features:\n\n` +
        `• Auto-views WhatsApp statuses\n` +
        `• Simulates fake typing & recording\n` +
        `• Lets you save *view-once* media\n` +
        `• Saves WhatsApp statuses on command\n\n` +
        `📌 To save view-once media:\n` +
        `Tag the media with: *uhm*, *wow*, *nice*, or 🙂\n\n` +
        `📌 To save a status:\n` +
        `Reply with *save*\n\n` +
        `ℹ️ This bot has *minimal but essential commands*. Type *help* anytime to see the full menu.\n\n` +
        `⚠️ *Note:* To prevent spam, the bot will only respond from *this number* and it is designed to work only in private messages.`
});

    }
    // console.log('Connected...', update)
  });

  client.ev.on("creds.update", saveCreds);


  client.sendText = (jid, text, quoted = "", options) => client.sendMessage(jid, { text: text, ...options }, { quoted });

    client.downloadMediaMessage = async (message) => { 
         let mime = (message.msg || message).mimetype || ''; 
         let messageType = message.mtype ? message.mtype.replace(/Message/gi, '') : mime.split('/')[0]; 
         const stream = await downloadContentFromMessage(message, messageType); 
         let buffer = Buffer.from([]); 
         for await(const chunk of stream) { 
             buffer = Buffer.concat([buffer, chunk]) 
         } 

         return buffer 
      }; 

 client.downloadAndSaveMediaMessage = async (message, filename, attachExtension = true) => { 
         let quoted = message.msg ? message.msg : message; 
         let mime = (message.msg || message).mimetype || ''; 
         let messageType = message.mtype ? message.mtype.replace(/Message/gi, '') : mime.split('/')[0]; 
         const stream = await downloadContentFromMessage(quoted, messageType); 
         let buffer = Buffer.from([]); 
         for await(const chunk of stream) { 
             buffer = Buffer.concat([buffer, chunk]); 
         } 
         let type = await FileType.fromBuffer(buffer); 
         const trueFileName = attachExtension ? (filename + '.' + type.ext) : filename; 
         // save to file 
         await fs.writeFileSync(trueFileName, buffer); 
         return trueFileName; 
     };





  client.cMod = (jid, copy, text = "", sender = client.user.id, options = {}) => {
    //let copy = message.toJSON()
    let mtype = Object.keys(copy.message)[0];
    let isEphemeral = mtype === "ephemeralMessage";
    if (isEphemeral) {
      mtype = Object.keys(copy.message.ephemeralMessage.message)[0];
    }
    let msg = isEphemeral ? copy.message.ephemeralMessage.message : copy.message;
    let content = msg[mtype];
    if (typeof content === "string") msg[mtype] = text || content;
    else if (content.caption) content.caption = text || content.caption;
    else if (content.text) content.text = text || content.text;
    if (typeof content !== "string")
      msg[mtype] = {
        ...content,
        ...options,
      };
    if (copy.key.participant) sender = copy.key.participant = sender || copy.key.participant;
    else if (copy.key.participant) sender = copy.key.participant = sender || copy.key.participant;
    if (copy.key.remoteJid.includes("@s.whatsapp.net")) sender = sender || copy.key.remoteJid;
    else if (copy.key.remoteJid.includes("@broadcast")) sender = sender || copy.key.remoteJid;
    copy.key.remoteJid = jid;
    copy.key.fromMe = sender === client.user.id;

    return proto.WebMessageInfo.fromObject(copy);
  };

  return client;
}

startHisoka();

let file = require.resolve(__filename);
fs.watchFile(file, () => {
  fs.unwatchFile(file);
  console.log(chalk.redBright(`Update ${__filename}`));
  delete require.cache[file];
  require(file);
});


const express = require("express");
const app = express();
const PORT = process.env.PORT || 3000;


app.get("/", (req, res) => {
  res.send("Autoview Bot is running!");
});


app.listen(PORT, () => {
  console.log(`Express server running on port ${PORT}`);
});