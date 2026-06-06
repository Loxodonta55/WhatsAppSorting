import React from 'react';
import { MessageSquare, Settings, Link, CheckSquare, Sparkles } from 'lucide-react';
import { useStore } from '../store/useStore';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
}) => {
  const { whatsappStatus, settings } = useStore();
  const filterEnabled = settings.filterEnabled;
  const isApiKeyConfigured = !!settings.isApiKeyConfigured;
  const getStatusBadge = () => {
    switch (whatsappStatus.status) {
      case 'CONNECTED':
        return (
          <span className="badge badge-success">
            <span className="pulse-indicator bg-success"></span>
            Verbunden ({whatsappStatus.user?.name || 'Mobil'})
          </span>
        );
      case 'CONNECTING':
        return (
          <span className="badge badge-warning">
            <span className="pulse-indicator bg-warning"></span>
            Verbinde...
          </span>
        );
      case 'QR_READY':
        return (
          <span className="badge badge-warning">
            <span className="pulse-indicator bg-warning"></span>
            QR bereit
          </span>
        );
      case 'DISCONNECTED':
      default:
        return (
          <span className="badge badge-danger">
            <span className="pulse-indicator bg-danger"></span>
            Getrennt
          </span>
        );
    }
  };

  return (
    <header className="navbar-header">
      <div className="navbar-container">
        <div className="navbar-logo">
          <div className="logo-icon">
            <Sparkles size={20} className="text-emerald" />
          </div>
          <div className="logo-text">
            <span>KinderSachen</span>
            <span className="subtitle">WhatsApp Pre-Selector</span>
          </div>
        </div>

        <nav className="navbar-menu">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
          >
            <MessageSquare size={18} />
            Treffer
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`}
          >
            <Settings size={18} />
            Kriterien
          </button>
          <button
            onClick={() => setActiveTab('chats')}
            className={`nav-item ${activeTab === 'chats' ? 'active' : ''}`}
          >
            <CheckSquare size={18} />
            Gruppen ({whatsappStatus.status === 'CONNECTED' ? 'Aktiv' : 'Getrennt'})
          </button>
          <button
            onClick={() => setActiveTab('connect')}
            className={`nav-item ${activeTab === 'connect' ? 'active' : ''}`}
          >
            <Link size={18} />
            Verbindung
          </button>
        </nav>

        <div className="navbar-status">
          {isApiKeyConfigured ? (
            <span className="badge badge-success">Gemini Aktiv</span>
          ) : (
            <span className="badge badge-danger">Gemini Key fehlt</span>
          )}
          {filterEnabled ? (
            <span className="badge badge-success">Filter Aktiv</span>
          ) : (
            <span className="badge badge-warning">Filter Pausiert</span>
          )}
          {getStatusBadge()}
        </div>
      </div>

      <style>{`
        .navbar-header {
          background-color: var(--bg-card);
          border-bottom: 1px solid var(--border-color);
          position: sticky;
          top: 0;
          z-index: 100;
          backdrop-filter: blur(8px);
        }
        .navbar-container {
          max-width: var(--container-max);
          margin: 0 auto;
          padding: 1rem 1.5rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 1rem;
        }
        .navbar-logo {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        .logo-icon {
          width: 2.25rem;
          height: 2.25rem;
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(99, 102, 241, 0.2));
          border: 1px solid rgba(16, 185, 129, 0.3);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .text-emerald {
          color: var(--primary);
        }
        .logo-text span {
          display: block;
          font-weight: 700;
          font-size: 1.1rem;
          line-height: 1.1;
        }
        .logo-text .subtitle {
          font-size: 0.75rem;
          font-weight: 500;
          color: var(--text-muted);
        }
        .navbar-menu {
          display: flex;
          gap: 0.5rem;
        }
        .nav-item {
          background: transparent;
          border: none;
          color: var(--text-muted);
          padding: 0.5rem 1rem;
          font-weight: 600;
          font-size: 0.95rem;
          border-radius: var(--radius-md);
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          transition: all 0.2s;
        }
        .nav-item:hover {
          color: var(--text-main);
          background-color: rgba(255, 255, 255, 0.03);
        }
        .nav-item.active {
          color: var(--primary);
          background-color: rgba(16, 185, 129, 0.1);
        }
        .navbar-status {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        .pulse-indicator {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          display: inline-block;
          margin-right: 2px;
          position: relative;
        }
        .pulse-indicator.bg-success {
          background-color: var(--text-success);
          box-shadow: 0 0 8px var(--text-success);
        }
        .pulse-indicator.bg-warning {
          background-color: var(--text-warning);
          box-shadow: 0 0 8px var(--text-warning);
        }
        .pulse-indicator.bg-danger {
          background-color: var(--text-danger);
          box-shadow: 0 0 8px var(--text-danger);
        }
        
        @media (max-width: 768px) {
          .navbar-container {
            flex-direction: column;
            align-items: stretch;
          }
          .navbar-menu {
            overflow-x: auto;
            padding-bottom: 0.5rem;
          }
          .navbar-status {
            justify-content: space-between;
          }
        }
      `}</style>
    </header>
  );
};
