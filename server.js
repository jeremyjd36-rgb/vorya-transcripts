const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();

const PORT = process.env.PORT || 3000;
const API_KEY = process.env.TRANSCRIPT_API_KEY || 'change-moi';
const BASE_URL = process.env.BASE_URL || '';

const TRANSCRIPT_DIR = path.join(__dirname, 'transcripts');

if (!fs.existsSync(TRANSCRIPT_DIR)) {
  fs.mkdirSync(TRANSCRIPT_DIR, { recursive: true });
}

app.use(express.json({ limit: '20mb' }));

app.get('/', (req, res) => {
  res.send('✅ Vorya Transcripts actif');
});

app.post('/upload-transcript', (req, res) => {
  const auth = req.headers.authorization;

  if (auth !== `Bearer ${API_KEY}`) {
    return res.status(401).json({ error: 'Non autorisé' });
  }

  const { filename, html } = req.body;

  if (!filename || !html) {
    return res.status(400).json({ error: 'filename ou html manquant' });
  }

  const cleanName = filename.replace(/[^a-zA-Z0-9-_\\.]/g, '-');
  const finalName = cleanName.endsWith('.html') ? cleanName : `${cleanName}.html`;

  const filePath = path.join(TRANSCRIPT_DIR, finalName);

  fs.writeFileSync(filePath, html, 'utf8');

  const publicUrl = `${BASE_URL}/transcripts/${finalName}`;

  res.json({
    success: true,
    url: publicUrl
  });
});

app.get('/transcripts/:filename', (req, res) => {
  const filePath = path.join(__dirname, 'transcripts', req.params.filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).send('Introuvable');
  }

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.sendFile(filePath);
});

app.listen(PORT, () => {
  console.log(`🚀 Transcript server running on port ${PORT}`);
});
