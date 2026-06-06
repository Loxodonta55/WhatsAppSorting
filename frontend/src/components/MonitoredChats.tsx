import React, { useState, useEffect } from 'react';
import { Search, RefreshCw, CheckCircle, ShieldAlert, Loader2, Save } from 'lucide-react';
import { useStore } from '../store/useStore';
import { MonitoredChat } from '../types';

interface GroupChat {
  id: string;
  name: string;
  unreadCount?: number;
}

export const MonitoredChats: React.FC = () => {
  const { whatsappStatus, monitoredChats, saveMonitoredChats } = useStore();
  const [allGroups, setAllGroups] = useState<GroupChat[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChatIds, setSelectedChatIds] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState('');

  // Fetch groups from WhatsApp
  const fetchGroups = async () => {
    if (whatsappStatus.status !== 'CONNECTED') return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/chats');
      if (res.ok) {
        const data = await res.json();
        // Sort groups alphabetically by name
        const sorted = data.sort((a: GroupChat, b: GroupChat) => a.name.localeCompare(b.name));
        setAllGroups(sorted);
      } else {
        setError('Fehler beim Laden der Gruppen von WhatsApp.');
      }
    } catch (err) {
      setError(`Verbindungsfehler: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, [whatsappStatus.status]);

  useEffect(() => {
    setSelectedChatIds(monitoredChats.map(c => c.id));
  }, [monitoredChats]);

  const handleToggleChat = (chatId: string) => {
    setSelectedChatIds(prev =>
      prev.includes(chatId) ? prev.filter(id => id !== chatId) : [...prev, chatId]
    );
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    setError('');
    
    // Construct list of MonitoredChat objects
    const chatsToSave: MonitoredChat[] = selectedChatIds.map(id => {
      // Find name in allGroups or fallback to name in monitoredChats or default
      const groupInList = allGroups.find(g => g.id === id);
      const groupInMonitored = monitoredChats.find(c => c.id === id);
      return {
        id,
        name: groupInList?.name || groupInMonitored?.name || `Gruppe (${id.split('@')[0]})`,
      };
    });

    try {
      const success = await saveMonitoredChats(chatsToSave);
      if (success) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        setError('Fehler beim Speichern der Gruppenauswahl.');
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  // Filter groups by search query
  const filteredGroups = allGroups.filter(g =>
    g.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Separate currently selected from unselected for better user UX
  const selectedGroups = filteredGroups.filter(g => selectedChatIds.includes(g.id));
  const unselectedGroups = filteredGroups.filter(g => !selectedChatIds.includes(g.id));

  return (
    <div className="card">
      <div className="groups-header-layout">
        <div>
          <h2 className="section-title">Gruppen-Auswahl</h2>
          <p className="section-desc">
            Wähle aus, welche WhatsApp-Gruppen von der KI gefiltert werden sollen.
          </p>
        </div>
        {whatsappStatus.status === 'CONNECTED' && (
          <button
            onClick={fetchGroups}
            disabled={loading}
            className="btn btn-secondary btn-refresh"
          >
            {loading ? <Loader2 className="animate-spin" size={16} /> : <RefreshCw size={16} />}
            Aktualisieren
          </button>
        )}
      </div>

      {whatsappStatus.status !== 'CONNECTED' ? (
        <div className="groups-empty state-locked">
          <ShieldAlert size={48} className="text-warning" />
          <h3>WhatsApp nicht verbunden</h3>
          <p>
            Bitte verbinde die Applikation zuerst unter dem Reiter <strong>Verbindung</strong> mit
            deinem WhatsApp-Konto, um Gruppenchats auslesen zu können.
          </p>
        </div>
      ) : (
        <div className="groups-content-layout">
          {/* Search bar */}
          <div className="search-wrapper">
            <Search className="search-icon" size={18} />
            <input
              type="text"
              placeholder="Gruppe suchen..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field search-input"
            />
          </div>

          {error && <div className="toast toast-danger error-alert">{error}</div>}

          {loading ? (
            <div className="groups-loading">
              <Loader2 className="animate-spin text-emerald" size={32} />
              <p>Lade WhatsApp Gruppen...</p>
            </div>
          ) : allGroups.length === 0 ? (
            <div className="groups-empty">
              <h3>Keine Gruppen gefunden</h3>
              <p>
                Dein WhatsApp-Konto scheint in keinen Gruppen zu sein, oder die Chats wurden noch
                nicht synchronisiert.
              </p>
            </div>
          ) : (
            <div className="groups-lists-container">
              {/* Monitored Groups list */}
              {selectedGroups.length > 0 && (
                <div className="groups-section">
                  <h4 className="section-subtitle">Überwachte Gruppen ({selectedGroups.length})</h4>
                  <div className="groups-grid">
                    {selectedGroups.map(group => (
                      <div
                        key={group.id}
                        onClick={() => handleToggleChat(group.id)}
                        className="group-card active"
                      >
                        <div className="group-status-dot"></div>
                        <span className="group-name">{group.name}</span>
                        <div className="checkmark">
                          <CheckCircle size={16} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Other Groups list */}
              <div className="groups-section">
                <h4 className="section-subtitle">
                  {selectedGroups.length > 0 ? 'Weitere Gruppen' : 'Alle Gruppen'} ({unselectedGroups.length})
                </h4>
                {unselectedGroups.length === 0 ? (
                  <p className="no-more-groups">Keine weiteren Gruppen vorhanden.</p>
                ) : (
                  <div className="groups-grid">
                    {unselectedGroups.map(group => (
                      <div
                        key={group.id}
                        onClick={() => handleToggleChat(group.id)}
                        className="group-card"
                      >
                        <span className="group-name">{group.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Sticky footer for saving */}
          <div className="groups-footer">
            <div className="save-status-info">
              <span>{selectedChatIds.length} von {allGroups.length} Gruppen ausgewählt</span>
            </div>
            <div className="save-actions">
              {saveSuccess && (
                <span className="toast toast-success">
                  Auswahl gespeichert!
                </span>
              )}
              <button
                onClick={handleSave}
                disabled={isSaving || loading}
                className="btn btn-primary"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="animate-spin" size={16} />
                    Speichere...
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    Auswahl speichern
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .groups-header-layout {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 1rem;
          margin-bottom: 1.5rem;
          flex-wrap: wrap;
        }
        .btn-refresh {
          padding: 0.5rem 0.9rem;
          font-size: 0.85rem;
        }
        .groups-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding: 3rem 1.5rem;
          background-color: rgba(255, 255, 255, 0.01);
          border: 1px dashed var(--border-color);
          border-radius: var(--radius-md);
        }
        .state-locked {
          background-color: rgba(251, 191, 36, 0.02);
          border-color: rgba(251, 191, 36, 0.1);
        }
        .groups-empty h3 {
          margin-top: 1rem;
          margin-bottom: 0.5rem;
        }
        
        .groups-content-layout {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }
        .search-wrapper {
          position: relative;
          width: 100%;
        }
        .search-icon {
          position: absolute;
          left: 1rem;
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-muted);
          pointer-events: none;
        }
        .search-input {
          padding-left: 2.75rem;
        }
        
        .error-alert {
          width: 100%;
        }
        .groups-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
          padding: 3rem;
          color: var(--text-muted);
        }
        .text-emerald {
          color: var(--primary);
        }
        
        .groups-lists-container {
          display: flex;
          flex-direction: column;
          gap: 1.75rem;
          max-height: 450px;
          overflow-y: auto;
          padding-right: 0.5rem;
          border-bottom: 1px solid var(--border-color);
          padding-bottom: 1.5rem;
        }
        .groups-section {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        .section-subtitle {
          font-size: 0.85rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--text-muted);
        }
        .groups-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 0.75rem;
        }
        @media (min-width: 640px) {
          .groups-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        @media (min-width: 900px) {
          .groups-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }
        .group-card {
          background-color: var(--bg-input);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          padding: 1rem;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.75rem;
          user-select: none;
        }
        .group-card:hover {
          border-color: var(--border-color-hover);
          background-color: var(--bg-card-hover);
          transform: translateY(-1px);
        }
        .group-card.active {
          border-color: rgba(16, 185, 129, 0.4);
          background-color: rgba(16, 185, 129, 0.04);
        }
        .group-card.active:hover {
          border-color: var(--primary);
          background-color: rgba(16, 185, 129, 0.08);
        }
        .group-name {
          font-size: 0.9rem;
          font-weight: 600;
          color: var(--text-main);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          flex: 1;
        }
        .group-status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background-color: var(--primary);
          box-shadow: 0 0 6px var(--primary);
          flex-shrink: 0;
        }
        .checkmark {
          color: var(--primary);
          display: flex;
          align-items: center;
          flex-shrink: 0;
        }
        .no-more-groups {
          font-size: 0.9rem;
          color: var(--text-muted);
          font-style: italic;
        }
        
        .groups-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 0.5rem;
          flex-wrap: wrap;
          gap: 1rem;
        }
        .save-status-info {
          font-size: 0.9rem;
          color: var(--text-muted);
          font-weight: 500;
        }
        .save-actions {
          display: flex;
          align-items: center;
          gap: 1rem;
        }
      `}</style>
    </div>
  );
};
