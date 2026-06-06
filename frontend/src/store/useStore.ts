import { create } from 'zustand';
import { SettingsData, WhatsAppStatus, MonitoredChat, MatchedItem } from '../types';
import { apiService } from '../services/api.client';

interface AppState {
  whatsappStatus: WhatsAppStatus;
  settings: SettingsData;
  monitoredChats: MonitoredChat[];
  matches: MatchedItem[];
  isLoading: boolean;
  
  // Actions
  setWhatsappStatus: (status: WhatsAppStatus) => void;
  addMatch: (match: MatchedItem) => void;
  loadInitialData: () => Promise<void>;
  saveSettings: (settings: SettingsData) => Promise<boolean>;
  saveMonitoredChats: (chats: MonitoredChat[]) => Promise<boolean>;
  deleteMatch: (id: string) => Promise<void>;
  clearAllMatches: () => Promise<void>;
}

export const useStore = create<AppState>((set) => ({
  whatsappStatus: {
    status: 'DISCONNECTED',
    qr: '',
    user: null,
  },
  settings: {
    geminiApiKey: '',
    criteria: '',
    notificationPhone: 'self',
    filterEnabled: true,
  },
  monitoredChats: [],
  matches: [],
  isLoading: true,

  setWhatsappStatus: (status) => set({ whatsappStatus: status }),
  
  addMatch: (match) => set((state) => ({ matches: [match, ...state.matches] })),

  loadInitialData: async () => {
    set({ isLoading: true });
    try {
      const [settings, matches, monitoredChats] = await Promise.all([
        apiService.getSettings(),
        apiService.getMatches(),
        apiService.getMonitoredChats()
      ]);
      set({ settings, matches, monitoredChats });
    } catch (error) {
      console.error('Failed to load initial configuration data:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  saveSettings: async (newSettings) => {
    try {
      const updated = await apiService.updateSettings(newSettings);
      set({ settings: updated });
      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  },

  saveMonitoredChats: async (chats) => {
    try {
      const updated = await apiService.updateMonitoredChats(chats);
      set({ monitoredChats: updated });
      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  },

  deleteMatch: async (id) => {
    try {
      await apiService.deleteMatch(id);
      set((state) => ({ matches: state.matches.filter(m => m.id !== id) }));
    } catch (err) {
      console.error(err);
    }
  },

  clearAllMatches: async () => {
    try {
      await apiService.clearMatches();
      set({ matches: [] });
    } catch (err) {
      console.error(err);
    }
  }
}));
