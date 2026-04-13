const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const { v2: cloudinary } = require('cloudinary');
const emailjs = require('@emailjs/nodejs');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const app = express();
app.use(cors());
app.use(express.json({ limit: '100mb' }));
app.use(express.static(path.join(__dirname)));

const clients = {
  bdlim: { name: 'BDLIM', color: '#1a5276', colorLight: '#2471a3' },
  martin: { name: 'Boulangerie Martin', color: '#8b4513', colorLight: '#c0392b' },
  dupont: { name: 'Restaurant Dupont', color: '#1a3a1a', colorLight: '#27ae60' }
};

app.get('/', (req, res) => { res.sendFile(path.join(__dirname, 'app.html')); });
app.get('/admin', (req, res) => { res.sendFile(path.join(__dirname, 'admin.html')); });
app.get('/admin.html', (req, res) => { res.sendFile(path.join(__dirname, 'admin.html')); });
app.get('/:client', (req, res) => {
  const clientId = req.params.client.toLowerCase();
  const client = clients[clientId];
  if (!client) return res.sendFile(path.join(__dirname, 'app.html'));
  let html = fs.readFileSync(path.join(__dirname, 'app.html'), 'utf8');
  html = html.replace(/Posto Studio/g, client.name);
  html = html.replace(/<title>Posto Studio<\/title>/, '<title>' + client.name + '</title>');
  html = html.replace(/#3d8ce0/g, client.color);
  html = html.replace(/#0e3270/g, client.colorLight);
  res.send(html);
});

app.post('/send-email', async (req, res) => {
  const { name, email, type, message, style, videoUrl } = req.body;
  try {
    await emailjs.send('service_qjbwtf8', 'template_j6vpg4b', {
      name: name || 'Inconnu',
      email: email || '',
      type: type || 'Demande',
      message: (message || '') + (videoUrl ? '\n\nLIEN VIDEO : ' + videoUrl : ''),
      style: style || 'N/A'
    }, {
      publicKey: 'Gg1Wl2WLrhqbfxyxO',
      privateKey: 'EnL1sdzNyW0aSuGlZRVM8'
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message || JSON.stringify(error) });
  }
});

app.post('/upload-video', express.raw({ type: '*/*', limit: '200mb' }), async (req, res) => {
  try {
    if (!req.body || req.body.length === 0) return res.status(400).json({ error: 'Pas de fichier' });
    const base64 = req.body.toString('base64');
    const dataUri = 'data:video/mp4;base64,' + base64;
    const result = await cloudinary.uploader.upload(dataUri, {
      resource_type: 'video',
      folder: 'posto-videos',
      public_id: 'video_' + Date.now()
    });
    res.json({ url: result.secure_url, publicId: result.public_id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/generate', async (req, res) => {
  const { cta, highlight, title, aiTitle } = req.body;
  const prompt = `Tu es un expert en reseaux sociaux pour un commercant. Adapte ton contenu au contexte fourni.\nTitre : "${title}"\nMise en avant : "${highlight}"\nCTA : ${cta === 'Oui' ? 'Oui' : 'Non'}\n\nREPONDS UNIQUEMENT :\n${aiTitle === 'Oui' ? 'NOUVEAU_TITRE: [max 8 mots]\n' : ''}CAPTION_1: [2-3 phrases emojis]\nCAPTION_2: [different 2-3 phrases emojis]\nCAPTION_3: [poetique 2-3 phrases emojis]`;
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 800, messages: [{ role: 'user', content: prompt }] })
    });
    const data = await response.json();
    if (!data.content || !data.content[0]) return res.status(500).json({ error: 'API error' });
    res.json({ text: data.content[0].text });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Serveur demarre sur le port ' + PORT));
