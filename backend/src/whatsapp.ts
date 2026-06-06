import { Client, LocalAuth, MessageMedia } from 'whatsapp-web.js';
import { Server } from 'socket.io';
import fs from 'fs';
import path from 'path';
import { db, MatchedItem } from './db';
import { classifyMessage } from './gemini';

let client: Client;
let io: Server;
let connectionStatus: 'DISCONNECTED' | 'CONNECTING' | 'QR_READY' | 'CONNECTED' = 'DISCONNECTED';
let qrCodeString: string = '';
let userInfo: { name?: string; number?: string } | null = null;

export function getWhatsAppClientStatus() {
  return {
    status: connectionStatus,
    qr: qrCodeString,
    user: userInfo,
  };
}

export async function getChatsList() {
  if (connectionStatus !== 'CONNECTED' || !client) {
    return [];
  }
  try {
    const chats = await client.getChats();
    // Filter for group chats
    const groups = chats.filter(chat => chat.isGroup);
    return groups.map(group => ({
      id: group.id._serialized,
      name: group.name,
      unreadCount: group.unreadCount,
    }));
  } catch (error) {
    console.error('Failed to get chats list:', error);
    return [];
  }
}

export async function sendDirectMessage(to: string, text: string) {
  if (connectionStatus !== 'CONNECTED' || !client) {
    throw new Error('WhatsApp client is not connected');
  }
  
  let targetJid = to;
  if (to === 'self') {
    targetJid = client.info.wid._serialized;
  } else if (!to.endsWith('@c.us')) {
    targetJid = `${to.replace(/[^0-9]/g, '')}@c.us`;
  }
  
  await client.sendMessage(targetJid, text);
}

