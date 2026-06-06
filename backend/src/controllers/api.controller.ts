import { Request, Response, NextFunction } from 'express';
import { dbService } from '../services/db.service';
import { whatsappService } from '../services/whatsapp.service';
import { geminiService } from '../services/gemini.service';

export const getWhatsAppStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(whatsappService.getStatus());
  } catch (error) {
    next(error);
  }
};

export const getChats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const chats = await whatsappService.getChatsList();
    res.json(chats);
  } catch (error) {
    next(error);
  }
};

export const getSettings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const settings = await dbService.getSettings();
    const isApiKeyConfigured = !!settings.geminiApiKey || !!process.env.GEMINI_API_KEY;
    res.json({
      ...settings,
      isApiKeyConfigured
    });
  } catch (error) {
    next(error);
  }
};

export const updateSettings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const updated = await dbService.updateSettings(req.body);
    const isApiKeyConfigured = !!updated.geminiApiKey || !!process.env.GEMINI_API_KEY;
    res.json({
      ...updated,
      isApiKeyConfigured
    });
  } catch (error) {
    next(error);
  }
};

export const getMonitoredChats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const chats = await dbService.getMonitoredChats();
    res.json(chats);
  } catch (error) {
    next(error);
  }
};

export const updateMonitoredChats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { chats } = req.body;
    if (!Array.isArray(chats)) {
      return res.status(400).json({ error: 'chats must be an array' });
    }
    await dbService.setMonitoredChats(chats);
    const updatedChats = await dbService.getMonitoredChats();
    res.json(updatedChats);
  } catch (error) {
    next(error);
  }
};

export const getMatches = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const matches = await dbService.getMatchedItems();
    res.json(matches);
  } catch (error) {
    next(error);
  }
};

export const deleteMatch = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await dbService.deleteMatchedItem(req.params.id);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

export const clearMatches = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await dbService.clearMatchedItems();
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

export const testFilter = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { text, imageBase64, imageMimeType } = req.body;
    
    if (!text && !imageBase64) {
      return res.status(400).json({ error: 'text or imageBase64 is required' });
    }

    let imageBuffer: Buffer | undefined = undefined;
    if (imageBase64) {
      const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');
      imageBuffer = Buffer.from(cleanBase64, 'base64');
    }

    const classification = await geminiService.classifyMessage(text, imageBuffer, imageMimeType);
    res.json(classification);
  } catch (error) {
    next(error);
  }
};

export const forwardMatch = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const matches = await dbService.getMatchedItems();
    const match = matches.find(m => m.id === req.params.id);
    if (!match) {
      return res.status(404).json({ error: 'Match not found' });
    }
    
    const settings = await dbService.getSettings();
    const phoneInput = settings.notificationPhone || 'self';
    const recipients = phoneInput.split(';').map(p => p.trim()).filter(Boolean);

    const details = match.extractedDetails;
    const detailLines = [
      details.item ? `• *Gegenstand:* ${details.item}` : null,
      details.size ? `• *Größe:* ${details.size}` : null,
      details.price ? `• *Preis:* ${details.price}` : null,
      details.location ? `• *Ort/Versand:* ${details.location}` : null,
      details.condition ? `• *Zustand:* ${details.condition}` : null,
    ].filter(Boolean).join('\n');

    const forwardText = `🔄 *Manuell weitergeleitetes Angebot!*\n\n👥 *Gruppe:* ${match.groupName}\n👤 *Von:* ${match.senderName}\n📝 *Nachricht:* ${match.text || '[Kein Text]'}\n\n🔍 *Details:*\n${detailLines || '• Keine Details extrahiert'}\n\n💡 *Grund:* ${match.reason}`;

    for (const recipient of recipients) {
      try {
        await whatsappService.sendDirectMessage(recipient, forwardText);
        console.log(`Manually forwarded match to ${recipient}`);
      } catch (err) {
        console.error(`Failed to manually forward match to ${recipient}:`, err);
      }
    }
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};
