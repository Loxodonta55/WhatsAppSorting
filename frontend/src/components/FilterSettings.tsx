import React, { useState, useEffect } from 'react';
import { Save, AlertCircle, Play, CheckCircle2, XCircle, Image as ImageIcon, Sparkles, Loader2 } from 'lucide-react';

interface SettingsData {
  geminiApiKey: string;
  criteria: string;
  notificationPhone: string;
  filterEnabled: boolean;
}

interface FilterSettingsProps {
  settings: SettingsData;
  onSaveSettings: (settings: SettingsData) => Promise<boolean>;
}

export const FilterSettings: React.FC<FilterSettingsProps> = ({ settings, onSaveSettings }) => {
  const [formData, setFormData] = useState<SettingsData>({ ...settings });
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Playground state
  const [testText, setTestText] = useState('');
  const [testImageBase64, setTestImageBase64] = useState<string>('');
  const [testImageMimeType, setTestImageMimeType] = useState<string>('');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [testError, setTestError] = useState('');

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
      const success = await onSaveSettings(formData);
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

  // Handle image upload in playground
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Bitte wähle ein gültiges Bild aus.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setTestImageBase64(reader.result as string);
      setTestImageMimeType(file.type);
    };
    reader.readAsDataURL(file);
  };

  const handleRunTest = async () => {
    if (!testText && !testImageBase64) {
      setTestError('Bitte gib einen Text ein oder lade ein Bild hoch.');
      return;
    }

    setIsTesting(true);
    setTestResult(null);
    setTestError('');

    try {
      // Temporarily update database settings before testing if API key changed
      const res = await fetch('/api/test-filter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: testText,
          imageBase64: testImageBase64,
          imageMimeType: testImageMimeType,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setTestResult(data);
      } else {
        setTestError(data.error || 'Fehler beim Ausführen des Tests.');
      }
    } catch (err) {
      setTestError(`Verbindungsfehler: ${(err as Error).message}`);
    } finally {
      setIsTesting(false);
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
            <label className="form-label" htmlFor="geminiApiKey">
              Gemini API Key
            </label>
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
              Weiterleitungs-Empfänger (WhatsApp)
            </label>
            <input
              id="notificationPhone"
              name="notificationPhone"
              value={formData.notificationPhone}
              onChange={handleChange}
              placeholder="Z.B. 'self' oder Telefonnummer mit Landesvorwahl (491701234567)"
              className="input-field"
              required
            />
            <span className="field-hint">
              Wähle <strong>'self'</strong>, um Treffer an deinen eigenen WhatsApp-Chat ("Nachricht an dich selbst") zu senden, oder gib eine Nummer ein.
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

      {/* Playground / Test Tool */}
      <div className="card">
        <h2 className="section-title">Filter-Testlabor</h2>
        <p className="section-desc">Teste deine Filterkriterien direkt an einer Beispielnachricht mit optionalem Bild.</p>

        <div className="playground-form">
          <div className="form-group">
            <label className="form-label">Beispiel-Text</label>
            <textarea
              value={testText}
              onChange={(e) => setTestText(e.target.value)}
              rows={4}
              placeholder="Kopiere eine Nachricht aus der WhatsApp Gruppe hier rein..."
              className="input-field textarea-field"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Beispiel-Bild (Optional)</label>
            <div className="image-upload-wrapper">
              <label className="image-upload-box">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden-file-input"
                />
                {testImageBase64 ? (
                  <div className="image-preview">
                    <img src={testImageBase64} alt="Playground Preview" />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        setTestImageBase64('');
                        setTestImageMimeType('');
                      }}
                      className="remove-img-btn"
                    >
                      <XCircle size={16} />
                    </button>
                  </div>
                ) : (
                  <div className="upload-placeholder">
                    <ImageIcon size={28} className="text-muted" />
                    <span>Bild hinzufügen (Z.B. Kleiderstapel)</span>
                  </div>
                )}
              </label>
            </div>
          </div>

          <button
            type="button"
            onClick={handleRunTest}
            disabled={isTesting}
            className="btn btn-secondary btn-test"
          >
            {isTesting ? (
              <>
                <Loader2 className="animate-spin" size={18} />
                Analysiere...
              </>
            ) : (
              <>
                <Play size={18} />
                Klassifizierung simulieren
              </>
            )}
          </button>

          {testError && (
            <div className="test-error-box">
              <AlertCircle size={16} />
              <span>{testError}</span>
            </div>
          )}

          {testResult && (
            <div className={`test-result-box ${testResult.isRelevant ? 'relevant' : 'irrelevant'}`}>
              <div className="result-header">
                {testResult.isRelevant ? (
                  <div className="result-badge match">
                    <CheckCircle2 size={18} />
                    <span>Treffer (Relevant)</span>
                  </div>
                ) : (
                  <div className="result-badge no-match">
                    <XCircle size={18} />
                    <span>Kein Treffer</span>
                  </div>
                )}
              </div>

              <div className="result-body">
                <div className="result-reason">
                  <strong>Begründung der KI:</strong>
                  <p>{testResult.reason}</p>
                </div>

                {testResult.isRelevant && testResult.extractedDetails && (
                  <div className="extracted-details-tags">
                    <strong>Extrahierte Merkmale:</strong>
                    <div className="tags-container">
                      {testResult.extractedDetails.item && (
                        <span className="tag-pill">Gegenstand: {testResult.extractedDetails.item}</span>
                      )}
                      {testResult.extractedDetails.size && (
                        <span className="tag-pill">Größe: {testResult.extractedDetails.size}</span>
                      )}
                      {testResult.extractedDetails.price && (
                        <span className="tag-pill">Preis: {testResult.extractedDetails.price}</span>
                      )}
                      {testResult.extractedDetails.location && (
                        <span className="tag-pill">Ort: {testResult.extractedDetails.location}</span>
                      )}
                      {testResult.extractedDetails.condition && (
                        <span className="tag-pill">Zustand: {testResult.extractedDetails.condition}</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .section-title {
          font-size: 1.5rem;
          margin-bottom: 0.5rem;
        }
        .section-desc {
          font-size: 0.9rem;
          margin-bottom: 1.5rem;
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