export function initWhatsApp(socketIo: Server) {
  io = socketIo;
  connectionStatus = 'CONNECTING';
  io.emit('whatsapp_status', { status: connectionStatus });

  // Initialize whatsapp-web.js client
  client = new Client({
    authStrategy: new LocalAuth({
      dataPath: path.join(__dirname, '..', '.wwebjs_auth')
    }),
    webVersionCache: {
      type: 'remote',
      remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/{version}.html',
      strict: false
    },
    puppeteer: {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu'
      ]
    }
  });

  client.on('qr', (qr) => {
    connectionStatus = 'QR_READY';
    qrCodeString = qr;
    console.log('WhatsApp QR Code generated.');
    io.emit('whatsapp_status', { status: connectionStatus, qr: qrCodeString });
  });

  client.on('authenticated', () => {
    console.log('WhatsApp Authenticated successfully.');
  });

  client.on('auth_failure', (msg) => {
    connectionStatus = 'DISCONNECTED';
    qrCodeString = '';
    console.error('WhatsApp Authentication failure:', msg);
    io.emit('whatsapp_status', { status: connectionStatus, error: msg });
  });

  client.on('ready', async () => {
    connectionStatus = 'CONNECTED';
    qrCodeString = '';
    
    // Extract logged in user info
    userInfo = {
      name: client.info.pushname || 'WhatsApp User',
      number: client.info.wid.user,
    };
    
    console.log(`WhatsApp Client is ready! Connected as ${userInfo.name} (${userInfo.number})`);
    io.emit('whatsapp_status', { status: connectionStatus, user: userInfo });
  });

  client.on('disconnected', (reason) => {
    connectionStatus = 'DISCONNECTED';
    qrCodeString = '';
    userInfo = null;
    console.log('WhatsApp Client was disconnected:', reason);
    io.emit('whatsapp_status', { status: connectionStatus });
  });

  // Handle incoming messages
  client.on('message', async (message) => {
    try {
      // Don't process messages sent by ourselves
      if (message.fromMe) return;

      const chat = await message.getChat();
      const groupId = chat.id._serialized;
      const groupName = chat.name;

      // Check if this chat is monitored
      const monitoredChats = db.getMonitoredChats();
      const isMonitored = monitoredChats.some(c => c.id === groupId);

      if (!isMonitored) return;

      const settings = db.getSettings();
      if (!settings.filterEnabled) return;

      console.log(`Processing message from group "${groupName}" (${groupId})`);

      // 1. Download attachment if it exists and is an image
      let imageBuffer: Buffer | undefined = undefined;
      let imageMimeType: string | undefined = undefined;
      
      if (message.hasMedia) {
        try {
          const media = await message.downloadMedia();
          if (media && media.mimetype.startsWith('image/')) {
            imageBuffer = Buffer.from(media.data, 'base64');
            imageMimeType = media.mimetype;
            console.log(`Downloaded image attachment (${imageMimeType})`);
          }
        } catch (mediaError) {
          console.error('Error downloading message media:', mediaError);
        }
      }

      // 2. Classify using Gemini
      const contact = await message.getContact();
      const senderName = contact.pushname || contact.name || 'Unbekannt';
      const senderNumber = contact.number;

      const classification = await classifyMessage(
        message.body,
        imageBuffer,
        imageMimeType
      );

      console.log(`Classification: ${classification.isRelevant ? 'RELEVANT' : 'NOT RELEVANT'} (${classification.reason})`);

      if (classification.isRelevant) {
        // Save the image locally if available
        let savedImagePath: string | undefined = undefined;
        if (imageBuffer) {
          const imageDir = path.join(__dirname, '..', 'public', 'images');
          if (!fs.existsSync(imageDir)) {
            fs.mkdirSync(imageDir, { recursive: true });
          }
          const filename = `${Math.random().toString(36).substring(2, 11)}_${Date.now()}.jpg`;
          fs.writeFileSync(path.join(imageDir, filename), imageBuffer);
          savedImagePath = `/images/${filename}`;
        }

        // Save to DB
        const matchedItem = db.addMatchedItem({
          messageId: message.id._serialized,
          timestamp: message.timestamp * 1000, // WhatsApp uses seconds, convert to ms
          senderName,
          senderNumber,
          groupName,
          groupId,
          text: message.body,
          isRelevant: true,
          reason: classification.reason,
          extractedDetails: classification.extractedDetails,
          imagePath: savedImagePath,
        });

        // Emit to frontend in real-time
        io.emit('new_match', matchedItem);

        // 3. Forward to user
        let targetJid = client.info.wid._serialized; // Default to self-chat
        if (settings.notificationPhone && settings.notificationPhone !== 'self') {
          targetJid = `${settings.notificationPhone.replace(/[^0-9]/g, '')}@c.us`;
        }

        const details = classification.extractedDetails;
        const detailLines = [
          details.item ? `• *Gegenstand:* ${details.item}` : null,
          details.size ? `• *Größe:* ${details.size}` : null,
          details.price ? `• *Preis:* ${details.price}` : null,
          details.location ? `• *Ort/Versand:* ${details.location}` : null,
          details.condition ? `• *Zustand:* ${details.condition}` : null,
        ].filter(Boolean).join('\n');

        const forwardText = `🌟 *Relevantes Angebot gefunden!*

👥 *Gruppe:* ${groupName}
👤 *Von:* ${senderName}
📝 *Nachricht:* ${message.body || '[Kein Text - siehe Bild]'}

🔍 *Details:*
${detailLines || '• Keine Details extrahiert'}

💡 *Grund:* ${classification.reason}

🔗 _Antworte direkt in der Gruppe "${groupName}"._`;

        try {
          if (imageBuffer && imageMimeType) {
            const media = new MessageMedia(imageMimeType, imageBuffer.toString('base64'));
            await client.sendMessage(targetJid, media, { caption: forwardText });
          } else {
            await client.sendMessage(targetJid, forwardText);
          }
          console.log(`Match forwarded successfully to ${targetJid}`);
        } catch (forwardError) {
          console.error('Failed to forward matched message:', forwardError);
        }
      }
    } catch (error) {
      console.error('Error handling incoming WhatsApp message:', error);
    }
  });

  client.initialize().catch(err => {
    connectionStatus = 'DISCONNECTED';
    console.error('Failed to initialize WhatsApp Client:', err);
    io.emit('whatsapp_status', { status: connectionStatus, error: err.message });
  });
}
