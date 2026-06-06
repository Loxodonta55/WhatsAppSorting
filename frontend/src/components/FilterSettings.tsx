import React, { useState, useEffect } from 'react';
import { Save, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { useStore } from '../store/useStore';
import { SettingsData } from '../types';
import { FilterPlayground } from './FilterPlayground';

export const FilterSettings: React.FC = () => {
  const { settings, saveSettings } = useStore();
  const [formData, setFormData] = useState<SettingsData>({ ...settings });
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    setFormData({ ...settings });
  }, [settings]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleToggle = () => {
    setFormData(prev => ({ ...prev, filterEnabled: !prev.filterEnabled }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);
    setErrorMessage('');
    
    try {
      const success = await saveSettings(formData);
      if (success) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        setErrorMessage('Fehler beim Speichern der Einstellungen.');
      }
    } catch (err) {
      setErrorMessage((err as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="grid-2">
      {/* Settings Panel */}
      <div className="card card-glowing">
        <h2 className="section-title">Filter Konfiguration</h2>
        <p className="section-desc">Passe die Suchkriterien an und konfiguriere die API-Schlüssel.</p>

        <form onSubmit={handleSubmit} className="settings-form">
          <div className="form-group toggle-group">
            <span className="form-label">Filter-Aktivierung</span>
            <div className="toggle-switch-layout">
              <button
                type="button"
                onClick={handleToggle}
                className={`toggle-switch ${formData.filterEnabled ? 'active' : ''}`}
              >
                <span className="toggle-handle"></span>
              </button>
              <span className="toggle-label">
                {formData.filterEnabled ? 'Filter aktiv – Nachrichten werden geprüft' : 'Filter pausiert – Inaktiv'}
              </span>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="criteria">
              Suchkriterien (Natürliche Sprache)
            </label>
            <textarea
              id="criteria"
              name="criteria"
              value={formData.criteria}
              onChange={handleChange}
              rows={5}
              placeholder="Beschreibe in deinen eigenen Worten, wonach gesucht werden soll. Z.B.: Kleidung für Jungs, Größe 74/80, keine Schuhe..."
              className="input-field textarea-field"
              required
            />
            <span className="field-hint">
              Je präziser die Beschreibung, desto treffsicherer ist der Filter. Du kannst Details wie Größe, Geschlecht, Marke, Ort oder Ausschlusskriterien erwähnen.
            </span>
          </div>

          <div className="form-group">
            <div className="label-with-status">
              <label className="form-label" htmlFor="geminiApiKey">
                Gemini API Key
              </label>
              {settings.isApiKeyConfigured ? (
                <span className="badge badge-success key-status-badge">Aktiv / Hinterlegt</span>
              ) : (
                <span className="badge badge-danger key-status-badge">Schlüssel fehlt</span>
              )}
            </div>
            <input
              id="geminiApiKey"
              name="geminiApiKey"
              type="password"
              value={formData.geminiApiKey}
              onChange={handleChange}
              placeholder={settings.geminiApiKey ? '••••••••••••••••••••••••••••' : 'Hier den API Key eintragen'}
              className="input-field"
            />
            <span className="field-hint">
              Benötigt für die KI-Klassifizierung. Ein kostenloser API-Schlüssel kann in der <a href="https://aistudio.google.com/" target="_blank" rel="noreferrer">Google AI Studio</a> erstellt werden.
            </span>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="notificationPhone">
              Weiterleitungs-Empfänger (WhatsApp, mit Semikolon trennbar)
            </label>
            <input
              id="notificationPhone"
              name="notificationPhone"
              value={formData.notificationPhone}
              onChange={handleChange}
              placeholder="Z.B. 'self' oder 'self; 491701234567; 491707654321'"
              className="input-field"
              required
            />
            <span className="field-hint">
              Gib <strong>'self'</strong> ein, um Treffer an deinen eigenen WhatsApp-Chat zu senden, oder gib eine oder mehrere Nummern mit Landesvorwahl (z. B. 491701234567) ein. Trenne mehrere Empfänger mit einem <strong>Semikolon (;)</strong>.
            </span>
          </div>

          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  Speichere...
                </>
              ) : (
                <>
                  <Save size={18} />
                  Einstellungen speichern
                </>
              )}
            </button>
            
            {saveSuccess && (
              <div className="toast toast-success">
                <CheckCircle2 size={16} />
                Erfolgreich gespeichert!
              </div>
            )}
            {errorMessage && (
              <div className="toast toast-danger">
                <AlertCircle size={16} />
                {errorMessage}
              </div>
            )}
          </div>
        </form>
      </div>

      <FilterPlayground />

      <style>{`
        .section-title {
          font-size: 1.5rem;
          margin-bottom: 0.5rem;
        }
        .section-desc {
          font-size: 0.9rem;
          margin-bottom: 1.5rem;
        }
        .label-with-status {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
        }
        .key-status-badge {
          font-size: 0.75rem;
          padding: 0.15rem 0.5rem;
        }
        .settings-form, .playground-form {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }
        .textarea-field {
          resize: vertical;
          font-family: inherit;
        }
        .field-hint {
          font-size: 0.8rem;
          color: var(--text-muted);
          line-height: 1.3;
        }
        .field-hint a {
          color: var(--primary);
          text-decoration: none;
        }
        .field-hint a:hover {
          text-decoration: underline;
        }
        .toggle-group {
          background: rgba(255, 255, 255, 0.02);
          padding: 1rem;
          border-radius: var(--radius-md);
          border: 1px solid var(--border-color);
        }
        .toggle-switch-layout {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-top: 0.25rem;
        }
        .toggle-switch {
          width: 3rem;
          height: 1.6rem;
          background: var(--bg-input);
          border: 1px solid var(--border-color);
          border-radius: 9999px;
          position: relative;
          cursor: pointer;
          transition: all 0.3s;
          padding: 0;
        }
        .toggle-switch.active {
          background: var(--primary);
          border-color: var(--primary-hover);
        }
        .toggle-handle {
          width: 1.2rem;
          height: 1.2rem;
          background: #ffffff;
          border-radius: 50%;
          position: absolute;
          top: 0.125rem;
          left: 0.15rem;
          transition: all 0.3s;
          box-shadow: var(--shadow-sm);
        }
        .toggle-switch.active .toggle-handle {
          left: 1.5rem;
        }
        .toggle-label {
          font-size: 0.9rem;
          color: var(--text-sub);
          font-weight: 500;
        }
        .form-actions {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-top: 1rem;
          flex-wrap: wrap;
        }
        .toast {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          border-radius: var(--radius-sm);
          font-size: 0.85rem;
          font-weight: 600;
          animation: fadeIn 0.2s ease-out;
        }
        .toast-success {
          background: rgba(52, 211, 153, 0.15);
          color: var(--text-success);
          border: 1px solid rgba(52, 211, 153, 0.2);
        }
        .toast-danger {
          background: rgba(248, 113, 113, 0.15);
          color: var(--text-danger);
          border: 1px solid rgba(248, 113, 113, 0.2);
        }
        
        /* Playground CSS */
        .image-upload-wrapper {
          border: 1px dashed var(--border-color);
          border-radius: var(--radius-md);
          overflow: hidden;
          transition: border-color 0.2s;
        }
        .image-upload-wrapper:hover {
          border-color: var(--border-color-hover);
        }
        .image-upload-box {
          display: block;
          cursor: pointer;
          padding: 1.5rem;
          background-color: var(--bg-input);
          text-align: center;
        }
        .hidden-file-input {
          display: none;
        }
        .upload-placeholder {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
        }
        .upload-placeholder span {
          font-size: 0.85rem;
          color: var(--text-muted);
          font-weight: 500;
        }
        .image-preview {
          position: relative;
          display: inline-block;
          max-width: 150px;
        }
        .image-preview img {
          width: 100%;
          border-radius: var(--radius-sm);
          border: 1px solid var(--border-color);
          display: block;
        }
        .remove-img-btn {
          position: absolute;
          top: -0.5rem;
          right: -0.5rem;
          background: var(--bg-main);
          color: var(--text-danger);
          border: none;
          border-radius: 50%;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0;
          box-shadow: var(--shadow-sm);
        }
        .btn-test {
          margin-top: 0.5rem;
        }
        .test-error-box {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: rgba(248, 113, 113, 0.1);
          border: 1px solid rgba(248, 113, 113, 0.2);
          border-radius: var(--radius-sm);
          padding: 0.75rem 1rem;
          color: var(--text-danger);
          font-size: 0.9rem;
        }
        
        .test-result-box {
          border-radius: var(--radius-md);
          padding: 1rem;
          margin-top: 1rem;
          border: 1px solid var(--border-color);
          animation: fadeIn 0.3s ease-out;
        }
        .test-result-box.relevant {
          background: rgba(16, 185, 129, 0.05);
          border-color: rgba(16, 185, 129, 0.2);
        }
        .test-result-box.irrelevant {
          background: rgba(248, 113, 113, 0.03);
          border-color: rgba(248, 113, 113, 0.1);
        }
        
        .result-header {
          margin-bottom: 0.75rem;
        }
        .result-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          font-weight: 700;
          font-size: 0.95rem;
        }
        .result-badge.match {
          color: var(--text-success);
        }
        .result-badge.no-match {
          color: var(--text-danger);
        }
        .result-body {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        .result-reason strong, .extracted-details-tags strong {
          display: block;
          font-size: 0.85rem;
          color: var(--text-sub);
          margin-bottom: 0.25rem;
        }
        .result-reason p {
          color: var(--text-main);
          font-size: 0.9rem;
        }
        .tags-container {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          margin-top: 0.25rem;
        }
        .tag-pill {
          background-color: var(--bg-input);
          border: 1px solid var(--border-color);
          color: var(--text-main);
          padding: 0.25rem 0.6rem;
          border-radius: var(--radius-sm);
          font-size: 0.8rem;
          font-weight: 600;
        }
      `}</style>
    </div>
  );
};
