const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'posto.html'));
});

app.post('/generate', async (req, res) => {
  const { cta, highlight, title, aiTitle } = req.body;

  const prompt = `Tu es un expert en reseaux sociaux pour un commercant. Adapte ton contenu au contexte fourni.

Genere IMMEDIATEMENT 3 captions Instagram differentes pour ce post.
Titre : "${title}"
Mise en avant : "${highlight}"
CTA : ${cta === 'Oui' ? 'Inclure un appel a laction' : 'Pas de CTA'}

REPONDS UNIQUEMENT dans ce format exact :
${aiTitle === 'Oui' ? 'NOUVEAU_TITRE: [titre max 8 mots]\n' : ''}CAPTION_1: [caption 2-3 phrases avec emojis]
CAPTION_2: [caption differente 2-3 phrases avec emojis]
CAPTION_3: [caption poetique 2-3 phrases avec emojis]`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 800,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await response.json();
    
    if (!data.content || !data.content[0]) {
      return res.status(500).json({ error: 'API error', fullResponse: data });
    }
    
    // Return as "text" so the HTML can parse it
    res.json({ text: data.content[0].text });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Serveur demarre sur le port ${PORT}`));
