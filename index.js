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