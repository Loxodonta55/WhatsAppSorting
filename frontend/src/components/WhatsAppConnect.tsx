import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { CheckCircle2, ShieldAlert, Smartphone, Loader2 } from 'lucide-react';
import { useStore } from '../store/useStore';

export const WhatsAppConnect: React.FC = () => {
  const whatsappStatus = useStore((state) => state.whatsappStatus);

  return (
    <div className="connect-wrapper">
      <div className="card card-glowing">
        <h2 className="section-title">WhatsApp Verbindung</h2>
        <p className="section-desc">
          Die Applikation liest Gruppenchats über eine automatisierte Instanz von WhatsApp Web.
          Verbinde dein Smartphone einmalig über das Scannen des QR-Codes.
        </p>

        {whatsappStatus.status === 'CONNECTED' && (
          <div className="connection-state state-connected">
            <div className="state-icon">
              <CheckCircle2 size={48} className="text-success" />
            </div>
            <div className="state-details">
              <h3>Erfolgreich Verbunden</h3>
              <p>Die App filtert nun aktiv deine WhatsApp Gruppen im Hintergrund.</p>
              
              <div className="user-profile-info">
                <div className="info-row">
                  <span className="label">Konto Name:</span>
                  <span className="value">{whatsappStatus.user?.name || 'Unbekannt'}</span>
                </div>
                <div className="info-row">
                  <span className="label">Telefonnummer:</span>
                  <span className="value">+{whatsappStatus.user?.number || 'Unbekannt'}</span>
                </div>
                <div className="info-row">
                  <span className="label">Status:</span>
                  <span className="value badge badge-success">Online & Überwacht</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {whatsappStatus.status === 'CONNECTING' && (
          <div className="connection-state state-loading">
            <Loader2 size={48} className="animate-spin text-indigo" />
            <h3>Initialisiere WhatsApp Web...</h3>
            <p>Ein headless Browser wird gestartet. Das kann beim ersten Mal bis zu einer Minute dauern.</p>
          </div>
        )}

        {whatsappStatus.status === 'QR_READY' && (
          <div className="connection-state state-qr">
            <div className="qr-container-layout">
              <div className="qr-box">
                {whatsappStatus.qr ? (
                  <QRCodeSVG
                    value={whatsappStatus.qr}
                    size={256}
                    bgColor="#111726"
                    fgColor="#ffffff"
                    level="M"
                    includeMargin={true}
                  />
                ) : (
                  <div className="qr-placeholder">QR Code wird geladen...</div>
                )}
              </div>
              
              <div className="qr-instructions">
                <h3>Gerät verknüpfen</h3>
                <ol className="steps-list">
                  <li>
                    <span className="step-num">1</span>
                    Öffne <strong>WhatsApp</strong> auf deinem Smartphone.
                  </li>
                  <li>
                    <span className="step-num">2</span>
                    Tippe auf das <strong>Menü (⋮)</strong> oder <strong>Einstellungen (⚙️)</strong>.
                  </li>
                  <li>
                    <span className="step-num">3</span>
                    Wähle <strong>Verknüpfte Geräte</strong> aus.
                  </li>
                  <li>
                    <span className="step-num">4</span>
                    Tippe auf <strong>Gerät verknüpfen</strong> und scanne diesen QR-Code.
                  </li>
                </ol>
                <div className="safety-note">
                  <Smartphone size={16} />
                  <span>Stelle sicher, dass dein Smartphone mit dem Internet verbunden ist.</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {whatsappStatus.status === 'DISCONNECTED' && (
          <div className="connection-state state-disconnected">
            <ShieldAlert size={48} className="text-danger" />
            <h3>Keine Verbindung</h3>
            <p>Der WhatsApp-Client läuft derzeit nicht oder die Sitzung wurde beendet.</p>
            {whatsappStatus.error && (
              <div className="error-box">
                <strong>Fehlerdetails:</strong> {whatsappStatus.error}
              </div>
            )}
            <p className="instruction-tip">
              Der Server versucht im Hintergrund automatisch eine neue Instanz zu starten.
              Wenn das Problem bestehen bleibt, starte die Server-Applikation im Terminal neu.
            </p>
          </div>
        )}
      </div>

      <style>{`
        .connect-wrapper {
          max-width: 800px;
          margin: 0 auto;
        }
        .section-title {
          font-size: 1.75rem;
          margin-bottom: 0.5rem;
        }
        .section-desc {
          margin-bottom: 2rem;
          font-size: 0.95rem;
        }
        .connection-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding: 2rem;
          border-radius: var(--radius-md);
          background-color: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--border-color);
        }
        
        .state-connected {
          flex-direction: row;
          align-items: flex-start;
          text-align: left;
          gap: 2rem;
          background-color: rgba(16, 185, 129, 0.03);
          border-color: rgba(16, 185, 129, 0.1);
        }
        .state-connected h3 {
          margin-bottom: 0.5rem;
          color: var(--text-success);
        }
        .user-profile-info {
          margin-top: 1.5rem;
          background: rgba(0, 0, 0, 0.2);
          border-radius: var(--radius-sm);
          padding: 1rem;
          width: 100%;
          max-width: 400px;
          border: 1px solid var(--border-color);
        }
        .info-row {
          display: flex;
          justify-content: space-between;
          padding: 0.5rem 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }
        .info-row:last-child {
          border-bottom: none;
          padding-bottom: 0;
        }
        .info-row .label {
          color: var(--text-muted);
          font-weight: 500;
        }
        .info-row .value {
          color: var(--text-main);
          font-weight: 600;
        }

        .state-loading {
          gap: 1rem;
        }
        .state-loading h3 {
          margin-top: 1rem;
        }
        .text-indigo {
          color: var(--secondary);
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }

        .state-qr {
          text-align: left;
          padding: 1.5rem;
        }
        .qr-container-layout {
          display: grid;
          grid-template-columns: 1fr;
          gap: 2rem;
          width: 100%;
          align-items: center;
        }
        @media (min-width: 640px) {
          .qr-container-layout {
            grid-template-columns: auto 1fr;
          }
        }
        .qr-box {
          background-color: #111726;
          border: 1px solid var(--border-color);
          padding: 1rem;
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: var(--shadow-md);
        }
        .qr-placeholder {
          width: 256px;
          height: 256px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-muted);
        }
        .qr-instructions h3 {
          font-size: 1.25rem;
          margin-bottom: 1rem;
        }
        .steps-list {
          list-style: none;
          margin-bottom: 1.5rem;
        }
        .steps-list li {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          margin-bottom: 0.75rem;
          font-size: 0.95rem;
          color: var(--text-sub);
        }
        .step-num {
          background-color: var(--bg-input);
          color: var(--primary);
          border: 1px solid rgba(16, 185, 129, 0.3);
          font-size: 0.8rem;
          font-weight: 700;
          width: 1.5rem;
          height: 1.5rem;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          margin-top: 0.1rem;
        }
        .safety-note {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.85rem;
          color: var(--text-muted);
          background: rgba(255, 255, 255, 0.02);
          padding: 0.75rem;
          border-radius: var(--radius-sm);
          border: 1px solid var(--border-color);
        }

        .state-disconnected h3 {
          margin-top: 1rem;
          color: var(--text-danger);
        }
        .error-box {
          margin: 1rem 0;
          padding: 0.75rem 1rem;
          background: rgba(248, 113, 113, 0.1);
          border: 1px solid rgba(248, 113, 113, 0.2);
          border-radius: var(--radius-sm);
          color: var(--text-danger);
          font-family: monospace;
          font-size: 0.85rem;
          text-align: left;
          max-width: 500px;
          word-break: break-all;
        }
        .instruction-tip {
          font-size: 0.85rem;
          color: var(--text-muted);
          margin-top: 1rem;
          max-width: 450px;
        }
      `}</style>
    </div>
  );
};
