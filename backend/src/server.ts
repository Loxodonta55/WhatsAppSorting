import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { db } from './db';
import { initWhatsApp, getWhatsAppClientStatus, getChatsList, sendDirectMessage } from './whatsapp';
import { classifyMessage } from './gemini';

// Load environment variables
dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Ensure public images directory exists and serve it statically
const publicDir = path.join(__dirname, '..', 'public');
const imagesDir = path.join(publicDir, 'images');
if (!fs.existsSync(imagesDir)) {
  fs.mkdirSync(imagesDir, { recursive: true });
}
app.use('/images', express.static(imagesDir));

// API: WhatsApp Status
app.get('/api/whatsapp-status', (req, res) => {
  res.json(getWhatsAppClientStatus());
});

// API: Get Chats
app.get('/api/chats', async (req, res) => {
  const chats = await getChatsList();
  res.json(chats);
});

// API: Settings
app.get('/api/settings', (req, res) => {
  res.json(db.getSettings());
});

app.post('/api/settings', (req, res) => {
  const updated = db.updateSettings(req.body);
  res.json(updated);
});

// API: Monitored Chats
app.get('/api/monitored-chats', (req, res) => {
  res.json(db.getMonitoredChats());
});

app.post('/api/monitored-chats', (req, res) => {
  const { chats } = req.body;
  if (!Array.isArray(chats)) {
    return res.status(400).json({ error: 'chats must be an array' });
  }
  db.setMonitoredChats(chats);
  res.json(db.getMonitoredChats());
});

// API: Matched Items
app.get('/api/matches', (req, res) => {
  res.json(db.getMatchedItems());
});

app.delete('/api/matches/:id', (req, res) => {
  db.deleteMatchedItem(req.params.id);
  res.json({ success: true });
});

app.delete('/api/matches', (req, res) => {
  db.clearMatchedItems();
  res.json({ success: true });
});

// API: Test Classification
app.post('/api/test-filter', async (req, res) => {
  const { text, imageBase64, imageMimeType } = req.body;
  
  if (!text && !imageBase64) {
    return res.status(400).json({ error: 'text or imageBase64 is required' });
  }

  try {
    let imageBuffer: Buffer | undefined = undefined;
    if (imageBase64) {
      // Remove data URL prefix if present
      const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');
      imageBuffer = Buffer.from(cleanBase64, 'base64');
    }

    const classification = await classifyMessage(text, imageBuffer, imageMimeType);
    res.json(classification);
  } catch (error) {
    console.error('Test filter failed:', error);
    res.status(500).json({ error: (error as Error).message });
  }
});

// API: Manual Forward
app.post('/api/matches/:id/forward', async (req, res) => {
  try {
    const matches = db.getMatchedItems();
    const match = matches.find(m => m.id === req.params.id);
    if (!match) {
      return res.status(404).json({ error: 'Match not found' });
    }
    
    const settings = db.getSettings();
    let targetJid = 'self';
    if (settings.notificationPhone && settings.notificationPhone !== 'self') {
      targetJid = settings.notificationPhone;
    }

    const details = match.extractedDetails;
    const detailLines = [
      details.item ? `• *Gegenstand:* ${details.item}` : null,
      details.size ? `• *Größe:* ${details.size}` : null,
      details.price ? `• *Preis:* ${details.price}` : null,
      details.location ? `• *Ort/Versand:* ${details.location}` : null,
      details.condition ? `• *Zustand:* ${details.condition}` : null,
    ].filter(Boolean).join('\n');

    const forwardText = `🔄 *Manuell weitergeleitetes Angebot!*

👥 *Gruppe:* ${match.groupName}
👤 *Von:* ${match.senderName}
📝 *Nachricht:* ${match.text || '[Kein Text]'}

🔍 *Details:*
${detailLines || '• Keine Details extrahiert'}

💡 *Grund:* ${match.reason}`;

    await sendDirectMessage(targetJid, forwardText);
    res.json({ success: true });
  } catch (error) {
    console.error('Manual forward failed:', error);
    res.status(500).json({ error: (error as Error).message });
  }
});

// Socket.io Connection
io.on('connection', (socket) => {
  console.log('Client connected to socket.io');
  // Send current status immediately
  socket.emit('whatsapp_status', getWhatsAppClientStatus());

  socket.on('disconnect', () => {
    console.log('Client disconnected from socket.io');
  });
});

// Start Server & Initialize WhatsApp
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
  // Initialize WhatsApp connection loop
  initWhatsApp(io);
});
