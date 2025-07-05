const fs = require('fs');
const readline = require('readline');
const path = require('path');

const HISTORY_FILE = path.join(__dirname, 'history.json');

// --- Simulierte Antworten ---
const ANTWORTEN = [
  { intent: "nucleus", antwort: "Der Zellkern speichert die DNA der Zelle und steuert ihre Aktivitäten." },
  { intent: "mitochondria", antwort: "Mitochondrien produzieren Energie in Form von ATP durch Zellatmung." },
  { intent: "ribosome", antwort: "Ribosomen sind für die Proteinsynthese zuständig." },
  { intent: "golgi", antwort: "Der Golgi-Apparat modifiziert, sortiert und verpackt Proteine für den Transport." },
  { intent: "er", antwort: "Das endoplasmatische Retikulum transportiert und verarbeitet Proteine und Lipide." },
  { intent: "lysosome", antwort: "Lysosomen bauen Abfallstoffe und Zellreste ab." }
];

// --- History Management ---
function loadHistory() {
  if (!fs.existsSync(HISTORY_FILE)) return [];
  const content = fs.readFileSync(HISTORY_FILE, 'utf-8');
  return JSON.parse(content);
}

function saveHistory(data) {
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

function addMessage(socketId, frage, intent) {
  let data = loadHistory();
  let userEntry = data.find(entry => entry.user === socketId);
  if (userEntry) {
    userEntry.gespräch[frage] = intent;
  } else {
    data.push({ user: socketId, gespräch: { [frage]: intent } });
  }
  saveHistory(data);
}

function getIntentsForUser(socketId) {
  const data = loadHistory();
  const userEntry = data.find(entry => entry.user === socketId);
  return userEntry ? Object.values(userEntry.gespräch) : [];
}

function removeUser(socketId) {
  let data = loadHistory();
  data = data.filter(entry => entry.user !== socketId);
  saveHistory(data);
}

// --- Quiz Engine ---
function generiereQuizfrage(socketId) {
  const benutzteIntents = getIntentsForUser(socketId);
  const moeglicheFragen = ANTWORTEN.filter(
    a => !benutzteIntents.includes(a.intent) && a.antwort.trim() !== ""
  );

  if (moeglicheFragen.length === 0) return null;

  const frage = moeglicheFragen[Math.floor(Math.random() * moeglicheFragen.length)];
  const korrekteIntent = frage.intent;
  const frageText = frage.antwort;

  const andereIntents = ANTWORTEN.map(a => a.intent).filter(i => i !== korrekteIntent);
  const falscheAntworten = andereIntents.length >= 2
    ? andereIntents.sort(() => 0.5 - Math.random()).slice(0, 2)
    : andereIntents;

  const antworten = [...falscheAntworten, korrekteIntent].sort(() => 0.5 - Math.random());

  return {
    frage: frageText,
    antworten,
    korrekt: korrekteIntent
  };
}

// --- CLI Quiz Demo ---
async function cliQuizDemo(socketId) {
  console.log(`Willkommen zum Chatbot-Quiz! Deine Session-ID: ${socketId}`);
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  const frageStellen = (frage) => new Promise(resolve => rl.question(frage, resolve));

  while (true) {
    const quiz = generiereQuizfrage(socketId);
    if (!quiz) {
      console.log("Keine neuen Quizfragen mehr verfügbar. Super gemacht!");
      break;
    }

    console.log(`\nFrage:\n${quiz.frage}`);
    quiz.antworten.forEach((a, i) => {
      console.log(`${i + 1}. ${a}`);
    });

    const input = await frageStellen("Deine Antwort (Nummer, 'q' zum Beenden): ");
    if (input.toLowerCase() === 'q') {
      console.log("Quiz beendet.");
      break;
    }

    const index = parseInt(input) - 1;
    if (isNaN(index) || index < 0 || index >= quiz.antworten.length) {
      console.log("Ungültige Nummer. Versuch’s nochmal.");
      continue;
    }

    if (quiz.antworten[index] === quiz.korrekt) {
      console.log("Richtig!");
    } else {
      console.log(`Falsch. Die richtige Antwort ist: ${quiz.korrekt}`);
    }

    addMessage(socketId, quiz.frage, quiz.korrekt);
  }

  removeUser(socketId);
  rl.close();
  console.log("Deine Session wurde beendet und die History gelöscht.");
}

// --- Start ---
(async () => {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  rl.question("Bitte gib deine User-ID (z.B. socket123) ein: ", async (userId) => {
    rl.close();
    await cliQuizDemo(userId.trim());
  });
})();
