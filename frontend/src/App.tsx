import { useState, useEffect } from 'react';
import io from 'socket.io-client';
import { Navbar } from './components/Navbar';
import { HistoryFeed } from './components/HistoryFeed';
import { FilterSettings } from './components/FilterSettings';
import { MonitoredChats } from './components/MonitoredChats';
import { WhatsAppConnect } from './components/WhatsAppConnect';
import { Sparkles } from 'lucide-react';
import { useStore } from './store/useStore';
import { WhatsAppStatus, MatchedItem } from './types';

// Socket connection initialization
const SOCKET_URL = window.location.hostname === 'localhost' ? 'http://localhost:3001' : '';
const socket = io(SOCKET_URL);

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  
  const { 
    isLoading, 
    loadInitialData, 
    setWhatsappStatus, 
    addMatch 
  } = useStore();

  useEffect(() => {
    loadInitialData();

    socket.on('whatsapp_status', (status: WhatsAppStatus) => {
      setWhatsappStatus(status);
    });

    socket.on('new_match', (newItem: MatchedItem) => {
      addMatch(newItem);
      
      try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        osc.connect(gain);
        gain.connect(audioContext.destination);
        osc.frequency.setValueAtTime(880, audioContext.currentTime);
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

  return (
    <div className="app-container">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      <main className="main-content">
        {isLoading ? (
          <div className="global-loader">
            <Sparkles className="animate-pulse text-emerald" size={48} />
            <p>Konfiguration wird geladen...</p>
          </div>
        ) : (
          <>
            {activeTab === 'dashboard' && <HistoryFeed />}
            {activeTab === 'settings' && <FilterSettings />}
            {activeTab === 'chats' && <MonitoredChats />}
            {activeTab === 'connect' && <WhatsAppConnect />}
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
