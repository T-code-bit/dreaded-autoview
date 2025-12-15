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
} = require("@whiskeysockets/baileys");

const pino = require("pino");
const { Boom } = require("@hapi/boom");
const fs = require("fs").promises;
const fsSync = require("fs");
const path = require("path");
const chalk = require("chalk");

const autolike = process.env.AUTOLIKE || "false";
const { session } = require('./settings');
const { antiDeleteHandler, startPeriodicCleanup } = require('./antidelete');
const mainHandler = require("./main"); 

const color = (text, color) => (!color ? chalk.green(text) : chalk.keyword(color)(text));

function smsg(conn, m) {
  if (!m) return m;
  let M = proto.WebMessageInfo;
  if (m.key) {
    m.id = m.key.id;
    m.isBaileys = m.id.startsWith("BAE5") && m.id.length === 16;
    m.chat = m.key.remoteJidAlt || m.key.remoteJid;
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

      /**
       *
       * @returns
       */
      m.quoted.delete = () => conn.sendMessage(m.quoted.chat, { delete: vM.key });

      /**
       *
       * @param {*} jid
       * @param {*} forceForward
       * @param {*} options
       * @returns
       */
      m.quoted.copyNForward = (jid, forceForward = false, options = {}) => conn.copyNForward(jid, vM, forceForward, options);

      /**
       *
       * @returns
       */
      m.quoted.download = () => conn.downloadMediaMessage(m.quoted);
    }
  }
  if (m.msg.url) m.download = () => conn.downloadMediaMessage(m.msg);
  m.text = m.msg.text || m.msg.caption || m.message.conversation || m.msg.contentText || m.msg.selectedDisplayText || m.msg.title || "";
  /**
   * Reply to this message
   * @param {String|Object} text
   * @param {String|false} chatId
   * @param {Object} options
   */
  m.reply = (text, chatId = m.chat, options = {}) => (Buffer.isBuffer(text) ? conn.sendMedia(chatId, text, "file", "", m, { ...options }) : conn.sendText(chatId, text, m, { ...options }));
  /**
   * Copy this message
   */
  m.copy = () => exports.smsg(conn, M.fromObject(M.toObject(m)));

  /**
   *
   * @param {*} jid
   * @param {*} forceForward
   * @param {*} options
   * @returns
   */
  m.copyNForward = (jid = m.chat, forceForward = false, options = {}) => conn.copyNForward(jid, m, forceForward, options);

  return m;
}

async function initializeSession() {
  const credsPath = path.join(__dirname, 'session', 'creds.json');
  try {
    const decoded = atob(session);
    if (!fsSync.existsSync(credsPath) || session !== "zokk") {
      console.log("📡 connecting...");
      await fs.writeFile(credsPath, decoded, "utf8");
    }
  } catch (e) {
    console.log("Session is invalid: " + e);
  }
}


let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY = 5000;

async function startHisoka() {
  const { version } = await fetchLatestWaWebVersion();
  const { state, saveCreds } = await useMultiFileAuthState(`./${sessionName}`);

  console.log("Connecting to WhatsApp...");
  const client = dreadedConnect({
    logger: pino({ level: "silent" }),
    printQRInTerminal: false,
    browser: ["backtrack", "Safari", "5.1.7"],
    markOnlineOnConnect: true,
    fireInitQueries: false,
    downloadHistory: false,
    syncFullHistory: false,
    version,
    auth: state,
  });

  const botJid = client.user?.id ? client.user.id.split(":")[0] + "@s.whatsapp.net" : null;

  client.ev.on("messages.upsert", async (chatUpdate) => {
    try {
      const mek = chatUpdate.messages[0];
      if (!mek.message) return;

      console.log(`📩 Message received: type=${Object.keys(mek.message)[0]}, from=${mek.key.remoteJid}`);

      
      antiDeleteHandler(client, mek).catch(err => console.error('[ANTIDELETE]', err));

      
      mek.message = Object.keys(mek.message)[0] === "ephemeralMessage"
        ? mek.message.ephemeralMessage.message
        : mek.message;

      if (mek.key && mek.key.remoteJid === "status@broadcast") {
        client.readMessages([mek.key]).catch(() => {});
        if (autolike === "true") {
          const nickk = client.user.id;
          client.sendMessage(mek.key.remoteJid, { react: { text: '🙂', key: mek.key } }, { statusJidList: [mek.key.participant, nickk] }).catch(() => {});
        }
      }

      
      if (!client.public && !mek.key.fromMe && chatUpdate.type === "notify") return;
      if (mek.key.id.startsWith("BAE5") && mek.key.id.length === 16) return;

      const m = smsg(client, mek);
      await mainHandler(client, m, chatUpdate);

    } catch (err) {
      console.error("❌ Error handling message:", err);
    }
  });

  
  client.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === "close") {
      let reason = new Boom(lastDisconnect?.error)?.output.statusCode;
      console.log("Connection closed:", reason);

      if ([DisconnectReason.badSession, DisconnectReason.loggedOut, DisconnectReason.connectionReplaced].includes(reason)) {
        console.log("Session invalid. Please delete creds.json and scan again.");
        process.exit();
      }

      if ([DisconnectReason.connectionClosed, DisconnectReason.connectionLost, DisconnectReason.timedOut].includes(reason)) {
        if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttempts++;
          console.log(`Reconnecting in ${RECONNECT_DELAY * reconnectAttempts / 1000}s...`);
          setTimeout(() => startHisoka(), RECONNECT_DELAY * reconnectAttempts);
        }
      }

      if (reason === DisconnectReason.restartRequired) {
        console.log("Restart required, restarting...");
        startHisoka();
      }
    } else if (connection === "open") {
      reconnectAttempts = 0;
      console.log(color("✅ Connected successfully!", "green"));
      startPeriodicCleanup();
    }
  });

  client.ev.on("creds.update", saveCreds);

  client.sendText = (jid, text, quoted = "", options) => client.sendMessage(jid, { text: text, ...options }, { quoted });
  
  client.decodeJid = (jid) => {
    if (!jid) return jid;
    if (/:\d+@/gi.test(jid)) {
      let decode = jidDecode(jid) || {};
      return (decode.user && decode.server ? decode.user + "@" + decode.server : jid);
    }
    return jid;
  };

  return client;
}


initializeSession().then(() => startHisoka());

if (process.env.NODE_ENV !== 'production') {
  let file = require.resolve(__filename);
  fsSync.watchFile(file, () => {
    fsSync.unwatchFile(file);
    console.log(chalk.redBright(`Update detected: ${__filename}`));
    delete require.cache[file];
    require(file);
  });
}


const express = require("express");
const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("Autoview Bot is running!");
});

app.listen(PORT, () => {
  console.log(`Express server running on port ${PORT}`);
});