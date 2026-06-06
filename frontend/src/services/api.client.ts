import { SettingsData, MonitoredChat, MatchedItem } from '../types';

const handleResponse = async (res: Response) => {
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error?.message || errorData.error || 'API Request failed');
  }
  return res.json();
};

export const apiService = {
  getSettings: (): Promise<SettingsData> => 
    fetch('/api/settings').then(handleResponse),
  
  updateSettings: (settings: SettingsData): Promise<SettingsData> => 
    fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    }).then(handleResponse),

  getMonitoredChats: (): Promise<MonitoredChat[]> => 
    fetch('/api/monitored-chats').then(handleResponse),

  updateMonitoredChats: (chats: MonitoredChat[]): Promise<MonitoredChat[]> => 
    fetch('/api/monitored-chats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chats }),
    }).then(handleResponse),

  getMatches: (): Promise<MatchedItem[]> => 
    fetch('/api/matches').then(handleResponse),

  deleteMatch: (id: string): Promise<{ success: boolean }> => 
    fetch(`/api/matches/${id}`, { method: 'DELETE' }).then(handleResponse),

  clearMatches: (): Promise<{ success: boolean }> => 
    fetch('/api/matches', { method: 'DELETE' }).then(handleResponse),

  forwardMatch: (id: string): Promise<{ success: boolean }> => 
    fetch(`/api/matches/${id}/forward`, { method: 'POST' }).then(handleResponse),
};
