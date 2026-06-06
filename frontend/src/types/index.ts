export interface SettingsData {
  geminiApiKey: string;
  criteria: string;
  notificationPhone: string;
  filterEnabled: boolean;
  isApiKeyConfigured?: boolean;
}

export interface WhatsAppStatus {
  status: 'DISCONNECTED' | 'CONNECTING' | 'QR_READY' | 'CONNECTED';
  qr: string;
  user: { name?: string; number?: string } | null;
  error?: string;
}

export interface MonitoredChat {
  id: string;
  name: string;
}

export interface MatchedItem {
  id: string;
  messageId: string;
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
  imagePath?: string;
}
