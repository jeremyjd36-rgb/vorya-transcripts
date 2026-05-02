const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();

const PORT = process.env.PORT || 3000;
const API_KEY = process.env.TRANSCRIPT_API_KEY || 'change-moi';
const BASE_URL = process.env.BASE_URL || '';

const TRANSCRIPT_DIR = path.join(__dirname, 'transcripts');
const DB_FILE = path.join(__dirname, 'transcripts.json');

if (!fs.existsSync(TRANSCRIPT_DIR)) {
  fs.mkdirSync(TRANSCRIPT_DIR, { recursive: true });
}

if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify([], null, 2));
}

app.use(express.json({ limit: '50mb' }));

function readDB() {
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}

function writeDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

app.get('/', (req, res) => {
  res.send(`
    <h1>✅ Vorya Transcripts actif</h1>
    <p><a href="/history">📁 Voir l'historique</a></p>
  `);
});

app.post('/upload-transcript', (req, res) => {
  const auth = req.headers.authorization;

  if (auth !== `Bearer ${API_KEY}`) {
    return res.status(401).json({ error: 'Non autorisé' });
  }

  const { filename, html, playerName, playerId, category, ticketName } = req.body;

  if (!filename || !html) {
    return res.status(400).json({ error: 'filename ou html manquant' });
  }

  const cleanName = filename.replace(/[^a-zA-Z0-9-_\\.]/g, '-');
  const finalName = cleanName.endsWith('.html') ? cleanName : `${cleanName}.html`;
  const filePath = path.join(TRANSCRIPT_DIR, finalName);

  fs.writeFileSync(filePath, html, 'utf8');

  const publicUrl = `${BASE_URL}/transcripts/${finalName}`;

  const db = readDB();

  db.unshift({
    filename: finalName,
    url: publicUrl,
    playerName: playerName || 'Inconnu',
    playerId: playerId || 'Inconnu',
    category: category || 'Inconnu',
    ticketName: ticketName || finalName,
    createdAt: new Date().toISOString()
  });

  writeDB(db);

  res.json({
    success: true,
    url: publicUrl
  });
});

app.get('/transcripts/:filename', (req, res) => {
  const filePath = path.join(TRANSCRIPT_DIR, req.params.filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).send('Introuvable');
  }

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.sendFile(filePath);
});

app.get('/history', (req, res) => {
  const search = String(req.query.search || '').toLowerCase();
  let db = readDB();

  if (search) {
    db = db.filter(t =>
      String(t.playerName).toLowerCase().includes(search) ||
      String(t.playerId).toLowerCase().includes(search) ||
      String(t.category).toLowerCase().includes(search) ||
      String(t.ticketName).toLowerCase().includes(search)
    );
  }

  const rows = db.map(t => `
    <tr>
      <td>${new Date(t.createdAt).toLocaleString('fr-FR')}</td>
      <td>${t.playerName}</td>
      <td>${t.playerId}</td>
      <td>${t.category}</td>
      <td>${t.ticketName}</td>
      <td><a href="${t.url}" target="_blank">📁 Ouvrir</a></td>
    </tr>
  `).join('');

  res.send(`
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8">
      <title>Historique Transcripts Vorya</title>
      <style>
        body {
          background: #0f1020;
          color: white;
          font-family: Arial, sans-serif;
          padding: 30px;
        }
        h1 {
          color: #8b5cf6;
        }
        form {
          margin-bottom: 20px;
        }
        input {
          padding: 10px;
          width: 320px;
          border-radius: 8px;
          border: none;
        }
        button {
          padding: 10px 15px;
          border-radius: 8px;
          border: none;
          cursor: pointer;
          background: #8b5cf6;
          color: white;
          font-weight: bold;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 20px;
          background: #181a2f;
          border-radius: 10px;
          overflow: hidden;
        }
        th, td {
          padding: 12px;
          border-bottom: 1px solid #2e3150;
          text-align: left;
        }
        th {
          background: #242647;
        }
        a {
          color: #60a5fa;
          font-weight: bold;
        }
      </style>
    </head>
    <body>
      <h1>📁 Historique des transcripts Vorya</h1>

      <form method="GET" action="/history">
        <input name="search" placeholder="Rechercher joueur, ID, catégorie..." value="${search}">
        <button type="submit">🔍 Rechercher</button>
      </form>

      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Joueur</th>
            <th>ID</th>
            <th>Catégorie</th>
            <th>Ticket</th>
            <th>Transcript</th>
          </tr>
        </thead>
        <tbody>
          ${rows || '<tr><td colspan="6">Aucun transcript trouvé.</td></tr>'}
        </tbody>
      </table>
    </body>
    </html>
  `);
});

app.listen(PORT, () => {
  console.log(`🚀 Transcript server running on port ${PORT}`);
});
