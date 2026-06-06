import React, { useState } from 'react';
import { Trash2, Send, Calendar, User, MessageSquare, Lightbulb, Image as ImageIcon, Check, Loader2 } from 'lucide-react';
import { MatchedItem } from '../types';
import { apiService } from '../services/api.client';

interface MatchCardProps {
  match: MatchedItem;
  onDeleteMatch: (id: string) => Promise<void>;
  setExpandedImage: (path: string | null) => void;
}

export const MatchCard: React.FC<MatchCardProps> = ({ match, onDeleteMatch, setExpandedImage }) => {
  const [isForwarding, setIsForwarding] = useState(false);
  const [forwardedSuccess, setForwardedSuccess] = useState(false);

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

  const handleForward = async () => {
    setIsForwarding(true);
    try {
      const res = await apiService.forwardMatch(match.id);
      if (res.success) {
        setForwardedSuccess(true);
        setTimeout(() => {
          setForwardedSuccess(false);
        }, 3000);
      } else {
        alert('Fehler beim Weiterleiten.');
      }
    } catch (err) {
      console.error(err);
      alert('Fehler bei der Kommunikation mit dem Server.');
    } finally {
      setIsForwarding(false);
    }
  };

  return (
    <article className="match-card card">
      <div className="match-card-content">
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

          <div className="match-text">
            <p className="original-message-text">
              {match.text || <em className="no-text-label">[Kein Text in der Nachricht]</em>}
            </p>
          </div>

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

          <div className="reasoning-box">
            <Lightbulb size={16} className="reasoning-icon" />
            <div className="reasoning-text">
              <strong>KI-Begründung:</strong>
              <p>{match.reason}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="match-card-actions">
        <button
          onClick={handleForward}
          disabled={isForwarding}
          className={`btn btn-secondary action-btn-forward ${
            forwardedSuccess ? 'btn-success-green' : ''
          }`}
        >
          {isForwarding ? (
            <Loader2 size={16} className="animate-spin" />
          ) : forwardedSuccess ? (
            <Check size={16} />
          ) : (
            <Send size={16} />
          )}
          {forwardedSuccess ? 'Weitergeleitet!' : 'Erneut weiterleiten'}
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
  );
};
