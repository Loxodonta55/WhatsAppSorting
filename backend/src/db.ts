import fs from 'fs';
import path from 'path';

export interface Settings {
  geminiApiKey: string;
  criteria: string;
  notificationPhone: string;
  filterEnabled: boolean;
}

export interface MonitoredChat {
  id: string;
  name: string;
}

export interface MatchedItem {
  id: string; // Unique ID (e.g., message ID or UUID)
  messageId: string; // WhatsApp message ID
  timestamp: number;
  senderName: string;
  senderNumber: string;
  groupName: string;
  groupId: string;
  text: string;
  isRelevant: boolean;
  reason: string;
  extractedDetails: {
    item?: string;
    size?: string;
    price?: string;
    location?: string;
    condition?: string;
  };
  imagePath?: string; // If we saved a downloaded image locally
}

export interface DatabaseSchema {
  settings: Settings;
  monitoredChats: MonitoredChat[];
  matchedItems: MatchedItem[];
}

const DB_PATH = path.join(__dirname, '..', 'data.json');

const DEFAULT_DB: DatabaseSchema = {
  settings: {
    geminiApiKey: '',
    criteria: 'Ich suche Babykleidung für Jungen in den Größen 74 und 80. Am besten Sets, Bodys oder Hosen. Bitte keine Schuhe und keine Spielzeuge. Nur Angebote mit Abholung in München oder Versand.',
    notificationPhone: 'self', // 'self' means message yourself, or a specific phone number
    filterEnabled: true,
  },
  monitoredChats: [],
  matchedItems: [],
};

// Ensure database file exists
function initDb(): DatabaseSchema {
  try {
    if (!fs.existsSync(DB_PATH)) {
      fs.writeFileSync(DB_PATH, JSON.stringify(DEFAULT_DB, null, 2), 'utf-8');
      return DEFAULT_DB;
    }
    const rawData = fs.readFileSync(DB_PATH, 'utf-8');
    const data = JSON.parse(rawData) as DatabaseSchema;
    
    // Ensure all fields exist (migration)
    let updated = false;
    if (!data.settings) {
      data.settings = DEFAULT_DB.settings;
      updated = true;
    }
    if (!data.monitoredChats) {
      data.monitoredChats = [];
      updated = true;
    }
    if (!data.matchedItems) {
      data.matchedItems = [];
      updated = true;
    }
    if (updated) {
      saveDb(data);
    }
    return data;
  } catch (error) {
    console.error('Failed to initialize database:', error);
    return DEFAULT_DB;
  }
}

// Save database file
function saveDb(data: DatabaseSchema): void {
  try {
    // Write atomically by writing to temporary file first
    const tempPath = DB_PATH + '.tmp';
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tempPath, DB_PATH);
  } catch (error) {
    console.error('Failed to save database:', error);
  }
}

export const db = {
  getSettings(): Settings {
    const data = initDb();
    return data.settings;
  },

  updateSettings(newSettings: Partial<Settings>): Settings {
    const data = initDb();
    data.settings = { ...data.settings, ...newSettings };
    saveDb(data);
    return data.settings;
  },

  getMonitoredChats(): MonitoredChat[] {
    const data = initDb();
    return data.monitoredChats;
  },

  addMonitoredChat(chat: MonitoredChat): void {
    const data = initDb();
    if (!data.monitoredChats.some(c => c.id === chat.id)) {
      data.monitoredChats.push(chat);
      saveDb(data);
    }
  },

  removeMonitoredChat(chatId: string): void {
    const data = initDb();
    data.monitoredChats = data.monitoredChats.filter(c => c.id !== chatId);
    saveDb(data);
  },

  setMonitoredChats(chats: MonitoredChat[]): void {
    const data = initDb();
    data.monitoredChats = chats;
    saveDb(data);
  },

  getMatchedItems(): MatchedItem[] {
    const data = initDb();
    // Return sorted by timestamp descending
    return [...data.matchedItems].sort((a, b) => b.timestamp - a.timestamp);
  },

  addMatchedItem(item: Omit<MatchedItem, 'id'>): MatchedItem {
    const data = initDb();
    const newItem: MatchedItem = {
      ...item,
      id: Math.random().toString(36).substring(2, 11) + Date.now().toString(36),
    };
    data.matchedItems.push(newItem);
    saveDb(data);
    return newItem;
  },

  deleteMatchedItem(id: string): void {
    const data = initDb();
    data.matchedItems = data.matchedItems.filter(item => item.id !== id);
    saveDb(data);
  },

  clearMatchedItems(): void {
    const data = initDb();
    data.matchedItems = [];
    saveDb(data);
  }
};
