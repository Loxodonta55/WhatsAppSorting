import dotenv from 'dotenv';
import { classifyMessage } from '../src/gemini';
import { db } from '../src/db';
import path from 'path';

// Load environment variables from backend directory
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const testMessages = [
  {
    label: 'MATCH EXPECTED: Boys bundle size 80',
    text: 'Hallo zusammen, ich verkaufe ein Kleidungspaket für Jungs in Größe 80. Es sind 5 Bodys, 3 Hosen und 2 Pullover. Alles in gutem Zustand für 15€. Abholung in München Laim.',
  },
  {
    label: 'NO MATCH EXPECTED: Girls dress size 74',
    text: 'Schickes rotes Kleid für Mädchen in Größe 74 zu verkaufen. Nur einmal getragen, wie neu. 10€ plus Versand.',
  },
  {
    label: 'NO MATCH EXPECTED: Wooden toys',
    text: 'Biete hier eine schöne Holzeisenbahn für Kleinkinder an. Komplett aus Holz, super Zustand. Abzuholen in München Sendling für 8€.',
  },
  {
    label: 'MATCH EXPECTED: Unisex bodys size 74/80 with shipping',
    text: 'Biete 4 weisse Unisex Wickelbodys, perfekt für Jungen oder Mädchen in Gr 74/80. Gerne Versand für 2€ BüWa oder Abholung. Hätte gerne 4€ dafür.',
  }
];

async function runTests() {
  console.log('🧪 Starting Gemini Classifier Integration Test...');
  
  // Save original settings so we can restore them later
  const originalSettings = db.getSettings();

  // Set mock criteria in the JSON db first so the classifier loads it
  const testCriteria = 'Ich suche Kleidung für Jungs in Größe 74 und 80. Keine Schuhe, keine Spielzeuge. Nur Angebote mit Abholung in München oder Versand.';
  db.updateSettings({ criteria: testCriteria });
  console.log(`📌 Configured test criteria: "${testCriteria}"\n`);

  const settings = db.getSettings();
  const apiKey = settings.geminiApiKey || process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.error('❌ ERROR: Gemini API Key not found in DB settings or .env file!');
    console.log('Please create a backend/.env file with: GEMINI_API_KEY=your_key_here\n');
    process.exit(1);
  }

  console.log('🔑 API Key found. Connecting to Gemini API...\n');

  try {
    for (const msg of testMessages) {
      console.log(`--------------------------------------------------`);
      console.log(`📡 Testing: "${msg.label}"`);
      console.log(`📝 Message: "${msg.text}"`);
      
      try {
        const result = await classifyMessage(msg.text);
        console.log(`\n🤖 Response:`);
        console.log(`   - Relevant: ${result.isRelevant ? '✅ YES' : '❌ NO'}`);
        console.log(`   - Reason:   ${result.reason}`);
        if (result.extractedDetails) {
          console.log(`   - Details:  ${JSON.stringify(result.extractedDetails)}`);
        }
      } catch (err) {
        console.error(`❌ Test failed with error:`, err);
      }
      console.log(`--------------------------------------------------\n`);
    }
  } finally {
    // Restore the original search criteria
    db.updateSettings({ criteria: originalSettings.criteria });
    console.log('🔄 Restored original search criteria to the database.');
  }
}

runTests().catch(console.error);
