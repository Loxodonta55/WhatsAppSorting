import { Client, LocalAuth } from 'whatsapp-web.js';
import { Server } from 'socket.io';
import fs from 'fs';
import path from 'path';
import { dbService } from './db.service';
import { geminiService, ClassificationResult } from './gemini.service';

export type ConnectionStatus = 'DISCONNECTED' | 'CONNECTING' | 'QR_READY' | 'CONNECTED';

const withTimeout = <T>(promise: Promise<T>, ms: number, fallbackErrorMsg: string): Promise<T> => {
  let timeoutId: NodeJS.Timeout;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(fallbackErrorMsg)), ms);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeoutId));
};

class WhatsAppService {
  private client!: Client;
  private io!: Server;
  private connectionStatus: ConnectionStatus = 'DISCONNECTED';
  private qrCodeString: string = '';
  private userInfo: { name?: string; number?: string } | null = null;

  init(socketIo: Server) {
    this.io = socketIo;
    this.updateStatus('CONNECTING');

    this.client = new Client({
      authStrategy: new LocalAuth({
        dataPath: path.join(__dirname, '..', '..', '.wwebjs_auth')
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

    this.setupEventListeners();

    this.client.initialize().catch(err => {
      this.updateStatus('DISCONNECTED');
      console.error('Failed to initialize WhatsApp Client:', err);
      this.io.emit('whatsapp_status', { status: this.connectionStatus, error: err.message });
    });
  }

  private updateStatus(status: ConnectionStatus, extraPayload: any = {}) {
    this.connectionStatus = status;
    this.io.emit('whatsapp_status', {
      status: this.connectionStatus,
      qr: this.qrCodeString,
      user: this.userInfo,
      ...extraPayload
    });
  }

  private setupEventListeners() {
    this.client.on('qr', (qr) => {
      this.qrCodeString = qr;
      this.updateStatus('QR_READY', { qr: this.qrCodeString });
      console.log('WhatsApp QR Code generated.');
    });

    this.client.on('authenticated', () => {
      console.log('WhatsApp Authenticated successfully.');
    });

    this.client.on('auth_failure', (msg) => {
      this.qrCodeString = '';
      this.updateStatus('DISCONNECTED', { error: msg });
      console.error('WhatsApp Authentication failure:', msg);
    });

    this.client.on('ready', () => {
      this.qrCodeString = '';
      this.userInfo = {
        name: this.client.info.pushname || 'WhatsApp User',
        number: this.client.info.wid.user,
      };
      this.updateStatus('CONNECTED');
      console.log(`WhatsApp Client is ready! Connected as ${this.userInfo.name} (${this.userInfo.number})`);
    });

    this.client.on('disconnected', (reason) => {
      this.qrCodeString = '';
      this.userInfo = null;
      this.updateStatus('DISCONNECTED');
      console.log('WhatsApp Client was disconnected:', reason);
    });

    this.client.on('message_create', async (message) => {
      await this.handleIncomingMessage(message);
    });
  }

  private isSalesOriented(text: string): boolean {
    if (!text) return false;
    const lowercase = text.toLowerCase();
    const keywords = [
      'biete', 'verkaufe', 'abzugeben', 'abzuholen', 'suche', 'vk', 'verschenke',
      'preis', 'euro', '€', 'gr', 'größe', 'groesse', 'paket', 'set', 'kleidung',
      'schuhe', 'spielzeug', 'wagen', 'sitz', 'bett', 'zustand', 'versand', 'abholung',
      'flohmarkt', 'basar', 'trage', 'kleinkind', 'baby', 'monate', 'jahre', 'kauf',
      'verkauf', 'neu', 'getragen', 'bereit', 'abgabe', 'jacke', 'hose', 'pulli',
      'shirt', 'kleid', 'bodys', 'body', 'strampler', 'schlafsack'
    ];
    return keywords.some(keyword => lowercase.includes(keyword));
  }

  private async handleIncomingMessage(message: any) {
    try {
      const isGroup = message.from.endsWith('@g.us');
      if (isGroup) {
        console.log(`✉️ WhatsApp Event - Group JID: ${message.from}, fromMe: ${message.fromMe}`);
      }

      if (message.fromMe && !isGroup) return;

      const chat = await message.getChat();
      const groupId = chat.id._serialized;
      const groupName = chat.name;

      const monitoredChats = await dbService.getMonitoredChats();
      const isMonitored = monitoredChats.some(c => c.id === groupId);

      if (!isMonitored) return;

      const settings = await dbService.getSettings();
      if (!settings.filterEnabled) return;

      if (!message.hasMedia && !this.isSalesOriented(message.body)) {
        console.log(`[Test Mode] Processing non-sales message from group "${groupName}"`);
      }

      console.log(`Processing message from group "${groupName}" (${groupId})`);

      const { imageBuffer, imageMimeType, savedImagePath } = await this.processMedia(message);
      
      const contact = await message.getContact();
      const senderName = contact.pushname || contact.name || 'Unbekannt';
      const senderNumber = contact.number;

      const classification = await geminiService.classifyMessage(message.body, imageBuffer, imageMimeType);
      console.log(`Classification: ${classification.isRelevant ? 'RELEVANT' : 'NOT RELEVANT'} (${classification.reason})`);

      const matchedItem = await dbService.addMatchedItem({
        messageId: message.id._serialized,
        timestamp: message.timestamp * 1000,
        senderName,
        senderNumber,
        groupName,
        groupId,
        text: message.body,
        isRelevant: classification.isRelevant,
        reason: classification.reason,
        extractedDetails: classification.extractedDetails,
        imagePath: savedImagePath,
      });

      this.io.emit('new_match', matchedItem);

      await this.notifyUsers(settings.notificationPhone, classification, groupName, senderName, message);

    } catch (error) {
      console.error('Error handling incoming WhatsApp message:', error);
    }
  }

  private async processMedia(message: any) {
    let imageBuffer: Buffer | undefined = undefined;
    let imageMimeType: string | undefined = undefined;
    let savedImagePath: string | undefined = undefined;

    if (message.hasMedia) {
      try {
        const media = await message.downloadMedia();
        if (media && media.mimetype.startsWith('image/')) {
          imageBuffer = Buffer.from(media.data, 'base64');
          imageMimeType = media.mimetype;
          
          const imageDir = path.join(__dirname, '..', '..', 'public', 'images');
          if (!fs.existsSync(imageDir)) {
            fs.mkdirSync(imageDir, { recursive: true });
          }
          const filename = `${Math.random().toString(36).substring(2, 11)}_${Date.now()}.jpg`;
          fs.writeFileSync(path.join(imageDir, filename), imageBuffer);
          savedImagePath = `/images/${filename}`;
        }
      } catch (error) {
        console.error('Error downloading message media:', error);
      }
    }
    return { imageBuffer, imageMimeType, savedImagePath };
  }

  private async notifyUsers(phoneInput: string, classification: ClassificationResult, groupName: string, senderName: string, originalMessage: any) {
    const recipients = (phoneInput || 'self').split(';').map(p => p.trim()).filter(Boolean);
    const prefix = classification.isRelevant ? '🔴 *Treffer*' : '⚪ *kein Treffer*';

    for (const recipient of recipients) {
      let targetJid = this.client.info.wid._serialized;
      if (recipient !== 'self') {
        // Apply user's custom formatting fix
        targetJid = `${recipient.replace(/[^0-9]/g, '').replace(/^00/, '')}@c.us`;
        try {
          const isRegistered = await withTimeout(
            this.client.isRegisteredUser(targetJid),
            5000,
            'isRegisteredUser timeout'
          );
          if (!isRegistered) {
            console.warn(`Recipient JID is not registered on WhatsApp: ${targetJid}. Skipping.`);
            continue;
          }
        } catch (regError) {
          console.error(`Failed to verify JID registration for ${targetJid}:`, regError);
          continue;
        }
      }

      try {
        await withTimeout(originalMessage.forward(targetJid), 10000, 'forward timeout');
        
        const details = classification.extractedDetails;
        const detailLines = [
          details.item ? `• *Gegenstand:* ${details.item}` : null,
          details.size ? `• *Größe:* ${details.size}` : null,
          details.price ? `• *Preis:* ${details.price}` : null,
          details.location ? `• *Ort/Versand:* ${details.location}` : null,
          details.condition ? `• *Zustand:* ${details.condition}` : null,
        ].filter(Boolean).join('\n');

        const summaryText = `${prefix}
💡 *Warum weitergeleitet?*
• *Gruppe:* ${groupName}
• *Von:* ${senderName}
${detailLines ? '\n*Extrahiert:*\n' + detailLines : ''}

🔍 *KI-Begründung:* ${classification.reason}

🔗 _Antworte direkt in der Gruppe "${groupName}"._`;

        await withTimeout(this.client.sendMessage(targetJid, summaryText), 10000, 'sendMessage timeout');
      } catch (forwardError) {
        console.error(`Failed to forward matched message to ${targetJid}:`, forwardError);
      }
    }
  }

  public getStatus() {
    return {
      status: this.connectionStatus,
      qr: this.qrCodeString,
      user: this.userInfo,
    };
  }

  public async getChatsList() {
    if (this.connectionStatus !== 'CONNECTED' || !this.client) {
      return [];
    }
    try {
      const chats = await this.client.getChats();
      const groups = chats.filter((chat: any) => chat.isGroup);
      return groups.map((group: any) => ({
        id: group.id._serialized,
        name: group.name,
        unreadCount: group.unreadCount,
      }));
    } catch (error) {
      console.error('Failed to get chats list:', error);
      return [];
    }
  }

  public async sendDirectMessage(to: string, text: string) {
    if (this.connectionStatus !== 'CONNECTED' || !this.client) {
      throw new Error('WhatsApp client is not connected');
    }
    let targetJid = to;
    if (to === 'self') {
      targetJid = this.client.info.wid._serialized;
    } else if (!to.endsWith('@c.us')) {
      targetJid = `${to.replace(/[^0-9]/g, '').replace(/^00/, '')}@c.us`;
    }
    await withTimeout(this.client.sendMessage(targetJid, text), 10000, 'sendMessage timeout');
  }
}

export const whatsappService = new WhatsAppService();
