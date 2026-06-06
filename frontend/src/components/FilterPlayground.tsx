import React, { useState } from 'react';
import { Play, CheckCircle2, XCircle, AlertCircle, Image as ImageIcon, Loader2 } from 'lucide-react';

export const FilterPlayground: React.FC = () => {
  const [testText, setTestText] = useState('');
  const [testImageBase64, setTestImageBase64] = useState<string>('');
  const [testImageMimeType, setTestImageMimeType] = useState<string>('');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [testError, setTestError] = useState('');

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
  );
};
