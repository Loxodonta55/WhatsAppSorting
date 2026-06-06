import { useState, useEffect } from 'react';
import io from 'socket.io-client';
import { Navbar } from './components/Navbar';
import { HistoryFeed } from './components/HistoryFeed';
import { FilterSettings } from './components/FilterSettings';
import { MonitoredChats } from './components/MonitoredChats';
import { WhatsAppConnect } from './components/WhatsAppConnect';
import { Sparkles } from 'lucide-react';

interface SettingsData {
  geminiApiKey: string;
  criteria: string;
  notificationPhone: string;
  filterEnabled: boolean;
}

interface WhatsAppStatus {
  status: 'DISCONNECTED' | 'CONNECTING' | 'QR_READY' | 'CONNECTED';
  qr: string;
  user: { name?: string; number?: string } | null;
  error?: string;
}

interface MonitoredChat {
  id: string;
  name: string;
}

interface MatchedItem {
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

// Socket connection initialization
const SOCKET_URL = window.location.hostname === 'localhost' ? 'http://localhost:3001' : '';
const socket = io(SOCKET_URL);

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // App Global State
  const [whatsappStatus, setWhatsappStatus] = useState<WhatsAppStatus>({
    status: 'DISCONNECTED',
    qr: '',
    user: null,
  });
  
  const [settings, setSettings] = useState<SettingsData>({
    geminiApiKey: '',
    criteria: '',
    notificationPhone: 'self',
    filterEnabled: true,
  });

  const [monitoredChats, setMonitoredChats] = useState<MonitoredChat[]>([]);
  const [matches, setMatches] = useState<MatchedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load initial data
  const loadInitialData = async () => {
    setIsLoading(true);
    try {
      // Fetch settings
      const settingsRes = await fetch('/api/settings');
      if (settingsRes.ok) {
        const data = await settingsRes.json();
        setSettings(data);
      }

      // Fetch matches
      const matchesRes = await fetch('/api/matches');
      if (matchesRes.ok) {
        const data = await matchesRes.json();
        setMatches(data);
      }

      // Fetch monitored chats
      const monitoredRes = await fetch('/api/monitored-chats');
      if (monitoredRes.ok) {
        const data = await monitoredRes.json();
        setMonitoredChats(data);
      }
    } catch (error) {
      console.error('Failed to load initial configuration data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();

    // Listen to real-time events
    socket.on('whatsapp_status', (status: WhatsAppStatus) => {
      setWhatsappStatus(status);
    });

    socket.on('new_match', (newItem: MatchedItem) => {
      setMatches(prev => [newItem, ...prev]);
      
      // Play a subtle notification sound if new match comes in
      try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        osc.connect(gain);
        gain.connect(audioContext.destination);
        osc.frequency.setValueAtTime(880, audioContext.currentTime); // High pitch notification chime
        osc.frequency.exponentialRampToValueAtTime(1200, audioContext.currentTime + 0.15);
        gain.gain.setValueAtTime(0.08, audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.25);
        osc.start();
        osc.stop(audioContext.currentTime + 0.3);
      } catch (err) {
        console.warn('Audio notification blocked or failed:', err);
      }
    });

    return () => {
      socket.off('whatsapp_status');
      socket.off('new_match');
    };
  }, []);

  // API Mutators
  const handleSaveSettings = async (newSettings: SettingsData) => {
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings),
      });
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
        return true;
      }
    } catch (err) {
      console.error(err);
    }
    return false;
  };

  const handleSaveMonitoredChats = async (chats: MonitoredChat[]) => {
    try {
      const res = await fetch('/api/monitored-chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chats }),
      });
      if (res.ok) {
        const data = await res.json();
        setMonitoredChats(data);
        return true;
      }
    } catch (err) {
      console.error(err);
    }
    return false;
  };

  const handleDeleteMatch = async (id: string) => {
    try {
      const res = await fetch(`/api/matches/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setMatches(prev => prev.filter(item => item.id !== id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleClearAllMatches = async () => {
    if (!window.confirm('Möchtest du wirklich den gesamten Verlauf löschen?')) return;
    try {
      const res = await fetch('/api/matches', {
        method: 'DELETE',
      });
      if (res.ok) {
        setMatches([]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="app-container">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        whatsappStatus={whatsappStatus}
        filterEnabled={settings.filterEnabled}
      />

      <main className="main-content">
        {isLoading ? (
          <div className="global-loader">
            <Sparkles className="animate-pulse text-emerald" size={48} />
            <p>Konfiguration wird geladen...</p>
          </div>
        ) : (
          <>
            {activeTab === 'dashboard' && (
              <HistoryFeed
                matches={matches}
                onDeleteMatch={handleDeleteMatch}
                onClearAllMatches={handleClearAllMatches}
              />
            )}
            {activeTab === 'settings' && (
              <FilterSettings
                settings={settings}
                onSaveSettings={handleSaveSettings}
              />
            )}
            {activeTab === 'chats' && (
              <MonitoredChats
                whatsappStatus={whatsappStatus}
                monitoredChats={monitoredChats}
                onSaveMonitoredChats={handleSaveMonitoredChats}
              />
            )}
            {activeTab === 'connect' && (
              <WhatsAppConnect
                whatsappStatus={whatsappStatus}
              />
            )}
          </>
        )}
      </main>

      <footer className="app-footer">
        <div className="footer-content">
          <p>© 2026 KinderSachen WhatsApp Pre-Selector • Entwickelt für Mütter & Väter</p>
        </div>
      </footer>

      <style>{`
        .global-loader {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 1.5rem;
          min-height: 50vh;
        }
        .text-emerald {
          color: var(--primary);
        }
        .animate-pulse {
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: .5; }
        }
        
        .app-footer {
          margin-top: auto;
          border-top: 1px solid var(--border-color);
          background-color: var(--bg-card);
          padding: 1.5rem;
          text-align: center;
          font-size: 0.85rem;
          color: var(--text-muted);
        }
      `}</style>
    </div>
  );
}

export default App;
