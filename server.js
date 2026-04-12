const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

const clients = {
  bdlim: { name: 'BDLIM', color: '#1a5276', colorLight: '#2471a3' },
  martin: { name: 'Boulangerie Martin', color: '#8b4513', colorLight: '#c0392b' }
};

app.get('/', (req, res) => { res.sendFile(path.join(__dirname, 'posto.html')); });
app.get('/admin', (req, res) => { res.sendFile(path.join(__dirname, 'admin.html')); });
app.get('/admin.html', (req, res) => { res.sendFile(path.join(__dirname, 'admin.html')); });
app.get('/:client', (req, res) => {
  const clientId = req.params.client.toLowerCase();
  const client = clients[clientId];
  if (!client) return res.sendFile(path.join(__dirname, 'posto.html'));
  let html = fs.readFileSync(path.join(__dirname, 'posto.html'), 'utf8');
  html = html.replace(/Posto Studio/g, client.name);
  html = html.replace(/<title>Posto Studio<\/title>/, '<title>' + client.name + '</title>');
  html = html.replace(/#3d8ce0/g, client.color);
  html = html.replace(/#0e3270/g, client.colorLight);
  res.send(html);
});

app.post('/generate', async (req, res) => {
  const { cta, highlight, title, aiTitle } = req.body;
  const prompt = 'Tu es un expert en reseaux sociaux pour un commercant. Adapte ton contenu au contexte fourni.\nTitre : "' + title + '"\nMise en avant : "' + highlight + '"\nCTA : ' + (cta === 'Oui' ? 'Oui' : 'Non') + '\n\nREPONDS UNIQUEMENT :\n' + (aiTitle === 'Oui' ? 'NOUVEAU_TITRE: [max 8 mots]\n' : '') + 'CAPTION_1: [2-3 phrases emojis]\nCAPTION_2: [different 2-3 phrases emojis]\nCAPTION_3: [poetique 2-3 phrases emojis]';
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 800, messages: [{ role: 'user', content: prompt }] })
    });
    const data = await response.json();
    if (!data.content || !data.content[0]) return res.status(500).json({ error: 'API error' });
    res.json({ text: data.content[0].text });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Serveur demarre sur le port ' + PORT));
