import { GoogleGenAI } from '@google/genai';
import { dbService, Settings } from './db.service';

export interface ClassificationResult {
  isRelevant: boolean;
  reason: string;
  extractedDetails: {
    item?: string;
    size?: string;
    price?: string;
    location?: string;
    condition?: string;
  };
}

export class GeminiService {
  /**
   * Classifies a WhatsApp message against the user's natural language criteria.
   * Supports optional image attachment for multimodal analysis.
   */
  async classifyMessage(
    messageText: string,
    imageBuffer?: Buffer,
    imageMimeType?: string
  ): Promise<ClassificationResult> {
    const settings = await dbService.getSettings();
    const apiKey = settings.geminiApiKey || process.env.GEMINI_API_KEY;

    if (!apiKey) {
      throw new Error('Gemini API Key is not configured. Please set it in settings.');
    }

    const ai = new GoogleGenAI({ apiKey });
    const criteria = settings.criteria;

    const systemInstruction = 
      `Du bist ein intelligenter Filter-Assistent für eine WhatsApp-Gruppe, in der Mütter Kinderkleidung, Spielsachen und Zubehör verkaufen oder verschenken.
Deine Aufgabe ist es, zu entscheiden, ob ein Angebot für die Nutzerin RELEVANT ist, basierend auf ihren Suchkriterien.

Nutzerkriterien:
"""
${criteria}
"""

Befolge diese Regeln:
1. Analysiere den Text der Nachricht sorgfältig.
2. Wenn ein Bild vorhanden ist, analysiere auch das Bild der angebotenen Ware, um wichtige Details wie Kleidungsart, Farbe, Zustand, Größe oder Marke zu erkennen, insbesondere wenn der Text sehr kurz ist.
3. Beurteile, ob das Angebot zu den Kriterien passt. Sei im Zweifel lieber etwas toleranter (isRelevant = true), damit der Nutzerin kein gutes Angebot entgeht.
4. Antworte ausschließlich im definierten JSON-Format.
5. Schreibe die Begründung ("reason") auf Deutsch. Sie soll kurz und knackig erklären, warum das Angebot passt oder warum nicht (z.B. "Passt: Bietet Jungenhosen in Gr. 80 an" oder "Unrelevant: Spielzeug, gesucht wird nur Kleidung").`;

    const contents: any[] = [];

    if (imageBuffer && imageMimeType) {
      contents.push({
        inlineData: {
          mimeType: imageMimeType,
          data: imageBuffer.toString('base64'),
        },
      });
    }

    contents.push({
      text: `Analysiere das folgende Angebot:
---
Nachrichtentext:
${messageText || '[Kein Text - Siehe Bild]'}
---
Entspricht dieses Angebot den Kriterien der Nutzerin?`,
    });

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: contents,
        config: {
          systemInstruction: systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'OBJECT',
            properties: {
              isRelevant: {
                type: 'BOOLEAN',
                description: 'Gibt true an, wenn das Angebot den Kriterien entspricht, ansonsten false.',
              },
              reason: {
                type: 'STRING',
                description: 'Eine kurze Begründung auf Deutsch, warum dieses Angebot passt oder nicht.',
              },
              extractedDetails: {
                type: 'OBJECT',
                properties: {
                  item: { type: 'STRING', description: 'Welches Produkt/Gegenstand wird angeboten (z.B. Sommer-Set, Matschhose, Maxi-Cosi).' },
                  size: { type: 'STRING', description: 'Die angegebene Größe (z.B. 74/80, 22), falls ersichtlich.' },
                  price: { type: 'STRING', description: 'Der angegebene Preis (z.B. 10€ VB, zu verschenken), falls ersichtlich.' },
                  location: { type: 'STRING', description: 'Abholort, Versandbereitschaft (z.B. Sendling, nur Abholung, Versand möglich), falls ersichtlich.' },
                  condition: { type: 'STRING', description: 'Zustand der Ware (z.B. neuwertig, gebraucht, Löcher), falls ersichtlich.' },
                },
                required: [],
              },
            },
            required: ['isRelevant', 'reason', 'extractedDetails'],
          },
        },
      });

      const textResponse = response.text;
      if (!textResponse) {
        throw new Error('Gemini returned an empty response.');
      }

      return JSON.parse(textResponse) as ClassificationResult;
    } catch (error) {
      console.error('Error during Gemini classification:', error);
      return {
        isRelevant: false,
        reason: `Fehler bei der Klassifizierung: ${(error as Error).message}`,
        extractedDetails: {},
      };
    }
  }
}

export const geminiService = new GeminiService();
