const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, 'data');
const privateDir = path.join(dataDir, 'private');
const groupsDir = path.join(dataDir, 'groups');
const statusDir = path.join(dataDir, 'status');

[dataDir, privateDir, groupsDir, statusDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

function isDeleteMessage(mek) {
  const REVOKE_TYPE = 0;
  const hasProtocol = mek.message && mek.message.protocolMessage;
  return hasProtocol && mek.message.protocolMessage.type === REVOKE_TYPE;
}

function getMessageCategory(mek) {
  const remoteJid = mek.key.remoteJid;

  if (remoteJid === 'status@broadcast') {
    return { type: 'status', dir: statusDir };
  } else if (remoteJid.endsWith('@g.us')) {
    return { type: 'group', dir: groupsDir };
  } else {
    return { type: 'private', dir: privateDir };
  }
}

function saveMessage(mek) {
  try {
    const { type, dir } = getMessageCategory(mek);
    const messageId = mek.key.id;
    const fileName = `${messageId}.json`;
    const filePath = path.join(dir, fileName);

    fs.writeFileSync(filePath, JSON.stringify(mek, null, 2));
  } catch (err) {
    console.error('[ANTIDELETE] Error saving message:', err);
  }
}

function getOriginalMessage(deletedMsgKey) {
  try {
    const messageId = deletedMsgKey.id;
    const dirs = [privateDir, groupsDir, statusDir];

    for (const dir of dirs) {
      const filePath = path.join(dir, `${messageId}.json`);
      if (fs.existsSync(filePath)) {
        const data = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(data);
      }
    }

    return null;
  } catch (err) {
    return null;
  }
}

function formatKenyanTime(timestamp) {
  const date = new Date(timestamp * 1000);
  const kenyanDate = new Date(date.toLocaleString('en-US', { timeZone: 'Africa/Nairobi' }));

  const day = String(kenyanDate.getDate()).padStart(2, '0');
  const month = String(kenyanDate.getMonth() + 1).padStart(2, '0');
  const year = kenyanDate.getFullYear();
  const hours = String(kenyanDate.getHours()).padStart(2, '0');
  const minutes = String(kenyanDate.getMinutes()).padStart(2, '0');
  const seconds = String(kenyanDate.getSeconds()).padStart(2, '0');

  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
}

function formatJid(jid) {
  if (!jid) return 'Unknown';
  const cleaned = jid.split('@')[0];
  return cleaned;
}

async function formatDeleteNotification(client, originalMsg, deleteMsg) {
  const { type } = getMessageCategory(originalMsg);

  let senderName = originalMsg.pushName || 'Unknown';
  let senderJid = '';
  let title = '';
  let locationInfo = '';

  if (type === 'status') {
    title = 'DELETED STATUS UPDATE';
    locationInfo = '📢 Status';
    senderJid = originalMsg.key.participant || originalMsg.key.remoteJid;
  } else if (type === 'group') {
    title = 'DELETED GROUP MESSAGE';
    
    // Get group name
    let groupName = 'Unknown Group';
    try {
      const groupMetadata = await client.groupMetadata(originalMsg.key.remoteJid);
      groupName = groupMetadata.subject;
    } catch (err) {
      console.error('[ANTIDELETE] Error fetching group metadata:', err);
    }
    
    locationInfo = `👥 Group: ${groupName}`;
    senderJid = originalMsg.key.participantPn || originalMsg.key.participant;
    
  } else {
    title = 'DELETED PRIVATE MESSAGE';
    locationInfo = '💬 Private Chat';
    senderJid = originalMsg.key.senderPn || originalMsg.key.remoteJid;
  }

  const formattedJid = formatJid(senderJid);
  const timestamp = formatKenyanTime(originalMsg.messageTimestamp);
  const deletedAt = formatKenyanTime(deleteMsg.messageTimestamp);

  return {
    text: `╔══════════════════╗
║   🗑️ ${title}   ║
╚══════════════════╝

📍 Location: ${locationInfo}
👤 Name: ${senderName}
📱 Sender: @${formattedJid}
⏰ Original: ${timestamp}
🕒 Deleted: ${deletedAt}`,
    mentionJid: `${formattedJid}@s.whatsapp.net`
  };
}

async function sendDeletedMedia(client, originalMsg, deleteMsg, botNumber) {
  try {
    const notificationData = await formatDeleteNotification(client, originalMsg, deleteMsg);
    const timestamp = formatKenyanTime(originalMsg.messageTimestamp);
    const { type } = getMessageCategory(originalMsg);

    let notificationPrefix = '';
    if (type === 'status') {
      notificationPrefix = '🗑️ DELETED STATUS UPDATE';
    } else if (type === 'group') {
      notificationPrefix = '🗑️ DELETED GROUP MESSAGE';
    } else {
      notificationPrefix = '🗑️ DELETED PRIVATE MESSAGE';
    }

    const m = originalMsg.message;

    const getMediaReply = (mediaMessage) => {
      const caption = mediaMessage.caption || '';
      const finalCaption = caption ? `${notificationData.text}\n\n📝 Caption: ${caption}` : notificationData.text;

      return {
        caption: finalCaption,
        mentions: [notificationData.mentionJid],
        contextInfo: {
          mentionedJid: [notificationData.mentionJid],
          externalAdReply: {
            title: notificationPrefix,
            body: `Time: ${timestamp}`,
            thumbnailUrl: "https://files.catbox.moe/z34m2h.jpg",
            sourceUrl: '',
            mediaType: 1,
            renderLargerThumbnail: false
          }
        }
      };
    };

    if (m.imageMessage) {
      const buffer = await client.downloadMediaMessage(m.imageMessage);
      const mediaReply = getMediaReply(m.imageMessage);
      await client.sendMessage(botNumber, { image: buffer, ...mediaReply });
      return true;
    }

    if (m.videoMessage) {
      const buffer = await client.downloadMediaMessage(m.videoMessage);
      const mediaReply = getMediaReply(m.videoMessage);
      await client.sendMessage(botNumber, { video: buffer, ...mediaReply });
      return true;
    }

    if (m.stickerMessage) {
      const buffer = await client.downloadMediaMessage(m.stickerMessage);
      await client.sendMessage(botNumber, { 
        sticker: buffer,
        mentions: [notificationData.mentionJid],
        contextInfo: {
          mentionedJid: [notificationData.mentionJid],
          externalAdReply: {
            title: notificationPrefix,
            body: `Time: ${timestamp}`,
            thumbnailUrl: "https://files.catbox.moe/z34m2h.jpg",
            sourceUrl: '',
            mediaType: 1,
            renderLargerThumbnail: false
          }
        }
      });
      return true;
    }

    if (m.documentMessage) {
      const buffer = await client.downloadMediaMessage(m.documentMessage);
      const mediaReply = getMediaReply(m.documentMessage);
      await client.sendMessage(botNumber, {
        document: buffer,
        fileName: m.documentMessage.fileName,
        mimetype: m.documentMessage.mimetype,
        ...mediaReply
      });
      return true;
    }

    if (m.audioMessage) {
      const buffer = await client.downloadMediaMessage(m.audioMessage);
      await client.sendMessage(botNumber, {
        audio: buffer,
        mimetype: 'audio/mpeg',
        ptt: m.audioMessage.ptt === true,
        caption: notificationData.text,
        mentions: [notificationData.mentionJid],
        contextInfo: {
          mentionedJid: [notificationData.mentionJid],
          externalAdReply: {
            title: notificationPrefix,
            body: `Time: ${timestamp}`,
            thumbnailUrl: "https://files.catbox.moe/z34m2h.jpg",
            sourceUrl: '',
            mediaType: 1,
            renderLargerThumbnail: false
          }
        }
      });
      return true;
    }

    return false;

  } catch (err) {
    console.error('[ANTIDELETE] Error sending deleted media:', err);
    return false;
  }
}

function extractTextContent(message) {
  if (!message) return null;

  if (message.conversation) {
    return message.conversation;
  } else if (message.extendedTextMessage?.text) {
    return message.extendedTextMessage.text;
  }

  return null;
}

async function handleDeletedMessage(client, deleteMsg) {
  try {
    const deletedKey = deleteMsg.message.protocolMessage.key;
    const originalMsg = getOriginalMessage(deletedKey);

    if (!originalMsg) return;

    const botNumber = await client.decodeJid(client.user.id);
    const mediaSent = await sendDeletedMedia(client, originalMsg, deleteMsg, botNumber);

    if (mediaSent) return;

    const notificationData = await formatDeleteNotification(client, originalMsg, deleteMsg);
    const textContent = extractTextContent(originalMsg.message);

    if (textContent) {
      const fullMessage = notificationData.text + '\n\n━━━━━━━━━━━━━━━━━━\n*Original Message:*\n━━━━━━━━━━━━━━━━━━\n\n' + textContent;
      await client.sendMessage(botNumber, { 
        text: fullMessage,
        mentions: [notificationData.mentionJid]
      });
    } else {
      await client.sendMessage(botNumber, { 
        text: notificationData.text + '\n\n[Unsupported message type]',
        mentions: [notificationData.mentionJid]
      });
    }

  } catch (err) {
    console.error('[ANTIDELETE] Error handling deleted message:', err);
  }
}

function cleanupOldMessages() {
  try {
    const sixHoursAgo = Date.now() - (6 * 60 * 60 * 1000);
    const dirs = [privateDir, groupsDir, statusDir];
    let deletedCount = 0;

    dirs.forEach(dir => {
      if (!fs.existsSync(dir)) return;

      const files = fs.readdirSync(dir);

      files.forEach(file => {
        const filePath = path.join(dir, file);

        try {
          const data = fs.readFileSync(filePath, 'utf8');
          const message = JSON.parse(data);
          const messageTime = message.messageTimestamp * 1000;

          if (messageTime < sixHoursAgo) {
            fs.unlinkSync(filePath);
            deletedCount++;
          }
        } catch (err) {
        }
      });
    });

    if (deletedCount > 0) {
      console.log(`[ANTIDELETE] Cleaned up ${deletedCount} old messages`);
    }

  } catch (err) {
    console.error('[ANTIDELETE] Error during cleanup:', err);
  }
}

function startPeriodicCleanup() {
  cleanupOldMessages();
  setInterval(() => {
    cleanupOldMessages();
  }, 60 * 60 * 1000);
}

async function antiDeleteHandler(client, mek) {
  try {
    if (isDeleteMessage(mek)) {
      await handleDeletedMessage(client, mek);
      return;
    }

    saveMessage(mek);

  } catch (err) {
    console.error('[ANTIDELETE] Error in antiDeleteHandler:', err);
  }
}

module.exports = {
  antiDeleteHandler,
  saveMessage,
  isDeleteMessage,
  handleDeletedMessage,
  getOriginalMessage,
  startPeriodicCleanup,
  cleanupOldMessages
};