import React, { useState } from 'react';
import { Trash2, Send, Calendar, User, MessageSquare, Lightbulb, ExternalLink, Image as ImageIcon, Check, Loader2 } from 'lucide-react';

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

interface HistoryFeedProps {
  matches: MatchedItem[];
  onDeleteMatch: (id: string) => Promise<void>;
  onClearAllMatches: () => Promise<void>;
}

export const HistoryFeed: React.FC<HistoryFeedProps> = ({
  matches,
  onDeleteMatch,
  onClearAllMatches,
}) => {
  const [forwardingIds, setForwardingIds] = useState<string[]>([]);
  const [forwardedSuccessIds, setForwardedSuccessIds] = useState<string[]>([]);
  const [expandedImage, setExpandedImage] = useState<string | null>(null);

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleForward = async (id: string) => {
    setForwardingIds(prev => [...prev, id]);
    try {
      const res = await fetch(`/api/matches/${id}/forward`, {
        method: 'POST',
      });
      if (res.ok) {
        setForwardedSuccessIds(prev => [...prev, id]);
        setTimeout(() => {
          setForwardedSuccessIds(prev => prev.filter(x => x !== id));
        }, 3000);
      } else {
        alert('Fehler beim Weiterleiten.');
      }
    } catch (err) {
      console.error(err);
      alert('Fehler bei der Kommunikation mit dem Server.');
    } finally {
      setForwardingIds(prev => prev.filter(x => x !== id));
    }
  };

  return (
    <div className="history-container">
      <div className="feed-header">
        <div>
          <h2 className="section-title font-bold">Gefundene Angebote</h2>
          <p className="section-desc">
            Hier sind alle Angebote aufgelistet, die den Kriterien entsprechen. Neue Treffer erscheinen in Echtzeit.
          </p>
        </div>
        {matches.length > 0 && (
          <button onClick={onClearAllMatches} className="btn btn-danger btn-clear-all">
            <Trash2 size={16} />
            Verlauf leeren
          </button>
        )}
      </div>

      {matches.length === 0 ? (
        <div className="feed-empty-state">
          <div className="empty-icon-box">
            <MessageSquare size={36} className="text-muted" />
          </div>
          <h3>Keine Treffer vorhanden</h3>
          <p>
            Bisher wurden noch keine passenden Angebote in den überwachten WhatsApp-Gruppen gefunden.
            Stelle sicher, dass der Filter aktiv ist und deine Gruppen ausgewählt sind.
          </p>
        </div>
      ) : (
        <div className="matches-list">
          {matches.map((match) => (
            <article key={match.id} className="match-card card">
              <div className="match-card-content">
                {/* Visual Image container if available */}
                {match.imagePath && (
                  <div
                    className="match-image-preview"
                    onClick={() => setExpandedImage(match.imagePath || null)}
                  >
                    <img src={match.imagePath} alt={match.extractedDetails.item || 'Angebot'} />
                    <div className="zoom-overlay">
                      <ImageIcon size={20} />
                      <span>Vergrößern</span>
                    </div>
                  </div>
                )}

                <div className="match-details-container">
                  {/* Meta header */}
                  <div className="match-meta">
                    <span className="group-badge badge badge-info">
                      <MessageSquare size={12} />
                      {match.groupName}
                    </span>
                    <span className="sender-badge">
                      <User size={12} />
                      {match.senderName} (+{match.senderNumber})
                    </span>
                    <span className="time-badge">
                      <Calendar size={12} />
                      {formatTime(match.timestamp)}
                    </span>
                  </div>

                  {/* Message body */}
                  <div className="match-text">
                    <p className="original-message-text">
                      {match.text || <em className="no-text-label">[Kein Text in der Nachricht]</em>}
                    </p>
                  </div>

                  {/* Structured properties */}
                  <div className="extracted-tags-list">
                    {match.extractedDetails.item && (
                      <span className="detail-tag tag-item">
                        <strong>Gegenstand:</strong> {match.extractedDetails.item}
                      </span>
                    )}
                    {match.extractedDetails.size && (
                      <span className="detail-tag tag-size">
                        <strong>Größe:</strong> {match.extractedDetails.size}
                      </span>
                    )}
                    {match.extractedDetails.price && (
                      <span className="detail-tag tag-price">
                        <strong>Preis:</strong> {match.extractedDetails.price}
                      </span>
                    )}
                    {match.extractedDetails.location && (
                      <span className="detail-tag tag-location">
                        <strong>Ort/Versand:</strong> {match.extractedDetails.location}
                      </span>
                    )}
                    {match.extractedDetails.condition && (
                      <span className="detail-tag tag-condition">
                        <strong>Zustand:</strong> {match.extractedDetails.condition}
                      </span>
                    )}
                  </div>

                  {/* AI Explanation reasoning */}
                  <div className="reasoning-box">
                    <Lightbulb size={16} className="reasoning-icon" />
                    <div className="reasoning-text">
                      <strong>KI-Begründung:</strong>
                      <p>{match.reason}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Footer */}
              <div className="match-card-actions">
                <button
                  onClick={() => handleForward(match.id)}
                  disabled={forwardingIds.includes(match.id)}
                  className={`btn btn-secondary action-btn-forward ${
                    forwardedSuccessIds.includes(match.id) ? 'btn-success-green' : ''
                  }`}
                >
                  {forwardingIds.includes(match.id) ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : forwardedSuccessIds.includes(match.id) ? (
                    <Check size={16} />
                  ) : (
                    <Send size={16} />
                  )}
                  {forwardedSuccessIds.includes(match.id) ? 'Weitergeleitet!' : 'Erneut weiterleiten'}
                </button>
                <button
                  onClick={() => onDeleteMatch(match.id)}
                  className="btn btn-danger action-btn-delete"
                >
                  <Trash2 size={16} />
                  Entfernen
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Expanded Image Modal overlay */}
      {expandedImage && (
        <div className="modal-overlay" onClick={() => setExpandedImage(null)}>
          <div className="modal-image-container" onClick={(e) => e.stopPropagation()}>
            <img src={expandedImage} alt="Expanded Item" />
            <button className="modal-close-btn" onClick={() => setExpandedImage(null)}>
              <XCircleClose size={24} />
            </button>
          </div>
        </div>
      )}

      <style>{`
        .history-container {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }
        .feed-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 1rem;
          flex-wrap: wrap;
        }
        .btn-clear-all {
          padding: 0.5rem 1rem;
          font-size: 0.85rem;
        }
        .feed-empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding: 4rem 2rem;
          background: rgba(255, 255, 255, 0.01);
          border: 1px dashed var(--border-color);
          border-radius: var(--radius-lg);
        }
        .empty-icon-box {
          width: 4.5rem;
          height: 4.5rem;
          background-color: var(--bg-input);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 1.25rem;
        }
        .feed-empty-state h3 {
          margin-bottom: 0.5rem;
        }
        .feed-empty-state p {
          max-width: 500px;
          font-size: 0.95rem;
        }

        .matches-list {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }
        
        .match-card {
          padding: 1.25rem;
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
          animation: slideUp 0.3s ease-out;
        }
        
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(15px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .match-card-content {
          display: grid;
          grid-template-columns: 1fr;
          gap: 1.25rem;
        }
        @media (min-width: 640px) {
          .match-card-content {
            grid-template-columns: auto 1fr;
          }
        }
        
        .match-image-preview {
          position: relative;
          width: 100%;
          max-width: 180px;
          height: 180px;
          border-radius: var(--radius-md);
          overflow: hidden;
          border: 1px solid var(--border-color);
          cursor: pointer;
          align-self: flex-start;
        }
        .match-image-preview img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.3s;
        }
        .match-image-preview:hover img {
          transform: scale(1.05);
        }
        .zoom-overlay {
          position: absolute;
          inset: 0;
          background: rgba(0, 0, 0, 0.4);
          opacity: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 0.25rem;
          color: #ffffff;
          font-size: 0.75rem;
          font-weight: 600;
          transition: opacity 0.2s;
        }
        .match-image-preview:hover .zoom-overlay {
          opacity: 1;
        }

        .match-details-container {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          overflow: hidden;
        }
        .match-meta {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          flex-wrap: wrap;
          font-size: 0.8rem;
          color: var(--text-muted);
        }
        .match-meta span {
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }
        .group-badge {
          padding: 0.25rem 0.5rem;
          font-size: 0.75rem;
        }
        
        .match-text {
          background-color: rgba(255, 255, 255, 0.015);
          border-left: 3px solid var(--border-color);
          padding: 0.5rem 0.75rem;
          border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
        }
        .original-message-text {
          font-size: 0.95rem;
          color: var(--text-sub);
          white-space: pre-wrap;
          word-break: break-word;
        }
        .no-text-label {
          font-style: italic;
          color: var(--text-muted);
        }

        .extracted-tags-list {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }
        .detail-tag {
          font-size: 0.8rem;
          padding: 0.25rem 0.5rem;
          border-radius: var(--radius-sm);
          background-color: var(--bg-input);
          border: 1px solid var(--border-color);
          color: var(--text-main);
        }
        .detail-tag strong {
          color: var(--text-muted);
          margin-right: 0.15rem;
        }
        .tag-price {
          border-color: rgba(52, 211, 153, 0.2);
          background-color: rgba(52, 211, 153, 0.03);
          color: var(--text-success);
        }
        .tag-size {
          border-color: rgba(99, 102, 241, 0.2);
          background-color: rgba(99, 102, 241, 0.03);
          color: var(--text-info);
        }

        .reasoning-box {
          background: rgba(16, 185, 129, 0.04);
          border: 1px solid rgba(16, 185, 129, 0.1);
          border-radius: var(--radius-md);
          padding: 0.75rem;
          display: flex;
          gap: 0.5rem;
          align-items: flex-start;
        }
        .reasoning-icon {
          color: var(--primary);
          flex-shrink: 0;
          margin-top: 0.15rem;
        }
        .reasoning-text strong {
          display: block;
          font-size: 0.8rem;
          color: var(--text-success);
          margin-bottom: 0.15rem;
        }
        .reasoning-text p {
          color: var(--text-sub);
          font-size: 0.85rem;
          line-height: 1.4;
        }

        .match-card-actions {
          display: flex;
          justify-content: flex-end;
          gap: 0.75rem;
          border-top: 1px solid var(--border-color);
          padding-top: 0.75rem;
        }
        .action-btn-forward {
          padding: 0.45rem 0.9rem;
          font-size: 0.85rem;
        }
        .action-btn-delete {
          padding: 0.45rem 0.9rem;
          font-size: 0.85rem;
        }
        .btn-success-green {
          background-color: var(--primary);
          color: #ffffff;
          border-color: var(--primary);
        }
        .btn-success-green:hover {
          background-color: var(--primary-hover);
        }

        /* Modal Overlay CSS */
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.8);
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1.5rem;
          animation: fadeIn 0.2s ease-out;
        }
        .modal-image-container {
          position: relative;
          max-width: 90%;
          max-height: 90%;
        }
        .modal-image-container img {
          max-width: 100%;
          max-height: 80vh;
          border-radius: var(--radius-md);
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);
        }
        .modal-close-btn {
          position: absolute;
          top: -2.5rem;
          right: 0;
          background: transparent;
          border: none;
          color: #ffffff;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0.8;
          transition: opacity 0.2s;
        }
        .modal-close-btn:hover {
          opacity: 1;
        }
      `}</style>
    </div>
  );
};

// SVG component helper for closing the modal
const XCircleClose: React.FC<{ size?: number }> = ({ size = 24 }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="10" />
    <path d="m15 9-6 6" />
    <path d="m9 9 6 6" />
  </svg>
);
