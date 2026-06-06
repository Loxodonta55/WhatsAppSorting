import fs from 'fs/promises';
import { existsSync } from 'fs';
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

const DB_PATH = path.join(__dirname, '..', '..', 'data.json'); // Changed path because services is a subfolder

const DEFAULT_DB: DatabaseSchema = {
  settings: {
    geminiApiKey: '',
    criteria: 'Ich suche Babykleidung für Jungen in den Größen 74 und 80. Am besten Sets, Bodys oder Hosen. Bitte keine Schuhe und keine Spielzeuge. Nur Angebote mit Abholung in München oder Versand.',
    notificationPhone: 'self',
    filterEnabled: true,
  },
  monitoredChats: [],
  matchedItems: [],
};

class DatabaseService {
  private dbPromise: Promise<DatabaseSchema> | null = null;
  private savePromise: Promise<void> = Promise.resolve();

  // Ensure database file exists and load it
  private async initDb(): Promise<DatabaseSchema> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = (async () => {
      try {
        if (!existsSync(DB_PATH)) {
          await fs.writeFile(DB_PATH, JSON.stringify(DEFAULT_DB, null, 2), 'utf-8');
          return { ...DEFAULT_DB };
        }
        const rawData = await fs.readFile(DB_PATH, 'utf-8');
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
          await this._saveDb(data);
        }
        return data;
      } catch (error) {
        console.error('Failed to initialize database:', error);
        return { ...DEFAULT_DB };
      }
    })();

    return this.dbPromise;
  }

  // Save database file sequentially to avoid race conditions
  private async _saveDb(data: DatabaseSchema): Promise<void> {
    this.savePromise = this.savePromise.then(async () => {
      try {
        await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
      } catch (error) {
        console.error('Failed to save database:', error);
      }
    });
    return this.savePromise;
  }

  async getSettings(): Promise<Settings> {
    const data = await this.initDb();
    return data.settings;
  }

  async updateSettings(newSettings: Partial<Settings>): Promise<Settings> {
    const data = await this.initDb();
    data.settings = { ...data.settings, ...newSettings };
    await this._saveDb(data);
    return data.settings;
  }

  async getMonitoredChats(): Promise<MonitoredChat[]> {
    const data = await this.initDb();
    return data.monitoredChats;
  }

  async addMonitoredChat(chat: MonitoredChat): Promise<void> {
    const data = await this.initDb();
    if (!data.monitoredChats.some(c => c.id === chat.id)) {
      data.monitoredChats.push(chat);
      await this._saveDb(data);
    }
  }

  async removeMonitoredChat(chatId: string): Promise<void> {
    const data = await this.initDb();
    data.monitoredChats = data.monitoredChats.filter(c => c.id !== chatId);
    await this._saveDb(data);
  }

  async setMonitoredChats(chats: MonitoredChat[]): Promise<void> {
    const data = await this.initDb();
    data.monitoredChats = chats;
    await this._saveDb(data);
  }

  async getMatchedItems(): Promise<MatchedItem[]> {
    const data = await this.initDb();
    // Return sorted by timestamp descending
    return [...data.matchedItems].sort((a, b) => b.timestamp - a.timestamp);
  }

  async addMatchedItem(item: Omit<MatchedItem, 'id'>): Promise<MatchedItem> {
    const data = await this.initDb();
    const newItem: MatchedItem = {
      ...item,
      id: Math.random().toString(36).substring(2, 11) + Date.now().toString(36),
    };
    data.matchedItems.push(newItem);
    await this._saveDb(data);
    return newItem;
  }

  async deleteMatchedItem(id: string): Promise<void> {
    const data = await this.initDb();
    data.matchedItems = data.matchedItems.filter(item => item.id !== id);
    await this._saveDb(data);
  }

  async clearMatchedItems(): Promise<void> {
    const data = await this.initDb();
    data.matchedItems = [];
    await this._saveDb(data);
  }
}

export const dbService = new DatabaseService();
